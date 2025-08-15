# Jira Issue Type Troubleshooting Guide

## Problem: No "Issue Type" Field Available During CSV Import

If you don't see "Issue Type" as a mapping option in Jira's CSV import, here are the solutions:

## Solution 1: Check Your Jira Project Setup

### 1.1 Verify Issue Types Exist
1. Go to **Project Settings → Issue Types**
2. You should see these issue types available:
   - **Epic**
   - **Story** 
   - **Task**
   - **Bug**

### 1.2 If Issue Types Are Missing
If you don't see Epic or Story:
1. Go to **Project Settings → Issue Types**
2. Click **"Add issue type"**
3. Add **Epic** and **Story** issue types
4. Associate them with appropriate workflows

## Solution 2: Alternative Import Method

### Method A: Import Without Issue Type Column
Create simplified CSV files without the Issue Type column:

#### For Epics: `jira-epics-simple.csv`
```csv
Epic Name,Summary,Description,Priority,Story Points
EPIC-001,Authentication & User Management,Core user authentication registration profile management and security features,Critical,89
EPIC-002,Social Media Integration,Integration with 11 social media platforms for content extraction and analysis,High,55
```

#### For Stories: `jira-stories-simple.csv`
```csv
Summary,Description,Epic Link,Priority,Story Points
User Registration with Email/Password,Implement basic user registration functionality with email verification,EPIC-001,Critical,8
OAuth 2.0 Integration,Implement social login functionality for major OAuth providers,EPIC-001,Critical,13
```

### Method B: Manual Epic Creation + CSV Story Import

#### Step 1: Create Epics Manually
Instead of importing epics, create them manually:

1. **Click "Create" → Select "Epic"**
2. **Fill Epic Details**:
   - Epic Name: EPIC-001
   - Summary: Authentication & User Management
   - Description: Core user authentication, registration, profile management and security features
   - Priority: Critical

3. **Repeat for all 13 epics**

#### Step 2: Import Stories Only
Use the stories CSV file to import stories that link to manually created epics.

## Solution 3: Check CSV Import Settings

### During CSV Import Process
1. **Upload CSV file**
2. **Look for "Issue Type" in mapping options**
3. **If not found, check these settings**:

#### Import Configuration Options:
- [ ] **"Create missing issue types"** - Enable this
- [ ] **"Import to existing project"** - Make sure correct project selected
- [ ] **"Map unmapped fields"** - Check if Issue Type appears here

## Solution 4: Alternative CSV Structure

### Option A: Pre-filter CSV by Issue Type
Create separate import sessions:

#### Session 1: Import Only Epics
Filter original CSV to only Epic rows and import.

#### Session 2: Import Only Stories  
Filter original CSV to only Story rows and import.

### Option B: Use Default Issue Type
If Jira has a default issue type (usually "Task"):

1. Import everything as "Task"
2. Bulk edit afterward to change issue types:
   - Select Epic items → Bulk edit → Change to Epic
   - Select Story items → Bulk edit → Change to Story

## Step-by-Step Workaround

### Workaround 1: Manual Epic Creation

```
1. Go to Issues → Create Issue
2. Select Issue Type: Epic
3. Fill details for EPIC-001:
   - Epic Name: EPIC-001
   - Summary: Authentication & User Management
   - Description: Core user authentication, registration...
   - Priority: Critical
   - Story Points: 89

4. Repeat for all 13 epics (see list below)
5. Then import stories using CSV
```

### Epic List for Manual Creation:
```
EPIC-001: Authentication & User Management (Critical, 89 pts)
EPIC-002: Social Media Integration (High, 55 pts)  
EPIC-003: AI-Powered Content Analysis (Critical, 144 pts)
EPIC-004: Contacts Management System (High, 89 pts)
EPIC-005: Content Sharing & Collaboration (Medium, 34 pts)
EPIC-006: File Management & Storage (High, 55 pts)
EPIC-007: Administration & System Management (Medium, 89 pts)
EPIC-008: Multimedia Testing System (Medium, 55 pts)
EPIC-009: Multilingual & Accessibility (Low, 34 pts)
EPIC-010: Security & Compliance (Critical, 34 pts)
EPIC-011: Integration & API (High, 34 pts)
EPIC-012: Mobile & Responsive Design (Medium, 21 pts)
EPIC-013: Analytics & Reporting (Low, 34 pts)
```

### Workaround 2: Import All as Tasks, Then Convert

#### Step 1: Import Everything as Tasks
1. Upload CSV without Issue Type column
2. Let Jira import everything as default "Task" type

#### Step 2: Bulk Convert to Correct Types
1. **Select Epic items**: Use filter or search
2. **Bulk Edit**: Tools → Bulk Change → Change Issue Type → Epic
3. **Select Story items**: Use filter or search  
4. **Bulk Edit**: Tools → Bulk Change → Change Issue Type → Story

## Solution 5: Check Jira Edition

### Jira Cloud vs Server/Data Center
- **Jira Cloud**: Should have Issue Type mapping in CSV import
- **Jira Server**: May have different CSV import interface
- **Jira Core**: May not have Epic issue type by default

### If Using Jira Core:
1. **Upgrade to Jira Software**: For proper Epic support
2. **Or use alternative**: Import as Tasks and organize differently

## Verification Steps

After any workaround:

### Check Epic Creation:
```jql
type = Epic
```
**Expected**: 13 results

### Check Story Creation:
```jql  
type = Story
```
**Expected**: Stories imported

### Check Epic Links:
```jql
type = Story AND "Epic Link" is not EMPTY
```
**Expected**: Stories linked to epics

## Quick Diagnostic

### What Jira Version Are You Using?
1. **Go to**: Jira Administration → System
2. **Check**: Jira version and edition
3. **Confirm**: Epic issue type availability

### What Do You See in CSV Import?
1. **Upload CSV file**
2. **Take screenshot** of field mapping screen
3. **List available field options** you see

Let me know:
1. What Jira edition you're using
2. What field options you see during CSV import
3. Whether Epic issue type exists in your project

This will help me give you the exact solution for your specific Jira setup!
