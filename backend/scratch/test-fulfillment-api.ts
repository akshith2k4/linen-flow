// Test script for pickup fulfillment API
import https from 'https';

const BASE_URL = 'https://dev.api.linengrass.com/api';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';

// Create an agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testFulfillmentAPI(orderId: number) {
  try {
    console.log(`\n🔍 Testing fulfillment for order ${orderId}...`);
    
    const url = `${BASE_URL}/orders/${orderId}/pickup-fulfillment`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'x-company-id': '1',
      },
      // @ts-ignore - Node.js fetch supports agent
      agent: httpsAgent
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ Success! Fulfillment data:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`❌ Error:`, error);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  PICKUP FULFILLMENT API TEST           ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Test with order 122880 (the one that worked in the logs)
  const orderIds = [
    122880,  // Known to have fulfillment data
    123109,  // Known to NOT have fulfillment data (from earlier test)
    122878,  // Another order from amangupta
  ];
  
  for (const orderId of orderIds) {
    await testFulfillmentAPI(orderId);
    console.log('\n' + '─'.repeat(50));
  }
}

// Set environment variable to ignore SSL errors
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

main().catch(console.error);
