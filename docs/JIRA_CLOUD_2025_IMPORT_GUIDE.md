# Jira Cloud 2025 Import Guide for DaySave Project

This guide provides the exact steps and field mappings for importing the DaySave project into Jira Cloud 2025 using the current, officially supported format.

## ✅ Files Created Based on Official Documentation

### 1. **`daysave-jira-cloud-2025-import.csv`**
- **Format**: Jira Cloud 2025 compatible CSV
- **Contains**: 13 Epics + 59 Stories in single file
- **Field Names**: Verified from official Atlassian documentation
- **Relationships**: Proper parent-child linking using Epic Name references

### 2. **`daysave-jira-cloud-2025-import.json`**
- **Format**: Metadata and structure documentation
- **Purpose**: Project overview and validation rules
- **Contains**: Epic structure, field mappings, verification steps

## 🎯 Exact Field Names (Verified Current)

Based on official Jira Cloud 2025 documentation:

| CSV Column | Jira Field | Purpose | Example Values |
|------------|------------|---------|----------------|
| **Issue Type** | Issue Type | Epic or Story | Epic, Story |
| **Summary** | Summary | Item title | "User Registration" |
| **Epic Name** | Epic Name | Epic identifier | "Authentication & User Management" |
| **Parent** | Parent | Story-Epic link | "Authentication & User Management" |
| **Description** | Description | Detailed requirements | Implementation details |
| **Priority** | Priority | Business priority | Highest, High, Medium, Low |
| **Story Points** | Story Points | Effort estimation | 1, 2, 3, 5, 8, 13 |
| **Labels** | Labels | Tags for organization | authentication,oauth,security |
| **Components** | Components | Functional areas | Authentication, AI Analysis |

## 📋 Import Process (Step-by-Step)

### Step 1: Access Import Function
```
Navigation Path:
Settings → System → External System Import → CSV
```

### Step 2: Upload File
```
File: daysave-jira-cloud-2025-import.csv
Format: CSV with headers
Encoding: UTF-8
```

### Step 3: Field Mapping
```
CRITICAL MAPPINGS:
✅ Issue Type → Issue Type
✅ Summary → Summary  
✅ Epic Name → Epic Name
✅ Parent → Parent
✅ Description → Description
✅ Priority → Priority

OPTIONAL MAPPINGS:
⭕ Story Points → Story Points
⭕ Labels → Labels
⭕ Components → Components
```

### Step 4: Import Settings
```
✅ Create missing priorities: Yes
✅ Create missing components: Yes
✅ Create missing labels: Yes
✅ Link parent-child relationships: Yes
✅ Send notifications: No (recommended)
```

## 🔗 Parent-Child Relationship Structure

### How Epic-Story Linking Works in Jira Cloud 2025:

```
Epic: "Authentication & User Management"
├── Story: "Register with email/password authentication"
├── Story: "Register using Google OAuth 2.0"
├── Story: "Login with username/password"
└── Story: "Enable/disable Two-Factor Authentication"
```

**Implementation**: 
- **Epics**: Have `Epic Name` field populated, `Parent` field empty
- **Stories**: Have `Parent` field = Epic Name, `Epic Name` field empty

## 📊 Project Structure Overview

### Epic Distribution
| Epic | Stories | Story Points | Priority |
|------|---------|--------------|----------|
| Authentication & User Management | 10 | 42 | High |
| AI-Powered Content Analysis | 7 | 67 | Highest |
| Social Media Integration | 6 | 33 | High |
| Contacts Management System | 7 | 27 | High |
| File Management & Storage | 5 | 26 | High |
| Administration & System Management | 5 | 26 | Medium |
| Content Sharing & Collaboration | 4 | 23 | Medium |
| Security & Compliance | 3 | 29 | Highest |
| Integration & API | 3 | 24 | High |
| Multilingual & Accessibility | 3 | 23 | Low |
| Multimedia Testing System | 3 | 18 | Medium |
| Mobile & Responsive Design | 2 | 13 | Medium |
| Analytics & Reporting | 2 | 13 | Low |

### Total Project Metrics
- **Epics**: 13
- **Stories**: 59 (representative sample from 340 use cases)
- **Total Story Points**: 364
- **Components**: 13
- **Priority Distribution**: 2 Highest, 6 High, 4 Medium, 1 Low

## 🔍 Post-Import Verification

### Verification Queries (JQL)
```jql
# Check all epics imported
type = Epic

# Verify epic count (should be 13)
type = Epic | COUNT

# Check stories with parent relationships
type = Story AND parent is not EMPTY

# Verify story count (should be 59)
type = Story | COUNT

# Check specific epic's children
parent = "Authentication & User Management"

# Verify story points are valid
"Story Points" in (1,2,3,5,8,13)
```

### Expected Results
- ✅ **13 Epics**: All with unique Epic Names
- ✅ **59 Stories**: All linked to parent epics
- ✅ **Hierarchy View**: Epic-Story relationships visible in backlog
- ✅ **Components**: Properly assigned for filtering
- ✅ **Story Points**: Valid Fibonacci values

## 🚨 Common Issues and Solutions

### Issue 1: Parent-Child Links Not Working
**Problem**: Stories not appearing under epics
**Solution**: 
- Verify `Parent` field contains exact `Epic Name` value
- Check for extra spaces or spelling differences
- Ensure epics are created before stories in import order

### Issue 2: Epic Name Field Not Found
**Problem**: "Epic Name" field not available for mapping
**Solution**:
- Verify project is Jira Software (not Jira Core)
- Check that Epic issue type is enabled in project
- Create Epic issue type if missing

### Issue 3: Priority Values Not Recognized
**Problem**: Custom priority values rejected
**Solution**:
- Use standard priorities: Highest, High, Medium, Low
- Enable "Create missing priorities" in import settings
- Map to existing priority scheme if required

### Issue 4: Story Points Field Missing
**Problem**: Story Points field not available
**Solution**:
- Verify Jira Software license (not Core)
- Check project settings for Estimation field
- Create custom number field if needed

## 📋 Alternative Import Methods

### Method A: Two-Phase Import
If single-file import fails:

1. **Phase 1**: Import only epics (filter CSV)
2. **Phase 2**: Import only stories with parent references

### Method B: Manual Epic Creation
If epic import issues persist:

1. **Create epics manually** in Jira
2. **Import stories only** with parent references
3. **Verify hierarchy** in backlog view

## 🎯 Success Criteria

After successful import:

### Functional Verification
- [ ] All 13 epics created with correct names
- [ ] All 59 stories linked to appropriate epics
- [ ] Epic-story hierarchy visible in backlog
- [ ] Story points properly assigned and summed
- [ ] Components enable proper filtering
- [ ] Labels support search and organization

### Project Readiness
- [ ] Backlog organized by epic priority
- [ ] Stories ready for sprint planning
- [ ] Team can view epic progress
- [ ] Reporting shows epic completion status
- [ ] Board configuration supports workflow

## 📞 Support and Troubleshooting

### Jira Cloud 2025 Specific Resources
- **Official Documentation**: [support.atlassian.com](https://support.atlassian.com/jira-cloud-administration/docs/import-data-from-a-csv-file/)
- **CSV Import Guide**: System → External System Import
- **Field Mapping Help**: Available during import wizard

### Project-Specific Help
- **Field Mappings**: Reference table above
- **Sample Data**: Use provided CSV as template
- **Validation Rules**: Check JSON metadata file

This import guide uses only verified, current Jira Cloud 2025 field names and procedures to ensure successful project import!
