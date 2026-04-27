/**
 * Complete End-to-End Test for Order Creation with Reserved Products
 * 
 * This test verifies:
 * 1. Customer has inventory reservation
 * 2. Reserved products are fetched correctly
 * 3. RENTAL order can be created with reserved products
 * 4. LEASING order can be created with reserved products
 */

const BASE_URL = process.env.BACKEND_URL || "https://api.linengrass.com";
const API_TOKEN = process.env.API_AUTH_TOKEN || "";
const COMPANY_ID = "1";

const KISSIK_CUSTOMER_ID = 106161;

interface ApiResponse {
  success: boolean;
  status: number;
  data?: any;
  error?: string;
}

async function makeRequest(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<ApiResponse> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n📡 ${method} ${url}`);
    
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "x-company-id": COMPANY_ID
      },
      // @ts-ignore
      tls: { rejectUnauthorized: false }
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (response.ok) {
      console.log("✅ Success:", response.status);
      return { success: true, status: response.status, data };
    } else {
      console.error("❌ Error:", response.status);
      console.error("Response:", JSON.stringify(data, null, 2));
      return { success: false, status: response.status, error: data };
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
    return { 
      success: false, 
      status: 0, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function runCompleteTest() {
  console.log("\n" + "=".repeat(80));
  console.log("COMPLETE END-TO-END TEST: ORDER CREATION WITH RESERVED PRODUCTS");
  console.log("=".repeat(80));
  console.log(`\n📋 Testing with Customer: kissik (ID: ${KISSIK_CUSTOMER_ID})`);
  
  // Step 1: Verify inventory reservation exists
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Verify Inventory Reservation");
  console.log("=".repeat(80));
  
  const reservationResponse = await makeRequest(
    `/api/inventory/reservations/customer/${KISSIK_CUSTOMER_ID}`
  );
  
  if (!reservationResponse.success) {
    console.error("\n❌ TEST FAILED: No inventory reservation found");
    return;
  }
  
  console.log(`\n✅ Reservation ID: ${reservationResponse.data.id}`);
  console.log(`   Pool ID: ${reservationResponse.data.poolId}`);
  console.log(`   Items: ${reservationResponse.data.items?.length || 0}`);
  
  // Step 2: Fetch reserved products
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: Fetch Reserved Products");
  console.log("=".repeat(80));
  
  const productsResponse = await makeRequest(
    `/api/inventory/customers/${KISSIK_CUSTOMER_ID}/reserved-products`
  );
  
  if (!productsResponse.success || !productsResponse.data || productsResponse.data.length === 0) {
    console.error("\n❌ TEST FAILED: No reserved products found");
    return;
  }
  
  const reservedProducts = productsResponse.data;
  console.log(`\n✅ Found ${reservedProducts.length} reserved products:`);
  reservedProducts.forEach((p: any, i: number) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id})`);
  });
  
  // Step 3: Create RENTAL order
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Create RENTAL Order with Reserved Products");
  console.log("=".repeat(80));
  
  const today = new Date().toISOString().split('.')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('.')[0];
  
  const rentalPayload = {
    customerId: KISSIK_CUSTOMER_ID,
    orderType: "RENTAL",
    orderDate: today,
    notes: "E2E test - RENTAL order with reserved products",
    rentalOrderDetails: {
      deliveryDate: tomorrow,
      items: reservedProducts.map((p: any) => ({
        productId: p.id,
        quantity: 3,
        rentalDuration: 7
      }))
    }
  };
  
  const rentalOrderResponse = await makeRequest(
    `/api/orders`,
    "POST",
    rentalPayload
  );
  
  if (!rentalOrderResponse.success) {
    console.error("\n❌ TEST FAILED: Could not create RENTAL order");
    return;
  }
  
  console.log(`\n✅ RENTAL Order Created:`);
  console.log(`   Order ID: ${rentalOrderResponse.data.id}`);
  console.log(`   Reference: ${rentalOrderResponse.data.referenceNumber}`);
  console.log(`   Status: ${rentalOrderResponse.data.status}`);
  console.log(`   Items: ${rentalOrderResponse.data.rentalOrderDetails?.items?.length || 0}`);
  
  // Step 4: Create LEASING order
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: Create LEASING Order with Reserved Products");
  console.log("=".repeat(80));
  
  const leasingPayload = {
    customerId: KISSIK_CUSTOMER_ID,
    orderType: "LEASING",
    orderDate: today,
    notes: "E2E test - LEASING order with reserved products",
    leasingOrderDetails: {
      leasingOrderType: "BOTH",
      pickupDate: today,
      deliveryDate: tomorrow,
      pickupItems: [
        {
          productId: reservedProducts[0].id,
          quantity: 2
        }
      ],
      deliveryItems: reservedProducts.map((p: any) => ({
        productId: p.id,
        quantity: 2
      }))
    }
  };
  
  const leasingOrderResponse = await makeRequest(
    `/api/orders`,
    "POST",
    leasingPayload
  );
  
  if (!leasingOrderResponse.success) {
    console.error("\n❌ TEST FAILED: Could not create LEASING order");
    return;
  }
  
  console.log(`\n✅ LEASING Order Created:`);
  console.log(`   Order ID: ${leasingOrderResponse.data.id}`);
  console.log(`   Reference: ${leasingOrderResponse.data.referenceNumber}`);
  console.log(`   Status: ${leasingOrderResponse.data.status}`);
  console.log(`   Pickup Items: ${leasingOrderResponse.data.leasingOrderDetails?.pickupItems?.length || 0}`);
  console.log(`   Delivery Items: ${leasingOrderResponse.data.leasingOrderDetails?.deliveryItems?.length || 0}`);
  
  // Final Summary
  console.log("\n" + "=".repeat(80));
  console.log("✅ ALL TESTS PASSED!");
  console.log("=".repeat(80));
  console.log("\n📊 Test Summary:");
  console.log(`   ✓ Inventory reservation verified (ID: ${reservationResponse.data.id})`);
  console.log(`   ✓ Reserved products fetched: ${reservedProducts.length} products`);
  console.log(`   ✓ RENTAL order created (ID: ${rentalOrderResponse.data.id})`);
  console.log(`   ✓ LEASING order created (ID: ${leasingOrderResponse.data.id})`);
  console.log("\n🎉 Order creation workflow with reserved products is fully functional!");
}

runCompleteTest().catch(console.error);
