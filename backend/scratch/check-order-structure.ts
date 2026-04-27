/**
 * Check existing orders to understand the correct structure
 */

const BASE_URL = process.env.BACKEND_URL || "https://api.linengrass.com";
const API_TOKEN = process.env.API_AUTH_TOKEN || "";
const COMPANY_ID = "1";

async function checkOrders() {
  try {
    console.log("\n📡 Fetching existing orders...");
    
    const response = await fetch(`${BASE_URL}/api/orders?page=0&size=5`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_TOKEN}`,
        "x-company-id": COMPANY_ID
      },
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
      console.log("✅ Success:", response.status);
      console.log("📥 Response:", JSON.stringify(data, null, 2));
      
      // If we have orders, show the first one's structure
      if (data.content && data.content.length > 0) {
        console.log("\n📋 First Order Structure:");
        console.log(JSON.stringify(data.content[0], null, 2));
      }
    } else {
      console.error("❌ Error:", response.status);
      console.error("📥 Response:", data);
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
  }
}

checkOrders();
