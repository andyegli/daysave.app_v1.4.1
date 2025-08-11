#!/usr/bin/env node

/**
 * DaySave Project Timeline - PlantUML Gantt Chart Generator
 * 
 * This script automatically generates a PlantUML Gantt chart from Git commit history,
 * mapping commits to project phases and showing implementation timeline.
 * 
 * Usage:
 *   node scripts/generate-gantt-chart.js [--output=file.puml] [--format=plantuml|mermaid]
 * 
 * Features:
 * - Parses Git commit history with dates and messages
 * - Maps commits to project phases based on keywords and patterns
 * - Generates timeline showing what was implemented and how long it took
 * - Supports both PlantUML and Mermaid output formats
 * - Calculates actual development time between commits
 * 
 * Created: 2025-01-31
 * Author: DaySave Development Team
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Project phase definitions based on commit patterns
const PROJECT_PHASES = [
    {
        name: "Modular Architecture Refactor",
        keywords: ["BaseMediaProcessor", "VideoProcessor", "AudioProcessor", "ImageProcessor", 
                  "AutomationOrchestrator", "Plugin Registry", "Configuration Manager", "modular"],
        color: "#2596be"
    },
    {
        name: "System Stabilization", 
        keywords: ["performance", "optimization", "fix", "stabilization", "pipeline", "modal"],
        color: "#a1d8c9"
    },
    {
        name: "Feature Integration",
        keywords: ["subscription", "file upload", "content management", "CSP", "integration"],
        color: "#fbda6a"
    },
    {
        name: "Infrastructure & DevOps",
        keywords: ["Docker", "CI/CD", "infrastructure", "security", "deployment"],
        color: "#d8e2a8"
    },
    {
        name: "Authentication & Security",
        keywords: ["WebAuthn", "passkey", "authentication", "MFA", "security", "login"],
        color: "#f0e28b"
    },
    {
        name: "Advanced Features",
        keywords: ["contact", "groups", "relationships", "fingerprinting", "advanced"],
        color: "#87c0a9"
    },
    {
        name: "Production Readiness",
        keywords: ["GCS", "SSL", "proxy", "production", "migration", "deployment"],
        color: "#fbce3c"
    },
    {
        name: "System Modernization",
        keywords: ["URL processing", "MultimediaAnalyzer", "removal", "modernization", "analytics"],
        color: "#309b9c"
    }
];

/**
 * Execute git command and return output
 */
function executeGitCommand(command) {
    try {
        return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.error(`Error executing git command: ${command}`);
        console.error(error.message);
        process.exit(1);
    }
}

/**
 * Parse Git commit history
 */
function parseCommitHistory() {
    console.log('📊 Parsing Git commit history...');
    
    const gitLog = executeGitCommand('git log --pretty=format:"%h|%ci|%s" --reverse');
    const commits = gitLog.split('\n').map(line => {
        const [hash, dateTime, message] = line.split('|');
        const date = new Date(dateTime);
        return {
            hash: hash.replace(/"/g, ''),
            date: date,
            dateString: date.toISOString().split('T')[0],
            message: message ? message.replace(/"/g, '') : '',
            originalLine: line
        };
    }).filter(commit => commit.hash && commit.message);

    console.log(`✅ Parsed ${commits.length} commits from ${commits[0]?.dateString} to ${commits[commits.length-1]?.dateString}`);
    return commits;
}

/**
 * Classify commit into project phase
 */
function classifyCommit(commit) {
    const message = commit.message.toLowerCase();
    
    for (const phase of PROJECT_PHASES) {
        for (const keyword of phase.keywords) {
            if (message.includes(keyword.toLowerCase())) {
                return phase;
            }
        }
    }
    
    // Default to System Stabilization for unclassified commits
    return PROJECT_PHASES[1]; // System Stabilization
}

/**
 * Group commits by phase and create timeline
 */
function createTimeline(commits) {
    console.log('🗓️ Creating project timeline...');
    
    const phaseGroups = {};
    
    // Initialize phase groups
    PROJECT_PHASES.forEach(phase => {
        phaseGroups[phase.name] = {
            phase: phase,
            commits: [],
            startDate: null,
            endDate: null,
            duration: 0
        };
    });
    
    // Group commits by phase
    commits.forEach(commit => {
        const phase = classifyCommit(commit);
        phaseGroups[phase.name].commits.push(commit);
    });
    
    // Calculate phase timelines
    Object.values(phaseGroups).forEach(group => {
        if (group.commits.length > 0) {
            group.commits.sort((a, b) => a.date - b.date);
            group.startDate = group.commits[0].dateString;
            group.endDate = group.commits[group.commits.length - 1].dateString;
            
            const start = new Date(group.startDate);
            const end = new Date(group.endDate);
            group.duration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        }
    });
    
    console.log('📈 Timeline analysis:');
    Object.values(phaseGroups).forEach(group => {
        if (group.commits.length > 0) {
            console.log(`  ${group.phase.name}: ${group.commits.length} commits, ${group.duration} days (${group.startDate} to ${group.endDate})`);
        }
    });
    
    return phaseGroups;
}

/**
 * Generate PlantUML Gantt chart
 */
function generatePlantUML(timeline) {
    console.log('🎨 Generating PlantUML Gantt chart...');
    
    let plantuml = `@startgantt
!theme plain
title DaySave v1.4.1 Development Timeline & Project Phases
subtitle Generated from Git commit history on ${new Date().toISOString().split('T')[0]}

' Color scheme
skinparam {
    ganttBackgroundColor white
    activityBackgroundColor #2596be
    activityBorderColor #309b9c
}

`;

    // Add phases with tasks
    Object.values(timeline).forEach(group => {
        if (group.commits.length > 0) {
            plantuml += `' ${group.phase.name} (${group.commits.length} commits)\n`;
            plantuml += `project starts ${group.startDate}\n`;
            
            // Group related commits into logical tasks
            const tasks = groupCommitsIntoTasks(group.commits);
            
            tasks.forEach(task => {
                const duration = calculateTaskDuration(task.commits);
                plantuml += `[${task.name}] lasts ${duration} days\n`;
            });
            
            plantuml += '\n';
        }
    });

    plantuml += '@endgantt\n';
    return plantuml;
}

/**
 * Generate Mermaid Gantt chart
 */
function generateMermaid(timeline) {
    console.log('🎨 Generating Mermaid Gantt chart...');
    
    let mermaid = `gantt
    title DaySave v1.4.1 Development Timeline
    dateFormat YYYY-MM-DD

`;

    Object.values(timeline).forEach(group => {
        if (group.commits.length > 0) {
            mermaid += `    section ${group.phase.name}\n`;
            
            // Group related commits into logical tasks
            const tasks = groupCommitsIntoTasks(group.commits);
            
            tasks.forEach(task => {
                const duration = calculateTaskDuration(task.commits);
                const startDate = task.commits[0].dateString;
                mermaid += `    ${task.name.substring(0, 25)}    :done, ${startDate}, ${duration}d\n`;
            });
            
            mermaid += '\n';
        }
    });

    return mermaid;
}

/**
 * Group related commits into logical tasks
 */
function groupCommitsIntoTasks(commits) {
    const tasks = [];
    let currentTask = null;
    
    commits.forEach(commit => {
        const taskName = extractTaskName(commit.message);
        
        if (!currentTask || currentTask.name !== taskName) {
            if (currentTask) {
                tasks.push(currentTask);
            }
            currentTask = {
                name: taskName,
                commits: [commit]
            };
        } else {
            currentTask.commits.push(commit);
        }
    });
    
    if (currentTask) {
        tasks.push(currentTask);
    }
    
    return tasks;
}

/**
 * Extract task name from commit message
 */
function extractTaskName(message) {
    // Remove common prefixes and clean up
    let taskName = message
        .replace(/^(fix|feat|docs|style|refactor|test|chore):\s*/i, '')
        .replace(/^(🎯|🚀|✅|🔧|🛡️|📊|🎨|💪|🔍|🚨)/, '')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Truncate and capitalize
    if (taskName.length > 50) {
        taskName = taskName.substring(0, 47) + '...';
    }
    
    return taskName.charAt(0).toUpperCase() + taskName.slice(1);
}

/**
 * Calculate task duration in days
 */
function calculateTaskDuration(commits) {
    if (commits.length === 1) return 1;
    
    const start = new Date(commits[0].dateString);
    const end = new Date(commits[commits.length - 1].dateString);
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Write output to file
 */
function writeOutput(content, outputPath, format) {
    console.log(`💾 Writing ${format} chart to: ${outputPath}`);
    
    fs.writeFileSync(outputPath, content, 'utf-8');
    
    console.log('✅ Chart generated successfully!');
    console.log(`📄 File size: ${fs.statSync(outputPath).size} bytes`);
    
    if (format === 'plantuml') {
        console.log('\n📖 To view the PlantUML chart:');
        console.log('  1. Visit http://www.plantuml.com/plantuml/uml/');
        console.log('  2. Copy and paste the content from the generated file');
        console.log('  3. Or use PlantUML CLI: plantuml ' + outputPath);
    } else if (format === 'mermaid') {
        console.log('\n📖 To view the Mermaid chart:');
        console.log('  1. Visit https://mermaid.live/');
        console.log('  2. Copy and paste the content from the generated file');
    }
}

/**
 * Main execution function
 */
function main() {
    console.log('🚀 DaySave Project Timeline Generator\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    let outputPath = 'daysave-timeline.puml';
    let format = 'plantuml';
    
    args.forEach(arg => {
        if (arg.startsWith('--output=')) {
            outputPath = arg.split('=')[1];
        } else if (arg.startsWith('--format=')) {
            format = arg.split('=')[1].toLowerCase();
        }
    });
    
    // Validate format
    if (!['plantuml', 'mermaid'].includes(format)) {
        console.error('❌ Invalid format. Use: plantuml or mermaid');
        process.exit(1);
    }
    
    // Ensure output path has correct extension
    if (format === 'plantuml' && !outputPath.endsWith('.puml')) {
        outputPath += '.puml';
    } else if (format === 'mermaid' && !outputPath.endsWith('.mmd')) {
        outputPath += '.mmd';
    }
    
    try {
        // Generate timeline
        const commits = parseCommitHistory();
        const timeline = createTimeline(commits);
        
        // Generate chart
        const content = format === 'plantuml' 
            ? generatePlantUML(timeline)
            : generateMermaid(timeline);
        
        // Write output
        writeOutput(content, outputPath, format);
        
        // Summary statistics
        console.log('\n📊 Project Summary:');
        console.log(`  Total Commits: ${commits.length}`);
        console.log(`  Development Period: ${commits[0]?.dateString} to ${commits[commits.length-1]?.dateString}`);
        console.log(`  Total Development Days: ${Math.ceil((new Date(commits[commits.length-1]?.dateString) - new Date(commits[0]?.dateString)) / (1000 * 60 * 60 * 24)) + 1}`);
        console.log(`  Active Phases: ${Object.values(timeline).filter(g => g.commits.length > 0).length}`);
        
    } catch (error) {
        console.error('❌ Error generating timeline:', error.message);
        process.exit(1);
    }
}

// Execute if run directly
if (require.main === module) {
    main();
}

module.exports = {
    parseCommitHistory,
    createTimeline,
    generatePlantUML,
    generateMermaid,
    PROJECT_PHASES
};
