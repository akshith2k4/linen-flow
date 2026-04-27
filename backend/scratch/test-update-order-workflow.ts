#!/usr/bin/env bun

/**
 * Test the update_order workflow end-to-end
 * Tests:
 * 1. Selecting an order (Step 1)
 * 2. Updating dates & order type (Step 2)
 * 3. Updating item quantities (Step 3)
 * 4. Verifying only editable fields were updated
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fetchWithRetry } from "../agent/shared/api-utils";

const ORDER_ID = 123418;
const BASE_URL = process.env.EXTERNAL_API_URL || "https://dev.api.linengrass.com";
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

interface TestResult {
  field: string;
  original: any;
  sent: any;
  final: any;
  expected: "UPDATED" | "PRESERVED";
  actual: "UPDATED" | "PRESERVED";
  passed: boolean;
}

async function testUpdateOrderWorkflow() {
  console.log("🧪 Test: Update Order Workflow");
  console.log("=".repeat(70));
  console.log(`📋 Order ID: ${ORDER_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  const url = `${BASE_URL}/api/orders/${ORDER_ID}`;

  try {
    // ========================================
    // STEP 1: GET - Fetch original order
    // ========================================
    console.log("📥 STEP 1: Fetch Original Order");
    console.log("=".repeat(70));
    
    const originalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Original order fetched");
    console.log("\nOriginal editable fields:");
    console.log(`  pickupDate: ${originalOrder.leasingOrderDetails?.pickupDate}`);
    console.log(`  deliveryDate: ${originalOrder.leasingOrderDetails?.deliveryDate}`);
    console.log(`  leasingOrderType: ${originalOrder.leasingOrderDetails?.leasingOrderType}`);
    console.log(`  deliveryItems[0].quantity: ${originalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity}`);
    
    console.log("\nOriginal read-only fields (should NOT change):");
    console.log(`  orderDate: ${originalOrder.orderDate}`);
    console.log(`  orderType: ${originalOrder.orderType}`);
    console.log(`  status: ${originalOrder.status}`);
    console.log(`  notes: "${originalOrder.notes}"`);
    console.log(`  referenceNumber: ${originalOrder.referenceNumber}`);
    console.log(`  isAdjustment: ${originalOrder.isAdjustment}`);
    console.log(`  invoiced: ${originalOrder.invoiced}`);

    // ========================================
    // STEP 2: Simulate workflow - Update dates & order type
    // ========================================
    console.log("\n📤 STEP 2: Update Dates & Order Type (Workflow Step 2)");
    console.log("=".repeat(70));

    const newPickupDate = "2026-08-01T10:00:00";
    const newDeliveryDate = "2026-08-15T10:00:00";
    const newLeasingOrderType = "DELIVERY";

    console.log("Updating:");
    console.log(`  pickupDate: ${newPickupDate}`);
    console.log(`  deliveryDate: ${newDeliveryDate}`);
    console.log(`  leasingOrderType: ${newLeasingOrderType}`);

    // Build payload following the workflow's merge_with_current pattern
    const step2Payload = {
      customerId: originalOrder.customerId,
      orderType: originalOrder.orderType,
      orderDate: originalOrder.orderDate,
      status: originalOrder.status,
      leasingOrderDetails: {
        ...originalOrder.leasingOrderDetails,
        pickupDate: newPickupDate,
        deliveryDate: newDeliveryDate,
        leasingOrderType: newLeasingOrderType,
      }
    };

    await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(step2Payload),
    });

    console.log("✅ Step 2 update completed");

    // ========================================
    // STEP 3: Simulate workflow - Update item quantities
    // ========================================
    console.log("\n📤 STEP 3: Update Item Quantities (Workflow Step 3)");
    console.log("=".repeat(70));

    const newQuantity = 200;
    console.log(`Updating deliveryItems[0].quantity to: ${newQuantity}`);

    // Fetch current state after step 2
    const afterStep2 = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    // Build payload for step 3
    const step3Payload = {
      customerId: afterStep2.customerId,
      orderType: afterStep2.orderType,
      orderDate: afterStep2.orderDate,
      status: afterStep2.status,
      leasingOrderDetails: {
        ...afterStep2.leasingOrderDetails,
        deliveryItems: afterStep2.leasingOrderDetails.deliveryItems.map((item: any, idx: number) => ({
          ...item,
          quantity: idx === 0 ? newQuantity : item.quantity,
        })),
      }
    };

    await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify(step3Payload),
    });

    console.log("✅ Step 3 update completed");

    // ========================================
    // STEP 4: GET - Verify final state
    // ========================================
    console.log("\n📥 STEP 4: Verify Final State");
    console.log("=".repeat(70));

    const finalOrder = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
    });

    console.log("✅ Final order fetched");

    // ========================================
    // VERIFICATION
    // ========================================
    console.log("\n📊 VERIFICATION: Field-by-Field Analysis");
    console.log("=".repeat(70));

    const tests: TestResult[] = [
      // EDITABLE FIELDS - Should be updated
      { 
        field: "pickupDate", 
        original: originalOrder.leasingOrderDetails?.pickupDate, 
        sent: newPickupDate, 
        final: finalOrder.leasingOrderDetails?.pickupDate,
        expected: "UPDATED",
        actual: finalOrder.leasingOrderDetails?.pickupDate === newPickupDate ? "UPDATED" : "PRESERVED",
        passed: finalOrder.leasingOrderDetails?.pickupDate === newPickupDate
      },
      { 
        field: "deliveryDate", 
        original: originalOrder.leasingOrderDetails?.deliveryDate, 
        sent: newDeliveryDate, 
        final: finalOrder.leasingOrderDetails?.deliveryDate,
        expected: "UPDATED",
        actual: finalOrder.leasingOrderDetails?.deliveryDate === newDeliveryDate ? "UPDATED" : "PRESERVED",
        passed: finalOrder.leasingOrderDetails?.deliveryDate === newDeliveryDate
      },
      { 
        field: "leasingOrderType", 
        original: originalOrder.leasingOrderDetails?.leasingOrderType, 
        sent: newLeasingOrderType, 
        final: finalOrder.leasingOrderDetails?.leasingOrderType,
        expected: "UPDATED",
        actual: finalOrder.leasingOrderDetails?.leasingOrderType === newLeasingOrderType ? "UPDATED" : "PRESERVED",
        passed: finalOrder.leasingOrderDetails?.leasingOrderType === newLeasingOrderType
      },
      { 
        field: "deliveryItems[0].quantity", 
        original: originalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity, 
        sent: newQuantity, 
        final: finalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity,
        expected: "UPDATED",
        actual: finalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity === newQuantity ? "UPDATED" : "PRESERVED",
        passed: finalOrder.leasingOrderDetails?.deliveryItems?.[0]?.quantity === newQuantity
      },
      
      // READ-ONLY FIELDS - Should be preserved
      { 
        field: "orderDate", 
        original: originalOrder.orderDate, 
        sent: originalOrder.orderDate, 
        final: finalOrder.orderDate,
        expected: "PRESERVED",
        actual: finalOrder.orderDate === originalOrder.orderDate ? "PRESERVED" : "UPDATED",
        passed: finalOrder.orderDate === originalOrder.orderDate
      },
      { 
        field: "orderType", 
        original: originalOrder.orderType, 
        sent: originalOrder.orderType, 
        final: finalOrder.orderType,
        expected: "PRESERVED",
        actual: finalOrder.orderType === originalOrder.orderType ? "PRESERVED" : "UPDATED",
        passed: finalOrder.orderType === originalOrder.orderType
      },
      { 
        field: "status", 
        original: originalOrder.status, 
        sent: originalOrder.status, 
        final: finalOrder.status,
        expected: "PRESERVED",
        actual: finalOrder.status === originalOrder.status ? "PRESERVED" : "UPDATED",
        passed: finalOrder.status === originalOrder.status
      },
      { 
        field: "notes", 
        original: originalOrder.notes, 
        sent: originalOrder.notes, 
        final: finalOrder.notes,
        expected: "PRESERVED",
        actual: finalOrder.notes === originalOrder.notes ? "PRESERVED" : "UPDATED",
        passed: finalOrder.notes === originalOrder.notes
      },
      { 
        field: "referenceNumber", 
        original: originalOrder.referenceNumber, 
        sent: originalOrder.referenceNumber, 
        final: finalOrder.referenceNumber,
        expected: "PRESERVED",
        actual: finalOrder.referenceNumber === originalOrder.referenceNumber ? "PRESERVED" : "UPDATED",
        passed: finalOrder.referenceNumber === originalOrder.referenceNumber
      },
      { 
        field: "isAdjustment", 
        original: originalOrder.isAdjustment, 
        sent: originalOrder.isAdjustment, 
        final: finalOrder.isAdjustment,
        expected: "PRESERVED",
        actual: finalOrder.isAdjustment === originalOrder.isAdjustment ? "PRESERVED" : "UPDATED",
        passed: finalOrder.isAdjustment === originalOrder.isAdjustment
      },
      { 
        field: "invoiced", 
        original: originalOrder.invoiced, 
        sent: originalOrder.invoiced, 
        final: finalOrder.invoiced,
        expected: "PRESERVED",
        actual: finalOrder.invoiced === originalOrder.invoiced ? "PRESERVED" : "UPDATED",
        passed: finalOrder.invoiced === originalOrder.invoiced
      },
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
      const icon = test.passed ? "✅" : "❌";
      const status = test.passed ? "PASS" : "FAIL";
      
      if (test.passed) passed++;
      else failed++;

      console.log(`\n${icon} ${test.field} [${status}]`);
      console.log(`   Expected: ${test.expected}`);
      console.log(`   Actual:   ${test.actual}`);
      console.log(`   Original: ${JSON.stringify(test.original)}`);
      console.log(`   Sent:     ${JSON.stringify(test.sent)}`);
      console.log(`   Final:    ${JSON.stringify(test.final)}`);
    });

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(70));
    console.log(`\nTotal tests: ${tests.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\nSuccess rate: ${((passed/tests.length)*100).toFixed(1)}%`);
    
    console.log("\n📋 Workflow Behavior:");
    console.log(`  ✅ Editable fields (4): ${tests.slice(0, 4).every(t => t.passed) ? "ALL UPDATED" : "SOME FAILED"}`);
    console.log(`  ✅ Read-only fields (7): ${tests.slice(4).every(t => t.passed) ? "ALL PRESERVED" : "SOME FAILED"}`);
    
    if (passed === tests.length) {
      console.log("\n🎉 SUCCESS: Update order workflow is working correctly!");
      console.log("   - Only editable fields were updated");
      console.log("   - All read-only fields were preserved");
    } else {
      console.log("\n⚠️  ISSUES DETECTED: Some tests failed");
      console.log("   Review the field-by-field analysis above");
    }

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

testUpdateOrderWorkflow().catch(console.error);
