#!/usr/bin/env bun

/**
 * Test script for Scheduled Tasks by Date API endpoint
 * 
 * IMPORTANT: Make sure API_AUTH_TOKEN in backend/.env is valid and not expired!
 * If you get 401 errors, you need to login to the API and get a fresh token.
 * 
 * Endpoint tested:
 * POST /api/trips/scheduled-tasks/by-date - Get scheduled tasks for specific customers/vendors on a date
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Load environment variables from backend/.env
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, appendFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

// Log file setup
const LOG_FILE = resolve(__dirname, "scheduled-tasks-by-date-test-results.log");
const timestamp = new Date().toISOString();

// Clear previous log
writeFileSync(LOG_FILE, `=== Scheduled Tasks by Date API Test Results ===\n`);
appendFileSync(LOG_FILE, `Test started at: ${timestamp}\n\n`);

// Dual logging function
function log(message: string) {
  console.log(message);
  appendFileSync(LOG_FILE, message + "\n");
}

async function testScheduledTasksByDate() {
  log("\n=== Test: Get Scheduled Tasks by Date ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/scheduled-tasks/by-date`;
  
  log(`📍 URL: ${url}`);
  
  // Payload based on the request you provided
  const requestBody = {
    customerIds: [106963],
    vendorIds: [],
    date: "2026-04-26",
    dcId: 100000
  };
  
  log(`📦 Request Body:`);
  log(JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    log(`\n📊 Status: ${response.status}`);
    log(`📄 Response:`);
    
    if (!response.ok) {
      log(`❌ Error Response: ${responseText}`);
      throw new Error(`API Error: ${response.status} - ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    log("✅ Scheduled tasks retrieved successfully!");
    log(JSON.stringify(data, null, 2));
    
    // Validate response structure
    log("\n=== Response Validation ===");
    
    if (Array.isArray(data)) {
      log(`✓ Response is an array with ${data.length} scheduled tasks`);
      
      if (data.length > 0) {
        const firstTask = data[0];
        const validations = [
          { field: "id", exists: firstTask.id !== undefined, value: firstTask.id },
          { field: "customerId", exists: firstTask.customerId !== undefined, value: firstTask.customerId },
          { field: "customerName", exists: !!firstTask.customerName, value: firstTask.customerName },
          { field: "scheduledDate", exists: !!firstTask.scheduledDate, value: firstTask.scheduledDate },
          { field: "taskType", exists: !!firstTask.taskType, value: firstTask.taskType },
          { field: "status", exists: !!firstTask.status, value: firstTask.status },
          { field: "dcId", exists: firstTask.dcId !== undefined, value: firstTask.dcId },
        ];
        
        log("\nFirst task structure:");
        validations.forEach(v => {
          const status = v.exists ? "✓" : "✗";
          log(`${status} ${v.field}: ${v.value}`);
        });
        
        // Group tasks by type
        const tasksByType = data.reduce((acc: any, task: any) => {
          const type = task.taskType || "UNKNOWN";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});
        
        log("\n=== Tasks by Type ===");
        Object.entries(tasksByType).forEach(([type, count]) => {
          log(`${type}: ${count}`);
        });
        
        // Group tasks by status
        const tasksByStatus = data.reduce((acc: any, task: any) => {
          const status = task.status || "UNKNOWN";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        
        log("\n=== Tasks by Status ===");
        Object.entries(tasksByStatus).forEach(([status, count]) => {
          log(`${status}: ${count}`);
        });
      } else {
        log("⚠️  No scheduled tasks found for the given criteria");
      }
    } else {
      log("⚠️  Response is not an array");
      log(`Response type: ${typeof data}`);
    }
    
    return data;
  } catch (error: any) {
    log("\n❌ Failed to retrieve scheduled tasks");
    log(`Error: ${error.message}`);
    throw error;
  }
}

async function testWithMultipleCustomers() {
  log("\n\n=== Test: Multiple Customers ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/scheduled-tasks/by-date`;
  
  const requestBody = {
    customerIds: [106963, 106964, 106965],
    vendorIds: [],
    date: "2026-04-26",
    dcId: 100000
  };
  
  log(`📦 Request Body:`);
  log(JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    log(`✅ Retrieved ${Array.isArray(data) ? data.length : 0} scheduled tasks`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function testWithVendors() {
  log("\n\n=== Test: With Vendors ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/scheduled-tasks/by-date`;
  
  const requestBody = {
    customerIds: [106963],
    vendorIds: [1, 2],  // Add actual vendor IDs if known
    date: "2026-04-26",
    dcId: 100000
  };
  
  log(`📦 Request Body:`);
  log(JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    log(`✅ Retrieved ${Array.isArray(data) ? data.length : 0} scheduled tasks`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function testDifferentDate() {
  log("\n\n=== Test: Different Date ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/scheduled-tasks/by-date`;
  
  const requestBody = {
    customerIds: [106963],
    vendorIds: [],
    date: "2026-04-27",  // Next day
    dcId: 100000
  };
  
  log(`📦 Request Body:`);
  log(JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "x-company-id": "1",
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    log(`\n📊 Status: ${response.status}`);
    log(`✅ Retrieved ${Array.isArray(data) ? data.length : 0} scheduled tasks`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function runTests() {
  log("========================================");
  log("Starting Scheduled Tasks by Date Tests");
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
    // Test 1: Single customer
    const result1 = await testScheduledTasksByDate();
    
    // Test 2: Multiple customers
    await testWithMultipleCustomers();
    
    // Test 3: With vendors
    await testWithVendors();
    
    // Test 4: Different date
    await testDifferentDate();
    
    log("\n========================================");
    log("✅ All tests completed successfully!");
    log("========================================");
    log("\n📝 Summary:");
    log(`   Total tasks found (Test 1): ${Array.isArray(result1) ? result1.length : 0}`);

  } catch (error: any) {
    log("\n========================================");
    log("❌ Tests failed");
    log("========================================");
    
    if (error.message.includes("401")) {
      log("\n💡 TIP: Your API token has expired.");
      log("   Please login to the API and update API_AUTH_TOKEN in backend/.env");
    } else if (error.message.includes("404")) {
      log("\n💡 TIP: The endpoint or resource was not found.");
      log("   Check if the customer IDs, vendor IDs, or dcId exist.");
    } else if (error.message.includes("400")) {
      log("\n💡 TIP: Bad request - check the payload structure.");
    }
    
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error).finally(() => {
  log(`\n=== Tests completed at: ${new Date().toISOString()} ===`);
  console.log(`\n📄 Full test results saved to: ${LOG_FILE}`);
});
