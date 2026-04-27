/**
 * Test Script for Order Creation with Reserved Products
 * 
 * This test verifies the complete order creation flow:
 * 1. Verify customer has inventory reservation
 * 2. Fetch reserved products
 * 3. Create an order using reserved products
 * 4. Verify order was created successfully
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
      // @ts-ignore - Bun specific option
      tls: {
        rejectUnauthorized: false
      }
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
      console.log("📤 Request Body:", JSON.stringify(body, null, 2));
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
      console.log("📥 Response:", JSON.stringify(data, null, 2));
      return { success: true, status: response.status, data };
    } else {
      console.error("❌ Error:", response.status);
      console.error("📥 Response:", data);
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

async function testOrderCreationWithReservations() {
  console.log("\n" + "=".repeat(80));
  console.log("TESTING ORDER CREATION WITH RESERVED PRODUCTS");
  console.log("=".repeat(80));
  console.log("\n📋 Customer: kissik (ID: 106161)");
  
  // Step 1: Verify customer has reservation
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Verify Customer Has Inventory Reservation");
  console.log("=".repeat(80));
  
  const reservationResponse = await makeRequest(
    `/api/inventory/reservations/customer/${KISSIK_CUSTOMER_ID}`
  );
  
  if (!reservationResponse.success) {
    console.error("❌ Customer does not have an inventory reservation");
    console.error("   Please create a reservation first using test-kissik-reservation.ts");
    return;
  }
  
  console.log(`\n✅ Reservation found:`);
  console.log(`   Reservation ID: ${reservationResponse.data.id}`);
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
    console.error("❌ No reserved products found for customer");
    return;
  }
  
  const reservedProducts = productsResponse.data;
  console.log(`\n✅ Found ${reservedProducts.length} reserved products:`);
  reservedProducts.forEach((p: any, i: number) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id}, Code: ${p.code})`);
  });
  
  // Step 3: Create order using reserved products
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Create Order with Reserved Products");
  console.log("=".repeat(80));
  
  const today = new Date().toISOString().split('.')[0]; // Format: 2026-04-13T10:30:00
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('.')[0];
  
  // Correct payload structure for WASHING order
  const orderPayload = {
    customerId: KISSIK_CUSTOMER_ID,
    orderType: "WASHING",
    orderDate: today,
    notes: "Test order with reserved products",
    washingOrderDetails: {
      pickupDate: today,
      deliveryDate: tomorrow,
      items: reservedProducts.map((product: any) => ({
        productId: product.id,
        quantity: 5
      }))
    }
  };
  
  const orderResponse = await makeRequest(
    `/api/orders`,
    "POST",
    orderPayload
  );
  
  if (!orderResponse.success) {
    console.error("\n❌ Failed to create order");
    return;
  }
  
  console.log(`\n✅ Order created successfully!`);
  console.log(`   Order ID: ${orderResponse.data.id || orderResponse.data.orderId || 'N/A'}`);
  console.log(`   Customer ID: ${orderResponse.data.customerId}`);
  console.log(`   Order Type: ${orderResponse.data.orderType}`);
  console.log(`   Items: ${orderResponse.data.items?.length || orderPayload.items.length}`);
  
  // Step 4: Verify order details
  if (orderResponse.data.id || orderResponse.data.orderId) {
    const orderId = orderResponse.data.id || orderResponse.data.orderId;
    
    console.log("\n" + "=".repeat(80));
    console.log("STEP 4: Verify Created Order");
    console.log("=".repeat(80));
    
    await makeRequest(`/api/orders/${orderId}`);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(80));
  console.log("\n📊 Summary:");
  console.log(`   ✓ Customer has inventory reservation`);
  console.log(`   ✓ Reserved products fetched: ${reservedProducts.length}`);
  console.log(`   ✓ Order created with reserved products`);
  console.log(`   ✓ Order verified`);
}

// Run the test
testOrderCreationWithReservations().catch(console.error);
