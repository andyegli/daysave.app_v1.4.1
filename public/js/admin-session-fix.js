/**
 * Admin Session Fix - Client-Side Debug and Repair
 * 
 * This script helps diagnose and fix admin link visibility issues
 * by checking the current session state and refreshing it if needed.
 * 
 * Usage: 
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Or run: checkAdminSession() and refreshAdminSession()
 */

// Function to check current session state
async function checkAdminSession() {
  console.log('🔍 Checking admin session state...');
  
  try {
    const response = await fetch('/auth/debug-session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('📊 Session Debug Results:');
    console.log('─'.repeat(50));
    console.log('Session User:', data.data.sessionUser);
    console.log('Database User:', data.data.freshUser);
    console.log('Role Mismatch:', data.data.mismatch);
    console.log('Message:', data.message);
    
    if (data.data.mismatch) {
      console.log('⚠️  PROBLEM FOUND: Session role doesn\'t match database role!');
      console.log('💡 Solution: Run refreshAdminSession() to fix this');
    } else if (data.data.sessionUser.templateCondition) {
      console.log('✅ Admin role detected - link should be visible');
      console.log('💡 If link not showing, try hard refresh (Ctrl+F5)');
    } else {
      console.log('❌ User is not admin or role not loaded');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Session check failed:', error);
    console.log('💡 Try logging out and logging back in');
    return null;
  }
}

// Function to refresh the session with fresh role data
async function refreshAdminSession() {
  console.log('🔄 Refreshing admin session...');
  
  try {
    const response = await fetch('/auth/refresh-session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Session refresh successful!');
    console.log('📊 Updated user data:', data.user);
    
    if (data.user.adminLinkWillShow) {
      console.log('🎉 Admin link should now be visible!');
      console.log('💡 Refresh the page to see the admin link');
    } else {
      console.log('ℹ️  User is not an admin, so admin link will not show');
    }
    
    // Automatically refresh the page to show updated navigation
    setTimeout(() => {
      console.log('🔄 Refreshing page to update navigation...');
      window.location.reload();
    }, 2000);
    
    return data;
    
  } catch (error) {
    console.error('❌ Session refresh failed:', error);
    console.log('💡 Try logging out and logging back in manually');
    return null;
  }
}

// Function to run complete diagnosis and fix
async function fixAdminLinkVisibility() {
  console.log('🔧 Running complete admin link visibility fix...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Step 1: Check current state
  const sessionCheck = await checkAdminSession();
  if (!sessionCheck) return;
  
  // Step 2: Refresh if needed
  if (sessionCheck.data.mismatch || !sessionCheck.data.sessionUser.hasRole) {
    console.log('\n🔄 Session needs refresh, attempting fix...');
    await refreshAdminSession();
  } else if (sessionCheck.data.sessionUser.templateCondition) {
    console.log('\n✅ Session looks good! Try these if admin link still not showing:');
    console.log('   1. Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
    console.log('   2. Clear browser cache');
    console.log('   3. Try incognito window');
    window.location.reload();
  } else {
    console.log('\n❌ User account is not an admin');
    console.log('💡 Contact system administrator to assign admin role');
  }
}

// Auto-run if script is executed
console.log('🚀 Admin Session Fix Script Loaded');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Available functions:');
console.log('• checkAdminSession() - Check current session state');
console.log('• refreshAdminSession() - Refresh session with fresh role data');
console.log('• fixAdminLinkVisibility() - Run complete diagnosis and fix');
console.log('');
console.log('🎯 Quick fix: Run fixAdminLinkVisibility()');

// Export functions for manual use
window.checkAdminSession = checkAdminSession;
window.refreshAdminSession = refreshAdminSession;
window.fixAdminLinkVisibility = fixAdminLinkVisibility; 