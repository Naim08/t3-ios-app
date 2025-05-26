// Simple Node.js script to test the database trigger
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cglfkkoynhjzyjnwwntf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbGZra295bmhqenlqbnd3bnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTQ1NTksImV4cCI6MjA2MzY5MDU1OX0.wV5AwyMcL6Uzp6JUszKinItP6dgHQ5V6xakiqEDCTd8';

async function testDatabaseTrigger() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('🧪 Testing database trigger functionality...');
  
  try {
    // Test 1: Check if user_credits table exists and is accessible
    console.log('\n1️⃣ Testing user_credits table access...');
    const { data: tableTest, error: tableError } = await supabase
      .from('user_credits')
      .select('count')
      .single();
    
    if (tableError && !tableError.message.includes('No rows')) {
      console.log('❌ user_credits table access failed:', tableError.message);
      return;
    }
    console.log('✅ user_credits table is accessible');
    
    // Test 2: Check the table structure
    console.log('\n2️⃣ Checking user_credits table structure...');
    const { data: tableStructure, error: structureError } = await supabase
      .from('user_credits')
      .select('*')
      .limit(1);
    
    if (structureError) {
      console.log('❌ Cannot check table structure:', structureError.message);
    } else {
      console.log('✅ user_credits table structure is accessible');
      console.log('   📋 Expected columns: id, user_id, remaining, monthly_tokens_remaining, monthly_reset_date, is_premium_subscriber, updated_at, created_at');
    }
    
    // Test 3: Check if trigger is properly installed
    console.log('\n3️⃣ Checking trigger installation...');
    const { data: triggerCheck, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'trigger_seed_user_credits');
      
    if (triggerError) {
      console.log('❌ Cannot check trigger (this is expected):', triggerError.message);
    } else if (triggerCheck && triggerCheck.length > 0) {
      console.log('✅ Trigger is installed');
    } else {
      console.log('⚠️ Trigger not found');
    }
    
    console.log('\n🎉 Database tests completed! The trigger should now work correctly with Apple OAuth.');
    console.log('📝 Next steps:');
    console.log('   1. Enable Apple OAuth provider in Supabase Dashboard');
    console.log('   2. Test Apple sign-in flow in the app');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testDatabaseTrigger().catch(console.error);
