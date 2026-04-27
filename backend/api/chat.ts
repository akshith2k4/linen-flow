import express from 'express'
import { graph } from '../agent/graph'
const router = express.Router()
import { v4 as uuidv4 } from 'uuid';
import { listHotels, listInventoryPools, listReservations } from '../agent/tools';


router.post('/chat', async (req, res) => {
    const { message, thread_id: existingThreadId } = req.body;
    const thread_id = existingThreadId || uuidv4();
    const config = { configurable: { thread_id } };
    
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║     NEW CHAT REQUEST                   ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("📨 Message:", message);
    console.log("🆔 Thread ID:", thread_id);
    console.log("🔄 Is existing thread:", !!existingThreadId);
    
    let initialState: any = {
        intent_plan: { usermessage: message, intent: "", type: "", workflow: "", status: "" }
    };
    
    if (existingThreadId) {
        try {
            const currentState = await graph.getState(config);
            console.log("📦 Retrieved state for thread:", thread_id);
            console.log("📦 Has session_context:", !!currentState?.values?.session_context);
            console.log("📦 Has last_search:", !!currentState?.values?.session_context?.last_search);
            
            if (currentState?.values?.session_context) {
                initialState.session_context = currentState.values.session_context;
                
                // Log last_search details if available
                if (currentState.values.session_context.last_search) {
                    const ls = currentState.values.session_context.last_search;
                    console.log(`📄 Last search: type=${ls.type}, page=${ls.current_page}, size=${ls.page_size}, total=${ls.total_count}`);
                }
            } else {
                console.warn("⚠️ No session_context found in existing thread");
            }
            
            // CRITICAL FIX: Preserve entity_context which contains active_workflow
            if (currentState?.values?.entity_context) {
                initialState.entity_context = currentState.values.entity_context;
                console.log("📦 Preserved entity_context with active_workflow:", currentState.values.entity_context.active_workflow);
            }
            
            // CRITICAL FIX: Preserve accumulated_data for mid-workflow edits
            if (currentState?.values?.accumulated_data) {
                initialState.accumulated_data = currentState.values.accumulated_data;
                console.log("📦 Preserved accumulated_data keys:", Object.keys(currentState.values.accumulated_data));
            }
        } catch (err) {
            console.warn("⚠️ Could not retrieve existing state:", err);
        }
    }
    
    const result = await graph.invoke(initialState, config);
    res.json({ ...result, thread_id });
});

/**
 * ⚡ STREAMING ENDPOINT (Perceived Latency Killer)
 * Uses Server-Sent Events (SSE) to stream graph execution.
 */
router.post('/chat-stream', async (req, res) => {
    const { message, thread_id: existingThreadId } = req.body;
    const thread_id = existingThreadId || uuidv4();
    const config = { configurable: { thread_id } };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let initialState: any = {
        intent_plan: { usermessage: message, intent: "", type: "", workflow: "", status: "" }
    };

    if (existingThreadId) {
        try {
            const currentState = await graph.getState(config);
            if (currentState?.values?.session_context) {
                initialState.session_context = currentState.values.session_context;
            }
            // CRITICAL FIX: Preserve entity_context for streaming endpoint too
            if (currentState?.values?.entity_context) {
                initialState.entity_context = currentState.values.entity_context;
            }
            if (currentState?.values?.accumulated_data) {
                initialState.accumulated_data = currentState.values.accumulated_data;
            }
        } catch (err) {}
    }

    try {
        const eventStream = graph.streamEvents(initialState, { 
            ...config, 
            version: "v2" 
        });

        for await (const event of eventStream) {
            const eventType = event.event;
            const node = event.metadata?.langgraph_node;

            // 1. Token Streaming (Mistral/Gemini output)
            if (eventType === "on_chat_model_stream" && node === "chatnode") {
                const chunk = event.data?.chunk?.content;
                if (chunk) send({ type: "token", text: chunk });
            }

            // 2. Node Transitions (Status Updates)
            if (eventType === "on_chain_start" && node) {
                 const friendlyNames: Record<string, string> = {
                    "orchestrator": "Classifying intent...",
                    "workflow": "Loading workflow config...",
                    "formbuilder": "Preparing form...",
                    "apinode": "Executing API call...",
                    "chatnode": "Thinking..."
                 };
                 if (friendlyNames[node]) {
                    send({ type: "status", text: friendlyNames[node] });
                 }
            }
        }

        // 3. Final State Delivery (the full result object for forms/actions)
        const finalState = await graph.getState(config);
        send({ 
            type: "result", 
            data: { ...finalState.values, thread_id } 
        });
        
    } catch (error) {
        console.error("❌ Streaming Error:", error);
        send({ type: "error", message: "Stream interrupted" });
    } finally {
        res.end();
    }
});



router.post('/form-submit', async (req, res) => {
    const { formData, thread_id } = req.body;
    const config = { configurable: { thread_id: thread_id ?? uuidv4() } };

    try {
        console.log("📥 Form submitted, checking checkpointer state...");
        const currentState = await graph.getState(config);
        
        await graph.updateState(config, { user_data: formData });

        // CRITICAL FIX: The Graph Restart Bug. 
        // We use graph.stream(null) and explicitly check the paused node 
        // to prevent full re-evaluations from the START node.
        if (currentState?.next?.length > 0) {
            console.log(`✅ Resuming graph seamlessly from paused node: ${currentState.next[0]}`);
            const stream = await graph.stream(null, config);
            for await (const chunk of stream) {
                // Exhaust the stream to complete execution
            }
            
            const finalState = await graph.getState(config);
            return res.json({ ...finalState.values, thread_id });
        } else {
            console.warn("⚠️ Graph was not paused. Using fallback invoke.");
            const result = await graph.invoke(null, config);
            return res.json({ ...result, thread_id });
        }
    } catch (error) {
        console.error("Error resuming workflow:", error);
        res.status(500).json({ error: "Failed to process step" });
    }
});

// Search-form submission: user picked a hotel from the search widget in chatnode.
// We send a synthetic chat message back through the graph so the LLM fetches
// full details via its tools and renders a rich widget.
router.post('/search-submit', async (req, res) => {
    const { formData, thread_id: existingThreadId } = req.body;
    const thread_id = existingThreadId || uuidv4();
    const config = { configurable: { thread_id } };

    const customerId = formData?.customer_id;
    if (!customerId) {
        return res.status(400).json({ error: "No customer_id provided" });
    }

    console.log("\n╔════════════════════════════════════════╗");
    console.log("║   SEARCH-SUBMIT → FETCH DETAILS       ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("🆔 Customer ID:", customerId);

    try {
        // Start a fresh graph invocation with a message that triggers tool usage
        const result = await graph.invoke({
            intent_plan: {
                usermessage: `Show me the complete details for hotel with ID ${customerId}. Include hotel information, active agreements, and products.`,
                intent: "",
                type: "chat",
                workflow: "",
                status: ""
            }
        }, { configurable: { thread_id: uuidv4() } });

        console.log("📤 Search-submit result sent to frontend");
        res.json({ ...result, thread_id });
    } catch (error) {
        console.error("❌ Search-submit error:", error);
        res.status(500).json({ error: "Failed to fetch hotel details" });
    }
});

router.post('/form-edit', async (req, res) => {
    const { formData, thread_id } = req.body;
    if (!thread_id) return res.status(400).json({ error: "Missing thread_id" });

    const config = { configurable: { thread_id } };

    try {
        const currentState = await graph.getState(config);
        if (!currentState || !currentState.values) {
            return res.status(400).json({ error: "Session not found" });
        }

        // Merge the edited data into accumulated_data
        const newAccumulatedData = {
            ...currentState.values.accumulated_data,
            ...formData
        };

        await graph.updateState(config, { accumulated_data: newAccumulatedData });

        res.json({ success: true, message: "Update successful" });
    } catch (error) {
        console.error("Error editing workflow:", error);
        res.status(500).json({ error: "Failed to edit step" });
    }
});

/**
 * ⚡ DIRECT PAGINATION ENDPOINT (LLM-Free)
 * Bypasses LLM for pagination to reduce cost and latency
 */
router.post('/paginate', async (req, res) => {
    const { operation, params, thread_id } = req.body;
    
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║   DIRECT PAGINATION (No LLM)          ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("🔧 Operation:", operation);
    console.log("📄 Params:", params);
    console.log("🆔 Thread ID:", thread_id || "none");
    
    try {
        let toolResult: any;
        let searchType: 'hotels' | 'pools' | 'reservations';
        
        // Map operation to tool function
        switch (operation) {
            case 'list_hotels':
                toolResult = await listHotels.invoke(params);
                searchType = 'hotels';
                break;
            case 'list_inventory_pools':
                toolResult = await listInventoryPools.invoke(params);
                searchType = 'pools';
                break;
            case 'list_reservations':
                toolResult = await listReservations.invoke(params);
                searchType = 'reservations';
                break;
            default:
                return res.status(400).json({ error: `Unknown operation: ${operation}` });
        }
        
        // Parse the tool result
        const resultData = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;
        
        // Extract entities based on search type
        let entities: any[] = [];
        let totalCount = 0;
        
        if (searchType === 'hotels') {
            entities = (resultData.content || []).map((hotel: any) => ({
                id: hotel.id,
                name: hotel.name,
                subtext: hotel.type || 'HOTEL'
            }));
            totalCount = resultData.totalElements || entities.length;
        } else if (searchType === 'pools') {
            entities = (resultData.content || []).map((pool: any) => ({
                id: pool.id,
                name: pool.name,
                subtext: `Capacity: ${pool.capacity || 0}`
            }));
            totalCount = resultData.totalElements || entities.length;
        } else if (searchType === 'reservations') {
            entities = (resultData.content || []).map((res: any) => ({
                id: res.id,
                name: `Reservation #${res.id}`,
                subtext: `Customer: ${res.customerId || 'N/A'}`
            }));
            totalCount = resultData.totalElements || entities.length;
        }
        
        // Format response as entity_list widget
        const response = {
            ui_widget: 'entity_list',
            data: {
                title: searchType === 'hotels' ? 'Hotels' : searchType === 'pools' ? 'Inventory Pools' : 'Reservations',
                total_count: totalCount,
                page: params.page || 0,
                page_size: params.size || 5,
                entities: entities,
                show_search_form: false
            }
        };
        
        console.log(`✅ Direct pagination successful: ${entities.length} ${searchType} returned`);
        
        res.json(response);
    } catch (error) {
        console.error("❌ Direct pagination error:", error);
        res.status(500).json({ error: "Failed to fetch paginated data" });
    }
});

export default router;