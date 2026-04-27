#!/usr/bin/env bun

/**
 * Test script to try editing different fields of order 123418
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function testEditDifferentFields() {
  console.log("🧪 Test: Edit Different Fields of Order 123418");
  console.log("===============================================");
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;

  try {
    // Step 1: Fetch the order
    console.log("\n📥 Step 1: Fetching original order...");
    const originalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Order fetched successfully!");
    console.log("📦 Original values:");
    console.log(`  - status: "${originalOrder.status}"`);
    console.log(`  - notes: "${originalOrder.notes}"`);
    console.log(`  - referenceNumber: "${originalOrder.referenceNumber}"`);

    // Test 1: Try updating notes
    console.log("\n\n🧪 TEST 1: Updating notes field");
    console.log("================================");
    const test1Payload = {
      ...originalOrder,
      notes: `Test update at ${new Date().toISOString()}`
    };
    
    const test1Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test1Payload),
    });

    console.log("📝 Sent notes:", test1Payload.notes);
    console.log("📥 Received notes:", test1Result.notes);
    console.log(test1Result.notes === test1Payload.notes ? "✅ Notes updated!" : "❌ Notes NOT updated");

    // Test 2: Try updating status
    console.log("\n\n🧪 TEST 2: Updating status field");
    console.log("=================================");
    
    // Fetch fresh data
    const order2 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const test2Payload = {
      ...order2,
      status: "CONFIRMED"
    };
    
    const test2Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test2Payload),
    });

    console.log("📝 Sent status:", test2Payload.status);
    console.log("📥 Received status:", test2Result.status);
    console.log(test2Result.status === test2Payload.status ? "✅ Status updated!" : "❌ Status NOT updated");

    // Test 3: Try updating delivery items quantity
    console.log("\n\n🧪 TEST 3: Updating delivery item quantity");
    console.log("===========================================");
    
    // Fetch fresh data
    const order3 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const test3Payload = {
      ...order3,
      leasingOrderDetails: {
        ...order3.leasingOrderDetails,
        deliveryItems: order3.leasingOrderDetails.deliveryItems.map((item: any, idx: number) => 
          idx === 0 ? { ...item, quantity: 50 } : item
        )
      }
    };
    
    const test3Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test3Payload),
    });

    const originalQty = order3.leasingOrderDetails.deliveryItems[0].quantity;
    const sentQty = test3Payload.leasingOrderDetails.deliveryItems[0].quantity;
    const receivedQty = test3Result.leasingOrderDetails.deliveryItems[0].quantity;
    
    console.log("📝 Original quantity:", originalQty);
    console.log("📝 Sent quantity:", sentQty);
    console.log("📥 Received quantity:", receivedQty);
    console.log(receivedQty === sentQty ? "✅ Quantity updated!" : "❌ Quantity NOT updated");

    // Summary
    console.log("\n\n📊 SUMMARY");
    console.log("==========");
    console.log("Test 1 (notes):", test1Result.notes === test1Payload.notes ? "✅ PASS" : "❌ FAIL");
    console.log("Test 2 (status):", test2Result.status === test2Payload.status ? "✅ PASS" : "❌ FAIL");
    console.log("Test 3 (quantity):", receivedQty === sentQty ? "✅ PASS" : "❌ FAIL");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

testEditDifferentFields().catch(console.error);
