#!/usr/bin/env bun

/**
 * 🧪 Complete End-to-End Test: Update Order Workflow
 * 
 * This script tests the update_order workflow by:
 * 1. Fetching an existing order (123418)
 * 2. Simulating the workflow steps
 * 3. Updating dates and quantities
 * 4. Verifying the changes were applied
 * 
 * Run with: bun run scratch/test-update-order-complete-flow.ts
 * 
 * Note: If you get SSL certificate errors, you can either:
 * 1. Set NODE_TLS_REJECT_UNAUTHORIZED=0 (not recommended for production)
 * 2. Test via the chat interface instead
 * 3. Use a local backend instance
 */

// Disable SSL verification for dev environment (remove in production!)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = "https://dev.api.linengrass.com";
const ORDER_ID = 123418;
const HEADERS = {
  "Content-Type": "application/json",
  "x-company-id": "1",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function section(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log("=".repeat(60));
}

async function apiCall(method: string, endpoint: string, body?: any, retries = 3) {
  const url = `${BASE_URL}${endpoint}`;
  log("📡", `${method} ${url}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const options: RequestInit = {
        method,
        headers: HEADERS,
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      return response.json();
    } catch (error: any) {
      if (attempt === retries) {
        throw error;
      }
      log("⚠️", `Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] + 'T00:00:00';
}

// ─── Test Functions ─────────────────────────────────────────────────────────

async function step1_fetchOriginalOrder() {
  section("STEP 1: Fetch Original Order");
  
  const order = await apiCall("GET", `/api/orders/${ORDER_ID}`);
  
  log("✅", `Order ${ORDER_ID} fetched successfully`);
  log("📦", `Customer: ${order.customerName} (ID: ${order.customerId})`);
  log("📦", `Status: ${order.status}`);
  log("📦", `Order Type: ${order.orderType}`);
  
  if (order.leasingOrderDetails) {
    const details = order.leasingOrderDetails;
    log("📦", `Leasing Type: ${details.leasingOrderType}`);
    log("📦", `Pickup Date: ${details.pickupDate}`);
    log("📦", `Delivery Date: ${details.deliveryDate}`);
    log("📦", `Delivery Items: ${details.deliveryItems?.length || 0} items`);
    
    if (details.deliveryItems && details.deliveryItems.length > 0) {
      details.deliveryItems.forEach((item: any, idx: number) => {
        log("  📦", `  Item ${idx + 1}: ${item.productName} (ID: ${item.productId}) - Qty: ${item.quantity}`);
      });
    }
  }
  
  return order;
}

async function step2_updateDatesAndType(originalOrder: any) {
  section("STEP 2: Update Dates & Leasing Type");
  
  const newPickupDate = new Date("2026-06-10T00:00:00");
  const newDeliveryDate = new Date("2026-06-20T00:00:00");
  const newLeasingType = "BOTH";
  
  log("📝", `New Pickup Date: ${formatDate(newPickupDate)}`);
  log("📝", `New Delivery Date: ${formatDate(newDeliveryDate)}`);
  log("📝", `New Leasing Type: ${newLeasingType}`);
  
  // Prepare the update payload - merge with current data
  const updatePayload = {
    ...originalOrder,
    leasingOrderDetails: {
      ...originalOrder.leasingOrderDetails,
      pickupDate: formatDate(newPickupDate),
      deliveryDate: formatDate(newDeliveryDate),
      leasingOrderType: newLeasingType,
    }
  };
  
  const updatedOrder = await apiCall("PUT", `/api/orders/${ORDER_ID}`, updatePayload);
  
  // Verify the changes
  const actualPickup = updatedOrder.leasingOrderDetails?.pickupDate;
  const actualDelivery = updatedOrder.leasingOrderDetails?.deliveryDate;
  const actualType = updatedOrder.leasingOrderDetails?.leasingOrderType;
  
  if (actualPickup === formatDate(newPickupDate)) {
    log("✅", `Pickup date updated successfully: ${actualPickup}`);
  } else {
    log("❌", `Pickup date NOT updated. Expected: ${formatDate(newPickupDate)}, Got: ${actualPickup}`);
  }
  
  if (actualDelivery === formatDate(newDeliveryDate)) {
    log("✅", `Delivery date updated successfully: ${actualDelivery}`);
  } else {
    log("❌", `Delivery date NOT updated. Expected: ${formatDate(newDeliveryDate)}, Got: ${actualDelivery}`);
  }
  
  if (actualType === newLeasingType) {
    log("✅", `Leasing type updated successfully: ${actualType}`);
  } else {
    log("❌", `Leasing type NOT updated. Expected: ${newLeasingType}, Got: ${actualType}`);
  }
  
  return updatedOrder;
}

async function step3_updateItemQuantities(currentOrder: any) {
  section("STEP 3: Update Line Item Quantities");
  
  const deliveryItems = currentOrder.leasingOrderDetails?.deliveryItems || [];
  
  if (deliveryItems.length === 0) {
    log("⚠️", "No delivery items to update");
    return currentOrder;
  }
  
  // Update the first item's quantity
  const itemToUpdate = deliveryItems[0];
  const originalQty = itemToUpdate.quantity;
  const newQty = originalQty + 10;
  
  log("📝", `Updating ${itemToUpdate.productName} (ID: ${itemToUpdate.productId})`);
  log("📝", `Original Quantity: ${originalQty}`);
  log("📝", `New Quantity: ${newQty}`);
  
  // Update the item in the array
  const updatedItems = deliveryItems.map((item: any) => {
    if (item.productId === itemToUpdate.productId) {
      return { ...item, quantity: newQty };
    }
    return item;
  });
  
  // Prepare the update payload
  const updatePayload = {
    ...currentOrder,
    leasingOrderDetails: {
      ...currentOrder.leasingOrderDetails,
      deliveryItems: updatedItems,
    }
  };
  
  const updatedOrder = await apiCall("PUT", `/api/orders/${ORDER_ID}`, updatePayload);
  
  // Verify the change
  const updatedItem = updatedOrder.leasingOrderDetails?.deliveryItems?.find(
    (item: any) => item.productId === itemToUpdate.productId
  );
  
  if (updatedItem && updatedItem.quantity === newQty) {
    log("✅", `Quantity updated successfully: ${updatedItem.quantity}`);
  } else {
    log("❌", `Quantity NOT updated. Expected: ${newQty}, Got: ${updatedItem?.quantity}`);
  }
  
  return updatedOrder;
}

async function step4_verifyFinalState() {
  section("STEP 4: Verify Final State");
  
  const finalOrder = await apiCall("GET", `/api/orders/${ORDER_ID}`);
  
  log("✅", "Final order state fetched");
  log("📦", `Status: ${finalOrder.status}`);
  
  if (finalOrder.leasingOrderDetails) {
    const details = finalOrder.leasingOrderDetails;
    log("📦", `Leasing Type: ${details.leasingOrderType}`);
    log("📦", `Pickup Date: ${details.pickupDate}`);
    log("📦", `Delivery Date: ${details.deliveryDate}`);
    
    if (details.deliveryItems && details.deliveryItems.length > 0) {
      log("📦", `Delivery Items:`);
      details.deliveryItems.forEach((item: any, idx: number) => {
        log("  📦", `  ${idx + 1}. ${item.productName} - Qty: ${item.quantity}`);
      });
    }
  }
  
  return finalOrder;
}

async function step5_showWorkflowSummary(original: any, final: any) {
  section("WORKFLOW SUMMARY");
  
  log("📊", "Changes Applied:");
  
  // Compare dates
  const origPickup = original.leasingOrderDetails?.pickupDate;
  const finalPickup = final.leasingOrderDetails?.pickupDate;
  if (origPickup !== finalPickup) {
    log("  ✏️", `Pickup Date: ${origPickup} → ${finalPickup}`);
  }
  
  const origDelivery = original.leasingOrderDetails?.deliveryDate;
  const finalDelivery = final.leasingOrderDetails?.deliveryDate;
  if (origDelivery !== finalDelivery) {
    log("  ✏️", `Delivery Date: ${origDelivery} → ${finalDelivery}`);
  }
  
  const origType = original.leasingOrderDetails?.leasingOrderType;
  const finalType = final.leasingOrderDetails?.leasingOrderType;
  if (origType !== finalType) {
    log("  ✏️", `Leasing Type: ${origType} → ${finalType}`);
  }
  
  // Compare quantities
  const origItems = original.leasingOrderDetails?.deliveryItems || [];
  const finalItems = final.leasingOrderDetails?.deliveryItems || [];
  
  origItems.forEach((origItem: any) => {
    const finalItem = finalItems.find((item: any) => item.productId === origItem.productId);
    if (finalItem && origItem.quantity !== finalItem.quantity) {
      log("  ✏️", `${origItem.productName}: Qty ${origItem.quantity} → ${finalItem.quantity}`);
    }
  });
  
  log("", "");
  log("✅", "Update Order Workflow Test Complete!");
}

// ─── Main Test Runner ───────────────────────────────────────────────────────

async function runTest() {
  console.log("🧪 Update Order Workflow - Complete Flow Test");
  console.log("=".repeat(60));
  log("📋", `Testing Order ID: ${ORDER_ID}`);
  log("🌐", `Base URL: ${BASE_URL}`);
  
  try {
    // Step 1: Fetch original order
    const originalOrder = await step1_fetchOriginalOrder();
    
    // Step 2: Update dates and type
    const afterDatesUpdate = await step2_updateDatesAndType(originalOrder);
    
    // Step 3: Update item quantities
    const afterQuantityUpdate = await step3_updateItemQuantities(afterDatesUpdate);
    
    // Step 4: Verify final state
    const finalOrder = await step4_verifyFinalState();
    
    // Step 5: Show summary
    await step5_showWorkflowSummary(originalOrder, finalOrder);
    
  } catch (error) {
    log("❌", `Test failed: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();
