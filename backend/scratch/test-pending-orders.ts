// Test script for pending orders API
import https from 'https';

const BASE_URL = 'https://dev.api.linengrass.com/api';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';

// Create an agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testPendingOrdersAPI() {
  const customerId = 106161;
  
  console.log('╔════════════════════════════════════════╗');
  console.log('║  PENDING ORDERS API TEST                ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Test 1: Get incomplete orders by customer (this should work)
  console.log(`\n🔍 Test 1: Get incomplete orders for customer ${customerId}...`);
  try {
    const url1 = `${BASE_URL}/orders/customers/${customerId}/incomplete`;
    
    const response1 = await fetch(url1, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'x-company-id': '1',
      },
      // @ts-ignore - Node.js fetch supports agent
      agent: httpsAgent
    });
    
    console.log(`📊 Status: ${response1.status} ${response1.statusText}`);
    
    if (!response1.ok) {
      const errorText = await response1.text();
      console.log(`❌ Error response: ${errorText}`);
    } else {
      const data = await response1.json();
      console.log(`✅ Success! Found ${data.length} incomplete orders`);
      console.log('Sample data:', JSON.stringify(data.slice(0, 2), null, 2));
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
  
  // Test 2: Search orders advanced with PENDING status
  console.log(`\n🔍 Test 2: Search orders advanced with PENDING status...`);
  try {
    const url2 = `${BASE_URL}/orders/search`;
    const body = {
      customerId: customerId,
      status: "PENDING"
    };
    
    const response2 = await fetch(url2, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'x-company-id': '1',
      },
      body: JSON.stringify(body),
      // @ts-ignore - Node.js fetch supports agent
      agent: httpsAgent
    });
    
    console.log(`📊 Status: ${response2.status} ${response2.statusText}`);
    
    if (!response2.ok) {
      const errorText = await response2.text();
      console.log(`❌ Error response: ${errorText}`);
    } else {
      const data = await response2.json();
      console.log(`✅ Success! Found ${data.length} pending orders`);
      console.log('Sample data:', JSON.stringify(data.slice(0, 2), null, 2));
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
  
  // Test 3: Get all orders by customer and filter PENDING
  console.log(`\n🔍 Test 3: Get all orders by customer (paginated)...`);
  try {
    const url3 = `${BASE_URL}/orders/customers/${customerId}/paged?page=0&size=50`;
    
    const response3 = await fetch(url3, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'x-company-id': '1',
      },
      // @ts-ignore - Node.js fetch supports agent
      agent: httpsAgent
    });
    
    console.log(`📊 Status: ${response3.status} ${response3.statusText}`);
    
    if (!response3.ok) {
      const errorText = await response3.text();
      console.log(`❌ Error response: ${errorText}`);
    } else {
      const data = await response3.json();
      const allOrders = data.content || [];
      const pendingOrders = allOrders.filter((order: any) => order.status === 'PENDING');
      
      console.log(`✅ Success! Found ${allOrders.length} total orders, ${pendingOrders.length} pending`);
      console.log('Pending orders sample:', JSON.stringify(pendingOrders.slice(0, 2), null, 2));
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

// Set environment variable to ignore SSL errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

testPendingOrdersAPI().catch(console.error);