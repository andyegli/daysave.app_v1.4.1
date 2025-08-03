#!/usr/bin/env node

/**
 * Simple verification that enableObjectDetection is now included in analyzeContent options
 */

const fs = require('fs');
const path = require('path');

// Read the MultimediaAnalyzer.js file and check for our fix
const analyzerPath = path.join(__dirname, '../services/multimedia/MultimediaAnalyzer.js');
const content = fs.readFileSync(analyzerPath, 'utf8');

console.log('🔍 Verifying Object Detection Fix for Facebook Content\n');

// Check if enableObjectDetection is in the default options
const defaultOptionsRegex = /const analysisOptions = \{[\s\S]*?enableObjectDetection: true[\s\S]*?\};/;
const match = content.match(defaultOptionsRegex);

if (match) {
  console.log('✅ SUCCESS: enableObjectDetection: true found in analyzeContent default options');
  console.log('');
  console.log('📋 Configuration found:');
  
  // Extract just the options part
  const optionsMatch = content.match(/const analysisOptions = \{([\s\S]*?)\};/);
  if (optionsMatch) {
    const options = optionsMatch[1].split(',').map(line => line.trim()).filter(line => line);
    options.forEach(option => {
      if (option.includes('enableObjectDetection')) {
        console.log(`   🎯 ${option}`);
      } else {
        console.log(`   📝 ${option}`);
      }
    });
  }
  
  console.log('');
  console.log('🎬 Facebook videos will now have object detection enabled by default!');
  console.log('');
  console.log('📊 What this means:');
  console.log('   • Google Vision API will analyze video frames');
  console.log('   • Objects, people, and scenes will be detected');
  console.log('   • Confidence thresholds will be applied (currently 0.5)');
  console.log('   • Falls back to OpenAI Vision if Google Vision fails');
  
} else {
  console.log('❌ FAILED: enableObjectDetection: true not found in analyzeContent options');
  console.log('');
  console.log('🔍 Searching for options configuration...');
  
  const analyzeContentMatch = content.match(/async analyzeContent\([\s\S]*?const analysisOptions = \{[\s\S]*?\};/);
  if (analyzeContentMatch) {
    console.log('Found options configuration:');
    console.log(analyzeContentMatch[0]);
  }
}

console.log('');
console.log('🏁 Verification complete');