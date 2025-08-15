# Jira Data Model: Work Items and Relationships

This document explains how Jira organizes and links work items, specifically for importing the DaySave project structure.

## Core Jira Data Structure

### Primary Entities

```
Project
├── Issue Types (Epic, Story, Task, Bug, Subtask)
├── Fields (System + Custom)
├── Workflows (To Do → In Progress → Done)
├── Components (Functional areas)
├── Versions (Releases)
├── Sprints (Time-boxed iterations)
└── Boards (Scrum/Kanban views)
```

## Issue Type Hierarchy

### 1. Epic (Parent Level)
- **Purpose**: Large feature or theme
- **Contains**: Multiple related stories
- **Duration**: Spans multiple sprints
- **Examples**: "Authentication System", "AI Analysis Pipeline"

### 2. Story (Child Level)
- **Purpose**: User-facing functionality
- **Belongs to**: One epic (via Epic Link)
- **Duration**: Completed within 1-2 sprints
- **Examples**: "User Registration", "OAuth Integration"

### 3. Subtask (Grandchild Level)
- **Purpose**: Technical implementation steps
- **Belongs to**: One story/task (via Parent Link)
- **Duration**: Completed within days
- **Examples**: "Create login form", "Add validation"

## Key Relationships and Links

### Epic → Story Relationship
```
Epic: EPIC-001 "Authentication & User Management"
├── Story: UC-001 "User Registration with Email/Password"
├── Story: UC-002 "Register using Google OAuth 2.0"
├── Story: UC-003 "Register using Microsoft OAuth 2.0"
└── Story: UC-024 "Session management and logout"
```

**Implementation**: Via **Epic Link** field
- **Field Type**: Epic Link (system field)
- **Values**: EPIC-001, EPIC-002, etc.
- **Purpose**: Groups related stories under themes

### Story → Sprint Relationship
```
Sprint 1: "Foundation Sprint"
├── Story: UC-001 (from EPIC-001)
├── Story: UC-002 (from EPIC-001)
├── Story: UC-062 (from EPIC-003)
└── Story: UC-025 (from EPIC-002)
```

**Implementation**: Via **Sprint** field
- **Field Type**: Sprint picker
- **Values**: Sprint names/IDs
- **Purpose**: Time-boxed delivery planning

## Essential Fields for Import

### System Fields (Built-in)
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| **Issue Type** | Select | Defines work item type | Epic, Story, Task |
| **Summary** | Text | Brief title | "User Registration" |
| **Description** | Rich Text | Detailed requirements | Implementation details |
| **Priority** | Select | Business importance | Critical, High, Medium, Low |
| **Status** | Workflow | Current state | To Do, In Progress, Done |
| **Assignee** | User | Who's working on it | john.doe@company.com |
| **Reporter** | User | Who created it | product.owner@company.com |

### Custom Fields (Project-specific)
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| **Epic Link** | Epic Link | Links story to epic | EPIC-001 |
| **Story Points** | Number | Effort estimation | 1, 2, 3, 5, 8, 13 |
| **Sprint** | Sprint | Sprint assignment | Sprint 1, Sprint 2 |
| **Use Case ID** | Text | Traceability | UC-001, UC-002 |
| **Components** | Multi-select | Functional area | Authentication, AI Analysis |

## Data Model for DaySave Import

### Project Structure
```
DaySave Project
├── 13 Epics (EPIC-001 to EPIC-013)
├── 340 Stories (UC-001 to UC-340)
├── 7 Sprints (SPRINT-001 to SPRINT-007)
├── 13 Components (Authentication, AI Analysis, etc.)
└── Custom Fields (Epic Link, Story Points, Use Case ID)
```

### Epic Mapping
| Epic ID | Name | Stories Count | Story Points |
|---------|------|---------------|--------------|
| EPIC-001 | Authentication & User Management | 24 | 89 |
| EPIC-002 | Social Media Integration | 22 | 55 |
| EPIC-003 | AI-Powered Content Analysis | 63 | 144 |
| EPIC-004 | Contacts Management System | 40 | 89 |
| EPIC-005 | Content Sharing & Collaboration | 18 | 34 |

### Story-Epic Relationships
```sql
-- Example relationships in Jira's data model
Story UC-001 → Epic Link → EPIC-001
Story UC-002 → Epic Link → EPIC-001
Story UC-025 → Epic Link → EPIC-002
Story UC-062 → Epic Link → EPIC-003
```

### Sprint Assignments
```
Sprint 1 (Foundation):
- Stories from EPIC-001 (Authentication)
- Stories from EPIC-003 (AI Analysis)
- Total: ~89 story points

Sprint 2 (Integration):
- Stories from EPIC-002 (Social Media)
- Stories from EPIC-006 (File Management)  
- Total: ~77 story points
```

## Import Sequence and Dependencies

### Step 1: Project Setup
1. **Create Jira Project** (Scrum template)
2. **Configure Issue Types**: Epic, Story, Task, Bug
3. **Add Custom Fields**: Epic Link, Story Points, Use Case ID
4. **Create Components**: Authentication, AI Analysis, etc.

### Step 2: Epic Creation
```
Method A: Manual Creation
- Create 13 epics manually
- Set Epic Name (EPIC-001, etc.)
- Add descriptions and story points

Method B: CSV Import
- Import epic data via CSV
- Map to Epic issue type
```

### Step 3: Story Import
```
CSV Import with Epic Links:
- Import 340 stories
- Map Epic Link field to connect stories to epics
- Ensure Epic Link values match existing epic names
```

### Step 4: Sprint Setup
```
Create Sprints:
- Sprint 1: 2025-07-16 to 2025-07-22
- Sprint 2: 2025-07-22 to 2025-07-29
- etc.

Assign Stories to Sprints:
- Based on epic priorities
- Consider story dependencies
- Balance story points per sprint
```

## Field Mapping for CSV Import

### Epic Import Fields
```csv
Issue Type,Epic Name,Summary,Description,Priority,Story Points
Epic,EPIC-001,Authentication & User Management,Core user authentication...,Critical,89
```

### Story Import Fields
```csv
Issue Type,Summary,Description,Epic Link,Priority,Story Points,Use Case ID
Story,User Registration,Implement basic user registration...,EPIC-001,Critical,8,UC-001
```

## Jira Database Relationships (Logical View)

### Tables and Connections
```
Issues Table:
- id (primary key)
- issue_type_id → Issue Types
- summary, description
- priority_id → Priorities
- status_id → Statuses

Custom Field Values:
- issue_id → Issues.id
- custom_field_id → Custom Fields
- string_value (for Epic Link: "EPIC-001")
- number_value (for Story Points: 8)

Issue Links:
- source_issue_id → Issues.id
- dest_issue_id → Issues.id  
- link_type_id → Link Types
```

### Epic-Story Link Mechanism
```
Epic Issue: EPIC-001 (id: 12345)
Story Issue: UC-001 (id: 67890)

Custom Field Value:
- issue_id: 67890 (story)
- custom_field_id: 10001 (Epic Link field)
- string_value: "EPIC-001"
```

## Best Practices for Import

### 1. Data Validation
- **Epic Names**: Must be unique and consistent
- **Story Points**: Use Fibonacci sequence (1,2,3,5,8,13)
- **Epic Links**: Must reference existing epic names exactly

### 2. Import Order
1. **Epics first** (creates parent items)
2. **Stories second** (creates children with links)
3. **Sprints third** (time-boxed containers)
4. **Story-Sprint assignments** (via bulk edit or planning)

### 3. Error Prevention
- **Test with small subset** before full import
- **Verify field mappings** in preview
- **Check epic link consistency** 
- **Validate story point values**

## Post-Import Verification

### JQL Queries for Validation
```jql
-- Check all epics imported
type = Epic

-- Verify epic-story links work
type = Story AND "Epic Link" is not EMPTY

-- Check story points are valid
type = Story AND "Story Points" in (1,2,3,5,8,13)

-- Verify specific epic's stories
type = Story AND "Epic Link" = "EPIC-001"

-- Check unlinked stories (should be none)
type = Story AND "Epic Link" is EMPTY
```

### Expected Results
- ✅ **13 Epics**: All with proper names and descriptions
- ✅ **340 Stories**: All linked to appropriate epics  
- ✅ **Epic Hierarchy**: Visible in backlog and board views
- ✅ **Story Points**: Properly summed at epic level
- ✅ **Traceability**: Use Case IDs maintained

This data model ensures proper hierarchical organization and enables effective agile project management in Jira!
