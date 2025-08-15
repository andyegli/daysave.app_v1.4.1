#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the usecases.md file and extract all use cases
function extractUseCases() {
    const usecasesPath = path.join(__dirname, '..', 'docs', 'usecases.md');
    const content = fs.readFileSync(usecasesPath, 'utf8');
    
    const lines = content.split('\n');
    const usecases = [];
    
    for (const line of lines) {
        // Match lines like "- **UC-001**: Register with email/password authentication"
        const match = line.match(/- \*\*UC-(\d+)\*\*: (.+)/);
        if (match) {
            const ucNumber = parseInt(match[1]);
            const description = match[2];
            usecases.push({
                id: ucNumber,
                code: `UC-${match[1].padStart(3, '0')}`,
                description: description
            });
        }
    }
    
    console.log(`Extracted ${usecases.length} use cases`);
    return usecases;
}

// Map use cases to epics
function mapUseCaseToEpic(ucId) {
    if (ucId >= 1 && ucId <= 24) return 1; // Authentication
    if (ucId >= 25 && ucId <= 46) return 2; // Social Media
    if (ucId >= 47 && ucId <= 109) return 3; // AI Analysis  
    if (ucId >= 110 && ucId <= 149) return 4; // Contacts
    if (ucId >= 150 && ucId <= 167) return 5; // Sharing
    if (ucId >= 168 && ucId <= 188) return 6; // File Management
    if (ucId >= 189 && ucId <= 230) return 7; // Administration
    if (ucId >= 231 && ucId <= 260) return 8; // Testing
    if (ucId >= 261 && ucId <= 278) return 9; // Internationalization
    if (ucId >= 279 && ucId <= 295) return 10; // Security
    if (ucId >= 296 && ucId <= 314) return 11; // Integration
    if (ucId >= 315 && ucId <= 324) return 12; // Mobile
    if (ucId >= 325 && ucId <= 340) return 13; // Analytics
    return 1; // Default to Authentication
}

// Get priority based on epic
function getPriority(epicId) {
    const priorities = {
        1: 'High',     // Authentication
        2: 'High',     // Social Media
        3: 'Highest',  // AI Analysis
        4: 'High',     // Contacts
        5: 'Medium',   // Sharing
        6: 'High',     // File Management
        7: 'Medium',   // Administration
        8: 'Medium',   // Testing
        9: 'Low',      // Internationalization
        10: 'Highest', // Security
        11: 'High',    // Integration
        12: 'Medium',  // Mobile
        13: 'Low'      // Analytics
    };
    return priorities[epicId] || 'Medium';
}

// Get story points based on complexity
function getStoryPoints(description) {
    const lowKeywords = ['view', 'display', 'show', 'enable', 'add', 'create'];
    const mediumKeywords = ['implement', 'integrate', 'manage', 'process'];
    const highKeywords = ['comprehensive', 'advanced', 'ai-powered', 'detection', 'analysis'];
    
    const lowerDesc = description.toLowerCase();
    
    if (highKeywords.some(keyword => lowerDesc.includes(keyword))) return 8;
    if (mediumKeywords.some(keyword => lowerDesc.includes(keyword))) return 5;
    if (lowKeywords.some(keyword => lowerDesc.includes(keyword))) return 3;
    
    return 3; // Default
}

// Generate CSV content
function generateCSV() {
    const usecases = extractUseCases();
    const csvLines = [];
    
    // Header
    csvLines.push('Work Item ID,Issue Type,Summary,Epic Name,Parent,Description,Priority,Story Points,Labels,Components');
    
    // Epics (1-13)
    const epics = [
        { id: 1, name: 'Authentication & User Management', desc: 'Core user authentication registration profile management and security features', points: 89, component: 'Authentication' },
        { id: 2, name: 'Social Media Integration', desc: 'Integration with 11 social media platforms for content extraction and analysis', points: 55, component: 'Social Media' },
        { id: 3, name: 'AI-Powered Content Analysis', desc: 'Advanced AI analysis including transcription sentiment analysis object detection and multimedia processing', points: 144, component: 'AI Analysis' },
        { id: 4, name: 'Contacts Management System', desc: 'Comprehensive contact management with relationships groups and integration features', points: 89, component: 'Contacts' },
        { id: 5, name: 'Content Sharing & Collaboration', desc: 'Content sharing collaboration features permissions and team management', points: 34, component: 'Sharing' },
        { id: 6, name: 'File Management & Storage', desc: 'File upload processing organization and cloud storage integration', points: 55, component: 'File Management' },
        { id: 7, name: 'Administration & System Management', desc: 'User administration system configuration monitoring and contact management for admins', points: 89, component: 'Administration' },
        { id: 8, name: 'Multimedia Testing System', desc: 'Comprehensive testing framework for multimedia analysis with automated workflows', points: 55, component: 'Testing' },
        { id: 9, name: 'Multilingual & Accessibility', desc: 'Multi-language support and accessibility features for inclusive user experience', points: 34, component: 'Internationalization' },
        { id: 10, name: 'Security & Compliance', desc: 'Data protection GDPR compliance security monitoring and threat detection', points: 34, component: 'Security' },
        { id: 11, name: 'Integration & API', desc: 'External service integrations and RESTful API development', points: 34, component: 'Integration' },
        { id: 12, name: 'Mobile & Responsive Design', desc: 'Mobile compatibility responsive design and touch-friendly interfaces', points: 21, component: 'Mobile' },
        { id: 13, name: 'Analytics & Reporting', desc: 'User analytics business intelligence and comprehensive reporting system', points: 34, component: 'Analytics' }
    ];
    
    // Add epics
    for (const epic of epics) {
        const priority = getPriority(epic.id);
        csvLines.push(`${epic.id},Epic,${epic.name},${epic.name},,${epic.desc},${priority},${epic.points},epic ${epic.component.toLowerCase().replace(/\s+/g, '-')},${epic.component}`);
    }
    
    // Add stories (use cases)
    for (const uc of usecases) {
        const epicId = mapUseCaseToEpic(uc.id);
        const epic = epics.find(e => e.id === epicId);
        const storyId = 13 + uc.id; // Stories start after epics
        const priority = getPriority(epicId);
        const storyPoints = getStoryPoints(uc.description);
        const labels = `story ${uc.code.toLowerCase()} ${epic.component.toLowerCase().replace(/\s+/g, '-')}`;
        
        csvLines.push(`${storyId},Story,${uc.description},,${epicId},${uc.description} - ${uc.code},${priority},${storyPoints},${labels},${epic.component}`);
    }
    
    return csvLines.join('\n');
}

// Main execution
try {
    const csvContent = generateCSV();
    const outputPath = path.join(__dirname, '..', 'docs', 'daysave-complete-all-usecases.csv');
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Complete CSV generated: ${outputPath}`);
    console.log(`Total lines: ${csvContent.split('\n').length}`);
} catch (error) {
    console.error('Error generating CSV:', error);
}
