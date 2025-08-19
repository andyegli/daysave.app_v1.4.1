#!/usr/bin/env node

/**
 * Check User Related Data Script
 * 
 * This script checks what related data exists for a user before deletion
 * and provides options for safe user deletion with cascade handling.
 */

require('dotenv').config();
const { User, SocialAccount, Content, File, Contact, ContactGroup, 
        Relationship, ContactRelation, ContentGroup, ContentRelation, 
        ShareLog, LoginAttempt, ContactSubmission, AdminSetting,
        UserSubscription, Speaker, Thumbnail, OCRCaption, VideoAnalysis,
        AudioAnalysis, ImageAnalysis, ProcessingJob, AuditLog, UserDevice } = require('../models');

async function checkUserRelatedData(userEmail) {
  try {
    console.log(`🔍 Checking related data for user: ${userEmail}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Find the user
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.username} (ID: ${user.id})`);
    console.log('');

    // Check all related data
    const relatedData = {
      'Social Accounts': await SocialAccount.count({ where: { user_id: user.id } }),
      'Content': await Content.count({ where: { user_id: user.id } }),
      'Files': await File.count({ where: { user_id: user.id } }),
      'Contacts': await Contact.count({ where: { user_id: user.id } }),
      'Contact Groups': await ContactGroup.count({ where: { user_id: user.id } }),
      'Relationships': await Relationship.count({ where: { user_id: user.id } }),
      'Contact Relations': await ContactRelation.count({ where: { user_id: user.id } }),
      'Content Groups': await ContentGroup.count({ where: { user_id: user.id } }),
      'Content Relations': await ContentRelation.count({ where: { user_id: user.id } }),
      'Share Logs': await ShareLog.count({ where: { user_id: user.id } }),
      'Login Attempts': await LoginAttempt.count({ where: { user_id: user.id } }),
      'Contact Submissions': await ContactSubmission.count({ where: { user_id: user.id } }),
      'Admin Settings': await AdminSetting.count({ where: { user_id: user.id } }),
      'User Subscriptions': await UserSubscription.count({ where: { user_id: user.id } }),
      'Speakers': await Speaker.count({ where: { user_id: user.id } }),
      'Thumbnails': await Thumbnail.count({ where: { user_id: user.id } }),
      'OCR Captions': await OCRCaption.count({ where: { user_id: user.id } }),
      'Video Analysis': await VideoAnalysis.count({ where: { user_id: user.id } }),
      'Audio Analysis': await AudioAnalysis.count({ where: { user_id: user.id } }),
      'Image Analysis': await ImageAnalysis.count({ where: { user_id: user.id } }),
      'Processing Jobs': await ProcessingJob.count({ where: { user_id: user.id } }),
      'Audit Logs': await AuditLog.count({ where: { user_id: user.id } }),
      'User Devices': await UserDevice.count({ where: { user_id: user.id } })
    };

    console.log('📊 Related Data Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let totalRelatedRecords = 0;
    let hasRelatedData = false;

    for (const [tableName, count] of Object.entries(relatedData)) {
      const status = count > 0 ? '🔴' : '✅';
      console.log(`${status} ${tableName}: ${count} records`);
      totalRelatedRecords += count;
      if (count > 0) hasRelatedData = true;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Total related records: ${totalRelatedRecords}`);
    console.log('');

    if (hasRelatedData) {
      console.log('⚠️  DELETION BLOCKED: User has related data');
      console.log('');
      console.log('💡 Options to resolve:');
      console.log('   1. Use cascade deletion (deletes all related data)');
      console.log('   2. Use soft deletion (marks user as deleted but keeps data)');
      console.log('   3. Transfer data to another user first');
      console.log('   4. Manually clean up related data first');
      console.log('');
      console.log('🔧 To enable cascade deletion, run:');
      console.log(`   node scripts/delete-user-cascade.js ${userEmail}`);
    } else {
      console.log('✅ SAFE TO DELETE: No related data found');
      console.log('   User can be deleted normally through admin interface');
    }

  } catch (error) {
    console.error('❌ Error checking user related data:', error.message);
  }
}

// Get email from command line argument
const userEmail = process.argv[2];
if (!userEmail) {
  console.log('Usage: node scripts/check-user-related-data.js <user-email>');
  console.log('Example: node scripts/check-user-related-data.js andy.egli@itnw.co.nz');
  process.exit(1);
}

checkUserRelatedData(userEmail).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
