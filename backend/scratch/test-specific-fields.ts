#!/usr/bin/env bun

/**
 * Focused test for specific fields in order 123418
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

interface TestResult {
  field: string;
  sent: any;
  received: any;
  passed: boolean;
}

async function testSpecificFields() {
  console.log("🧪 Focused Test: Specific Fields of Order 123418");
  console.log("=================================================");
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;
  const results: TestResult[] = [];

  try {
    // Fetch original order
    console.log("📥 Fetching original order...");
    const originalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Order fetched successfully!\n");

    // Create update payload with only specified fields
    const updatedOrder = {
      ...originalOrder,
      
      // Top-level fields
      orderDate: "2026-05-15T00:00:00",
      orderType: "RENTAL",
      status: "CONFIRMED",
      notes: "Test update at " + new Date().toISOString(),
      referenceNumber: "TEST-REF-999999",
      isAdjustment: true,
      invoiced: true,
      
      // Leasing order details
      leasingOrderDetails: {
        ...originalOrder.leasingOrderDetails,
        pickupDate: "2026-06-20T00:00:00",
        deliveryDate: "2026-06-25T00:00:00",
        leasingOrderType: "PICKUP",
        
        // Only update quantity in delivery items
        deliveryItems: originalOrder.leasingOrderDetails.deliveryItems.map((item: any, idx: number) => ({
          ...item,
          quantity: idx === 0 ? 100 : 25,
        })),
      }
    };

    console.log("📤 Sending update...\n");
    
    // Send the update
    const result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(updatedOrder),
    });

    console.log("✅ Update completed!\n");
    console.log("=".repeat(60) + "\n");

    // Compare fields
    console.log("🔍 FIELD-BY-FIELD COMPARISON\n");

    // Top-level fields
    console.log("📋 TOP-LEVEL FIELDS:");
    const topLevelTests = [
      { name: "orderDate", sent: updatedOrder.orderDate, received: result.orderDate },
      { name: "orderType", sent: updatedOrder.orderType, received: result.orderType },
      { name: "status", sent: updatedOrder.status, received: result.status },
      { name: "notes", sent: updatedOrder.notes, received: result.notes },
      { name: "referenceNumber", sent: updatedOrder.referenceNumber, received: result.referenceNumber },
      { name: "isAdjustment", sent: updatedOrder.isAdjustment, received: result.isAdjustment },
      { name: "invoiced", sent: updatedOrder.invoiced, received: result.invoiced },
    ];

    topLevelTests.forEach(test => {
      const passed = test.sent === test.received;
      results.push({ field: test.name, sent: test.sent, received: test.received, passed });
      console.log(`  ${passed ? "✅" : "❌"} ${test.name}`);
      console.log(`     Sent: ${JSON.stringify(test.sent)}`);
      console.log(`     Got:  ${JSON.stringify(test.received)}`);
    });

    // Leasing order details
    console.log("\n📋 LEASING ORDER DETAILS:");
    const detailTests = [
      { name: "pickupDate", sent: updatedOrder.leasingOrderDetails.pickupDate, received: result.leasingOrderDetails?.pickupDate },
      { name: "deliveryDate", sent: updatedOrder.leasingOrderDetails.deliveryDate, received: result.leasingOrderDetails?.deliveryDate },
      { name: "leasingOrderType", sent: updatedOrder.leasingOrderDetails.leasingOrderType, received: result.leasingOrderDetails?.leasingOrderType },
    ];

    detailTests.forEach(test => {
      const passed = test.sent === test.received;
      results.push({ field: `leasingOrderDetails.${test.name}`, sent: test.sent, received: test.received, passed });
      console.log(`  ${passed ? "✅" : "❌"} ${test.name}`);
      console.log(`     Sent: ${JSON.stringify(test.sent)}`);
      console.log(`     Got:  ${JSON.stringify(test.received)}`);
    });

    // Delivery items quantity
    console.log("\n📋 DELIVERY ITEMS:");
    if (result.leasingOrderDetails?.deliveryItems?.[0]) {
      const sentQty = updatedOrder.leasingOrderDetails.deliveryItems[0].quantity;
      const receivedQty = result.leasingOrderDetails.deliveryItems[0].quantity;
      const passed = sentQty === receivedQty;
      
      results.push({ field: "deliveryItems[0].quantity", sent: sentQty, received: receivedQty, passed });
      console.log(`  ${passed ? "✅" : "❌"} quantity (first item)`);
      console.log(`     Sent: ${sentQty}`);
      console.log(`     Got:  ${receivedQty}`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60) + "\n");

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total: ${total} fields tested`);
    console.log(`✅ Updatable: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`❌ Read-only: ${failed} (${((failed/total)*100).toFixed(1)}%)`);

    console.log("\n✅ UPDATABLE FIELDS:");
    results.filter(r => r.passed).forEach(r => {
      console.log(`   • ${r.field}`);
    });

    console.log("\n❌ READ-ONLY FIELDS:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.field}`);
    });

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

testSpecificFields().catch(console.error);
