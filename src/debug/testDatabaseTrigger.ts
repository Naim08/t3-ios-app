/**
 * Debug script to test database trigger and identify Apple OAuth database error
 * Run this to diagnose the "Database error saving new user" issue
 */

import { supabase } from '../lib/supabase';

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
}

export const testDatabaseTrigger = async (): Promise<TestResult[]> => {
  const results: TestResult[] = [];
  
  console.log('🔍 Starting database trigger diagnostics...');
  
  // Test 1: Check if user_credits table exists and has correct structure
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .limit(1);
    
    results.push({
      test: 'user_credits table accessibility',
      success: !error,
      error: error?.message,
      data: data?.length !== undefined ? `Table exists with ${data.length} records` : 'No data'
    });
  } catch (error: any) {
    results.push({
      test: 'user_credits table accessibility',
      success: false,
      error: error.message
    });
  }
  
  // Test 2: Check if trigger function exists
  try {
    const { data, error } = await supabase.rpc('seed_user_credits', {});
    
    results.push({
      test: 'seed_user_credits function exists',
      success: !error || !error.message.includes('function does not exist'),
      error: error?.message,
      data: 'Function is callable'
    });
  } catch (error: any) {
    results.push({
      test: 'seed_user_credits function exists',
      success: false,
      error: error.message
    });
  }
  
  // Test 3: Check RLS policies on user_credits
  try {
    // This will test if we can insert into user_credits manually
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Fake UUID for testing
    
    const { data, error } = await supabase
      .from('user_credits')
      .insert({ user_id: testUserId, remaining: 1000 })
      .select();
    
    if (!error) {
      // Clean up test data
      await supabase
        .from('user_credits')
        .delete()
        .eq('user_id', testUserId);
    }
    
    results.push({
      test: 'user_credits insert permissions',
      success: !error,
      error: error?.message,
      data: 'Insert/delete test completed'
    });
  } catch (error: any) {
    results.push({
      test: 'user_credits insert permissions',
      success: false,
      error: error.message
    });
  }
  
  // Test 4: Test the add_user_tokens function directly
  try {
    const { data, error } = await supabase.rpc('add_user_tokens', {
      user_uuid: '00000000-0000-0000-0000-000000000000',
      amount: 150000
    });
    
    results.push({
      test: 'add_user_tokens function',
      success: !error,
      error: error?.message,
      data: data ? JSON.stringify(data) : 'No return data'
    });
  } catch (error: any) {
    results.push({
      test: 'add_user_tokens function',
      success: false,
      error: error.message
    });
  }
  
  // Test 5: Check if we can access auth schema (this might be the issue)
  try {
    const { data, error } = await supabase.auth.getUser();
    
    results.push({
      test: 'auth schema accessibility',
      success: !error,
      error: error?.message,
      data: data?.user ? 'User found' : 'No current user'
    });
  } catch (error: any) {
    results.push({
      test: 'auth schema accessibility',
      success: false,
      error: error.message
    });
  }
  
  return results;
};

export const runDatabaseDiagnostics = async () => {
  console.log('🏃‍♂️ Running database diagnostics...');
  
  const results = await testDatabaseTrigger();
  
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log('========================');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.test}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.data) {
      console.log(`   Data: ${result.data}`);
    }
    
    console.log('');
  });
  
  // Summary and recommendations
  const failedTests = results.filter(r => !r.success);
  
  if (failedTests.length === 0) {
    console.log('🎉 All tests passed! The trigger should be working correctly.');
    console.log('💡 The issue might be in the OAuth flow itself or a timing issue.');
  } else {
    console.log(`⚠️  ${failedTests.length} test(s) failed. Issues found:`);
    failedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.error}`);
    });
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    
    failedTests.forEach(test => {
      if (test.test.includes('user_credits table')) {
        console.log('   - Run: npx supabase db push to ensure migrations are applied');
      }
      if (test.test.includes('function')) {
        console.log('   - Check if database functions were properly created');
      }
      if (test.test.includes('permissions')) {
        console.log('   - Review RLS policies and function permissions');
      }
      if (test.test.includes('auth schema')) {
        console.log('   - Check Supabase project configuration and API keys');
      }
    });
  }
  
  return results;
};
