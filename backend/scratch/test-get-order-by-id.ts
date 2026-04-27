#!/usr/bin/env bun

/**
 * Test script to fetch order details by ID
 */

// Disable TLS cert validation for dev API (same as NODE_TLS_REJECT_UNAUTHORIZED=0)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 122881;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function testGetOrderById() {
  console.log("🧪 Test: Get Order Details by ID");
  console.log("==================================");
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;

  try {
    const result = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("\n✅ Order fetched successfully!");
    console.log("📦 Order Details:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n❌ Failed to fetch order:", error);
  }
}

testGetOrderById().catch(console.error);
