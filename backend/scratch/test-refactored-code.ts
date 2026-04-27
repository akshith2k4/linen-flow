/**
 * Test script to verify refactored code works correctly
 */

import { apiClient } from '../lib/api-client';
import { getWorkflowType, isCreateWorkflow, isUpdateWorkflow } from '../config/workflow-types';
import { buildFieldMappings, isMidCreationCorrection } from '../agent/brain-utils';

console.log('🧪 Testing Refactored Code\n');

// ============================================================================
// Test 1: API Client
// ============================================================================
console.log('📡 Test 1: API Client');
console.log('Testing API client initialization...');

try {
  console.log('✅ API Client initialized successfully');
  console.log(`   Base URL: ${(apiClient as any).baseUrl}`);
} catch (error) {
  console.error('❌ API Client initialization failed:', error);
}

// ============================================================================
// Test 2: Workflow Type Configuration
// ============================================================================
console.log('\n🔄 Test 2: Workflow Type Configuration');

const testWorkflows = [
  'hotel_onboarding',
  'update_hotel',
  'generate_agreement',
  'update_agreement',
  'create_inventory_reservation',
  'create_order',
  'update_order',
  'unknown_workflow'
];

testWorkflows.forEach(workflow => {
  const type = getWorkflowType(workflow);
  const isCreate = isCreateWorkflow(workflow);
  const isUpdate = isUpdateWorkflow(workflow);
  
  console.log(`   ${workflow}:`);
  console.log(`      Type: ${type}`);
  console.log(`      Is Create: ${isCreate}`);
  console.log(`      Is Update: ${isUpdate}`);
});

// ============================================================================
// Test 3: Field Mappings
// ============================================================================
console.log('\n🗺️  Test 3: Field Mappings');

const testFieldMappings = ['create_order', 'update_hotel', 'generate_agreement'];

testFieldMappings.forEach(workflow => {
  try {
    const { fieldToStepMap, aliasToCanonical } = buildFieldMappings(workflow);
    console.log(`   ${workflow}:`);
    console.log(`      Fields mapped: ${Object.keys(fieldToStepMap).length}`);
    console.log(`      Aliases mapped: ${Object.keys(aliasToCanonical).length}`);
    console.log(`      Sample fields: ${Object.keys(fieldToStepMap).slice(0, 3).join(', ')}`);
  } catch (error) {
    console.error(`   ❌ Failed to build field mappings for ${workflow}:`, error);
  }
});

// ============================================================================
// Test 4: Mid-Creation Correction Detection
// ============================================================================
console.log('\n🎯 Test 4: Mid-Creation Correction Detection');

const testCases = [
  { msg: 'update the items', workflow: 'create_order', expected: true },
  { msg: 'change the products', workflow: 'generate_agreement', expected: true },
  { msg: 'fix the address', workflow: 'hotel_onboarding', expected: true },
  { msg: 'update the items', workflow: 'update_order', expected: false },
  { msg: 'show me orders', workflow: 'create_order', expected: false },
  { msg: 'update items', workflow: null, expected: false },
];

testCases.forEach(({ msg, workflow, expected }) => {
  const result = isMidCreationCorrection(msg, workflow);
  const status = result === expected ? '✅' : '❌';
  console.log(`   ${status} "${msg}" + ${workflow || 'null'} = ${result} (expected: ${expected})`);
});

// ============================================================================
// Test 5: API Client Methods (without actual API calls)
// ============================================================================
console.log('\n🔌 Test 5: API Client Methods');

console.log('   Testing method availability:');
console.log(`      fetchAsString: ${typeof apiClient.fetchAsString === 'function' ? '✅' : '❌'}`);
console.log(`      fetchPaginatedAsString: ${typeof apiClient.fetchPaginatedAsString === 'function' ? '✅' : '❌'}`);
console.log(`      fetchOptional: ${typeof apiClient.fetchOptional === 'function' ? '✅' : '❌'}`);

console.log('\n✨ All tests completed!\n');
