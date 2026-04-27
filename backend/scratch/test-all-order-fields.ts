#!/usr/bin/env bun

/**
 * Comprehensive test to update ALL possible fields in order 123418
 * Based on the Edit Order modal fields
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

async function testAllOrderFields() {
  console.log("🧪 Comprehensive Test: Update ALL Fields of Order 123418");
  console.log("=========================================================");
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
    console.log("📦 Original Order Structure:");
    console.log(JSON.stringify(originalOrder, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // Create a comprehensive update payload with ALL fields modified
    const updatedOrder = {
      ...originalOrder,
      
      // Top-level fields
      orderDate: "2026-05-15T00:00:00",
      orderType: "RENTAL",
      status: "CONFIRMED",
      notes: "Comprehensive test update at " + new Date().toISOString(),
      referenceNumber: "TEST-REF-999999",
      isAdjustment: true,
      invoiced: true,
      
      // Leasing order details
      leasingOrderDetails: {
        ...originalOrder.leasingOrderDetails,
        pickupDate: "2026-06-20T00:00:00",
        deliveryDate: "2026-06-25T00:00:00",
        leasingOrderType: "PICKUP",
        
        // Delivery items with all possible fields
        deliveryItems: originalOrder.leasingOrderDetails.deliveryItems.map((item: any, idx: number) => ({
          ...item,
          productId: item.productId,
          productName: item.productName + " (UPDATED)",
          productCategory: item.productCategory,
          quantity: idx === 0 ? 100 : 25,
          actualQuantity: idx === 0 ? 95 : 20,
          rejectedQuantity: idx === 0 ? 5 : 3,
          heavySoiledQuantity: idx === 0 ? 2 : 1,
          damagedQuantity: idx === 0 ? 1 : 1,
          remarks: `Updated remarks for item ${idx + 1}`,
          rentalDuration: 30,
          unitPrice: 15.50
        })),
        
        // Pickup items with all possible fields
        pickupItems: [
          {
            productId: 100202,
            productName: "SINGLE BED SHEET",
            productCategory: "BED_LINEN",
            quantity: 50,
            actualQuantity: 48,
            rejectedQuantity: 2,
            heavySoiledQuantity: 1,
            damagedQuantity: 1,
            remarks: "Test pickup item",
            rentalDuration: 15,
            unitPrice: 12.00
          }
        ]
      }
    };

    console.log("📤 Sending comprehensive update...\n");
    
    // Send the update
    const result = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(updatedOrder),
    });

    console.log("✅ Update request completed!\n");
    console.log("📦 Updated Order Response:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // Compare all fields
    console.log("🔍 FIELD-BY-FIELD COMPARISON");
    console.log("=".repeat(60) + "\n");

    // Top-level fields
    const topLevelFields = [
      { name: "orderDate", sent: updatedOrder.orderDate, received: result.orderDate },
      { name: "orderType", sent: updatedOrder.orderType, received: result.orderType },
      { name: "status", sent: updatedOrder.status, received: result.status },
      { name: "notes", sent: updatedOrder.notes, received: result.notes },
      { name: "referenceNumber", sent: updatedOrder.referenceNumber, received: result.referenceNumber },
      { name: "isAdjustment", sent: updatedOrder.isAdjustment, received: result.isAdjustment },
      { name: "invoiced", sent: updatedOrder.invoiced, received: result.invoiced },
    ];

    console.log("📋 TOP-LEVEL FIELDS:");
    topLevelFields.forEach(field => {
      const passed = field.sent === field.received;
      results.push({ field: field.name, sent: field.sent, received: field.received, passed });
      console.log(`  ${passed ? "✅" : "❌"} ${field.name}`);
      console.log(`     Sent: ${JSON.stringify(field.sent)}`);
      console.log(`     Received: ${JSON.stringify(field.received)}`);
    });

    // Leasing order details fields
    console.log("\n📋 LEASING ORDER DETAILS:");
    const detailFields = [
      { name: "pickupDate", sent: updatedOrder.leasingOrderDetails.pickupDate, received: result.leasingOrderDetails?.pickupDate },
      { name: "deliveryDate", sent: updatedOrder.leasingOrderDetails.deliveryDate, received: result.leasingOrderDetails?.deliveryDate },
      { name: "leasingOrderType", sent: updatedOrder.leasingOrderDetails.leasingOrderType, received: result.leasingOrderDetails?.leasingOrderType },
    ];

    detailFields.forEach(field => {
      const passed = field.sent === field.received;
      results.push({ field: `leasingOrderDetails.${field.name}`, sent: field.sent, received: field.received, passed });
      console.log(`  ${passed ? "✅" : "❌"} ${field.name}`);
      console.log(`     Sent: ${JSON.stringify(field.sent)}`);
      console.log(`     Received: ${JSON.stringify(field.received)}`);
    });

    // Delivery items fields
    console.log("\n📋 DELIVERY ITEMS (First Item):");
    if (result.leasingOrderDetails?.deliveryItems?.[0]) {
      const sentItem = updatedOrder.leasingOrderDetails.deliveryItems[0];
      const receivedItem = result.leasingOrderDetails.deliveryItems[0];
      
      const itemFields = [
        { name: "quantity", sent: sentItem.quantity, received: receivedItem.quantity },
        { name: "actualQuantity", sent: sentItem.actualQuantity, received: receivedItem.actualQuantity },
        { name: "rejectedQuantity", sent: sentItem.rejectedQuantity, received: receivedItem.rejectedQuantity },
        { name: "heavySoiledQuantity", sent: sentItem.heavySoiledQuantity, received: receivedItem.heavySoiledQuantity },
        { name: "damagedQuantity", sent: sentItem.damagedQuantity, received: receivedItem.damagedQuantity },
        { name: "remarks", sent: sentItem.remarks, received: receivedItem.remarks },
        { name: "rentalDuration", sent: sentItem.rentalDuration, received: receivedItem.rentalDuration },
        { name: "unitPrice", sent: sentItem.unitPrice, received: receivedItem.unitPrice },
        { name: "productName", sent: sentItem.productName, received: receivedItem.productName },
      ];

      itemFields.forEach(field => {
        const passed = field.sent === field.received;
        results.push({ field: `deliveryItems[0].${field.name}`, sent: field.sent, received: field.received, passed });
        console.log(`  ${passed ? "✅" : "❌"} ${field.name}`);
        console.log(`     Sent: ${JSON.stringify(field.sent)}`);
        console.log(`     Received: ${JSON.stringify(field.received)}`);
      });
    }

    // Pickup items
    console.log("\n📋 PICKUP ITEMS:");
    const pickupItemsAdded = result.leasingOrderDetails?.pickupItems?.length > 0;
    results.push({ 
      field: "pickupItems (added)", 
      sent: updatedOrder.leasingOrderDetails.pickupItems.length, 
      received: result.leasingOrderDetails?.pickupItems?.length || 0, 
      passed: pickupItemsAdded 
    });
    console.log(`  ${pickupItemsAdded ? "✅" : "❌"} Pickup items added`);
    console.log(`     Sent: ${updatedOrder.leasingOrderDetails.pickupItems.length} items`);
    console.log(`     Received: ${result.leasingOrderDetails?.pickupItems?.length || 0} items`);

    // Final Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(60) + "\n");

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total Fields Tested: ${total}`);
    console.log(`✅ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);

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
      console.error("Error stack:", error.stack);
    }
  }
}

testAllOrderFields().catch(console.error);
