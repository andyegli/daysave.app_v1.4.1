#!/usr/bin/env node

/**
 * Debug DOCX Text Extraction
 * 
 * Test what content is actually being extracted from DOCX files
 */

const mammoth = require('mammoth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function debugDocxExtraction() {
  console.log('🔍 Debugging DOCX text extraction...\n');
  
  try {
    // Test with the sample DOCX file
    const testUrl = 'https://www.filesampleshub.com/download/document/docx/sample3.docx';
    console.log(`📥 Downloading test DOCX: ${testUrl}`);
    
    // Download the file
    const response = await axios({
      method: 'GET',
      url: testUrl,
      responseType: 'arraybuffer'
    });
    
    const tempFile = path.join(__dirname, '../temp/debug_sample.docx');
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFile);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(tempFile, response.data);
    console.log(`✅ Downloaded to: ${tempFile}`);
    console.log(`📖 File size: ${response.data.length} bytes\n`);
    
    // Test different mammoth extraction methods
    console.log('🔧 Testing mammoth.extractRawText():');
    try {
      const rawResult = await mammoth.extractRawText({ path: tempFile });
      console.log(`📝 Raw text length: ${rawResult.value.length} chars`);
      console.log(`📝 Raw text content:\n"${rawResult.value}"`);
      console.log(`⚠️  Messages: ${JSON.stringify(rawResult.messages, null, 2)}\n`);
    } catch (error) {
      console.error(`❌ Raw text extraction failed:`, error.message);
    }
    
    console.log('🔧 Testing mammoth.convertToHtml():');
    try {
      const htmlResult = await mammoth.convertToHtml({ path: tempFile });
      console.log(`📝 HTML length: ${htmlResult.value.length} chars`);
      console.log(`📝 HTML content:\n"${htmlResult.value}"`);
      console.log(`⚠️  Messages: ${JSON.stringify(htmlResult.messages, null, 2)}\n`);
      
      // Extract text from HTML
      const textFromHtml = htmlResult.value.replace(/<[^>]*>/g, '').trim();
      console.log(`📝 Text from HTML: ${textFromHtml.length} chars`);
      console.log(`📝 Clean text content:\n"${textFromHtml}"\n`);
    } catch (error) {
      console.error(`❌ HTML conversion failed:`, error.message);
    }
    
    console.log('🔧 Testing with buffer instead of file path:');
    try {
      const fileBuffer = fs.readFileSync(tempFile);
      const bufferResult = await mammoth.extractRawText({ buffer: fileBuffer });
      console.log(`📝 Buffer raw text length: ${bufferResult.value.length} chars`);
      console.log(`📝 Buffer text content:\n"${bufferResult.value}"`);
      console.log(`⚠️  Messages: ${JSON.stringify(bufferResult.messages, null, 2)}\n`);
    } catch (error) {
      console.error(`❌ Buffer extraction failed:`, error.message);
    }
    
    // Clean up
    fs.unlinkSync(tempFile);
    console.log('🗑️ Cleaned up temp file');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugDocxExtraction().then(() => {
    console.log('\n✅ DOCX extraction debug completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
}

module.exports = { debugDocxExtraction }; 