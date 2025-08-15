# Jira Import Field Mapping Matrix

This document provides the exact field mapping you need when importing the DaySave scrum board files into Jira.

## Import Order & Prerequisites

### ⚠️ CRITICAL: Import Order
1. **FIRST**: Import `scrum-board-import.csv` (Epics & Sprints)
2. **SECOND**: Import `usecases-backlog-import.csv` (340 Use Cases)

### Prerequisites in Jira
Before importing, ensure these exist in your Jira project:

#### Required Custom Fields
| Field Name | Field Type | Field ID Example | Purpose |
|------------|------------|------------------|---------|
| Use Case ID | Text Field | customfield_10001 | Store UC-XXX references |
| Story Points | Number Field | customfield_10002 | Usually built-in |
| Epic Link | Epic Link Field | customfield_10003 | Usually built-in |

#### Required Issue Types
- Epic
- Story
- Sprint (if using Jira Software)

## Part 1: Epic Import Mapping

### File: `scrum-board-import.csv`

| CSV Column | Jira Field | Field Type | Example Value | Notes |
|------------|------------|------------|---------------|-------|
| **Type** | Issue Type | System | Epic | Must be "Epic" |
| **ID** | Epic Name | Text | EPIC-001 | Becomes Epic Key |
| **Title** | Summary | Text | Authentication & User Management | Epic title |
| **Description** | Description | Rich Text | Core user authentication, registration... | Epic description |
| **Priority** | Priority | Select | Critical | High/Medium/Low/Critical |
| **Story Points** | Story Points | Number | 89 | Epic story point total |
| **Status** | Status | Workflow | In Progress | To Do/In Progress/Done |
| **Use Cases** | Labels | Multi-select | UC-001,UC-002,UC-003 | Add as labels |

### Jira Import Settings for Epics
```
✅ Create missing users: Yes
✅ Create missing priorities: Yes  
✅ Create missing labels: Yes
✅ Send email notifications: No (recommended)
✅ Update existing issues: No
```

## Part 2: Story Import Mapping

### File: `usecases-backlog-import.csv`

| CSV Column | Jira Field | Field Type | Example Value | Required | Notes |
|------------|------------|------------|---------------|----------|-------|
| **Issue Type** | Issue Type | System | Story | ✅ Yes | Must be "Story" |
| **Summary** | Summary | Text | Register with email/password authentication | ✅ Yes | Story title |
| **Description** | Description | Rich Text | Implement user registration functionality... | ✅ Yes | Detailed requirements |
| **Epic Link** | Epic Link | Epic Link | EPIC-001 | ✅ Yes | Links to parent epic |
| **Priority** | Priority | Select | High | ✅ Yes | Critical/High/Medium/Low |
| **Story Points** | Story Points | Number | 3 | ⭕ Optional | Fibonacci: 1,2,3,5,8,13 |
| **Labels** | Labels | Multi-select | authentication,registration,email-verification | ⭕ Optional | Comma-separated |
| **Components** | Components | Multi-select | Authentication | ⭕ Optional | Functional area |
| **Use Case ID** | Use Case ID | Text | UC-001 | ⭕ Optional | Traceability reference |

### Jira Import Settings for Stories
```
✅ Create missing users: Yes
✅ Create missing priorities: Yes
✅ Create missing components: Yes
✅ Create missing labels: Yes
✅ Link to existing epics: Yes
✅ Send email notifications: No (recommended)
✅ Update existing issues: No
```

## Step-by-Step Import Process

### Step 1: Prepare Jira Project
1. **Create Project**: New Scrum project in Jira
2. **Configure Workflows**: Ensure To Do → In Progress → Done
3. **Create Custom Fields**: Use Case ID (if not exists)
4. **Set Permissions**: Import permissions for your user

### Step 2: Import Epics First

#### 2.1 Navigate to Import
```
Project Settings → Issues → Import Issues from CSV
```

#### 2.2 Upload File
```
Select File: scrum-board-import.csv
```

#### 2.3 Configure Field Mapping
| Step | Jira Screen | Action |
|------|-------------|--------|
| 1 | **Map Fields** | Use table above for Epic mapping |
| 2 | **Issue Type** | Select "Epic" for Type column |
| 3 | **Required Fields** | Map Summary, Description |
| 4 | **Custom Fields** | Map Story Points if available |
| 5 | **Labels** | Map Use Cases to Labels |

#### 2.4 Import Settings
```
✅ Skip first line (headers): Yes
✅ Date format: Auto-detect
✅ Create missing values: Yes
🔄 Validate data: Review preview
✅ Start import: Execute
```

### Step 3: Import Stories Second

#### 3.1 Navigate to Import
```
Project Settings → Issues → Import Issues from CSV
```

#### 3.2 Upload File
```
Select File: usecases-backlog-import.csv
```

#### 3.3 Configure Field Mapping

**Critical Mappings (Must Do):**
| CSV Column | Jira Field | Validation |
|------------|------------|------------|
| Issue Type | Issue Type | Must be "Story" |
| Summary | Summary | Text field |
| Description | Description | Rich text field |
| Epic Link | Epic Link | Must link to existing epics |
| Priority | Priority | Must match Jira priorities |

**Important Mappings (Should Do):**
| CSV Column | Jira Field | Validation |
|------------|------------|------------|
| Story Points | Story Points | Number field (1-13) |
| Labels | Labels | Create missing labels |
| Components | Components | Create missing components |

**Optional Mappings (Nice to Have):**
| CSV Column | Jira Field | Validation |
|------------|------------|------------|
| Use Case ID | Use Case ID | Custom text field |

#### 3.4 Field Mapping Validation
Before importing, verify:

```bash
✅ Epic Link column maps to Epic Link field
✅ Epic values match imported epic keys (EPIC-001, etc.)
✅ Priority values match Jira priorities
✅ Story Points are numbers (2,3,5,8,13)
✅ Issue Type is set to "Story"
```

## Troubleshooting Common Issues

### Issue 1: Epic Link Mapping Fails
**Problem**: Epic links not working
**Solution**: 
```
1. Ensure epics imported first
2. Check epic keys match exactly (EPIC-001, EPIC-002, etc.)
3. Verify Epic Link field exists and is mapped
```

### Issue 2: Story Points Not Importing
**Problem**: Story points appear as text
**Solution**:
```
1. Ensure Story Points field is Number type
2. Check values are numeric (2,3,5,8,13)
3. Map to correct Story Points field
```

### Issue 3: Labels Not Creating
**Problem**: Labels not being applied
**Solution**:
```
1. Enable "Create missing labels" in import settings
2. Check label format (comma-separated, no spaces around commas)
3. Verify Labels field mapping
```

### Issue 4: Components Not Found
**Problem**: Components not being assigned
**Solution**:
```
1. Enable "Create missing components" in import settings
2. Pre-create components manually if needed
3. Check component names match exactly
```

## Post-Import Verification Checklist

### Epic Verification
- [ ] All 13 epics imported successfully
- [ ] Epic story points totals are correct
- [ ] Epic descriptions are complete
- [ ] Epic priorities are assigned

### Story Verification
- [ ] All 340 stories imported successfully
- [ ] Epic links are working (stories show under epics)
- [ ] Story points are numeric and follow Fibonacci
- [ ] Priorities are correctly assigned
- [ ] Labels are applied and searchable
- [ ] Components are assigned correctly
- [ ] Use Case IDs are populated (if mapped)

### Quick Verification Queries
Use these JQL queries to verify import:

```jql
# Check all epics imported
type = Epic

# Check all stories have epic links
type = Story AND "Epic Link" is not EMPTY

# Check story points are valid
type = Story AND "Story Points" in (1,2,3,5,8,13)

# Check specific epic's stories
type = Story AND "Epic Link" = "EPIC-001"

# Check stories with components
type = Story AND component is not EMPTY

# Check stories with labels
type = Story AND labels is not EMPTY
```

## Advanced Mapping Options

### Custom Field Mapping
If you have additional custom fields:

| CSV Data | Custom Field | Purpose |
|----------|--------------|---------|
| Acceptance Criteria | Text Area | Definition of done |
| Business Value | Number | ROI scoring |
| Technical Risk | Select | Risk assessment |
| Dependencies | Text | Inter-story dependencies |

### Bulk Edit After Import
For mass updates after import:

1. **Select Issues**: Use JQL or filters
2. **Bulk Edit**: Tools → Bulk Change
3. **Update Fields**: Modify multiple stories at once
4. **Common Updates**: 
   - Assign to sprints
   - Update story points
   - Add missing labels
   - Set assignees

## Mapping Matrix Summary

### Epic Import: `scrum-board-import.csv`
```
Type → Issue Type (Epic)
ID → Epic Name  
Title → Summary
Description → Description
Priority → Priority
Story Points → Story Points
Use Cases → Labels
```

### Story Import: `usecases-backlog-import.csv`
```
Issue Type → Issue Type (Story)
Summary → Summary
Description → Description  
Epic Link → Epic Link
Priority → Priority
Story Points → Story Points
Labels → Labels
Components → Components
Use Case ID → Use Case ID (custom field)
```

This mapping matrix ensures perfect alignment between your CSV files and Jira's data structure, maintaining all relationships and metadata for effective project management!
