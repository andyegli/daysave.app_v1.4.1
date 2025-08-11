#!/usr/bin/env node
/**
 * Simple URL Test
 * 
 * Tests URL processing with a simple YouTube video to verify our fix
 */

require('dotenv').config();
const { Content, User } = require('../models');

async function testSimpleUrl() {
  try {
    console.log('🔄 Testing URL processing with our AI generation fix...');
    
    // Find a test user
    const user = await User.findOne();
    if (!user) {
      console.log('❌ No user found for testing');
      return;
    }
    
    console.log(`👤 Using test user: ${user.username}`);
    
    // Create a simple test content item
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Simple test video
    
    const content = await Content.create({
      user_id: user.id,
      url: testUrl,
      content_type: 'video',
      metadata: { source: 'test' }
    });
    
    console.log(`✅ Created test content: ${content.id}`);
    console.log(`   URL: ${testUrl}`);
    
    // Import the triggerMultimediaAnalysis function
    const { triggerMultimediaAnalysis } = require('../routes/content');
    
    console.log('\n🎬 Triggering multimedia analysis...');
    
    // Trigger analysis
    await triggerMultimediaAnalysis(content, user);
    
    console.log('⏱️  Waiting for processing to complete...');
    
    // Wait a bit and check results
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    
    // Check the updated content
    const updatedContent = await Content.findByPk(content.id);
    
    console.log('\n📊 Results:');
    console.log('   Generated Title:', updatedContent.generated_title || 'None');
    console.log('   Summary Length:', updatedContent.summary?.length || 0);
    console.log('   Summary Preview:', updatedContent.summary?.substring(0, 100) + '...' || 'None');
    console.log('   Auto Tags:', updatedContent.auto_tags || 'None');
    
    // Check if our fix worked
    const titleWorking = updatedContent.generated_title && 
                        !updatedContent.generated_title.startsWith('Kind: captions') &&
                        updatedContent.generated_title.length > 20;
    
    const summaryWorking = updatedContent.summary && 
                          !updatedContent.summary.startsWith('Kind: captions') &&
                          updatedContent.summary.length > 300;
    
    console.log('\n🔍 Fix Validation:');
    console.log('   AI Title Generation:', titleWorking ? '✅ Working' : '❌ Still broken');
    console.log('   AI Summary Generation:', summaryWorking ? '✅ Working' : '❌ Still broken');
    
    // Clean up test data
    await content.destroy();
    console.log('\n🧹 Test content cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

if (require.main === module) {
  testSimpleUrl().catch(console.error);
}

module.exports = { testSimpleUrl };
