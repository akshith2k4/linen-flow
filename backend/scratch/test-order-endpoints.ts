import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../agent/.env') });

const BASE_URL = process.env.EXTERNAL_API_URL || 'https://dev.api.linengrass.com';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';

// Test customer data
const TEST_CUSTOMER = {
  name: 'amangupta',
  email: 'linengras@gmail.com',
  phone: '098765a321',
  id: 100006
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function logTest(testName: string) {
  log(`\n🧪 TEST: ${testName}`, 'blue');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'x-company-id': '1',
    },
    // @ts-ignore - Bun specific option to bypass SSL verification in dev
    tls: {
      rejectUnauthorized: false
    }
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testGetOrderById(orderId: number) {
  logTest(`Get Order by ID: ${orderId}`);
  
  const result = await makeRequest(`/api/orders/${orderId}`);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    console.log('Order Data:', JSON.stringify(result.data, null, 2).substring(0, 500) + '...');
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testListOrders() {
  logTest('List All Orders (paginated)');
  
  const result = await makeRequest('/api/orders?page=0&size=5');
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    const orders = result.data.content || result.data;
    const total = result.data.totalElements || orders.length;
    console.log(`Found ${total} total orders, showing first ${orders.length}`);
    if (orders.length > 0) {
      console.log('First order:', JSON.stringify(orders[0], null, 2).substring(0, 300) + '...');
    }
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testGetOrdersByCustomer(customerId: number) {
  logTest(`Get Orders by Customer ID: ${customerId}`);
  
  const result = await makeRequest(`/api/orders/customers/${customerId}/paged?page=0&size=10`);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    const orders = result.data.content || [];
    const total = result.data.totalElements || 0;
    console.log(`Found ${total} orders for customer ${customerId}`);
    if (orders.length > 0) {
      console.log('Orders:', orders.map((o: any) => ({
        id: o.id,
        referenceNumber: o.referenceNumber,
        orderType: o.orderType,
        status: o.status,
        orderDate: o.orderDate
      })));
    } else {
      logWarning('No orders found for this customer');
    }
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testGetIncompleteOrdersByCustomer(customerId: number) {
  logTest(`Get Incomplete Orders by Customer ID: ${customerId}`);
  
  const result = await makeRequest(`/api/orders/customers/${customerId}/incomplete`);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    const orders = Array.isArray(result.data) ? result.data : [];
    console.log(`Found ${orders.length} incomplete orders`);
    if (orders.length > 0) {
      console.log('Incomplete Orders:', orders.map((o: any) => ({
        id: o.id,
        referenceNumber: o.referenceNumber,
        status: o.status
      })));
    }
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testSearchOrders(customerId: number) {
  logTest('Search Orders (Advanced)');
  
  const searchBody = {
    customerId: customerId,
    startDate: '2026-04-01T00:00:00',
    endDate: '2026-04-30T23:59:59'
  };
  
  const result = await makeRequest('/api/orders/search', 'POST', searchBody);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    const orders = Array.isArray(result.data) ? result.data : [];
    console.log(`Found ${orders.length} orders in April 2026`);
    if (orders.length > 0) {
      console.log('Search Results:', orders.slice(0, 3).map((o: any) => ({
        id: o.id,
        referenceNumber: o.referenceNumber,
        orderType: o.orderType,
        orderDate: o.orderDate
      })));
    }
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testGetPickupFulfillment(orderId: number) {
  logTest(`Get Pickup Fulfillment for Order: ${orderId}`);
  
  const result = await makeRequest(`/api/orders/${orderId}/pickup-fulfillment`);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    console.log('Fulfillment Data:', JSON.stringify(result.data, null, 2).substring(0, 400) + '...');
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function testSearchOrdersByType(orderType: string) {
  logTest(`Search Orders by Type: ${orderType}`);
  
  const searchBody = {
    orderType: orderType
  };
  
  const result = await makeRequest('/api/orders/search', 'POST', searchBody);
  
  if (result.ok) {
    logSuccess(`Status: ${result.status}`);
    const orders = Array.isArray(result.data) ? result.data : [];
    console.log(`Found ${orders.length} ${orderType} orders`);
    return result.data;
  } else {
    logError(`Status: ${result.status}`);
    console.log('Error:', result.data || result.error);
    return null;
  }
}

async function runAllTests() {
  logSection('🚀 ORDER ENDPOINTS TEST SUITE');
  
  log(`\n📋 Test Configuration:`, 'magenta');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Customer: ${TEST_CUSTOMER.name} (ID: ${TEST_CUSTOMER.id})`);
  console.log(`   Email: ${TEST_CUSTOMER.email}`);
  console.log(`   Auth Token: ${AUTH_TOKEN ? '✓ Configured' : '✗ Missing'}`);
  
  if (!AUTH_TOKEN) {
    logError('AUTH_TOKEN is not configured! Tests will likely fail.');
    return;
  }

  // Test 1: List all orders first to get some order IDs
  logSection('TEST 1: List All Orders');
  const listResult = await testListOrders();
  const sampleOrderId = listResult?.content?.[0]?.id || listResult?.[0]?.id;
  
  // Test 2: Get orders by customer
  logSection('TEST 2: Get Orders by Customer');
  const customerOrders = await testGetOrdersByCustomer(TEST_CUSTOMER.id);
  const customerOrderId = customerOrders?.content?.[0]?.id;
  
  // Test 3: Get incomplete orders
  logSection('TEST 3: Get Incomplete Orders by Customer');
  await testGetIncompleteOrdersByCustomer(TEST_CUSTOMER.id);
  
  // Test 4: Search orders with filters
  logSection('TEST 4: Search Orders (Advanced)');
  await testSearchOrders(TEST_CUSTOMER.id);
  
  // Test 5: Get specific order by ID
  if (customerOrderId || sampleOrderId) {
    logSection('TEST 5: Get Order by ID');
    const testOrderId = customerOrderId || sampleOrderId;
    await testGetOrderById(testOrderId);
    
    // Test 6: Get pickup fulfillment
    logSection('TEST 6: Get Pickup Fulfillment');
    await testGetPickupFulfillment(testOrderId);
  } else {
    logWarning('No order IDs available to test individual order endpoints');
  }
  
  // Test 7: Search by order type
  logSection('TEST 7: Search Orders by Type');
  await testSearchOrdersByType('LEASING');
  
  // Summary
  logSection('📊 TEST SUMMARY');
  log('All tests completed. Review the results above.', 'cyan');
  log('\nIf you see 404 errors for customer-specific endpoints, the customer ID might not have orders.', 'yellow');
  log('If you see 401/403 errors, check your API authentication token.', 'yellow');
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
