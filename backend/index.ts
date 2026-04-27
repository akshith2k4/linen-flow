import express from 'express'
import chat from './api/chat'
import cors from 'cors';


// ⚠️ Must be set BEFORE any imports that trigger fetch/https calls
// Disables TLS cert validation for dev environments with self-signed or mismatched certs
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    console.warn("⚠️  TLS certificate validation is DISABLED (NODE_TLS_REJECT_UNAUTHORIZED=0). Dev only.");
}


const app = express()
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/**
 * Reusable fetch wrapper with exponential backoff retry.
 * Replaces hand-rolled while-loop retries across route handlers.
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    config: { maxAttempts?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
    const { maxAttempts = 3, baseDelayMs = 500, timeoutMs = 10000 } = config;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            console.log(`📡 fetch (attempt ${attempt}/${maxAttempts}): ${url}`);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) return response;

            console.warn(`⚠️ Attempt ${attempt} failed: ${response.status} ${response.statusText}`);
        } catch (err) {
            clearTimeout(timeoutId);
            console.error(`❌ Attempt ${attempt} error:`, err);
        }

        if (attempt < maxAttempts) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1); // True exponential backoff: 500, 1000, 2000…
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error(`All ${maxAttempts} fetch attempts failed for ${url}`);
}

app.get('/health', (_req, res) => {
    res.send("The server is running healthy")
})


app.get('/api/customers/search', async (req, res) => {
    const query = req.query.q as string || "";
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    console.log(`🔍 Customer search request: query="${query}", external_url="${external_url}"`);
    
    if (!query || query.length < 2) {
        return res.json([]);
    }
    
    try {
        const url = `${external_url}/api/customers/search?name=${encodeURIComponent(query)}`;
        console.log(`📡 Calling external API: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ External API error: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.error(`Error body: ${errorText.substring(0, 200)}`);
            return res.json([]);
        }
        
        const data: any = await response.json();
        console.log("📦 Raw API response:", JSON.stringify(data).substring(0, 300));
        
        // According to API docs, search returns array of { id, name }
        if (Array.isArray(data)) {
            console.log(`✅ Returning ${data.length} results`);
            return res.json(data);
        }
        
        console.warn("⚠️  Response is not an array, returning empty");
        res.json([]);
    } catch (err) {
        console.error("❌ Customer search proxy error:", err);
        res.json([]);
    }
});

app.get('/api/products', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    // Extract search query if present
    const name = req.query.name || req.query.q || req.query.search;
    const queryParams = name ? `?name=${encodeURIComponent(String(name))}` : "";
    
    console.log(`🔍 Products list/search request: query="${name || 'ALL'}", external_url="${external_url}"`);
    
    try {
        const url = `${external_url}/api/products${queryParams}`;
        console.log(`📡 Calling external API: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ External API error: ${response.status} ${response.statusText}`);
            return res.json([]);
        }
        
        const data: any = await response.json();
        
        // Handle paginated response
        if (data && data.content && Array.isArray(data.content)) {
            return res.json(data.content);
        }
        
        // Handle direct array response
        if (Array.isArray(data)) {
            return res.json(data);
        }
        
        res.json([]);
    } catch (err) {
        console.error("❌ Products list proxy error:", err);
        res.json([]);
    }
});

/**
 * 🛡️ GENERIC API PROXY
 * Allows the frontend to securely call ANY external API through the backend authorized tunnel.
 * Prevents CORS issues and keeps tokens secret.
 */
app.post('/api/api-proxy', async (req, res) => {
    const { url, method = 'GET', body, headers = {} } = req.body;
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    if (!url) return res.status(400).json({ error: "Missing URL" });
    
    console.log(`🛰️ Generic Proxy: ${method} ${url}`);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined,
            // @ts-ignore
            tls: { rejectUnauthorized: false }
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: "Proxy failed" });
    }
});

app.get('/api/inventory-pools', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";

    try {
        const url = `${external_url}/api/inventory/pools`;
        const response = await fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });

        const data: any = await response.json();

        // Handle paginated response
        if (data.content && Array.isArray(data.content)) {
            return res.json(data.content);
        }
        if (Array.isArray(data)) {
            return res.json(data);
        }
        res.json([]);
    } catch (err) {
        console.error("❌ Inventory pools fetch failed after retries:", err);
        res.json([]);
    }
});

// Alias: /api/inventory/pools → same handler as /api/inventory-pools
app.get('/api/inventory/pools', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";

    try {
        const url = `${external_url}/api/inventory/pools`;
        const response = await fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });

        const data: any = await response.json();

        if (data.content && Array.isArray(data.content)) {
            return res.json(data.content);
        }
        if (Array.isArray(data)) {
            return res.json(data);
        }
        res.json([]);
    } catch (err) {
        console.error("❌ Inventory pools fetch failed after retries:", err);
        res.json([]);
    }
});

// Get a single inventory pool by ID (proxy using list-and-filter)
app.get('/api/inventory-pools/:poolId', async (req, res) => {
    const poolId = req.params.poolId;
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    console.log(`🔍 Inventory pool detail request: poolId="${poolId}"`);
    
    try {
        const url = `${external_url}/api/inventory/pools`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });
        
        if (!response.ok) return res.status(response.status).json({ message: "External API error" });
        
        const data: any = await response.json();
        const pools = Array.isArray(data) ? data : (data && data.content ? data.content : []);
        const pool = pools.find((p: any) => String(p.id) === String(poolId));
        
        if (pool) return res.json(pool);
        res.status(404).json({ message: "Pool not found" });
    } catch (err) {
        console.error("❌ Inventory pool detail proxy error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get products from a specific inventory pool
app.get('/api/inventory-pool-products/:poolId', async (req, res) => {
    const poolId = req.params.poolId;
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    console.log(`🔍 Inventory pool products request: poolId="${poolId}", external_url="${external_url}"`);
    
    if (!poolId || poolId === 'undefined' || poolId === 'null' || poolId.includes('{{')) {
        console.warn(`⚠️  Invalid pool ID received: "${poolId}", returning empty array`);
        return res.json([]);
    }
    
    try {
        const url = `${external_url}/api/inventory/pools`;
        console.log(`📡 Fetching inventory pools to extract products for poolId: ${poolId}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ External API error (Pools List): ${response.status}`);
            return res.json([]);
        }
        
        const data: any = await response.json();
        const pools = Array.isArray(data) ? data : (data && data.content ? data.content : []);
        
        let pool = pools.find((p: any) => String(p.id) === String(poolId));
        
        // If not found in list or list items are partial, try fetching detailed pool
        if (!pool || (!pool.productItems && !pool.products)) {
            console.log(`🔍 Pool details missing in list, trying direct fetch for pool ${poolId}...`);
            const detailUrl = `${external_url}/api/inventory/pools/${poolId}`;
            const detailRes = await fetch(detailUrl, {
                headers: {
                    'Authorization': `Bearer ${auth_token}`,
                    'Content-Type': 'application/json',
                    'x-company-id': '1'
                }
            });
            
            if (detailRes.ok) {
                pool = await detailRes.json();
            }
        }
        
        if (pool) {
            const rawProducts = pool.productItems || pool.products || [];
            if (Array.isArray(rawProducts)) {
                console.log(`✅ Success: Found ${rawProducts.length} products for pool ${poolId}`);
                // Ensure the response matches what the frontend expects (productId/productName vs id/name)
                // The frontend config uses value_key/label_key so returning raw is fine
                return res.json(rawProducts);
            }
        }
        
        console.warn(`⚠️  No products found for pool ${poolId}`);
        res.json([]);
    } catch (err) {
        console.error("❌ Inventory pool products proxy error:", err);
        res.json([]);
    }
});

// Get reserved products for a specific customer
app.get('/api/inventory/customers/:customerId/reserved-products', async (req, res) => {
    const customerId = req.params.customerId;
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    
    console.log(`🔍 Reserved products request: customerId="${customerId}"`);
    
    if (!customerId || customerId === 'undefined' || customerId === 'null' || customerId.includes('{{')) {
        console.error(`❌ Invalid customerId: ${customerId}`);
        return res.json([]);
    }
    
    try {
        const url = `${external_url}/api/inventory/customers/${customerId}/reserved-products`;
        console.log(`📡 Fetching reserved products: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ External API error: ${response.status} ${response.statusText}`);
            return res.json([]);
        }
        
        const data: any = await response.json();
        console.log(`✅ Reserved products fetched: ${Array.isArray(data) ? data.length : 0} products`);
        
        // Return the products array
        if (Array.isArray(data)) {
            return res.json(data);
        }
        
        res.json([]);
    } catch (err) {
        console.error("❌ Reserved products proxy error:", err);
        res.json([]);
    }
});

// ── Laundry Vendors proxy ───────────────────────────────────────────────────

app.get('/api/laundry-vendors', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    const searchTerm = req.query.name || req.query.q;

    try {
        let url = `${external_url}/api/laundry-vendors`;
        if (searchTerm) url += `?name=${encodeURIComponent(String(searchTerm))}`;

        console.log(`📡 Laundry vendors proxy: ${url}`);

        const response = await fetchWithRetry(url, {
            headers: {
                'Authorization': `Bearer ${auth_token}`,
                'Content-Type': 'application/json',
                'x-company-id': '1'
            }
        });

        const data: any = await response.json();

        if (Array.isArray(data)) return res.json(data);
        if (data?.content && Array.isArray(data.content)) return res.json(data.content);
        res.json([]);
    } catch (err) {
        console.error("❌ Laundry vendors proxy error:", err);
        res.json([]);
    }
});

// ── Routes proxy ────────────────────────────────────────────────────────────

app.get('/api/trips/routes', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    const { dcId, page, size, q, name } = req.query;

    const params = new URLSearchParams();
    if (dcId) params.append('dcId', String(dcId));
    if (page) params.append('page', String(page));
    if (size) params.append('size', String(size));
    // Support both ?q= and ?name= for lookup search
    const searchTerm = (q || name) as string | undefined;
    if (searchTerm) params.append('name', searchTerm);

    try {
        const url = `${external_url}/api/trips/routes?${params}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${auth_token}`, 'x-company-id': '1' }
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('Routes list proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
    }
});

app.get('/api/trips/routes/:routeId', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    const { routeId } = req.params;

    try {
        const response = await fetch(`${external_url}/api/trips/routes/${routeId}`, {
            headers: { 'Authorization': `Bearer ${auth_token}`, 'x-company-id': '1' }
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('Route detail proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
    }
});

app.post('/api/trips/routes', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";

    try {
        const response = await fetch(`${external_url}/api/trips/routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`,
                'x-company-id': '1'
            },
            body: JSON.stringify(req.body)
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('Create route proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
    }
});

app.post('/api/trips/routes/:routeId/assign-points', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    const { routeId } = req.params;

    try {
        const response = await fetch(`${external_url}/api/trips/routes/${routeId}/assign-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`,
                'x-company-id': '1'
            },
            body: JSON.stringify(req.body)
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('Assign route points proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
    }
});

app.delete('/api/trips/routes/:routeId', async (req, res) => {
    const external_url = process.env.EXTERNAL_API_URL || "http://localhost:4000";
    const auth_token = process.env.API_AUTH_TOKEN || "";
    const { routeId } = req.params;

    try {
        const response = await fetch(`${external_url}/api/trips/routes/${routeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${auth_token}`, 'x-company-id': '1' }
        });
        const text = await response.text();
        res.status(response.status).send(text);
    } catch (error) {
        console.error('Delete route proxy error:', error);
        res.status(500).json({ error: 'Proxy error' });
    }
});

app.use('/api', chat)

const PORT = process.env.PORT || 8050;
app.listen(PORT, () => {
    console.log(`The server is running on port ${PORT}`)
})
