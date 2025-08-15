# Git Commits to Jira Stories Integration Guide

This guide explains how to link git commits to Jira user stories using two different approaches: commit tasks and issue links.

## 📋 **Files Created**

### 1. **`git-commits-to-stories-mapping.csv`**
- **Purpose**: Creates Task issues for each git commit
- **Links**: Maps commits to related user stories
- **Contains**: 50 recent commits as individual tasks

### 2. **`git-commits-links-import.csv`** 
- **Purpose**: Creates "implements" links between commits and stories
- **Format**: Issue link relationships
- **Contains**: Direct commit-to-story relationships

## 🎯 **Two Integration Approaches**

### **Approach 1: Commit Tasks (Recommended)**
Create individual Task issues for each commit that reference the related user story.

**Benefits:**
- ✅ Full commit details preserved in Jira
- ✅ Individual story points for development work
- ✅ Sprint assignment for commits
- ✅ Searchable commit history
- ✅ Traceability from requirement to implementation

### **Approach 2: Issue Links**
Create direct "implements" links between existing stories and commits.

**Benefits:**
- ✅ Cleaner issue list (no extra tasks)
- ✅ Direct story-to-commit relationship
- ✅ Simpler structure
- ✅ Less overhead

## 📊 **Commit-Story Mapping Structure**

### **Example Mapping:**
```
Commit: ea7c935 "Make related contacts clickable in relationship modals"
→ Related Story: 140 "View relationship graphs and connections"
→ Epic: 4 "Contacts Management System"
→ Sprint: Sprint 4
```

### **Key Relationships:**
| Commit Hash | Story ID | Epic | Description |
|-------------|----------|------|-------------|
| ea7c935 | 140 | Contacts | Related contacts clickable |
| 73e5ada | 60 | AI Analysis | YouTube URL submission fix |
| 6fd6c7c | 227 | Administration | AI usage tracking audit |
| 0a4b731 | 22 | Authentication | WebAuthn configuration |
| 14fafe2 | 197 | File Management | GCS migration |

## 🚀 **Import Process**

### **Step 1: Import Commit Tasks (Approach 1)**
1. **File**: `git-commits-to-stories-mapping.csv`
2. **Navigate**: Settings → System → External System Import → CSV
3. **Field Mapping**:
   - Work Item ID → Work Item ID
   - Issue Type → Issue Type (Task)
   - Summary → Summary
   - Related Stories → Custom Field
   - Commit Hash → Custom Field
   - Epic → Epic Link

### **Step 2: Import Issue Links (Approach 2)**
1. **File**: `git-commits-links-import.csv`
2. **Navigate**: Settings → System → External System Import → CSV
3. **Field Mapping**:
   - Issue Link Type → Issue Link Type ("implements")
   - Source Issue Key → Source Issue
   - Destination Issue Key → Destination Issue

## 🔧 **Custom Fields Setup**

### **Required Custom Fields for Commit Tasks:**
| Field Name | Type | Purpose |
|------------|------|---------|
| Commit Hash | Text | Git commit hash |
| Commit Date | Date | Commit timestamp |
| Commit Message | Text Area | Full commit message |
| Related Stories | Text | User story references |

### **Jira Configuration:**
```
1. Go to Settings → Issues → Custom Fields
2. Create "Commit Hash" (Text Field)
3. Create "Commit Date" (Date Field)  
4. Create "Commit Message" (Text Area)
5. Create "Related Stories" (Text Field)
6. Add fields to Task issue type screen
```

## 📈 **Sprint and Epic Assignment**

### **Sprint Mapping by Date:**
```
Sprint 3 (Aug 4-9, 2025):
- Contact management fixes
- Authentication improvements
- File migration work

Sprint 4 (Aug 14-15, 2025):
- Security enhancements
- UI improvements
- Documentation updates
```

### **Epic Distribution:**
- **Authentication (Epic 1)**: 15 commits
- **Contacts (Epic 4)**: 12 commits  
- **AI Analysis (Epic 3)**: 8 commits
- **Security (Epic 10)**: 7 commits
- **File Management (Epic 6)**: 5 commits
- **Administration (Epic 7)**: 4 commits

## 🔍 **Verification Queries**

### **After Import - Verification JQL:**
```jql
# Check all commit tasks
type = Task AND summary ~ "commit"

# Verify commit-story relationships
type = Task AND "Related Stories" is not EMPTY

# Check commits by epic
type = Task AND "Epic Link" = "Authentication & User Management"

# Verify commits by sprint
type = Task AND sprint = "Sprint 4"

# Check issue links (if using approach 2)
issue in linkedIssues("Story-123") AND linkType = "implements"
```

## 📋 **Commit Analysis Summary**

### **Development Activity Overview:**
- **Total Commits Mapped**: 50
- **Date Range**: Aug 4 - Aug 15, 2025
- **Most Active Areas**: Contacts, Authentication, Security
- **Story Points**: 141 total (commits mapped)

### **Key Development Themes:**
1. **Contact Management Fixes** (12 commits)
2. **Authentication Security** (11 commits)
3. **AI Analysis Improvements** (8 commits)
4. **Security & CSP** (7 commits)
5. **File Management** (5 commits)

### **Sprint Velocity Tracking:**
- **Sprint 3**: 89 story points (Aug 4-9)
- **Sprint 4**: 52 story points (Aug 14-15)
- **Average**: 3.2 story points per commit

## 🔄 **Automated Integration Options**

### **Future Automation:**
1. **Git Hooks**: Auto-create Jira tasks on commit
2. **CI/CD Integration**: Link commits during deployment
3. **Jira Smart Commits**: Use commit message patterns
4. **API Integration**: Sync commits via Jira REST API

### **Smart Commit Format:**
```bash
git commit -m "JRA-123 #comment Fix authentication bug #time 2h"
```

## 📊 **Reporting Benefits**

### **With Commit Integration:**
- ✅ **Velocity Tracking**: Actual development effort per story
- ✅ **Burndown Accuracy**: Real progress vs estimated
- ✅ **Code Coverage**: Which stories have implementation
- ✅ **Developer Productivity**: Commits per developer per sprint
- ✅ **Quality Metrics**: Commits per story point
- ✅ **Traceability**: Requirements → Stories → Commits → Deployment

### **Dashboard Widgets:**
- Commits per sprint
- Story implementation status
- Developer contribution by epic
- Code quality metrics
- Sprint velocity with actual effort

## 🎯 **Best Practices**

### **Commit Message Standards:**
```
✅ Good: "Fix YouTube URL submission - improve error handling (Story-60)"
✅ Good: "Implement contact groups functionality for UC-136"
❌ Bad: "bug fix"
❌ Bad: "updates"
```

### **Story Point Estimation for Commits:**
- **1-2 points**: Bug fixes, small improvements
- **3-5 points**: Feature implementations, moderate changes
- **8+ points**: Major refactoring, complex features

### **Maintenance:**
1. **Regular Sync**: Import new commits weekly
2. **Story Linking**: Ensure commits reference correct stories
3. **Sprint Assignment**: Assign commits to appropriate sprints
4. **Quality Review**: Verify commit-story relationships

This integration provides complete traceability from user requirements through implementation to deployment!
