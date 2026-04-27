/**
 * Test Script for Inventory Reservation APIs
 * 
 * This script tests the following endpoints:
 * 1. GET /api/inventory/reservations/customer/{customerId} - Get customer reservation
 * 2. POST /api/inventory/customers/{customerId}/reservations - Create reservation
 * 3. PUT /api/inventory/customer-reservations/{reservationId} - Update reservation
 * 4. GET /api/inventory/customers/{customerId}/reserved-products - Get reserved products
 */

const BASE_URL = process.env.BACKEND_URL || "https://api.linengrass.com";
const API_TOKEN = process.env.API_AUTH_TOKEN || "";
const COMPANY_ID = "1";

// Test customer IDs
const TEST_CUSTOMER_ID = 100006; // amanagupta
const TEST_CUSTOMER_ID_2 = 106161; // kissik

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
      // @ts-ignore - Bun specific option to bypass SSL verification for testing
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

async function testGetCustomerReservation(customerId: number) {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 1: Get Customer Reservation");
  console.log("=".repeat(80));
  
  return await makeRequest(`/api/inventory/reservations/customer/${customerId}`);
}

async function testGetReservedProducts(customerId: number) {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 2: Get Reserved Products for Customer");
  console.log("=".repeat(80));
  
  return await makeRequest(`/api/inventory/customers/${customerId}/reserved-products`);
}

async function testCreateReservation(customerId: number) {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 3: Create Customer Inventory Reservation");
  console.log("=".repeat(80));
  
  // First, let's get customer details to get branchId and warehouseId
  console.log(`\n📋 Fetching customer details for ID: ${customerId}...`);
  const customerResponse = await makeRequest(`/api/customers/${customerId}`);
  
  if (!customerResponse.success) {
    console.error("❌ Failed to fetch customer details");
    return customerResponse;
  }
  
  const customer = customerResponse.data;
  console.log(`✅ Customer: ${customer.name}`);
  console.log(`   Branch ID: ${customer.branchId || 'N/A'}`);
  console.log(`   Warehouse ID: ${customer.warehouseId || customer.dcId || 'N/A'}`);
  
  const payload = {
    poolId: 103657, // Using existing pool ID from previous test
    branchId: customer.branchId || 1,
    warehouseId: customer.warehouseId || customer.dcId || 1,
    startDate: "2026-04-13T00:00:00",
    endDate: "2026-12-31T23:59:59",
    reservationType: "FIXED",
    items: [
      {
        productId: 100202, // SINGLE BED SHEET
        totalReservedQuantity: 20,
        quantityAllocatedWithCustomer: 15,
        quantityAllocatedWithDC: 5,
        remarks: "Initial reservation for kissik hotel",
        type: "FIXED"
      },
      {
        productId: 100208, // DOUBLE BED SHEET
        totalReservedQuantity: 15,
        quantityAllocatedWithCustomer: 10,
        quantityAllocatedWithDC: 5,
        remarks: "Initial reservation for kissik hotel",
        type: "FIXED"
      }
    ]
  };
  
  return await makeRequest(
    `/api/inventory/customers/${customerId}/reservations`,
    "POST",
    payload
  );
}

async function testUpdateReservation(reservationId: number, existingData: any) {
  console.log("\n" + "=".repeat(80));
  console.log("TEST 4: Update Customer Inventory Reservation");
  console.log("=".repeat(80));
  
  // Use existing data structure but update quantities
  const payload = {
    poolId: existingData.poolId,
    branchId: 1, // Keep existing or use default
    warehouseId: 1, // Keep existing or use default
    startDate: existingData.startDate,
    endDate: existingData.endDate,
    reservationType: existingData.reservationType,
    items: existingData.items.map((item: any) => ({
      productId: item.productId,
      totalReservedQuantity: item.totalReservedQuantity + 5, // Increase by 5
      quantityAllocatedWithCustomer: item.quantityAllocatedWithCustomer + 3,
      quantityAllocatedWithDC: item.quantityAllocatedWithDC + 2,
      notes: "Updated via API test",
      type: item.type || "FIXED",
      inventoryItemIds: item.inventoryItemIds || []
    }))
  };
  
  return await makeRequest(
    `/api/inventory/customer-reservations/${reservationId}`,
    "PUT",
    payload
  );
}

async function runAllTests() {
  console.log("\n🚀 Starting Inventory Reservation API Tests");
  console.log("Base URL:", BASE_URL);
  console.log("Test Customer 1 (amangupta):", TEST_CUSTOMER_ID);
  console.log("Test Customer 2 (kissik):", TEST_CUSTOMER_ID_2);
  
  // ========== TEST WITH CUSTOMER 1 (amangupta - has existing reservation) ==========
  console.log("\n" + "=".repeat(80));
  console.log("TESTING WITH CUSTOMER 1: amangupta (ID: 100006)");
  console.log("=".repeat(80));
  
  // Test 1: Get existing reservation
  const getResult = await testGetCustomerReservation(TEST_CUSTOMER_ID);
  
  // Test 2: Get reserved products
  await testGetReservedProducts(TEST_CUSTOMER_ID);
  
  // Test 4: Update reservation (if exists)
  if (getResult.success && getResult.data?.id) {
    await testUpdateReservation(getResult.data.id, getResult.data);
  }
  
  // ========== TEST WITH CUSTOMER 2 (kissik - create new reservation) ==========
  console.log("\n" + "=".repeat(80));
  console.log("TESTING WITH CUSTOMER 2: kissik (ID: 106161)");
  console.log("=".repeat(80));
  
  // Check if kissik already has a reservation
  const kissikGetResult = await testGetCustomerReservation(TEST_CUSTOMER_ID_2);
  
  if (!kissikGetResult.success || kissikGetResult.status === 500) {
    console.log("\n✅ No existing reservation found for kissik. Creating new one...");
    const createResult = await testCreateReservation(TEST_CUSTOMER_ID_2);
    
    if (createResult.success && createResult.data?.id) {
      console.log(`\n✅ Successfully created reservation ID: ${createResult.data.id}`);
      
      // Verify the created reservation
      console.log("\n📋 Verifying created reservation...");
      await testGetCustomerReservation(TEST_CUSTOMER_ID_2);
      
      // Check reserved products
      await testGetReservedProducts(TEST_CUSTOMER_ID_2);
    }
  } else {
    console.log(`\n✅ kissik already has reservation ID: ${kissikGetResult.data?.id}`);
    await testGetReservedProducts(TEST_CUSTOMER_ID_2);
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ All tests completed!");
  console.log("=".repeat(80));
}

// Run tests
runAllTests().catch(console.error);
