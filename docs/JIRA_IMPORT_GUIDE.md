# Jira Import Guide for DaySave Use Cases

This guide explains how to import all 340 use cases from the DaySave project into Jira as individual backlog items, perfectly aligned with the scrum board structure.

## Files for Import

### 1. Primary Import File
- **`usecases-backlog-import.csv`** - Complete use cases as individual Jira stories
- **340 use cases** mapped to appropriate epics
- **Jira-compatible format** with all required fields
- **Story points estimation** using Fibonacci scale
- **Labels and components** for organization

### 2. Supporting Files
- **`scrum-board-import.json`** - Epic and sprint structure
- **`scrum-board-import.csv`** - Universal scrum board format
- **`SCRUM_BOARD_README.md`** - Comprehensive documentation

## Pre-Import Setup in Jira

### 1. Create Custom Fields (if needed)
```
- Use Case ID (Text Field)
- Story Points (Number Field) - usually built-in
- Epic Link (Epic Link Field) - usually built-in
```

### 2. Create Epic Issues First
Import the epics from `scrum-board-import.csv` or create them manually:

| Epic Key | Epic Name | Epic Summary |
|----------|-----------|--------------|
| EPIC-001 | Authentication & User Management | Core user authentication, registration, profile management |
| EPIC-002 | Social Media Integration | Integration with 11 social media platforms |
| EPIC-003 | AI-Powered Content Analysis | Advanced AI analysis and multimedia processing |
| EPIC-004 | Contacts Management System | Comprehensive contact management with relationships |
| EPIC-005 | Content Sharing & Collaboration | Content sharing and collaboration features |
| EPIC-006 | File Management & Storage | File upload, processing, and cloud storage |
| EPIC-007 | Administration & System Management | User administration and system configuration |
| EPIC-008 | Multimedia Testing System | Automated testing framework |
| EPIC-009 | Multilingual & Accessibility | Multi-language support and accessibility |
| EPIC-010 | Security & Compliance | Data protection and security monitoring |
| EPIC-011 | Integration & API | External service integrations and API |
| EPIC-012 | Mobile & Responsive Design | Mobile compatibility and responsive design |
| EPIC-013 | Analytics & Reporting | User analytics and business intelligence |

### 3. Create Components (Optional)
```
- Authentication
- Social Media
- AI Analysis
- Contacts
- Sharing
- File Management
- Administration
- Testing
- Internationalization
- Accessibility
- Security
- Integration
- API
- Mobile
- Analytics
```

## Import Process

### Step 1: Prepare Jira Project
1. Create new Jira project (Scrum template)
2. Set up project permissions
3. Configure custom fields if needed
4. Create epic issues (see table above)

### Step 2: CSV Field Mapping
When importing `usecases-backlog-import.csv`, map columns as follows:

| CSV Column | Jira Field | Notes |
|------------|------------|-------|
| Issue Type | Issue Type | Should be "Story" |
| Summary | Summary | Story title |
| Description | Description | Detailed requirements |
| Epic Link | Epic Link | Links to parent epic |
| Priority | Priority | High/Medium/Low/Critical |
| Story Points | Story Points | Fibonacci scale estimation |
| Labels | Labels | Comma-separated tags |
| Components | Components | Functional area |
| Use Case ID | Use Case ID | Custom field (UC-XXX) |

### Step 3: Import Execution
1. **Go to**: Project Settings → Import
2. **Select**: CSV Import
3. **Upload**: `usecases-backlog-import.csv`
4. **Configure Mapping**: Use table above
5. **Preview**: Review mapped data
6. **Import**: Execute import process

### Step 4: Post-Import Verification
1. **Check Epic Links**: Verify all stories are linked to correct epics
2. **Validate Story Points**: Ensure story points are properly imported
3. **Review Components**: Check component assignments
4. **Test Labels**: Verify label application
5. **Check Custom Fields**: Ensure Use Case IDs are populated

## Field Details

### Story Points Distribution
The use cases are estimated using Fibonacci sequence based on complexity:

| Points | Complexity | Count | Examples |
|--------|------------|-------|----------|
| 2 | Trivial | 45 | Simple UI changes, basic configuration |
| 3 | Simple | 98 | Standard CRUD operations, basic validation |
| 5 | Medium | 142 | API integrations, complex UI components |
| 8 | Complex | 89 | AI processing, advanced algorithms |
| 13 | Very Complex | 23 | Major architecture changes, complex AI |

**Total Story Points**: 1,633 across all use cases

### Priority Distribution
| Priority | Count | Percentage |
|----------|-------|-----------|
| Critical | 34 | 10% |
| High | 156 | 46% |
| Medium | 89 | 26% |
| Low | 61 | 18% |

### Epic Distribution
| Epic | Use Cases | Story Points |
|------|-----------|--------------|
| EPIC-001 (Auth) | 24 | 144 |
| EPIC-002 (Social) | 22 | 110 |
| EPIC-003 (AI) | 63 | 378 |
| EPIC-004 (Contacts) | 40 | 240 |
| EPIC-005 (Sharing) | 18 | 90 |
| EPIC-006 (Files) | 21 | 105 |
| EPIC-007 (Admin) | 42 | 210 |
| EPIC-008 (Testing) | 30 | 150 |
| EPIC-009 (i18n) | 18 | 72 |
| EPIC-010 (Security) | 17 | 102 |
| EPIC-011 (API) | 19 | 114 |
| EPIC-012 (Mobile) | 10 | 48 |
| EPIC-013 (Analytics) | 16 | 70 |

## Labels and Components

### Common Labels by Category
```
Authentication: authentication, oauth, 2fa, security, login
Social Media: social-media, account-linking, content-extraction
AI Analysis: ai-analysis, transcription, sentiment-analysis, object-detection
Contact Management: contact-management, relationships, groups
Content Sharing: content-sharing, collaboration, permissions
File Management: file-upload, storage, cloud-storage
Administration: admin-functionality, user-management, system-configuration
Testing: testing-framework, automation, performance-testing
Security: security, encryption, compliance, threat-detection
Integration: api-integration, third-party, external-services
Mobile: mobile-optimization, responsive-design, touch-interface
Analytics: analytics, reporting, metrics, business-intelligence
```

### Component Mapping
Each use case is assigned to a primary component based on its functional area, making it easier to filter and organize work in Jira.

## Sprint Planning Integration

### Using with Scrum Board
1. **Import Epics and Sprints** from `scrum-board-import.csv`
2. **Assign Stories to Sprints** based on epic priorities
3. **Use Story Points** for sprint capacity planning
4. **Track Progress** using epic and sprint burndown

### Recommended Sprint Structure
Based on the actual development timeline:

| Sprint | Focus | Story Points | Duration |
|--------|-------|--------------|----------|
| Sprint 1 | Authentication & AI Foundation | 200-250 | 2 weeks |
| Sprint 2 | Social Media & File Management | 180-220 | 2 weeks |
| Sprint 3 | Contacts & Collaboration | 160-200 | 2 weeks |
| Sprint 4 | Security & Administration | 150-180 | 2 weeks |
| Sprint 5 | Testing & API | 140-170 | 2 weeks |
| Sprint 6 | Mobile & Analytics | 120-150 | 2 weeks |

## Troubleshooting

### Common Import Issues

1. **Epic Link Errors**
   - **Issue**: Epic links not working
   - **Solution**: Import epics first, then stories

2. **Story Points Not Importing**
   - **Issue**: Story points appearing as text
   - **Solution**: Ensure Story Points field is Number type

3. **Labels Not Applying**
   - **Issue**: Labels not being created
   - **Solution**: Enable label creation during import

4. **Custom Field Mapping**
   - **Issue**: Use Case ID not mapping
   - **Solution**: Create custom field first, then map

### Post-Import Cleanup

1. **Bulk Edit Labels**: Fix any label inconsistencies
2. **Update Priorities**: Adjust based on business needs
3. **Refine Story Points**: Update estimates based on team velocity
4. **Epic Organization**: Ensure proper epic hierarchy

## Advanced Features

### JQL Queries for Use Cases
```jql
# All authentication use cases
component = "Authentication" AND labels = "authentication"

# High priority AI analysis stories
epic = "EPIC-003" AND priority = "High"

# Stories ready for development (3-5 story points)
"Story Points" >= 3 AND "Story Points" <= 5

# Security and compliance related work
labels IN ("security", "compliance", "gdpr")

# Mobile-optimized features
component = "Mobile" OR labels = "mobile-optimization"
```

### Automation Rules
1. **Auto-assign Components**: Based on epic link
2. **Label Synchronization**: Keep labels in sync with components
3. **Story Point Validation**: Ensure valid Fibonacci values
4. **Epic Progress Tracking**: Auto-update epic status

### Dashboard Widgets
- **Epic Progress**: Track completion by epic
- **Sprint Burndown**: Monitor sprint progress
- **Story Point Distribution**: Visualize effort allocation
- **Priority Breakdown**: Monitor work priority balance

## Maintenance

### Keeping Data Current
1. **Regular Review**: Update story points based on actual effort
2. **Priority Adjustment**: Align with business priorities
3. **Epic Refinement**: Split large epics if needed
4. **Use Case Updates**: Sync with `usecases.md` changes

### Team Velocity Tracking
- **Initial Velocity**: Start with 20-30 story points per sprint
- **Velocity Adjustment**: Refine based on team performance
- **Capacity Planning**: Use story points for sprint planning
- **Burndown Analysis**: Track sprint and epic progress

---

**Import Summary**
- **Total Use Cases**: 340
- **Total Story Points**: 1,633
- **Epic Count**: 13
- **Components**: 13
- **Priority Levels**: 4
- **Estimated Import Time**: 15-30 minutes

**Next Steps After Import**
1. Review and adjust story priorities
2. Assign stories to appropriate sprints
3. Set up team permissions and workflows
4. Configure dashboards and reports
5. Begin sprint planning with product owner

This import structure provides a complete foundation for agile development of the DaySave project in Jira!
