#!/usr/bin/env node

/**
 * Cascade User Deletion Script
 * 
 * This script safely deletes a user and all their related data
 * in the correct order to avoid foreign key constraint violations.
 */

require('dotenv').config();
const { User, SocialAccount, Content, File, Contact, ContactGroup, 
        Relationship, ContactRelation, ContentGroup, ContentRelation, 
        ShareLog, LoginAttempt, ContactSubmission, AdminSetting,
        UserSubscription, Speaker, Thumbnail, OCRCaption, VideoAnalysis,
        AudioAnalysis, ImageAnalysis, ProcessingJob, AuditLog, UserDevice,
        Role, sequelize } = require('../models');

async function deleteUserCascade(userEmail, confirmDelete = false) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`🔍 Starting cascade deletion for user: ${userEmail}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Find the user
    const user = await User.findOne({ 
      where: { email: userEmail },
      include: [{ model: Role, required: false }]
    });
    
    if (!user) {
      console.log('❌ User not found');
      await transaction.rollback();
      return;
    }

    console.log(`✅ User found: ${user.username} (ID: ${user.id})`);
    console.log(`   Role: ${user.Role ? user.Role.name : 'No role'}`);
    console.log('');

    // Safety check - prevent deletion of last admin
    if (user.Role && user.Role.name === 'admin') {
      const adminCount = await User.count({
        include: [{ model: Role, where: { name: 'admin' } }]
      });
      
      if (adminCount <= 1) {
        console.log('❌ Cannot delete the last admin user');
        await transaction.rollback();
        return;
      }
    }

    if (!confirmDelete) {
      console.log('⚠️  DRY RUN MODE - No actual deletion will occur');
      console.log('   Add --confirm flag to perform actual deletion');
      console.log('');
    }

    // Delete in reverse dependency order to avoid foreign key violations
    const deletionSteps = [
      { name: 'Processing Jobs', model: ProcessingJob },
      { name: 'Image Analysis', model: ImageAnalysis },
      { name: 'Audio Analysis', model: AudioAnalysis },
      { name: 'Video Analysis', model: VideoAnalysis },
      { name: 'OCR Captions', model: OCRCaption },
      { name: 'Thumbnails', model: Thumbnail },
      { name: 'Speakers', model: Speaker },
      { name: 'User Subscriptions', model: UserSubscription },
      { name: 'Admin Settings', model: AdminSetting },
      { name: 'Contact Submissions', model: ContactSubmission },
      { name: 'Login Attempts', model: LoginAttempt },
      { name: 'Share Logs', model: ShareLog },
      { name: 'Content Relations', model: ContentRelation },
      { name: 'Content Groups', model: ContentGroup },
      { name: 'Contact Relations', model: ContactRelation },
      { name: 'Relationships', model: Relationship },
      { name: 'Contact Groups', model: ContactGroup },
      { name: 'Contacts', model: Contact },
      { name: 'Files', model: File },
      { name: 'Content', model: Content },
      { name: 'Social Accounts', model: SocialAccount },
      { name: 'User Devices', model: UserDevice },
      { name: 'Audit Logs', model: AuditLog }
    ];

    let totalDeleted = 0;

    for (const step of deletionSteps) {
      const count = await step.model.count({ where: { user_id: user.id } });
      
      if (count > 0) {
        console.log(`🗑️  Deleting ${count} ${step.name} records...`);
        
        if (confirmDelete) {
          const deleted = await step.model.destroy({ 
            where: { user_id: user.id },
            transaction 
          });
          console.log(`   ✅ Deleted ${deleted} ${step.name} records`);
          totalDeleted += deleted;
        } else {
          console.log(`   📋 Would delete ${count} ${step.name} records`);
          totalDeleted += count;
        }
      }
    }

    console.log('');
    console.log(`🗑️  Deleting user account: ${user.username}`);
    
    if (confirmDelete) {
      await user.destroy({ transaction });
      console.log('   ✅ User account deleted');
      totalDeleted += 1;
    } else {
      console.log('   📋 Would delete user account');
      totalDeleted += 1;
    }

    if (confirmDelete) {
      await transaction.commit();
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ CASCADE DELETION COMPLETED`);
      console.log(`📊 Total records deleted: ${totalDeleted}`);
      console.log(`👤 User ${userEmail} and all related data removed`);
    } else {
      await transaction.rollback();
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 DRY RUN COMPLETED`);
      console.log(`📊 Total records that would be deleted: ${totalDeleted}`);
      console.log('');
      console.log('🔧 To perform actual deletion, run:');
      console.log(`   node scripts/delete-user-cascade.js ${userEmail} --confirm`);
    }

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error during cascade deletion:', error.message);
    throw error;
  }
}

// Parse command line arguments
const userEmail = process.argv[2];
const confirmFlag = process.argv[3];

if (!userEmail) {
  console.log('Usage: node scripts/delete-user-cascade.js <user-email> [--confirm]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/delete-user-cascade.js andy.egli@itnw.co.nz          # Dry run');
  console.log('  node scripts/delete-user-cascade.js andy.egli@itnw.co.nz --confirm # Actual deletion');
  console.log('');
  console.log('⚠️  WARNING: Cascade deletion permanently removes ALL user data!');
  process.exit(1);
}

const confirmDelete = confirmFlag === '--confirm';

deleteUserCascade(userEmail, confirmDelete).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
