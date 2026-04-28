#!/usr/bin/env bun

/**
 * Test script for Soiled Inventory Quantities API endpoint
 * 
 * IMPORTANT: Make sure API_AUTH_TOKEN in backend/.env is valid and not expired!
 * If you get 401 errors, you need to login to the API and get a fresh token.
 * 
 * Endpoint tested:
 * GET /api/soiled-inventory/soiled-quantities?poolId=X&vendorId=Y&deliveryDate=YYYY-MM-DD
 * - Get soiled quantities for a specific pool, vendor, and delivery date
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Load environment variables from backend/.env
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, appendFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

// Log file setup
const LOG_FILE = resolve(__dirname, "soiled-quantities-test-results.log");
const timestamp = new Date().toISOString();

// Clear previous log
writeFileSync(LOG_FILE, `=== Soiled Inventory Quantities API Test Results ===\n`);
appendFileSync(LOG_FILE, `Test started at: ${timestamp}\n\n`);

// Dual logging function
function log(message: string) {
  console.log(message);
  appendFileSync(LOG_FILE, message + "\n");
}

async function testSoiledQuantities(poolId: number, vendorId: number, deliveryDate: string) {
  log(`\n=== Test: Get Soiled Quantities ===`);
  log(`Parameters: poolId=${poolId}, vendorId=${vendorId}, deliveryDate=${deliveryDate}`);
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/soiled-inventory/soiled-quantities?poolId=${poolId}&vendorId=${vendorId}&deliveryDate=${deliveryDate}`;
  
  log(`📍 URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      }
    });
    
    const responseText = await response.text();
    log(`\n📊 Status: ${response.status}`);
    log(`📄 Response:`);
    
    if (!response.ok) {
      log(`❌ Error Response: ${responseText}`);
      throw new Error(`API Error: ${response.status} - ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    log("✅ Soiled quantities retrieved successfully!");
    log(JSON.stringify(data, null, 2));
    
    // Validate response structure
    log("\n=== Response Validation ===");
    
    const items = Array.isArray(data) ? data : (data?.content || []);
    
    if (items.length > 0) {
      log(`✓ Found ${items.length} soiled items`);
      
      const firstItem = items[0];
      const validations = [
        { field: "productId", exists: firstItem.productId !== undefined, value: firstItem.productId },
        { field: "productName", exists: !!firstItem.productName, value: firstItem.productName },
        { field: "soiledQuantity", exists: firstItem.soiledQuantity !== undefined, value: firstItem.soiledQuantity },
        { field: "heavySoiledQuantity", exists: firstItem.heavySoiledQuantity !== undefined, value: firstItem.heavySoiledQuantity },
        { field: "poolId", exists: firstItem.poolId !== undefined, value: firstItem.poolId },
        { field: "vendorId", exists: firstItem.vendorId !== undefined, value: firstItem.vendorId },
      ];
      
      log("\n=== First Item Structure ===");
      validations.forEach(v => {
        const status = v.exists ? "✓" : "✗";
        log(`${status} ${v.field}: ${v.value}`);
      });
      
      // Calculate totals
      const totalSoiled = items.reduce((sum: number, item: any) => sum + (item.soiledQuantity || 0), 0);
      const totalHeavySoiled = items.reduce((sum: number, item: any) => sum + (item.heavySoiledQuantity || 0), 0);
      
      log("\n=== Quantity Summary ===");
      log(`Total soiled quantity: ${totalSoiled}`);
      log(`Total heavy soiled quantity: ${totalHeavySoiled}`);
      log(`Total items: ${items.length}`);
      
      // Group by product
      log("\n=== Items by Product ===");
      items.forEach((item: any, index: number) => {
        log(`${index + 1}. ${item.productName || `Product ${item.productId}`}: ${item.soiledQuantity || 0} soiled, ${item.heavySoiledQuantity || 0} heavy soiled`);
      });
      
    } else {
      log("⚠️  No soiled items found for the given criteria");
      log("   This could mean:");
      log("   - No soiled inventory exists for this pool/vendor/date combination");
      log("   - The poolId or vendorId doesn't exist");
      log("   - The deliveryDate is outside the available range");
    }
    
    return data;
  } catch (error: any) {
    log("\n❌ Failed to retrieve soiled quantities");
    log(`Error: ${error.message}`);
    throw error;
  }
}

async function testDifferentDate() {
  log("\n\n=== Test: Different Delivery Date ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  
  // Use same pool and vendor but different date
  const poolId = 103657;
  const vendorId = 100000;
  const deliveryDate = "2026-04-29"; // Tomorrow
  
  const url = `${BASE_URL}/api/soiled-inventory/soiled-quantities?poolId=${poolId}&vendorId=${vendorId}&deliveryDate=${deliveryDate}`;
  
  log(`📍 URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      }
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    
    const items = Array.isArray(data) ? data : (data?.content || []);
    log(`✅ Retrieved ${items.length} soiled items for date ${deliveryDate}`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function testDifferentVendor() {
  log("\n\n=== Test: Different Vendor ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  
  // Use same pool and date but different vendor
  const poolId = 103657;
  const vendorId = 100001; // Different vendor
  const deliveryDate = "2026-04-28";
  
  const url = `${BASE_URL}/api/soiled-inventory/soiled-quantities?poolId=${poolId}&vendorId=${vendorId}&deliveryDate=${deliveryDate}`;
  
  log(`📍 URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      }
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    
    const items = Array.isArray(data) ? data : (data?.content || []);
    log(`✅ Retrieved ${items.length} soiled items for vendor ${vendorId}`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function testMissingParameters() {
  log("\n\n=== Test: Missing Parameters ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  
  // Test without vendorId
  const poolId = 103657;
  const deliveryDate = "2026-04-28";
  
  const url = `${BASE_URL}/api/soiled-inventory/soiled-quantities?poolId=${poolId}&deliveryDate=${deliveryDate}`;
  
  log(`📍 URL: ${url} (missing vendorId)`);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      }
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    
    if (response.ok) {
      const items = Array.isArray(data) ? data : (data?.content || []);
      log(`✅ API accepted request without vendorId, returned ${items.length} items`);
    } else {
      log(`⚠️ API rejected request without vendorId (expected behavior)`);
    }
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    // This might fail with 400 if vendorId is required
    return null;
  }
}

async function runTests() {
  log("========================================");
  log("Starting Soiled Inventory Quantities Tests");
  log("========================================");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  
  log(`🌐 API URL: ${BASE_URL}`);
  log(`🔑 Token: ${AUTH_TOKEN ? AUTH_TOKEN.substring(0, 20) + "..." : "NOT SET"}`);
  
  if (!AUTH_TOKEN) {
    log("\n❌ API_AUTH_TOKEN is not set in backend/.env");
    log("Please add a valid token to continue.");
    process.exit(1);
  }

  try {
    // Test 1: Get soiled quantities with known pool and vendor
    const poolId = 103657; // From test-inventory-reservations.ts
    const vendorId = 100000; // Rose laundry (from routes test)
    const deliveryDate = "2026-04-28"; // Today
    
    const result1 = await testSoiledQuantities(poolId, vendorId, deliveryDate);
    
    // Test 2: Different delivery date
    await testDifferentDate();
    
    // Test 3: Different vendor
    await testDifferentVendor();
    
    // Test 4: Missing parameters
    await testMissingParameters();
    
    log("\n========================================");
    log("✅ All tests completed successfully!");
    log("========================================");
    
    const items = Array.isArray(result1) ? result1 : (result1?.content || []);
    log(`\n📝 Summary:`);
    log(`   Total soiled items found (Test 1): ${items.length}`);
    
    if (items.length > 0) {
      const totalSoiled = items.reduce((sum: number, item: any) => sum + (item.soiledQuantity || 0), 0);
      const totalHeavySoiled = items.reduce((sum: number, item: any) => sum + (item.heavySoiledQuantity || 0), 0);
      log(`   Total soiled quantity: ${totalSoiled}`);
      log(`   Total heavy soiled quantity: ${totalHeavySoiled}`);
    } else {
      log("\n⚠️  No soiled items found in Test 1");
      log("   This is expected if there's no soiled inventory for the test parameters");
    }

  } catch (error: any) {
    log("\n========================================");
    log("❌ Tests failed");
    log("========================================");
    
    if (error.message.includes("401")) {
      log("\n💡 TIP: Your API token has expired.");
      log("   Please login to the API and update API_AUTH_TOKEN in backend/.env");
    } else if (error.message.includes("404")) {
      log("\n💡 TIP: The endpoint or resource was not found.");
      log("   Check if the poolId, vendorId exist or the endpoint URL is correct.");
    } else if (error.message.includes("400")) {
      log("\n💡 TIP: Bad request - check if all required parameters are provided.");
      log("   Required: poolId, vendorId, deliveryDate");
    }
    
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error).finally(() => {
  log(`\n=== Tests completed at: ${new Date().toISOString()} ===`);
  console.log(`\n📄 Full test results saved to: ${LOG_FILE}`);
});
