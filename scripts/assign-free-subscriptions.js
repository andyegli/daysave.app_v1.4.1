/**
 * Script to assign Free subscriptions to existing users
 * Run this once to migrate existing users to the subscription system
 */

const { User, SubscriptionPlan } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const logger = require('../config/logger');

async function assignFreeSubscriptions() {
  try {
    console.log('Starting Free subscription assignment for existing users...');
    
    // Find the Free plan
    const freePlan = await SubscriptionPlan.findOne({ where: { name: 'free' } });
    if (!freePlan) {
      console.error('Free plan not found! Please run the subscription plan seeder first.');
      process.exit(1);
    }
    
    console.log(`Found Free plan: ${freePlan.display_name} (${freePlan.id})`);
    
    // Get all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users to process`);
    
    let assigned = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Check if user already has a subscription
        const existingSubscription = await subscriptionService.getUserSubscription(user.id);
        
        if (existingSubscription) {
          console.log(`User ${user.username} (${user.id}) already has subscription: ${existingSubscription.subscriptionPlan.name}`);
          skipped++;
          continue;
        }
        
        // Assign Free subscription
        await subscriptionService.createSubscription(user.id, freePlan.id, 'monthly');
        console.log(`✅ Assigned Free subscription to user ${user.username} (${user.id})`);
        assigned++;
        
      } catch (error) {
        console.error(`❌ Error assigning subscription to user ${user.username} (${user.id}):`, error.message);
        errors++;
      }
    }
    
    console.log('\n=== Assignment Complete ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Assigned: ${assigned}`);
    console.log(`Skipped (already have subscription): ${skipped}`);
    console.log(`Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('✅ All eligible users successfully assigned Free subscriptions!');
    } else {
      console.log('⚠️  Some errors occurred. Please review the output above.');
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  assignFreeSubscriptions()
    .then(() => {
      console.log('Script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { assignFreeSubscriptions }; 