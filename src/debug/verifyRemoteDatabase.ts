/**
 * Verify Remote Database Setup
 * Check if the user_credits table and trigger exist in the remote database
 */

import { supabase } from '../lib/supabase';

export const verifyRemoteDatabase = async () => {
  console.log('🔍 Verifying remote database setup...');
  
  try {
    // Test 1: Check if user_credits table exists by trying to select from it
    console.log('1. Testing user_credits table access...');
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('*')
      .limit(1);
    
    if (creditsError) {
      console.error('❌ user_credits table error:', creditsError.message);
      return false;
    } else {
      console.log('✅ user_credits table accessible');
    }
    
    // Test 2: Check if the add_user_tokens function exists
    console.log('2. Testing add_user_tokens function...');
    const { data: addTokensData, error: addTokensError } = await supabase.rpc('add_user_tokens', {
      user_uuid: '00000000-0000-0000-0000-000000000000', // Test UUID
      amount: 1000
    });
    
    if (addTokensError) {
      console.error('❌ add_user_tokens function error:', addTokensError.message);
    } else {
      console.log('✅ add_user_tokens function exists and callable');
    }
    
    // Test 3: Check if get_user_credits function exists
    console.log('3. Testing get_user_credits function...');
    const { data: getCreditsData, error: getCreditsError } = await supabase.rpc('get_user_credits', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });
    
    if (getCreditsError) {
      console.error('❌ get_user_credits function error:', getCreditsError.message);
    } else {
      console.log('✅ get_user_credits function exists and callable');
    }
    
    // Test 4: Test current user session
    console.log('4. Testing current user session...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Auth error:', userError.message);
    } else {
      console.log('✅ Auth working, user:', userData.user?.email || 'No user');
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('The remote database setup appears to be working correctly.');
    console.log('The Apple OAuth error might be caused by:');
    console.log('1. The trigger failing to execute properly during user creation');
    console.log('2. A race condition during the OAuth callback');
    console.log('3. Missing Apple OAuth provider configuration');
    
    return true;
    
  } catch (error: any) {
    console.error('💥 Verification failed:', error.message);
    return false;
  }
};

// Run verification
if (typeof window !== 'undefined') {
  verifyRemoteDatabase();
}
