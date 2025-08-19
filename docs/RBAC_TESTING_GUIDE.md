# DaySave RBAC Testing Guide

## Overview

This guide provides step-by-step instructions for testing the Role-Based Access Control (RBAC) system in DaySave. It includes test user setup, testing procedures, and expected outcomes for each role.

## Prerequisites

1. **Application Running**: Ensure DaySave is running locally or on your test environment
2. **Database Access**: Admin access to create/modify users
3. **Test Users Created**: Use the provided script to create test users

## Quick Setup

### 1. Create Test Users

```bash
# Create all test users with default password
node scripts/create-test-users.js create

# Or with custom password
TESTUSER_PASSWORD="YourTestPass123" node scripts/create-test-users.js create

# List created test users
node scripts/create-test-users.js list
```

### 2. Test User Credentials

| Username | Role | Email | Password |
|----------|------|-------|----------|
| `dstestadmin` | admin | dstestadmin@daysave.app | TestUser123! |
| `dstestmanager` | manager | dstestmanager@daysave.app | TestUser123! |
| `dstestmoderator` | moderator | dstestmoderator@daysave.app | TestUser123! |
| `dstesteditor` | editor | dstesteditor@daysave.app | TestUser123! |
| `dstestsupport` | support | dstestsupport@daysave.app | TestUser123! |
| `dstesttester` | tester | dstesttester@daysave.app | TestUser123! |
| `dstestpremium` | premium | dstestpremium@daysave.app | TestUser123! |
| `dstestenterprise` | enterprise | dstestenterprise@daysave.app | TestUser123! |
| `dstestuser` | user | dstestuser@daysave.app | TestUser123! |
| `dstestviewer` | viewer | dstestviewer@daysave.app | TestUser123! |

## Testing Procedures

### Phase 1: Dashboard Access Testing

**Objective**: Verify role-based dashboard elements display correctly

#### Test Steps:
1. **Login with each test user**
2. **Navigate to `/dashboard`**
3. **Observe role-based action buttons**
4. **Check role badge and description**

#### Expected Outcomes:

| Role | Expected Dashboard Elements |
|------|----------------------------|
| **Admin** | ✅ Admin Dashboard, User Management, Content Moderation, Support Tickets, Testing Interface, Analytics |
| **Manager** | ✅ Admin Dashboard, User Management, Content Moderation, Support Tickets, Analytics |
| **Moderator** | ✅ Content Moderation only |
| **Editor** | ❌ No special role-based buttons (standard user view) |
| **Support** | ✅ Support Tickets only |
| **Tester** | ✅ Testing Interface only |
| **Premium** | ✅ Analytics only |
| **Enterprise** | ✅ Analytics only |
| **User** | ❌ No special role-based buttons (standard user view) |
| **Viewer** | ❌ No special role-based buttons (standard user view) |

### Phase 2: Route Access Testing

**Objective**: Test permission-based route access

#### Test Matrix:

| Route | Admin | Manager | Moderator | Editor | Support | Tester | Premium | Enterprise | User | Viewer |
|-------|-------|---------|-----------|--------|---------|--------|---------|------------|------|--------|
| `/admin/dashboard` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/admin/users` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/content` (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/content` (create) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/content/:id` (delete) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/files` (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/files/upload` | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/files/:id` (delete) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/contacts` (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/contacts` (create) | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api-keys` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

#### Testing Steps:

1. **Login as test user**
2. **Navigate to each route**
3. **Record outcome**: ✅ Access granted, ❌ Access denied with error page
4. **Verify error handling**: Check error message quality and navigation options

### Phase 3: Error Handling Testing

**Objective**: Verify graceful error handling for permission failures

#### Test Scenarios:

1. **Web Request Permission Denial**
   - Login as `dstestviewer`
   - Try to access `/content/new`
   - **Expected**: Professional error page with:
     - Clear "Access Denied" message
     - Explanation of missing permissions
     - "Go Back" and "Dashboard" buttons
     - Current role displayed

2. **AJAX Request Permission Denial**
   - Login as `dstestviewer`
   - Try to create content via AJAX
   - **Expected**: JSON error response with:
     - Clear error message
     - Required and missing permissions listed
     - User role information

3. **Form Submission Permission Denial**
   - Login as `dstestviewer`
   - Try to submit a contact form
   - **Expected**: Form prevented, modal shown with helpful message

### Phase 4: Admin User Management Testing

**Objective**: Verify admin can manage user roles

#### Test Steps:

1. **Login as `dstestadmin`**
2. **Navigate to `/admin/users`**
3. **Verify all test users are visible**
4. **Test role assignment**:
   - Select a user (e.g., `dstestuser`)
   - Change their role to `moderator`
   - Save changes
   - Verify role updated in database
5. **Test role impact**:
   - Login as the modified user
   - Verify new role permissions work
   - Check dashboard shows new role-based buttons

### Phase 5: Permission Granularity Testing

**Objective**: Test specific permission combinations

#### Content Management Tests:

1. **Content Creation** (`content.create`)
   - ✅ Should work: admin, manager, moderator, editor, tester, premium, enterprise, user
   - ❌ Should fail: support, viewer

2. **Content Moderation** (`content.moderate`)
   - ✅ Should work: admin, manager, moderator
   - ❌ Should fail: all others

3. **Content Deletion** (`content.delete`)
   - ✅ Should work: admin, manager, premium, enterprise, user
   - ❌ Should fail: all others

#### File Management Tests:

1. **File Upload** (`files.upload`)
   - ✅ Should work: admin, manager, editor, tester, premium, enterprise, user
   - ❌ Should fail: moderator, support, viewer

2. **File Analysis** (`files.analyze`)
   - ✅ Should work: admin, manager, moderator, editor, tester, premium, enterprise, user
   - ❌ Should fail: support, viewer

## Automated Testing

### Run Comprehensive Test Suite

```bash
# Run the automated role system test
node scripts/test-role-system.js

# Check specific user permissions
node scripts/manage-user-roles.js user-permissions dstestmoderator

# View all roles and permissions
node scripts/manage-user-roles.js list-roles
```

## Troubleshooting

### Common Issues

1. **Test Users Not Created**
   ```bash
   # Check if users exist
   node scripts/create-test-users.js list
   
   # Recreate if needed
   node scripts/create-test-users.js create
   ```

2. **Permission Errors Not Showing**
   - Check browser console for JavaScript errors
   - Verify `permission-error-handler.js` is loaded
   - Check Bootstrap 5 is available

3. **Role Changes Not Taking Effect**
   - Clear browser cache
   - Logout and login again
   - Check database for role assignment

4. **Error Pages Not Displaying Correctly**
   - Verify error.ejs template is updated
   - Check for missing Bootstrap/FontAwesome resources

### Debugging Commands

```bash
# Check user role assignments
node scripts/manage-user-roles.js list-users

# View specific user permissions
node scripts/manage-user-roles.js user-permissions username

# Reset test user roles
node scripts/create-test-users.js delete
node scripts/create-test-users.js create
```

## Expected Test Results Summary

### ✅ What Should Work:

1. **Role-based dashboard elements** display correctly
2. **Permission-based route access** enforced properly
3. **Graceful error handling** with professional messages
4. **Admin user management** functions correctly
5. **Permission granularity** works as designed

### 🔍 Key Success Indicators:

- Users see appropriate dashboard buttons for their role
- Access denied errors are user-friendly and informative
- Admin can successfully manage user roles
- Permission checks prevent unauthorized actions
- Error pages provide clear guidance and navigation

### 📊 Test Completion Checklist:

- [ ] All 10 test users created successfully
- [ ] Dashboard role-based elements verified for each role
- [ ] Route access matrix tested and confirmed
- [ ] Error handling tested for web and AJAX requests
- [ ] Admin user management functionality verified
- [ ] Permission granularity spot-checked
- [ ] No broken functionality for existing features

## Cleanup

After testing, you can remove test users:

```bash
# Remove all test users
node scripts/create-test-users.js delete
```

## Support

If you encounter issues during testing:

1. Check the application logs for detailed error information
2. Verify database connectivity and role/permission data
3. Ensure all middleware is properly loaded
4. Test with a fresh browser session (clear cache/cookies)

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Tested With**: DaySave v1.4.1
