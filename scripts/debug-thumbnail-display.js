#!/usr/bin/env node

/**
 * Debug Thumbnail Display Issues
 * 
 * Comprehensive diagnostic tool to identify and fix thumbnail display problems
 */

const db = require('../models');
const { Content, File, Thumbnail } = db;
const path = require('path');
const fs = require('fs');
const http = require('http');

console.log('🖼️ Starting Thumbnail Display Diagnostic...\n');

async function diagnoseThumbailIssues() {
  try {
    // 1. Check database thumbnail records
    console.log('📊 Checking thumbnail database records...');
    const thumbnails = await Thumbnail.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`   Found ${thumbnails.length} thumbnail records\n`);
    
    // 2. Check file system thumbnails
    console.log('📁 Checking thumbnail files on disk...');
    const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
    
    if (!fs.existsSync(thumbnailDir)) {
      console.log('   ❌ Thumbnails directory does not exist!');
      return;
    }
    
    const files = fs.readdirSync(thumbnailDir);
    console.log(`   Found ${files.length} thumbnail files on disk\n`);
    
    // 3. Check URL generation for sample thumbnails
    console.log('🔗 Testing URL generation for sample thumbnails...');
    
    for (let i = 0; i < Math.min(5, thumbnails.length); i++) {
      const thumb = thumbnails[i];
      console.log(`   Thumbnail ${i + 1}:`);
      console.log(`     Database path: ${thumb.file_path}`);
      
      // Generate URL using same logic as routes/content.js
      let thumbnailUrl = null;
      if (thumb.file_path.startsWith('http')) {
        thumbnailUrl = thumb.file_path;
      } else if (thumb.file_path.startsWith('uploads/thumbnails/')) {
        thumbnailUrl = '/' + thumb.file_path;
      } else if (thumb.file_path.startsWith('uploads/')) {
        thumbnailUrl = '/' + thumb.file_path;
      } else {
        thumbnailUrl = thumb.file_path.startsWith('/') ? 
          thumb.file_path : 
          '/' + thumb.file_path;
      }
      
      console.log(`     Generated URL: ${thumbnailUrl}`);
      
      // Check if file exists
      const fullPath = path.join(__dirname, '..', thumb.file_path);
      const exists = fs.existsSync(fullPath);
      console.log(`     File exists: ${exists ? '✅' : '❌'}`);
      
      if (exists) {
        const stats = fs.statSync(fullPath);
        console.log(`     File size: ${Math.round(stats.size / 1024)}KB`);
      }
      
      console.log('');
    }
    
    // 4. Test HTTP accessibility
    console.log('🌐 Testing HTTP accessibility...');
    
    if (thumbnails.length > 0) {
      const sampleThumb = thumbnails[0];
      let testUrl = null;
      
      if (sampleThumb.file_path.startsWith('uploads/thumbnails/')) {
        testUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/${sampleThumb.file_path}`;
      } else {
        testUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/uploads/thumbnails/${path.basename(sampleThumb.file_path)}`;
      }
      
      console.log(`   Testing URL: ${testUrl}`);
      
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(testUrl, (res) => {
            console.log(`   HTTP Status: ${res.statusCode}`);
            console.log(`   Content-Type: ${res.headers['content-type']}`);
            console.log(`   Content-Length: ${res.headers['content-length']}`);
            resolve();
          });
          
          req.on('error', (err) => {
            console.log(`   ❌ HTTP Error: ${err.message}`);
            resolve();
          });
          
          req.setTimeout(5000, () => {
            console.log(`   ❌ HTTP Timeout`);
            resolve();
          });
        });
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Recommendations:');
    
    // Check for common issues
    if (thumbnails.length === 0) {
      console.log('   • No thumbnails found in database - run multimedia analysis');
    } else if (files.length === 0) {
      console.log('   • No thumbnail files on disk - regenerate thumbnails');
    } else if (thumbnails.length !== files.length) {
      console.log(`   • Mismatch: ${thumbnails.length} DB records vs ${files.length} files`);
      console.log('   • Run cleanup script to sync database and filesystem');
    } else {
      console.log('   • Database and filesystem counts match ✅');
      console.log('   • Issue may be with URL generation or static serving');
      console.log('   • Check browser console for JavaScript errors');
      console.log('   • Verify /uploads route is properly configured');
    }
    
    console.log('\n🔧 Quick Fix Commands:');
    console.log('   • Regenerate thumbnails: node scripts/fix-thumbnails.js');
    console.log(`   • Check static serving: curl ${process.env.BASE_URL || 'http://localhost:3000'}/uploads/thumbnails/`);
    console.log('   • Browser console: Open DevTools → Console tab');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// Run diagnostics
diagnoseThumbailIssues().then(() => {
  console.log('\n🎉 Thumbnail diagnostic completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 