#!/usr/bin/env node

/**
 * Install Document Processing Dependencies
 * 
 * Installs the required npm packages for document processing functionality
 * including PDF parsing, Word document extraction, and text processing.
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🔧 Installing Document Processing Dependencies...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const dependencies = [
    'pdf-parse',      // PDF text extraction
    'mammoth',        // Word document (.docx) text extraction  
    'textract'        // Alternative text extraction library
];

console.log(`📦 Installing packages: ${dependencies.join(', ')}`);
console.log('');

const installCommand = `npm install ${dependencies.join(' ')}`;

exec(installCommand, { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ Installation failed:', error.message);
        process.exit(1);
    }
    
    if (stderr) {
        console.warn('⚠️  Installation warnings:', stderr);
    }
    
    console.log(stdout);
    console.log('✅ Document processing dependencies installed successfully!');
    console.log('');
    console.log('📋 Installed packages:');
    dependencies.forEach(dep => {
        console.log(`   • ${dep}`);
    });
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Upload a PDF, Word doc, or text file');
    console.log('   2. The system will automatically extract text and generate AI analysis');
    console.log('   3. Documents will display with title, tags, and summary in the content cards');
}); 