#!/usr/bin/env bun

/**
 * Clear test flow: GET → PUT → GET
 * Tests if field updates actually persist
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

async function testGetPutGet() {
  console.log("🧪 Test Flow: GET → PUT → GET");
  console.log("==============================");
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;

  try {
    // ========================================
    // STEP 1: GET - Fetch original order
    // ========================================
    console.log("📥 STEP 1: GET - Fetching original order");
    console.log("=".repeat(60));
    
    const originalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Original order fetched\n");
    console.log("Original values:");
    console.log(`  orderDate: ${originalOrder.orderDate}`);
    console.log(`  orderType: ${originalOrder.orderType}`);
    console.log(`  status: ${originalOrder.status}`);
    console.log(`  notes: "${originalOrder.notes}"`);
    console.log(`  referenceNumber: ${originalOrder.referenceNumber}`);
    console.log(`  isAdjustment: ${originalOrder.isAdjustment}`);
    console.log(`  invoiced: ${originalOrder.invoiced}`);
    console.log(`  pickupDate: ${originalOrder.leasingOrderDetails?.pickupDate}`);
    console.log(`  deliveryDate: ${originalOrder.leasingOrderDetails?.deliveryDate}`);
    console.log(`  leasingOrderType: ${originalOrder.leasingOrderDetails?.leasingOrderType}`);
    console.log(`  deliveryItems[0].quantity: ${originalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity}`);

    // ========================================
    // STEP 2: PUT - Update order
    // ========================================
    console.log("\n📤 STEP 2: PUT - Updating order");
    console.log("=".repeat(60));

    const updatedOrder = {
      ...originalOrder,
      
      // Top-level fields
      orderDate: "2026-05-20T00:00:00",
      orderType: "RENTAL",
      status: "CONFIRMED",
      notes: "Updated at " + new Date().toISOString(),
      referenceNumber: "TEST-999",
      isAdjustment: true,
      invoiced: true,
      
      // Leasing order details
      leasingOrderDetails: {
        ...originalOrder.leasingOrderDetails,
        pickupDate: "2026-07-01T00:00:00",
        deliveryDate: "2026-07-10T00:00:00",
        leasingOrderType: "PICKUP",
        
        // Update quantity
        deliveryItems: originalOrder.leasingOrderDetails.deliveryItems.map((item: any, idx: number) => ({
          ...item,
          quantity: idx === 0 ? 150 : 30,
        })),
      }
    };

    console.log("Sending updates:");
    console.log(`  orderDate: ${updatedOrder.orderDate}`);
    console.log(`  orderType: ${updatedOrder.orderType}`);
    console.log(`  status: ${updatedOrder.status}`);
    console.log(`  notes: "${updatedOrder.notes}"`);
    console.log(`  referenceNumber: ${updatedOrder.referenceNumber}`);
    console.log(`  isAdjustment: ${updatedOrder.isAdjustment}`);
    console.log(`  invoiced: ${updatedOrder.invoiced}`);
    console.log(`  pickupDate: ${updatedOrder.leasingOrderDetails.pickupDate}`);
    console.log(`  deliveryDate: ${updatedOrder.leasingOrderDetails.deliveryDate}`);
    console.log(`  leasingOrderType: ${updatedOrder.leasingOrderDetails.leasingOrderType}`);
    console.log(`  deliveryItems[0].quantity: ${updatedOrder.leasingOrderDetails.deliveryItems[0].quantity}`);

    const putResponse = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(updatedOrder),
    });

    console.log("\n✅ PUT request completed");

    // ========================================
    // STEP 3: GET - Fetch updated order
    // ========================================
    console.log("\n📥 STEP 3: GET - Fetching order again to verify changes");
    console.log("=".repeat(60));

    const finalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Final order fetched\n");
    console.log("Final values:");
    console.log(`  orderDate: ${finalOrder.orderDate}`);
    console.log(`  orderType: ${finalOrder.orderType}`);
    console.log(`  status: ${finalOrder.status}`);
    console.log(`  notes: "${finalOrder.notes}"`);
    console.log(`  referenceNumber: ${finalOrder.referenceNumber}`);
    console.log(`  isAdjustment: ${finalOrder.isAdjustment}`);
    console.log(`  invoiced: ${finalOrder.invoiced}`);
    console.log(`  pickupDate: ${finalOrder.leasingOrderDetails?.pickupDate}`);
    console.log(`  deliveryDate: ${finalOrder.leasingOrderDetails?.deliveryDate}`);
    console.log(`  leasingOrderType: ${finalOrder.leasingOrderDetails?.leasingOrderType}`);
    console.log(`  deliveryItems[0].quantity: ${finalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity}`);

    // ========================================
    // COMPARISON
    // ========================================
    console.log("\n📊 COMPARISON: What Changed?");
    console.log("=".repeat(60));

    const tests = [
      { 
        field: "orderDate", 
        original: originalOrder.orderDate, 
        sent: updatedOrder.orderDate, 
        final: finalOrder.orderDate 
      },
      { 
        field: "orderType", 
        original: originalOrder.orderType, 
        sent: updatedOrder.orderType, 
        final: finalOrder.orderType 
      },
      { 
        field: "status", 
        original: originalOrder.status, 
        sent: updatedOrder.status, 
        final: finalOrder.status 
      },
      { 
        field: "notes", 
        original: originalOrder.notes, 
        sent: updatedOrder.notes, 
        final: finalOrder.notes 
      },
      { 
        field: "referenceNumber", 
        original: originalOrder.referenceNumber, 
        sent: updatedOrder.referenceNumber, 
        final: finalOrder.referenceNumber 
      },
      { 
        field: "isAdjustment", 
        original: originalOrder.isAdjustment, 
        sent: updatedOrder.isAdjustment, 
        final: finalOrder.isAdjustment 
      },
      { 
        field: "invoiced", 
        original: originalOrder.invoiced, 
        sent: updatedOrder.invoiced, 
        final: finalOrder.invoiced 
      },
      { 
        field: "pickupDate", 
        original: originalOrder.leasingOrderDetails?.pickupDate, 
        sent: updatedOrder.leasingOrderDetails.pickupDate, 
        final: finalOrder.leasingOrderDetails?.pickupDate 
      },
      { 
        field: "deliveryDate", 
        original: originalOrder.leasingOrderDetails?.deliveryDate, 
        sent: updatedOrder.leasingOrderDetails.deliveryDate, 
        final: finalOrder.leasingOrderDetails?.deliveryDate 
      },
      { 
        field: "leasingOrderType", 
        original: originalOrder.leasingOrderDetails?.leasingOrderType, 
        sent: updatedOrder.leasingOrderDetails.leasingOrderType, 
        final: finalOrder.leasingOrderDetails?.leasingOrderType 
      },
      { 
        field: "deliveryItems[0].quantity", 
        original: originalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity, 
        sent: updatedOrder.leasingOrderDetails.deliveryItems[0].quantity, 
        final: finalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity 
      },
    ];

    let updatable = 0;
    let readonly = 0;

    tests.forEach(test => {
      const changed = test.final !== test.original;
      const matchesSent = test.final === test.sent;
      const success = changed && matchesSent;
      
      if (success) updatable++;
      else readonly++;

      console.log(`\n${success ? "✅" : "❌"} ${test.field}`);
      console.log(`   Original: ${JSON.stringify(test.original)}`);
      console.log(`   Sent:     ${JSON.stringify(test.sent)}`);
      console.log(`   Final:    ${JSON.stringify(test.final)}`);
      console.log(`   Status:   ${success ? "UPDATED ✓" : "READ-ONLY ✗"}`);
    });

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(60));
    console.log(`\nTotal fields tested: ${tests.length}`);
    console.log(`✅ Updatable: ${updatable}`);
    console.log(`❌ Read-only: ${readonly}`);
    console.log(`\nSuccess rate: ${((updatable/tests.length)*100).toFixed(1)}%`);

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
  }
}

testGetPutGet().catch(console.error);
