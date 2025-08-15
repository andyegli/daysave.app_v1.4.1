#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix the CSV format to include Work Type column
function fixCSVFormat() {
    const inputPath = path.join(__dirname, '..', 'docs', 'daysave-complete-with-commits.csv');
    const outputPath = path.join(__dirname, '..', 'docs', 'daysave-complete-jira-fixed.csv');
    
    const content = fs.readFileSync(inputPath, 'utf8');
    const lines = content.split('\n');
    
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (i === 0) {
            // Fix header: Add Work Type column after Issue Type
            const newHeader = 'Work Item ID,Issue Type,Work Type,Summary,Epic Name,Parent,Description,Priority,Story Points,Labels,Components';
            fixedLines.push(newHeader);
        } else {
            // Parse the line
            const parts = line.split(',');
            if (parts.length >= 10) {
                const workItemId = parts[0];
                const issueType = parts[1];
                const summary = parts[2];
                const epicName = parts[3];
                const parent = parts[4];
                const description = parts[5];
                const priority = parts[6];
                const storyPoints = parts[7];
                const labels = parts[8];
                const components = parts[9];
                
                // Determine Work Type based on Issue Type
                let workType;
                if (issueType === 'Epic') {
                    workType = 'Epic';
                } else if (issueType === 'Story') {
                    workType = 'User Story';
                } else if (issueType === 'Task') {
                    workType = 'Task';
                } else {
                    workType = 'User Story'; // Default
                }
                
                // Reconstruct line with Work Type column
                const newLine = `${workItemId},${issueType},${workType},${summary},${epicName},${parent},${description},${priority},${storyPoints},${labels},${components}`;
                fixedLines.push(newLine);
            }
        }
    }
    
    const fixedContent = fixedLines.join('\n');
    fs.writeFileSync(outputPath, fixedContent);
    
    console.log(`Fixed CSV saved to: ${outputPath}`);
    console.log(`Total lines: ${fixedLines.length}`);
    
    return outputPath;
}

// Main execution
try {
    const outputPath = fixCSVFormat();
    console.log('✅ CSV format fixed for Jira import');
} catch (error) {
    console.error('❌ Error fixing CSV format:', error);
}
