#!/usr/bin/env bun

/**
 * Test script to fetch order 123418 and then edit it with a PUT request
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function testGetAndEditOrder() {
  console.log("🧪 Test: Get Order 123418 and Edit It");
  console.log("======================================");
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;

  try {
    // Step 1: Fetch the order
    console.log("\n📥 Step 1: Fetching order...");
    const order = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Order fetched successfully!");
    console.log("📦 Current Order Details:");
    console.log(JSON.stringify(order, null, 2));

    // Step 2: Modify the order
    console.log("\n✏️ Step 2: Modifying order...");
    
    // Example modifications - you can change these as needed
    const updatedOrder = {
      ...order,
      notes: `${order.notes || ""}\nUpdated via test script at ${new Date().toISOString()}`.trim(),
      // You can add more field modifications here, for example:
      // status: "CONFIRMED",
      // referenceNumber: "TEST-REF-123",
    };

    console.log("📝 Changes to be applied:");
    console.log(`  - notes: "${updatedOrder.notes}"`);

    // Step 3: Send PUT request
    console.log("\n📤 Step 3: Sending PUT request...");
    const result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(updatedOrder),
    });

    console.log("\n✅ Order updated successfully!");
    console.log("📦 Updated Order Details:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

testGetAndEditOrder().catch(console.error);
