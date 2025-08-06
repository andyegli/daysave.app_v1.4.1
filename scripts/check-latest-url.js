#!/usr/bin/env node
/**
 * Latest URL Submission Checker for DaySave
 * 
 * PURPOSE:
 * Checks the most recently submitted URL content to diagnose processing issues
 * and determine if automatic AI analysis (title/tag generation) is working properly.
 * 
 * USAGE:
 * node scripts/check-latest-url.js
 * 
 * FEATURES:
 * - Shows latest URL submission details (URL, user, creation time)
 * - Displays processing status (summary, title, tags)
 * - Lists any associated processing jobs
 * - Identifies missing title/tag generation issues
 * - Provides suggested troubleshooting actions
 * 
 * OUTPUT:
 * - Content metadata and processing status
 * - Processing job history and status
 * - Issue detection and recommended fixes
 * 
 * DEPENDENCIES:
 * - Database models (Content, User, ProcessingJob)
 * - Environment configuration
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-06 (URL Processing Debug Updates)
 */

require('dotenv').config();
const { Content, User, ProcessingJob } = require('../models');

async function checkLatestUrl() {
  try {
    // Get the latest content submission
    const latestContent = await Content.findOne({
      include: [{ model: User, attributes: ['username', 'email'] }],
      order: [['createdAt', 'DESC']]
    });

    if (!latestContent) {
      console.log('❌ No content found');
      return;
    }

    console.log('🔍 Latest URL Submission:');
    console.log('   ID:', latestContent.id);
    console.log('   URL:', latestContent.url);
    console.log('   User:', latestContent.User.username);
    console.log('   Created:', latestContent.createdAt.toISOString());
    console.log('   Content Type:', latestContent.content_type);
    console.log('');
    
    console.log('📊 Processing Status:');
    console.log('   Has Summary:', !!latestContent.summary, `(${latestContent.summary?.length || 0} chars)`);
    console.log('   Has Title:', !!latestContent.generated_title);
    console.log('   Title:', latestContent.generated_title || 'None');
    console.log('   Has Tags:', !!(latestContent.auto_tags && latestContent.auto_tags.length > 0));
    console.log('   Tags:', latestContent.auto_tags || 'None');
    console.log('');

    // Check processing jobs
    const jobs = await ProcessingJob.findAll({
      where: { content_id: latestContent.id },
      order: [['createdAt', 'DESC']]
    });

    console.log('⚙️ Processing Jobs:', jobs.length);
    jobs.forEach((job, i) => {
      console.log(`   ${i+1}. ${job.job_type}: ${job.status} (${job.progress}%)`);
      if (job.completed_at) {
        console.log(`      Completed: ${job.completed_at.toISOString()}`);
      }
      if (job.error_message) {
        console.log(`      Error: ${job.error_message}`);
      }
    });

    // Check if this content needs processing
    const needsProcessing = !latestContent.generated_title || !latestContent.auto_tags || latestContent.auto_tags.length === 0;
    
    if (needsProcessing) {
      console.log('\n❌ ISSUE DETECTED: Content is missing title and/or tags');
      console.log('📝 Possible causes:');
      console.log('   1. Server not restarted after recent fixes');
      console.log('   2. Automatic AI analysis not triggering');
      console.log('   3. Error in processing pipeline');
      
      console.log('\n🔧 Suggested actions:');
      console.log('   1. Restart the server to apply recent fixes');
      console.log('   2. Or run: node scripts/reprocess-failed-url.js');
    } else {
      console.log('\n✅ Content appears to be fully processed');
    }

  } catch (error) {
    console.error('❌ Error checking latest URL:', error.message);
  }
}

if (require.main === module) {
  checkLatestUrl().then(() => process.exit(0));
}

module.exports = { checkLatestUrl };