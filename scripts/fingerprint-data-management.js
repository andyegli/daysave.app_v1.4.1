#!/usr/bin/env node

/**
 * Device Fingerprinting Data Management Suite
 * 
 * This is a comprehensive script that provides all the tools needed
 * to manage device fingerprinting mock data and ensure fresh analytics.
 * 
 * Usage: node scripts/fingerprint-data-management.js <command> [options]
 * 
 * Commands:
 *   check          Check current data status
 *   generate       Generate fresh mock data
 *   fix-duplicates Remove duplicate fingerprints
 *   refresh        Full refresh (check + generate + verify)
 *   clean          Clean old data
 * 
 * Options:
 *   --count=N      Number of records to generate (default: 500)
 *   --clean-old    Remove data older than 7 days
 *   --force-fresh  Remove ALL existing data
 *   --dry-run      Show what would be done without making changes
 *   --force        Skip confirmation prompts
 */

const { checkDataStatus } = require('./check-fingerprint-data');
const { EnhancedMockDataGenerator } = require('./enhanced-fingerprint-mock-data');
const { fixDuplicateFingerprints } = require('./fix-duplicate-fingerprints');
const { refreshAnalyticsData } = require('./refresh-analytics-data');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = {
  count: 500,
  cleanOld: false,
  forceFresh: false,
  dryRun: false,
  force: false
};

args.slice(1).forEach(arg => {
  if (arg.startsWith('--count=')) {
    options.count = parseInt(arg.split('=')[1]) || 500;
  } else if (arg === '--clean-old') {
    options.cleanOld = true;
  } else if (arg === '--force-fresh') {
    options.forceFresh = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--force') {
    options.force = true;
  }
});

/**
 * Display help information
 */
function showHelp() {
  console.log('🔧 Device Fingerprinting Data Management Suite');
  console.log('==============================================\n');
  
  console.log('📋 Available Commands:');
  console.log('  check          - Check current data status and duplicates');
  console.log('  generate       - Generate fresh mock data');
  console.log('  fix-duplicates - Remove duplicate fingerprints');
  console.log('  refresh        - Full refresh (recommended for analytics)');
  console.log('  clean          - Clean old data only');
  console.log('  help           - Show this help message\n');
  
  console.log('⚙️  Available Options:');
  console.log('  --count=N      - Number of records to generate (default: 500)');
  console.log('  --clean-old    - Remove data older than 7 days before generating');
  console.log('  --force-fresh  - Remove ALL existing data before generating');
  console.log('  --dry-run      - Show what would be done without making changes');
  console.log('  --force        - Skip confirmation prompts\n');
  
  console.log('💡 Examples:');
  console.log('  node scripts/fingerprint-data-management.js check');
  console.log('  node scripts/fingerprint-data-management.js generate --count=100');
  console.log('  node scripts/fingerprint-data-management.js refresh --clean-old');
  console.log('  node scripts/fingerprint-data-management.js fix-duplicates --dry-run\n');
  
  console.log('🌐 Dashboard URLs:');
  console.log('  Analytics: http://localhost:3000/admin/fingerprinting-analytics');
  console.log('  Management: http://localhost:3000/admin/device-fingerprinting');
}

/**
 * Generate fresh mock data
 */
async function generateData() {
  console.log('🎯 Generating Fresh Mock Data');
  console.log('=============================\n');
  
  const generator = new EnhancedMockDataGenerator();
  await generator.initialize();
  
  if (options.cleanOld || options.forceFresh) {
    await generator.cleanupOldData();
  }
  
  // Set up the process.argv for the generator
  process.argv = [
    'node', 
    'enhanced-fingerprint-mock-data.js',
    `--count=${options.count}`,
    ...(options.cleanOld ? ['--clean-old'] : []),
    ...(options.forceFresh ? ['--force-fresh'] : []),
    ...(options.dryRun ? ['--dry-run'] : [])
  ];
  
  await generator.generate();
}

/**
 * Clean old data only
 */
async function cleanData() {
  console.log('🧹 Cleaning Old Data');
  console.log('===================\n');
  
  const generator = new EnhancedMockDataGenerator();
  await generator.initialize();
  
  // Force clean-old option
  options.cleanOld = true;
  await generator.cleanupOldData();
  
  console.log('✅ Data cleanup completed!');
}

/**
 * Full refresh workflow
 */
async function fullRefresh() {
  console.log('🔄 Full Analytics Data Refresh');
  console.log('==============================\n');
  
  // Override refresh options
  const refreshOptions = {
    count: options.count,
    cleanOld: options.cleanOld,
    forceFresh: options.forceFresh
  };
  
  // Set up process.argv for refresh script
  process.argv = [
    'node',
    'refresh-analytics-data.js',
    ...(options.count !== 500 ? [`--count=${options.count}`] : []),
    ...(options.cleanOld ? ['--clean-old'] : []),
    ...(options.forceFresh ? ['--force-fresh'] : [])
  ];
  
  await refreshAnalyticsData();
}

/**
 * Main execution function
 */
async function main() {
  if (!command || command === 'help') {
    showHelp();
    return;
  }

  console.log('🚀 Device Fingerprinting Data Management');
  console.log('========================================');
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  console.log(`📋 Command: ${command}`);
  console.log(`⚙️  Options: ${JSON.stringify(options, null, 2)}\n`);

  try {
    switch (command) {
      case 'check':
        await checkDataStatus();
        break;
        
      case 'generate':
        await generateData();
        break;
        
      case 'fix-duplicates':
        // Set up process.argv for fix-duplicates script
        process.argv = [
          'node',
          'fix-duplicate-fingerprints.js',
          ...(options.dryRun ? ['--dry-run'] : []),
          ...(options.force ? ['--force'] : [])
        ];
        await fixDuplicateFingerprints();
        break;
        
      case 'refresh':
        await fullRefresh();
        break;
        
      case 'clean':
        await cleanData();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('\nUse "help" to see available commands.');
        process.exit(1);
    }

    console.log('\n✅ Operation completed successfully!');
    
    if (!options.dryRun && ['generate', 'refresh'].includes(command)) {
      console.log('\n🌐 Fresh data is now available in the analytics dashboard:');
      console.log('   📈 http://localhost:3000/admin/fingerprinting-analytics');
      console.log('   🔍 http://localhost:3000/admin/device-fingerprinting');
      console.log('\n💡 Tip: Refresh your browser (Ctrl+F5) to see the latest data.');
    }

  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run the management suite
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Management suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  checkDataStatus,
  generateData,
  fixDuplicateFingerprints,
  refreshAnalyticsData,
  cleanData,
  fullRefresh
};
