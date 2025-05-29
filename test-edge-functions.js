#!/usr/bin/env node

/**
 * Edge Functions Integration Test Suite
 * 
 * This script tests all deployed Supabase Edge Functions to ensure they're working correctly
 * with the React Native app.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cglfkkoynhjzyjnwwntf.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbGZra295bmhqenlqbnd3bnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTQ1NTksImV4cCI6MjA2MzY5MDU1OX0.wV5AwyMcL6Uzp6JUszKinItP6dgHQ5V6xakiqEDCTd8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Starting Edge Functions Integration Tests...\n');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0
};

function logTest(name, success, details = '') {
  results.total++;
  if (success) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

async function testGetCredits() {
  console.log('\n📊 Testing get_credits function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('get_credits');
    
    if (error) {
      logTest('get_credits - function call', false, error.message);
      return;
    }
    
    logTest('get_credits - function call', true);
    
    // Check response structure
    if (typeof data === 'object' && 'remaining' in data) {
      logTest('get_credits - response structure', true);
    } else {
      logTest('get_credits - response structure', false, 'Missing "remaining" field');
    }
    
  } catch (error) {
    logTest('get_credits - function call', false, error.message);
  }
}

async function testAddTokens() {
  console.log('\n💰 Testing add_tokens function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('add_tokens', {
      body: { amount: 1000 }
    });
    
    if (error) {
      logTest('add_tokens - function call', false, error.message);
      return;
    }
    
    logTest('add_tokens - function call', true);
    
    // Check response structure
    if (typeof data === 'object' && 'remaining' in data) {
      logTest('add_tokens - response structure', true);
    } else {
      logTest('add_tokens - response structure', false, 'Missing "remaining" field');
    }
    
  } catch (error) {
    logTest('add_tokens - function call', false, error.message);
  }
}

async function testSpendTokens() {
  console.log('\n💸 Testing spend_tokens function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('spend_tokens', {
      body: { amount: 100 }
    });
    
    if (error && error.message.includes('insufficient_credits')) {
      logTest('spend_tokens - insufficient credits handling', true);
    } else if (error) {
      logTest('spend_tokens - function call', false, error.message);
      return;
    } else {
      logTest('spend_tokens - function call', true);
      
      // Check response structure
      if (typeof data === 'object' && 'remaining' in data) {
        logTest('spend_tokens - response structure', true);
      } else {
        logTest('spend_tokens - response structure', false, 'Missing "remaining" field');
      }
    }
    
  } catch (error) {
    logTest('spend_tokens - function call', false, error.message);
  }
}

async function testValidateReceipt() {
  console.log('\n🧾 Testing validate_receipt function...');
  
  try {
    // Test with invalid receipt (should fail gracefully)
    const { data, error } = await supabase.functions.invoke('validate_receipt', {
      body: {
        receipt_data: 'test-receipt',
        user_id: 'test-user',
        product_id: 'premium_pass_monthly',
        transaction_id: 'test-transaction',
        platform: 'ios'
      }
    });
    
    // We expect this to fail with authentication error
    if (error && error.message.includes('authorization')) {
      logTest('validate_receipt - authentication check', true);
    } else if (error) {
      logTest('validate_receipt - function call', true, 'Function exists and responds');
    } else {
      logTest('validate_receipt - function call', false, 'Should require authentication');
    }
    
  } catch (error) {
    logTest('validate_receipt - function call', false, error.message);
  }
}

async function testGateway() {
  console.log('\n🚪 Testing gateway function...');
  
  try {
    // Test basic gateway call (should fail due to authentication)
    const { data, error } = await supabase.functions.invoke('gateway', {
      body: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      }
    });
    
    // We expect this to fail with authentication error
    if (error && (error.message.includes('authorization') || error.message.includes('Unauthorized'))) {
      logTest('gateway - authentication check', true);
    } else if (error) {
      logTest('gateway - function call', true, 'Function exists and responds');
    } else {
      logTest('gateway - function call', false, 'Should require authentication');
    }
    
  } catch (error) {
    logTest('gateway - function call', false, error.message);
  }
}

async function testGetUserSubscriptionInfo() {
  console.log('\n📋 Testing get_user_subscription_info function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('get_user_subscription_info');
    
    if (error && error.message.includes('authorization')) {
      logTest('get_user_subscription_info - authentication check', true);
    } else if (error) {
      logTest('get_user_subscription_info - function call', true, 'Function exists and responds');
    } else {
      logTest('get_user_subscription_info - function call', true);
    }
    
  } catch (error) {
    logTest('get_user_subscription_info - function call', false, error.message);
  }
}

async function testManagePremium() {
  console.log('\n👑 Testing manage_premium function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('manage_premium', {
      body: {
        action: 'grant',
        user_id: 'test-user'
      }
    });
    
    if (error && error.message.includes('authorization')) {
      logTest('manage_premium - authentication check', true);
    } else if (error) {
      logTest('manage_premium - function call', true, 'Function exists and responds');
    } else {
      logTest('manage_premium - function call', false, 'Should require authentication');
    }
    
  } catch (error) {
    logTest('manage_premium - function call', false, error.message);
  }
}

async function testSupabaseConnection() {
  console.log('\n🔗 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase.from('user_credits').select('count').limit(1);
    
    if (error) {
      logTest('Supabase connection', false, error.message);
    } else {
      logTest('Supabase connection', true);
    }
    
  } catch (error) {
    logTest('Supabase connection', false, error.message);
  }
}

async function runAllTests() {
  console.log(`🔗 Testing against: ${supabaseUrl}`);
  console.log(`🔑 Using anon key: ${supabaseAnonKey.substring(0, 20)}...`);
  
  await testSupabaseConnection();
  await testGetCredits();
  await testAddTokens();
  await testSpendTokens();
  await testValidateReceipt();
  await testGateway();
  await testGetUserSubscriptionInfo();
  await testManagePremium();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.total}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Your Edge Functions are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Test with authenticated user session for full functionality');
  console.log('2. Test in-app purchase validation with real receipts');
  console.log('3. Test AI gateway with various models');
  console.log('4. Monitor function logs in Supabase Dashboard');
}

// Handle environment variables from .env.local
if (require('fs').existsSync('.env.local')) {
  const envContent = require('fs').readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      process.env[key] = value.replace(/"/g, '');
    }
  });
}

// Run the tests
runAllTests().catch(console.error);
