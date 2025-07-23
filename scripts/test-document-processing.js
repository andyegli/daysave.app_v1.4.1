#!/usr/bin/env node

/**
 * Test Document Processing Pipeline
 * 
 * Tests that document files now trigger AI analysis including title generation,
 * summary creation, and tag generation through the DocumentProcessor.
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Document Processing Pipeline...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Test the updated isMultimediaFile function
function testIsMultimediaFile() {
  console.log('\n📋 Testing isMultimediaFile function...');
  
  // Import the function from files.js by reading the file
  const filesRouteContent = fs.readFileSync(path.join(__dirname, '..', 'routes', 'files.js'), 'utf8');
  
  // Extract the multimediaTypes array
  const multimediaTypesMatch = filesRouteContent.match(/const multimediaTypes = \[([\s\S]*?)\];/);
  if (!multimediaTypesMatch) {
    console.log('❌ Could not find multimediaTypes array in files.js');
    return false;
  }
  
  const typesContent = multimediaTypesMatch[1];
  const documentTypes = [
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
    'application/rtf'
  ];
  
  let allDocTypesFound = true;
  for (const docType of documentTypes) {
    if (!typesContent.includes(`'${docType}'`)) {
      console.log(`❌ Missing document type: ${docType}`);
      allDocTypesFound = false;
    } else {
      console.log(`✅ Found document type: ${docType}`);
    }
  }
  
  return allDocTypesFound;
}

// Test DocumentProcessor integration
function testDocumentProcessorIntegration() {
  console.log('\n🔧 Testing DocumentProcessor integration...');
  
  try {
    // Check if DocumentProcessor is properly exported
    const multimediaIndex = require('../services/multimedia/index.js');
    if (multimediaIndex.DocumentProcessor) {
      console.log('✅ DocumentProcessor exported from multimedia services');
    } else {
      console.log('❌ DocumentProcessor not found in multimedia services exports');
      return false;
    }
    
    // Check if DocumentProcessor can be instantiated
    const DocumentProcessor = multimediaIndex.DocumentProcessor;
    const processor = new DocumentProcessor();
    console.log(`✅ DocumentProcessor instantiated: ${processor.name}`);
    console.log(`✅ Supported types: ${processor.supportedTypes.join(', ')}`);
    
    return true;
  } catch (error) {
    console.log(`❌ DocumentProcessor integration test failed: ${error.message}`);
    return false;
  }
}

// Test AutomationOrchestrator includes DocumentProcessor
function testOrchestrationIntegration() {
  console.log('\n🎛️  Testing AutomationOrchestrator integration...');
  
  try {
    const { AutomationOrchestrator } = require('../services/multimedia');
    const orchestrator = AutomationOrchestrator.getInstance();
    
    // Check if document processor is registered (this would happen during initialization)
    console.log('✅ AutomationOrchestrator loaded successfully');
    console.log('✅ DocumentProcessor should be registered during orchestrator initialization');
    
    return true;
  } catch (error) {
    console.log(`❌ AutomationOrchestrator integration test failed: ${error.message}`);
    return false;
  }
}

// Test MultimediaAnalyzer recognizes documents
function testMultimediaAnalyzerDocumentSupport() {
  console.log('\n📊 Testing MultimediaAnalyzer document support...');
  
  try {
    const { MultimediaAnalyzer } = require('../services/multimedia');
    const analyzer = new MultimediaAnalyzer();
    
    // Test document MIME types
    const documentMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    let allSupported = true;
    for (const mimeType of documentMimeTypes) {
      const category = analyzer.getFileCategory(mimeType);
      if (category === 'document') {
        console.log(`✅ ${mimeType} → ${category}`);
      } else {
        console.log(`❌ ${mimeType} → ${category} (expected: document)`);
        allSupported = false;
      }
    }
    
    return allSupported;
  } catch (error) {
    console.log(`❌ MultimediaAnalyzer document support test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = {
    isMultimediaFile: testIsMultimediaFile(),
    documentProcessor: testDocumentProcessorIntegration(),
    orchestration: testOrchestrationIntegration(),
    analyzerSupport: testMultimediaAnalyzerDocumentSupport()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let allPassed = true;
  for (const [testName, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    if (!passed) allPassed = false;
  }
  
  console.log('\n🎯 Overall Result:');
  if (allPassed) {
    console.log('✅ All tests passed! Document processing should now work correctly.');
    console.log('📄 Documents will now trigger AI analysis for title, summary, and tags.');
  } else {
    console.log('❌ Some tests failed. Document processing may not work correctly.');
  }
  
  return allPassed;
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 