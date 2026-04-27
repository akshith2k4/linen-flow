/**
 * Form Session Management Module
 * 
 * Handles session-based entity options and interaction tracking.
 * Provides recently interacted entities for quick selection in forms.
 */

const RECENT_ENTITIES_LIMIT = 5;

/**
 * Get unique session entities with deduplication and sorting.
 * 
 * @param sessionContext - Current session context
 * @param entityType - Type of entity ('hotels', 'orders', 'routes', etc.)
 * @returns Array of unique entities sorted by recency
 */
export function getUniqueSessionEntities(
  sessionContext: any,
  entityType: 'hotels' | 'orders' | 'routes'
): any[] {
  const sessionKey = `interacted_${entityType}`;
  const entities = sessionContext?.[sessionKey] || [];
  
  if (entities.length === 0) {
    return [];
  }
  
  // Deduplicate by ID, keeping most recent interaction
  const uniqueMap = new Map<string, any>();
  entities.forEach((entity: any) => {
    const idStr = String(entity.id);
    const existing = uniqueMap.get(idStr);
    if (!existing || entity.created_at > existing.created_at) {
      uniqueMap.set(idStr, entity);
    }
  });
  
  // Sort by recency and limit count
  return Array.from(uniqueMap.values())
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, RECENT_ENTITIES_LIMIT);
}

/**
 * Prepare session options for entity selection fields.
 * Looks at step fields to determine which entity types need session options.
 * 
 * @param stepConfig - Current step configuration
 * @param workflowContext - Workflow context (workflow type, step number, etc.)
 * @param accumulatedData - Current accumulated data
 * @param sessionContext - Current session context
 * @returns Updated accumulated data with _session_*_options attached
 */
export function prepareSessionOptions(
  stepConfig: any,
  workflowContext: any,
  accumulatedData: any,
  sessionContext: any
): any {
  console.log(`🔍 DEBUG prepareSessionOptions:`);
  console.log(`  - sessionContext keys:`, Object.keys(sessionContext || {}));
  console.log(`  - interacted_hotels:`, sessionContext?.interacted_hotels);
  console.log(`  - interacted_hotels count:`, sessionContext?.interacted_hotels?.length || 0);
  console.log(`  - workflowContext.currentStepNum:`, workflowContext.currentStepNum);
  console.log(`  - workflowContext.isNewWorkflowStart:`, workflowContext.isNewWorkflowStart);
  
  const isNewWorkflowStart = workflowContext.currentStepNum === 1 && 
                             workflowContext.isNewWorkflowStart;
  
  console.log(`  - isNewWorkflowStart (computed):`, isNewWorkflowStart);
  
  if (!isNewWorkflowStart) {
    console.log(`  - ❌ Not a new workflow start, skipping session options`);
    return accumulatedData;
  }
  
  const stepFields = stepConfig?.form?.fields || [];
  
  // Check for customer_id field (hotels)
  const needsCustomerId = stepFields.some((f: any) => 
    f.name === "customer_id" || f.name === "customerId"
  );
  
  if (needsCustomerId) {
    console.log(`  - needsCustomerId: true`);
    const hasCustomerId = !!accumulatedData.customer_id || !!accumulatedData.customerId;
    console.log(`  - hasCustomerId:`, hasCustomerId);
    
    if (!hasCustomerId) {
      const recentHotels = getUniqueSessionEntities(sessionContext, 'hotels');
      console.log(`  - recentHotels from getUniqueSessionEntities:`, recentHotels.length);
      
      if (recentHotels.length > 0) {
        console.log(`🏨 Session Context: Found ${recentHotels.length} interacted hotels`);
        
        accumulatedData._session_hotel_options = recentHotels.map(h => ({
          value: String(h.id),
          label: `${h.name} (${h.interaction_type})`,
          id: String(h.id),
          name: h.name,
          interaction_type: h.interaction_type
        }));
        
        accumulatedData._hotel_name_map = recentHotels.reduce((map, h) => {
          map[String(h.id)] = h.name;
          return map;
        }, {} as Record<string, string>);
        
        console.log(`✅ Prepared ${recentHotels.length} unique hotel options for selection`);
        console.log(`✅ Hotel IDs:`, recentHotels.map(h => String(h.id)));
      } else {
        console.log(`ℹ️ No session hotels available - will show search component`);
      }
    }
  }
  
  // Check for order_id field (orders)
  const needsOrderId = stepFields.some((f: any) => 
    f.name === "order_id" || f.name === "orderId"
  );
  
  if (needsOrderId) {
    const hasOrderId = !!accumulatedData.order_id || !!accumulatedData.orderId;
    
    if (!hasOrderId) {
      const recentOrders = getUniqueSessionEntities(sessionContext, 'orders');
      
      if (recentOrders.length > 0) {
        console.log(`📦 Session Context: Found ${recentOrders.length} interacted orders`);
        
        accumulatedData._session_order_options = recentOrders.map(o => ({
          value: String(o.id),
          label: `Order ${o.id} (${o.interaction_type})`,
          id: String(o.id),
          interaction_type: o.interaction_type
        }));
        
        console.log(`✅ Prepared ${recentOrders.length} unique order options for selection`);
      }
    }
  }
  
  // Check for route_id field (routes)
  const needsRouteId = stepFields.some((f: any) => 
    f.name === "route_id" || f.name === "routeId"
  );
  
  if (needsRouteId) {
    const hasRouteId = !!accumulatedData.route_id || !!accumulatedData.routeId;
    
    if (!hasRouteId) {
      const recentRoutes = getUniqueSessionEntities(sessionContext, 'routes');
      
      if (recentRoutes.length > 0) {
        console.log(`🚚 Session Context: Found ${recentRoutes.length} interacted routes`);
        
        accumulatedData._session_route_options = recentRoutes.map(r => ({
          value: String(r.id),
          label: `Route ${r.id} (${r.interaction_type})`,
          id: String(r.id),
          name: r.name,
          interaction_type: r.interaction_type
        }));
        
        console.log(`✅ Prepared ${recentRoutes.length} unique route options for selection`);
      }
    }
  }
  
  return accumulatedData;
}

/**
 * Track entity interaction by marking it in accumulated data.
 * The marker will be processed later by updateSessionContext.
 * 
 * @param workflowContext - Workflow context (workflow type, etc.)
 * @param accumulatedData - Current accumulated data
 * @param entityType - Type of entity ('hotel', 'order', 'route')
 * @returns Updated accumulated data with _track_*_interaction marker
 */
export function trackEntityInteraction(
  workflowContext: any,
  accumulatedData: any,
  sessionContext: any,
  entityType: 'hotel' | 'order' | 'route'
): any {
  // Determine entity ID based on type
  let entityId: any;
  let entityName: string;
  
  switch (entityType) {
    case 'hotel':
      entityId = accumulatedData.customer_id || accumulatedData.customerId;
      entityName = accumulatedData.name || "Selected Hotel";
      break;
    case 'order':
      entityId = accumulatedData.order_id || accumulatedData.orderId;
      entityName = `Order ${entityId}`;
      break;
    case 'route':
      entityId = accumulatedData.route_id || accumulatedData.routeId;
      entityName = accumulatedData.route_name || `Route ${entityId}`;
      break;
  }
  
  if (!entityId) {
    return accumulatedData;
  }
  
  // Check if already tracked
  const sessionKey = `interacted_${entityType}s`;
  const existingInteracted = sessionContext?.[sessionKey] || [];
  const alreadyTracked = existingInteracted.some((e: any) => String(e.id) === String(entityId));
  
  if (!alreadyTracked) {
    const entry = {
      id: String(entityId),
      name: entityName,
      interaction_type: workflowContext.isCreateWorkflow ? 'created' : 'updated' as const,
      created_at: Date.now()
    };
    
    accumulatedData[`_track_${entityType}_interaction`] = entry;
    console.log(`✅ Tracking new ${entityType} interaction:`, entityName, `(${entry.interaction_type})`);
  }
  
  return accumulatedData;
}

/**
 * Update session context with tracked interactions.
 * Processes _track_*_interaction markers and updates session context.
 * 
 * @param state - Current intent state
 * @param accumulatedData - Current accumulated data (may contain markers)
 * @returns Object with updated sessionContext and cleanAccumulatedData (markers removed)
 */
export function updateSessionContext(
  state: any,
  accumulatedData: any
): { sessionContext: any; cleanAccumulatedData: any } {
  let sessionContext = state.session_context || {};
  let cleanData = { ...accumulatedData };
  
  // Process hotel interaction marker
  if (accumulatedData._track_hotel_interaction) {
    const hotelEntry = accumulatedData._track_hotel_interaction;
    const existingInteracted = sessionContext.interacted_hotels || [];
    const filteredInteracted = existingInteracted.filter((h: any) => h.id !== hotelEntry.id);
    
    sessionContext = {
      ...sessionContext,
      interacted_hotels: [...filteredInteracted, hotelEntry]
    };
    
    delete cleanData._track_hotel_interaction;
  }
  
  // Process order interaction marker
  if (accumulatedData._track_order_interaction) {
    const orderEntry = accumulatedData._track_order_interaction;
    const existingInteracted = sessionContext.interacted_orders || [];
    const filteredInteracted = existingInteracted.filter((o: any) => o.id !== orderEntry.id);
    
    sessionContext = {
      ...sessionContext,
      interacted_orders: [...filteredInteracted, orderEntry]
    };
    
    delete cleanData._track_order_interaction;
  }
  
  // Process route interaction marker
  if (accumulatedData._track_route_interaction) {
    const routeEntry = accumulatedData._track_route_interaction;
    const existingInteracted = sessionContext.interacted_routes || [];
    const filteredInteracted = existingInteracted.filter((r: any) => r.id !== routeEntry.id);
    
    sessionContext = {
      ...sessionContext,
      interacted_routes: [...filteredInteracted, routeEntry]
    };
    
    delete cleanData._track_route_interaction;
  }
  
  return {
    sessionContext,
    cleanAccumulatedData: cleanData
  };
}
