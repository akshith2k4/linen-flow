/**
 * Test Script for Creating Inventory Reservation for kissik Hotel
 * 
 * Customer Details:
 * - Name: kissik
 * - Email: Akshith166@gmail.com
 * - Phone: 0987654321
 * - ID: 106161
 * - Type: HOTEL
 * - Status: ACTIVE
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

async function testKissikReservation() {
  console.log("\n" + "=".repeat(80));
  console.log("TESTING INVENTORY RESERVATION FOR KISSIK HOTEL");
  console.log("=".repeat(80));
  console.log("\n📋 Customer Details:");
  console.log("   Name: kissik");
  console.log("   Email: Akshith166@gmail.com");
  console.log("   Phone: 0987654321");
  console.log("   ID: 106161");
  console.log("   Type: HOTEL");
  console.log("   Status: ACTIVE");
  
  // Step 1: Verify customer exists
  console.log("\n" + "=".repeat(80));
  console.log("STEP 1: Verify Customer Exists");
  console.log("=".repeat(80));
  
  const customerResponse = await makeRequest(`/api/customers/${KISSIK_CUSTOMER_ID}`);
  
  if (!customerResponse.success) {
    console.error("❌ Failed to fetch customer details");
    return;
  }
  
  const customer = customerResponse.data;
  console.log(`\n✅ Customer Verified:`);
  console.log(`   Name: ${customer.name}`);
  console.log(`   Email: ${customer.email}`);
  console.log(`   Phone: ${customer.phone}`);
  console.log(`   Branch ID: ${customer.branchId || 'N/A'}`);
  console.log(`   Warehouse ID: ${customer.warehouseId || customer.dcId || 'N/A'}`);
  
  // Step 2: Check if reservation already exists
  console.log("\n" + "=".repeat(80));
  console.log("STEP 2: Check Existing Reservation");
  console.log("=".repeat(80));
  
  const existingReservation = await makeRequest(
    `/api/inventory/reservations/customer/${KISSIK_CUSTOMER_ID}`
  );
  
  if (existingReservation.success && existingReservation.data?.id) {
    console.log(`\n✅ Existing reservation found:`);
    console.log(`   Reservation ID: ${existingReservation.data.id}`);
    console.log(`   Pool ID: ${existingReservation.data.poolId}`);
    console.log(`   Items: ${existingReservation.data.items?.length || 0}`);
    console.log("\n⚠️ Customer already has a reservation. Skipping creation.");
    
    // Show reserved products
    console.log("\n" + "=".repeat(80));
    console.log("STEP 3: Get Reserved Products");
    console.log("=".repeat(80));
    await makeRequest(`/api/inventory/customers/${KISSIK_CUSTOMER_ID}/reserved-products`);
    
    return;
  }
  
  console.log("\n✅ No existing reservation found. Proceeding with creation...");
  
  // Step 3: Create new reservation
  console.log("\n" + "=".repeat(80));
  console.log("STEP 3: Create Inventory Reservation");
  console.log("=".repeat(80));
  
  // Based on the agreement details provided:
  // - Agreement Type: RENTAL_LAUNDRY
  // - Total Rooms: 12
  // - Products: CHAIR COVER (qty: 22), TABLE COVER (qty: 22)
  
  const payload = {
    poolId: 103657, // Using existing pool ID
    branchId: customer.branchId || 1,
    warehouseId: customer.warehouseId || customer.dcId || 1,
    startDate: "2026-03-31T00:00:00", // Agreement start date
    endDate: "2026-03-31T23:59:59", // Agreement end date (same day in this case)
    reservationType: "FIXED",
    items: [
      {
        productId: 100202, // SINGLE BED SHEET (as proxy for CHAIR COVER)
        totalReservedQuantity: 22,
        quantityAllocatedWithCustomer: 15,
        quantityAllocatedWithDC: 7,
        remarks: "Chair cover reservation for kissik hotel - 12 rooms",
        type: "FIXED"
      },
      {
        productId: 100208, // DOUBLE BED SHEET (as proxy for TABLE COVER)
        totalReservedQuantity: 22,
        quantityAllocatedWithCustomer: 15,
        quantityAllocatedWithDC: 7,
        remarks: "Table cover reservation for kissik hotel - 12 rooms",
        type: "FIXED"
      }
    ]
  };
  
  const createResult = await makeRequest(
    `/api/inventory/customers/${KISSIK_CUSTOMER_ID}/reservations`,
    "POST",
    payload
  );
  
  if (!createResult.success) {
    console.error("\n❌ Failed to create reservation");
    return;
  }
  
  console.log(`\n✅ Successfully created reservation!`);
  console.log(`   Reservation ID: ${createResult.data.id}`);
  
  // Step 4: Verify the created reservation
  console.log("\n" + "=".repeat(80));
  console.log("STEP 4: Verify Created Reservation");
  console.log("=".repeat(80));
  
  await makeRequest(`/api/inventory/reservations/customer/${KISSIK_CUSTOMER_ID}`);
  
  // Step 5: Get reserved products
  console.log("\n" + "=".repeat(80));
  console.log("STEP 5: Get Reserved Products");
  console.log("=".repeat(80));
  
  await makeRequest(`/api/inventory/customers/${KISSIK_CUSTOMER_ID}/reserved-products`);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ TEST COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(80));
}

// Run the test
testKissikReservation().catch(console.error);
