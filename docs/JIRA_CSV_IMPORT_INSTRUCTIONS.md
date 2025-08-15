# Jira CSV Import Instructions - Step by Step

## ❌ Why JSON Import Failed

The JSON file you tried to import is a **custom format** designed for documentation and general scrum tools. Jira's JSON import expects specific formats from:
- Azure DevOps exports
- Other Atlassian tools  
- Specific third-party integrations

**Solution**: Use CSV import instead - it's more reliable and gives you full control over field mapping.

## ✅ Correct Import Method: CSV Files

Use these files for Jira import:
1. **`scrum-board-import.csv`** - For epics and sprints
2. **`usecases-backlog-import.csv`** - For individual stories

## Step-by-Step Import Process

### Step 1: Import Epics First

#### 1.1 Navigate to CSV Import
```
Jira Project → Project Settings → Issues → Import Issues from CSV
```

#### 1.2 Upload Epics File
- **File**: `scrum-board-import.csv`
- **Filter**: Only rows where Type = "Epic"

#### 1.3 Configure Epic Import
| CSV Column | → | Jira Field | Notes |
|------------|---|------------|-------|
| **Type** | → | **Issue Type** | Must select "Epic" |
| **ID** | → | **Epic Name** | EPIC-001, EPIC-002, etc. |
| **Title** | → | **Summary** | Epic title |
| **Description** | → | **Description** | Epic description |
| **Priority** | → | **Priority** | Critical/High/Medium/Low |
| **Story Points** | → | **Story Points** | Total epic points |

#### 1.4 Import Settings for Epics
```
✅ Create new users: No
✅ Create missing priorities: Yes
✅ Create missing components: Yes
✅ Send email notifications: No
✅ Skip first line: Yes (headers)
```

### Step 2: Import Stories Second

#### 2.1 Navigate to CSV Import (Again)
```
Jira Project → Project Settings → Issues → Import Issues from CSV
```

#### 2.2 Upload Stories File
- **File**: `usecases-backlog-import.csv`
- **Contains**: All 340 use cases as individual stories

#### 2.3 Configure Story Import
| CSV Column | → | Jira Field | Critical | Notes |
|------------|---|------------|----------|-------|
| **Issue Type** | → | **Issue Type** | ⚠️ CRITICAL | Must be "Story" |
| **Summary** | → | **Summary** | ⚠️ CRITICAL | Story title |
| **Description** | → | **Description** | ⚠️ CRITICAL | Requirements |
| **Epic Link** | → | **Epic Link** | ⚠️ CRITICAL | Links to epics |
| **Priority** | → | **Priority** | ✅ Important | Business priority |
| **Story Points** | → | **Story Points** | ✅ Important | Effort estimation |
| **Labels** | → | **Labels** | ⭕ Optional | Tags for filtering |
| **Components** | → | **Components** | ⭕ Optional | Functional areas |
| **Use Case ID** | → | **Custom Field** | ⭕ Optional | UC-XXX reference |

#### 2.4 Import Settings for Stories
```
✅ Create new users: No
✅ Create missing priorities: Yes
✅ Create missing components: Yes
✅ Create missing labels: Yes
✅ Link to existing epics: Yes
✅ Send email notifications: No
✅ Skip first line: Yes (headers)
```

## Detailed Field Mapping Guide

### Epic Import Mapping
When importing `scrum-board-import.csv` (epics only):

```
Step 1: Upload CSV file
Step 2: Select mapping screen
Step 3: Configure mappings:

"Type" column → "Issue Type" field → Select "Epic"
"ID" column → "Epic Name" field
"Title" column → "Summary" field  
"Description" column → "Description" field
"Priority" column → "Priority" field
"Story Points" column → "Story Points" field

Step 4: Preview data (should show 13 epics)
Step 5: Import
```

### Story Import Mapping
When importing `usecases-backlog-import.csv`:

```
Step 1: Upload CSV file
Step 2: Select mapping screen
Step 3: Configure mappings:

"Issue Type" column → "Issue Type" field → Select "Story"
"Summary" column → "Summary" field
"Description" column → "Description" field
"Epic Link" column → "Epic Link" field (links to existing epics)
"Priority" column → "Priority" field
"Story Points" column → "Story Points" field
"Labels" column → "Labels" field
"Components" column → "Components" field
"Use Case ID" column → Custom field (if created)

Step 4: Preview data (should show 340 stories)
Step 5: Import
```

## Pre-Import Checklist

### Before Importing Epics
- [ ] Jira project exists and is accessible
- [ ] You have admin/import permissions
- [ ] Epic issue type is available in project

### Before Importing Stories  
- [ ] Epics have been imported successfully (13 epics)
- [ ] Epic Link field is available
- [ ] Story Points field exists
- [ ] Create custom "Use Case ID" field (optional)

## Troubleshooting Common Issues

### Issue 1: "Epic Link field not found"
**Problem**: Epic Link field missing during story import
**Solution**: 
```
1. Go to Project Settings → Issue Types
2. Add "Epic Link" field to Story screen
3. Or map to different field that links to epics
```

### Issue 2: "Invalid Epic Link values"
**Problem**: Epic links don't match existing epics
**Solution**:
```
1. Verify epics imported first with correct keys
2. Check epic keys match exactly: EPIC-001, EPIC-002, etc.
3. Epic Name field should contain these values
```

### Issue 3: "Story Points field not accepting values"
**Problem**: Story points importing as text
**Solution**:
```
1. Ensure Story Points field is Number type
2. Check values are numeric: 2, 3, 5, 8, 13
3. Map to correct Story Points field (usually built-in)
```

### Issue 4: "Priority values not recognized"
**Problem**: Priority values don't match Jira
**Solution**:
```
1. Enable "Create missing priorities" in import settings
2. Or map to existing priorities:
   - Critical → Highest
   - High → High  
   - Medium → Medium
   - Low → Low
```

## Alternative: Manual Epic Creation

If epic import continues to fail, create epics manually:

### Manual Epic Creation Steps
1. **Create Epic**: Issues → Create → Epic
2. **Fill Fields**:
   - Epic Name: EPIC-001
   - Summary: Authentication & User Management
   - Description: Core user authentication, registration, profile management and security features
   - Priority: Critical
   - Story Points: 89

3. **Repeat for all 13 epics** (see list below)

### Epic List for Manual Creation
```
EPIC-001: Authentication & User Management (Critical, 89 points)
EPIC-002: Social Media Integration (High, 55 points)
EPIC-003: AI-Powered Content Analysis (Critical, 144 points)
EPIC-004: Contacts Management System (High, 89 points)
EPIC-005: Content Sharing & Collaboration (Medium, 34 points)
EPIC-006: File Management & Storage (High, 55 points)
EPIC-007: Administration & System Management (Medium, 89 points)
EPIC-008: Multimedia Testing System (Medium, 55 points)
EPIC-009: Multilingual & Accessibility (Low, 34 points)
EPIC-010: Security & Compliance (Critical, 34 points)
EPIC-011: Integration & API (High, 34 points)
EPIC-012: Mobile & Responsive Design (Medium, 21 points)
EPIC-013: Analytics & Reporting (Low, 34 points)
```

## Verification After Import

### Check Epic Import Success
Use this JQL query:
```jql
type = Epic
```
**Expected Result**: 13 epics

### Check Story Import Success
Use this JQL query:
```jql
type = Story AND "Epic Link" is not EMPTY
```
**Expected Result**: 340 stories, all linked to epics

### Check Specific Epic's Stories
```jql
type = Story AND "Epic Link" = "EPIC-001"
```
**Expected Result**: 24 stories for Authentication epic

## Next Steps After Successful Import

1. **Verify Data**: Check all epics and stories imported
2. **Create Sprints**: Set up sprint structure
3. **Assign Stories**: Move stories to appropriate sprints
4. **Team Setup**: Add team members and permissions
5. **Board Configuration**: Set up scrum board views

## Summary

- ❌ **Don't use**: `scrum-board-import.json` (not compatible)
- ✅ **Use instead**: `scrum-board-import.csv` + `usecases-backlog-import.csv`
- 📋 **Order**: Import epics first, then stories
- 🔗 **Critical**: Ensure Epic Link field mapping works
- ✅ **Result**: 13 epics + 340 stories fully linked

The CSV import method gives you complete control and visibility over the mapping process!
