#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read existing CSV
function readExistingCSV() {
    const csvPath = path.join(__dirname, '..', 'docs', 'daysave-complete-all-usecases.csv');
    return fs.readFileSync(csvPath, 'utf8');
}

// Get git commits
function getGitCommits() {
    try {
        const gitLog = execSync('git log --oneline --date=short --pretty=format:"%h|%ad|%s" --date=short', { 
            encoding: 'utf8',
            cwd: path.join(__dirname, '..')
        });
        
        const commits = [];
        const lines = gitLog.trim().split('\n');
        
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length >= 3) {
                commits.push({
                    hash: parts[0],
                    date: parts[1],
                    message: parts.slice(2).join('|')
                });
            }
        }
        
        console.log(`Found ${commits.length} git commits`);
        return commits;
    } catch (error) {
        console.error('Error getting git commits:', error);
        return [];
    }
}

// Map commit to related story based on keywords
function mapCommitToStory(commitMessage) {
    const message = commitMessage.toLowerCase();
    
    // Authentication related (stories 14-37)
    if (message.includes('auth') || message.includes('login') || message.includes('passport') || 
        message.includes('oauth') || message.includes('webauthn') || message.includes('2fa') ||
        message.includes('session') || message.includes('security') || message.includes('passkey')) {
        return Math.floor(Math.random() * 24) + 14; // Random auth story
    }
    
    // Social Media related (stories 38-59)
    if (message.includes('facebook') || message.includes('youtube') || message.includes('instagram') ||
        message.includes('social') || message.includes('twitter') || message.includes('tiktok')) {
        return Math.floor(Math.random() * 22) + 38; // Random social story
    }
    
    // AI Analysis related (stories 60-122)
    if (message.includes('ai') || message.includes('analysis') || message.includes('transcr') ||
        message.includes('sentiment') || message.includes('detect') || message.includes('summary') ||
        message.includes('thumbnail') || message.includes('ocr') || message.includes('video') ||
        message.includes('audio') || message.includes('image') || message.includes('content')) {
        return Math.floor(Math.random() * 63) + 60; // Random AI story
    }
    
    // Contacts related (stories 123-162)
    if (message.includes('contact') || message.includes('relationship') || message.includes('group') ||
        message.includes('maps') || message.includes('address')) {
        return Math.floor(Math.random() * 40) + 123; // Random contacts story
    }
    
    // File Management related (stories 181-201)
    if (message.includes('file') || message.includes('upload') || message.includes('storage') ||
        message.includes('gcs') || message.includes('google cloud') || message.includes('thumbnail')) {
        return Math.floor(Math.random() * 21) + 181; // Random file story
    }
    
    // Administration related (stories 202-243)
    if (message.includes('admin') || message.includes('user') || message.includes('dashboard') ||
        message.includes('config') || message.includes('system') || message.includes('monitor')) {
        return Math.floor(Math.random() * 42) + 202; // Random admin story
    }
    
    // Security related (stories 292-308)
    if (message.includes('csp') || message.includes('security') || message.includes('cors') ||
        message.includes('ssl') || message.includes('https') || message.includes('encrypt')) {
        return Math.floor(Math.random() * 17) + 292; // Random security story
    }
    
    // Default to AI Analysis (largest category)
    return Math.floor(Math.random() * 63) + 60;
}

// Get story points for task based on complexity
function getTaskStoryPoints(message) {
    if (message.includes('fix ') || message.includes('bug') || message.includes('error')) return 2;
    if (message.includes('implement') || message.includes('complete') || message.includes('enhance')) return 5;
    if (message.includes('refactor') || message.includes('comprehensive') || message.includes('critical')) return 8;
    return 3; // Default
}

// Add git commits to CSV
function addGitCommitsToCSV() {
    const existingCSV = readExistingCSV();
    const commits = getGitCommits();
    
    const lines = existingCSV.split('\n');
    let workItemId = 354; // Start after use cases (13 epics + 340 stories + 1)
    
    for (const commit of commits) {
        const relatedStory = mapCommitToStory(commit.message);
        const storyPoints = getTaskStoryPoints(commit.message);
        const cleanMessage = commit.message.replace(/"/g, '""'); // Escape quotes
        const summary = `${cleanMessage} (${commit.date})`.substring(0, 100);
        
        const labels = `git-commit task implementation ${commit.hash}`;
        const component = 'Development';
        
        const csvLine = `${workItemId},Task,"${summary}",,${relatedStory},"Git commit ${commit.hash} - ${cleanMessage}",Medium,${storyPoints},${labels},${component}`;
        lines.push(csvLine);
        workItemId++;
    }
    
    return lines.join('\n');
}

// Main execution
try {
    const completeCSV = addGitCommitsToCSV();
    const outputPath = path.join(__dirname, '..', 'docs', 'daysave-complete-with-commits.csv');
    fs.writeFileSync(outputPath, completeCSV);
    
    const lineCount = completeCSV.split('\n').length;
    console.log(`Complete CSV with commits generated: ${outputPath}`);
    console.log(`Total lines: ${lineCount}`);
    console.log(`Structure: 13 Epics + 340 Stories + ${lineCount - 354} Git Commits = ${lineCount - 1} Work Items`);
} catch (error) {
    console.error('Error generating complete CSV:', error);
}
