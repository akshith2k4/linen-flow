#!/usr/bin/env bun

/**
 * Test script for Routes API endpoint
 * 
 * IMPORTANT: Make sure API_AUTH_TOKEN in backend/.env is valid and not expired!
 * If you get 401 errors, you need to login to the API and get a fresh token.
 * 
 * Endpoint tested:
 * GET /api/trips/routes?dcId=100000 - Get routes for a specific distribution center
 */

// Disable TLS cert validation for dev API
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Load environment variables from backend/.env
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, appendFileSync } from "fs";

config({ path: resolve(__dirname, "../.env") });

// Log file setup
const LOG_FILE = resolve(__dirname, "get-routes-test-results.log");
const timestamp = new Date().toISOString();

// Clear previous log
writeFileSync(LOG_FILE, `=== Routes API Test Results ===\n`);
appendFileSync(LOG_FILE, `Test started at: ${timestamp}\n\n`);

// Dual logging function
function log(message: string) {
  console.log(message);
  appendFileSync(LOG_FILE, message + "\n");
}

async function testGetRoutes(dcId: number) {
  log(`\n=== Test: Get Routes for dcId=${dcId} ===`);
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/routes?dcId=${dcId}`;
  
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
    log("✅ Routes retrieved successfully!");
    log(JSON.stringify(data, null, 2));
    
    // Validate response structure
    log("\n=== Response Validation ===");
    
    const routes = Array.isArray(data) ? data : (data?.content || []);
    
    if (routes.length > 0) {
      log(`✓ Found ${routes.length} routes`);
      
      const firstRoute = routes[0];
      const validations = [
        { field: "id", exists: firstRoute.id !== undefined, value: firstRoute.id },
        { field: "name", exists: !!firstRoute.name, value: firstRoute.name },
        { field: "dcId", exists: firstRoute.dcId !== undefined, value: firstRoute.dcId },
        { field: "routePoints", exists: firstRoute.routePoints !== undefined, value: `Array(${firstRoute.routePoints?.length || 0})` },
        { field: "status", exists: !!firstRoute.status, value: firstRoute.status },
        { field: "description", exists: firstRoute.description !== undefined, value: firstRoute.description || "(empty)" },
      ];
      
      log("\n=== First Route Structure ===");
      validations.forEach(v => {
        const status = v.exists ? "✓" : "✗";
        log(`${status} ${v.field}: ${v.value}`);
      });
      
      // Analyze route points
      if (firstRoute.routePoints && Array.isArray(firstRoute.routePoints)) {
        log(`\n=== Route Points Analysis (Route: ${firstRoute.name}) ===`);
        log(`Total route points: ${firstRoute.routePoints.length}`);
        
        if (firstRoute.routePoints.length > 0) {
          const firstPoint = firstRoute.routePoints[0];
          log("\nFirst route point structure:");
          const pointValidations = [
            { field: "id", exists: firstPoint.id !== undefined, value: firstPoint.id },
            { field: "partyId", exists: firstPoint.partyId !== undefined, value: firstPoint.partyId },
            { field: "partyType", exists: !!firstPoint.partyType, value: firstPoint.partyType },
            { field: "partyName", exists: !!firstPoint.partyName, value: firstPoint.partyName },
            { field: "sequence", exists: firstPoint.sequence !== undefined, value: firstPoint.sequence },
            { field: "address", exists: firstPoint.address !== undefined, value: firstPoint.address || "(empty)" },
          ];
          
          pointValidations.forEach(v => {
            const status = v.exists ? "✓" : "✗";
            log(`${status} ${v.field}: ${v.value}`);
          });
          
          // Group route points by partyType
          const pointsByType = firstRoute.routePoints.reduce((acc: any, point: any) => {
            const type = point.partyType || "UNKNOWN";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {});
          
          log("\n=== Route Points by Party Type ===");
          Object.entries(pointsByType).forEach(([type, count]) => {
            log(`${type}: ${count}`);
          });
          
          // Extract customer and vendor IDs
          const customerIds = firstRoute.routePoints
            .filter((p: any) => p.partyType === "CUSTOMER")
            .map((p: any) => p.partyId);
          const vendorIds = firstRoute.routePoints
            .filter((p: any) => p.partyType === "LAUNDRY_VENDOR" || p.partyType === "VENDOR")
            .map((p: any) => p.partyId);
          
          log("\n=== Extracted IDs for Visit Requests ===");
          log(`Customer IDs: [${customerIds.join(", ")}]`);
          log(`Vendor IDs: [${vendorIds.join(", ")}]`);
        }
      } else {
        log("\n⚠️  Route has no routePoints array or it's empty");
      }
      
      // Check all routes for route points
      log("\n=== All Routes Summary ===");
      routes.forEach((route: any, index: number) => {
        const pointCount = route.routePoints?.length || 0;
        const status = pointCount > 0 ? "✓" : "✗";
        log(`${status} Route ${index + 1}: "${route.name}" (id: ${route.id}) - ${pointCount} points`);
      });
      
    } else {
      log("⚠️  No routes found for the given dcId");
    }
    
    return data;
  } catch (error: any) {
    log("\n❌ Failed to retrieve routes");
    log(`Error: ${error.message}`);
    throw error;
  }
}

async function testDifferentDcId() {
  log("\n\n=== Test: Different DC ID ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const dcId = 100001;  // Different DC
  const url = `${BASE_URL}/api/trips/routes?dcId=${dcId}`;
  
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
    
    const routes = Array.isArray(data) ? data : (data?.content || []);
    log(`✅ Retrieved ${routes.length} routes for dcId=${dcId}`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function testWithoutDcId() {
  log("\n\n=== Test: Without dcId Parameter ===");
  
  const BASE_URL = process.env.EXTERNAL_API_URL || "https://apidev.linengrass.com";
  const AUTH_TOKEN = process.env.API_AUTH_TOKEN;
  const url = `${BASE_URL}/api/trips/routes`;
  
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
    
    const routes = Array.isArray(data) ? data : (data?.content || []);
    log(`✅ Retrieved ${routes.length} routes (all DCs)`);
    
    return data;
  } catch (error: any) {
    log(`❌ Error: ${error.message}`);
    // This might fail with 400 if dcId is required
    return null;
  }
}

async function runTests() {
  log("========================================");
  log("Starting Routes API Tests");
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
    // Test 1: Get routes for dcId=100000
    const result1 = await testGetRoutes(100000);
    
    // Test 2: Different DC ID
    await testDifferentDcId();
    
    // Test 3: Without dcId parameter
    await testWithoutDcId();
    
    log("\n========================================");
    log("✅ All tests completed successfully!");
    log("========================================");
    
    const routes = Array.isArray(result1) ? result1 : (result1?.content || []);
    log(`\n📝 Summary:`);
    log(`   Total routes found (dcId=100000): ${routes.length}`);
    
    if (routes.length > 0) {
      const totalPoints = routes.reduce((sum: number, r: any) => sum + (r.routePoints?.length || 0), 0);
      log(`   Total route points across all routes: ${totalPoints}`);
      
      const routesWithPoints = routes.filter((r: any) => r.routePoints && r.routePoints.length > 0);
      log(`   Routes with route points: ${routesWithPoints.length}/${routes.length}`);
      
      if (routesWithPoints.length === 0) {
        log("\n⚠️  WARNING: No routes have route points!");
        log("   This will cause visitRequests to be empty in trip creation.");
      }
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
      log("   Check if the dcId exists or the endpoint URL is correct.");
    } else if (error.message.includes("400")) {
      log("\n💡 TIP: Bad request - check if dcId parameter is required.");
    }
    
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error).finally(() => {
  log(`\n=== Tests completed at: ${new Date().toISOString()} ===`);
  console.log(`\n📄 Full test results saved to: ${LOG_FILE}`);
});
