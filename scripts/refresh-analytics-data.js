#!/usr/bin/env node

/**
 * Refresh Analytics Dashboard Data
 * 
 * This script ensures fresh data is available for the fingerprinting analytics
 * dashboard by generating new mock data and clearing any caches.
 * 
 * Usage: node scripts/refresh-analytics-data.js [options]
 * 
 * Options:
 *   --quick       Generate 100 records (default: 500)
 *   --full        Generate 1000 records  
 *   --clean-old   Remove data older than 7 days
 *   --force-fresh Remove ALL existing data
 */

const { EnhancedMockDataGenerator } = require('./enhanced-fingerprint-mock-data');
const { checkDataStatus } = require('./check-fingerprint-data');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  count: 500,
  cleanOld: false,
  forceFresh: false
};

args.forEach(arg => {
  if (arg === '--quick') {
    options.count = 100;
  } else if (arg === '--full') {
    options.count = 1000;
  } else if (arg === '--clean-old') {
    options.cleanOld = true;
  } else if (arg === '--force-fresh') {
    options.forceFresh = true;
  }
});

/**
 * Main refresh function
 */
async function refreshAnalyticsData() {
  console.log('🔄 Refreshing Analytics Dashboard Data');
  console.log('=====================================\n');

  try {
    // Step 1: Check current data status
    console.log('📊 Step 1: Checking current data status...');
    await checkDataStatus();
    console.log('');

    // Step 2: Generate fresh mock data
    console.log('🎯 Step 2: Generating fresh mock data...');
    const generator = new EnhancedMockDataGenerator();
    await generator.initialize();
    
    if (options.cleanOld || options.forceFresh) {
      await generator.cleanupOldData();
    }
    
    // Override the options for the generator
    process.argv = [
      'node', 
      'enhanced-fingerprint-mock-data.js',
      `--count=${options.count}`,
      ...(options.cleanOld ? ['--clean-old'] : []),
      ...(options.forceFresh ? ['--force-fresh'] : [])
    ];
    
    await generator.generate();
    console.log('');

    // Step 3: Verify fresh data
    console.log('✅ Step 3: Verifying fresh data...');
    await checkDataStatus();
    console.log('');

    // Step 4: Provide dashboard access info
    console.log('🌐 Step 4: Dashboard Access Information');
    console.log('=====================================');
    console.log('📈 Analytics Dashboard: http://localhost:3000/admin/fingerprinting-analytics');
    console.log('🔍 Device Management: http://localhost:3000/admin/device-fingerprinting');
    console.log('');
    console.log('💡 The dashboard will automatically refresh every 5 minutes,');
    console.log('   or you can manually refresh the page to see the new data.');
    console.log('');

    // Step 5: Cache clearing recommendations
    console.log('🧹 Step 5: Cache Clearing Recommendations');
    console.log('========================================');
    console.log('To ensure the freshest data display:');
    console.log('1. 🔄 Refresh your browser page (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. 🧹 Clear browser cache if needed');
    console.log('3. 📊 The analytics auto-refresh every 5 minutes');
    console.log('');

    console.log('✅ Analytics data refresh completed successfully!');
    console.log('🎉 Fresh data is now available in the dashboard.');

  } catch (error) {
    console.error('❌ Error refreshing analytics data:', error);
    process.exit(1);
  }
}

// Run the refresh
if (require.main === module) {
  refreshAnalyticsData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Refresh failed:', error);
      process.exit(1);
    });
}

module.exports = { refreshAnalyticsData };
