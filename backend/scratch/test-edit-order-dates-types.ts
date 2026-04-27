#!/usr/bin/env bun

/**
 * Test script to try editing date and type fields of order 123418
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function testEditDatesAndTypes() {
  console.log("🧪 Test: Edit Date and Type Fields of Order 123418");
  console.log("===================================================");
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
    console.log(`  - orderDate: "${originalOrder.orderDate}"`);
    console.log(`  - orderType: "${originalOrder.orderType}"`);
    console.log(`  - pickupDate: "${originalOrder.leasingOrderDetails?.pickupDate}"`);
    console.log(`  - deliveryDate: "${originalOrder.leasingOrderDetails?.deliveryDate}"`);
    console.log(`  - leasingOrderType: "${originalOrder.leasingOrderDetails?.leasingOrderType}"`);

    // Test 1: Try updating orderDate
    console.log("\n\n🧪 TEST 1: Updating orderDate");
    console.log("==============================");
    const newOrderDate = "2026-05-01T00:00:00";
    const test1Payload = {
      ...originalOrder,
      orderDate: newOrderDate
    };
    
    const test1Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test1Payload),
    });

    console.log("📝 Sent orderDate:", test1Payload.orderDate);
    console.log("📥 Received orderDate:", test1Result.orderDate);
    console.log(test1Result.orderDate === test1Payload.orderDate ? "✅ orderDate updated!" : "❌ orderDate NOT updated");

    // Test 2: Try updating orderType
    console.log("\n\n🧪 TEST 2: Updating orderType");
    console.log("==============================");
    
    // Fetch fresh data
    const order2 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const newOrderType = "RENTAL"; // Change from LEASING to RENTAL
    const test2Payload = {
      ...order2,
      orderType: newOrderType
    };
    
    const test2Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test2Payload),
    });

    console.log("📝 Sent orderType:", test2Payload.orderType);
    console.log("📥 Received orderType:", test2Result.orderType);
    console.log(test2Result.orderType === test2Payload.orderType ? "✅ orderType updated!" : "❌ orderType NOT updated");

    // Test 3: Try updating pickupDate
    console.log("\n\n🧪 TEST 3: Updating pickupDate");
    console.log("===============================");
    
    // Fetch fresh data
    const order3 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const newPickupDate = "2026-06-01T00:00:00";
    const test3Payload = {
      ...order3,
      leasingOrderDetails: {
        ...order3.leasingOrderDetails,
        pickupDate: newPickupDate
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

    console.log("📝 Sent pickupDate:", test3Payload.leasingOrderDetails.pickupDate);
    console.log("📥 Received pickupDate:", test3Result.leasingOrderDetails?.pickupDate);
    console.log(test3Result.leasingOrderDetails?.pickupDate === test3Payload.leasingOrderDetails.pickupDate ? "✅ pickupDate updated!" : "❌ pickupDate NOT updated");

    // Test 4: Try updating deliveryDate
    console.log("\n\n🧪 TEST 4: Updating deliveryDate");
    console.log("=================================");
    
    // Fetch fresh data
    const order4 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const newDeliveryDate = "2026-06-15T00:00:00";
    const test4Payload = {
      ...order4,
      leasingOrderDetails: {
        ...order4.leasingOrderDetails,
        deliveryDate: newDeliveryDate
      }
    };
    
    const test4Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test4Payload),
    });

    console.log("📝 Sent deliveryDate:", test4Payload.leasingOrderDetails.deliveryDate);
    console.log("📥 Received deliveryDate:", test4Result.leasingOrderDetails?.deliveryDate);
    console.log(test4Result.leasingOrderDetails?.deliveryDate === test4Payload.leasingOrderDetails.deliveryDate ? "✅ deliveryDate updated!" : "❌ deliveryDate NOT updated");

    // Test 5: Try updating leasingOrderType
    console.log("\n\n🧪 TEST 5: Updating leasingOrderType");
    console.log("=====================================");
    
    // Fetch fresh data
    const order5 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const newLeasingOrderType = "PICKUP"; // Change from DELIVERY to PICKUP
    const test5Payload = {
      ...order5,
      leasingOrderDetails: {
        ...order5.leasingOrderDetails,
        leasingOrderType: newLeasingOrderType
      }
    };
    
    const test5Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test5Payload),
    });

    console.log("📝 Sent leasingOrderType:", test5Payload.leasingOrderDetails.leasingOrderType);
    console.log("📥 Received leasingOrderType:", test5Result.leasingOrderDetails?.leasingOrderType);
    console.log(test5Result.leasingOrderDetails?.leasingOrderType === test5Payload.leasingOrderDetails.leasingOrderType ? "✅ leasingOrderType updated!" : "❌ leasingOrderType NOT updated");

    // Test 6: Try updating referenceNumber
    console.log("\n\n🧪 TEST 6: Updating referenceNumber");
    console.log("====================================");
    
    // Fetch fresh data
    const order6 = await fetchWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json", ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}) }});
    
    const newReferenceNumber = "TEST-REF-123456";
    const test6Payload = {
      ...order6,
      referenceNumber: newReferenceNumber
    };
    
    const test6Result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(test6Payload),
    });

    console.log("📝 Sent referenceNumber:", test6Payload.referenceNumber);
    console.log("📥 Received referenceNumber:", test6Result.referenceNumber);
    console.log(test6Result.referenceNumber === test6Payload.referenceNumber ? "✅ referenceNumber updated!" : "❌ referenceNumber NOT updated");

    // Summary
    console.log("\n\n📊 SUMMARY");
    console.log("==========");
    console.log("Test 1 (orderDate):", test1Result.orderDate === test1Payload.orderDate ? "✅ PASS" : "❌ FAIL");
    console.log("Test 2 (orderType):", test2Result.orderType === test2Payload.orderType ? "✅ PASS" : "❌ FAIL");
    console.log("Test 3 (pickupDate):", test3Result.leasingOrderDetails?.pickupDate === test3Payload.leasingOrderDetails.pickupDate ? "✅ PASS" : "❌ FAIL");
    console.log("Test 4 (deliveryDate):", test4Result.leasingOrderDetails?.deliveryDate === test4Payload.leasingOrderDetails.deliveryDate ? "✅ PASS" : "❌ FAIL");
    console.log("Test 5 (leasingOrderType):", test5Result.leasingOrderDetails?.leasingOrderType === test5Payload.leasingOrderDetails.leasingOrderType ? "✅ PASS" : "❌ FAIL");
    console.log("Test 6 (referenceNumber):", test6Result.referenceNumber === test6Payload.referenceNumber ? "✅ PASS" : "❌ FAIL");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

testEditDatesAndTypes().catch(console.error);
