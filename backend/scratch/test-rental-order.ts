/**
 * Test creating a RENTAL order instead of WASHING to see if it works
 */

const BASE_URL = process.env.BACKEND_URL || "https://api.linengrass.com";
const API_TOKEN = process.env.API_AUTH_TOKEN || "";
const COMPANY_ID = "1";
const KISSIK_CUSTOMER_ID = 106161;

async function testRentalOrder() {
  console.log("\n" + "=".repeat(80));
  console.log("TESTING RENTAL ORDER CREATION");
  console.log("=".repeat(80));
  
  const today = new Date().toISOString().split('.')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('.')[0];
  
  // Try RENTAL order type
  const rentalPayload = {
    customerId: KISSIK_CUSTOMER_ID,
    orderType: "RENTAL",
    orderDate: today,
    notes: "Test rental order",
    rentalOrderDetails: {
      deliveryDate: tomorrow,
      items: [
        {
          productId: 100202,
          quantity: 5,
          rentalDuration: 7
        }
      ]
    }
  };
  
  console.log("\n📤 Testing RENTAL order:");
  console.log(JSON.stringify(rentalPayload, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "x-company-id": COMPANY_ID
      },
      body: JSON.stringify(rentalPayload),
      // @ts-ignore
      tls: { rejectUnauthorized: false }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    if (response.ok) {
      console.log("\n✅ RENTAL order created successfully!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("\n❌ RENTAL order failed:", response.status);
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
  
  // Try LEASING order type
  console.log("\n" + "=".repeat(80));
  console.log("TESTING LEASING ORDER CREATION");
  console.log("=".repeat(80));
  
  const leasingPayload = {
    customerId: KISSIK_CUSTOMER_ID,
    orderType: "LEASING",
    orderDate: today,
    notes: "Test leasing order",
    leasingOrderDetails: {
      leasingOrderType: "BOTH",
      pickupDate: today,
      deliveryDate: tomorrow,
      pickupItems: [
        {
          productId: 100202,
          quantity: 5
        }
      ],
      deliveryItems: [
        {
          productId: 100208,
          quantity: 5
        }
      ]
    }
  };
  
  console.log("\n📤 Testing LEASING order:");
  console.log(JSON.stringify(leasingPayload, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "x-company-id": COMPANY_ID
      },
      body: JSON.stringify(leasingPayload),
      // @ts-ignore
      tls: { rejectUnauthorized: false }
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    
    if (response.ok) {
      console.log("\n✅ LEASING order created successfully!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("\n❌ LEASING order failed:", response.status);
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

testRentalOrder();
