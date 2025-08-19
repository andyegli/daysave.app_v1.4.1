# DaySave User Roles and Permissions Guide

## Overview

DaySave now includes a comprehensive Role-Based Access Control (RBAC) system that provides fine-grained control over user permissions. This system allows administrators to assign specific roles to users, each with their own set of permissions.

## Available User Roles

### 1. **Admin** 
- **Description**: Administrator role with full access
- **Permissions**: 38 permissions (full system access)
- **Use Case**: System administrators, owners

### 2. **Manager**
- **Description**: Team manager with user management and reporting capabilities  
- **Permissions**: 23 permissions
- **Use Case**: Team leads, department managers
- **Key Features**: User management, reporting, content management

### 3. **Enterprise**
- **Description**: Enterprise user with full feature access and custom integrations
- **Permissions**: 24 permissions
- **Use Case**: Large organizations, enterprise customers
- **Key Features**: Custom integrations, advanced user management

### 4. **Premium**
- **Description**: Premium user with enhanced features and higher limits
- **Permissions**: 19 permissions
- **Use Case**: Premium subscribers, power users
- **Key Features**: Enhanced content management, API access

### 5. **Editor**
- **Description**: Content editor with advanced content management capabilities
- **Permissions**: 14 permissions
- **Use Case**: Content creators, editors
- **Key Features**: Content creation, publishing, file management

### 6. **Moderator**
- **Description**: Content moderator with ability to review and manage user content
- **Permissions**: 10 permissions
- **Use Case**: Content moderators, community managers
- **Key Features**: Content moderation, publishing approval

### 7. **Support**
- **Description**: Customer support role with limited admin capabilities
- **Permissions**: 9 permissions
- **Use Case**: Customer support representatives
- **Key Features**: User assistance, ticket management

### 8. **Tester**
- **Description**: Testing role with access to beta features and testing interfaces
- **Permissions**: 12 permissions
- **Use Case**: QA testers, beta users
- **Key Features**: Testing interfaces, debug access

### 9. **User** (Default)
- **Description**: Standard user role
- **Permissions**: 16 permissions
- **Use Case**: Regular users, standard accounts
- **Key Features**: Basic content and file management

### 10. **Viewer**
- **Description**: Read-only access to content and basic features
- **Permissions**: 4 permissions
- **Use Case**: Read-only accounts, guests
- **Key Features**: View content, download files

## Permission Categories

The system includes 38 permissions organized into 10 categories:

### Content Management
- `content.create` - Create new content items
- `content.read` - View content items
- `content.update` - Edit content items
- `content.delete` - Delete content items
- `content.moderate` - Moderate user content
- `content.publish` - Publish content

### File Management
- `files.upload` - Upload files
- `files.download` - Download files
- `files.delete` - Delete files
- `files.analyze` - Run AI analysis on files

### Contact Management
- `contacts.create` - Create contacts
- `contacts.read` - View contacts
- `contacts.update` - Edit contacts
- `contacts.delete` - Delete contacts
- `contacts.import` - Import contacts
- `contacts.export` - Export contacts

### User Management
- `users.create` - Create new users
- `users.read` - View user information
- `users.update` - Edit user information
- `users.delete` - Delete users
- `users.manage_roles` - Assign roles to users

### Admin Functions
- `admin.dashboard` - Access admin dashboard
- `admin.settings` - Manage system settings
- `admin.analytics` - View system analytics
- `admin.logs` - View system logs
- `admin.backup` - Create system backups

### API Management
- `api.create_keys` - Create API keys
- `api.manage_keys` - Manage API keys
- `api.view_usage` - View API usage statistics

### Testing & Development
- `testing.access` - Access testing interfaces
- `testing.multimedia` - Access multimedia testing
- `dev.debug` - Access debug information

### Support Functions
- `support.view_tickets` - View support tickets
- `support.respond` - Respond to support requests
- `support.escalate` - Escalate support issues

### Reporting
- `reports.view` - View reports
- `reports.create` - Create custom reports
- `reports.export` - Export reports

## Role Management

### Using the Management Script

A comprehensive role management script is available at `scripts/manage-user-roles.js`:

```bash
# List all available roles
node scripts/manage-user-roles.js list-roles

# List all permissions
node scripts/manage-user-roles.js list-permissions

# Assign a role to a user
node scripts/manage-user-roles.js assign-role <username> <role>

# View user permissions
node scripts/manage-user-roles.js user-permissions <username>

# List users (optionally filtered by role)
node scripts/manage-user-roles.js list-users [role]
```

### Examples

```bash
# Assign admin role to a user
node scripts/manage-user-roles.js assign-role john.doe admin

# View permissions for a specific user
node scripts/manage-user-roles.js user-permissions john.doe

# List all admin users
node scripts/manage-user-roles.js list-users admin
```

## Middleware Usage

### In Routes

```javascript
const { requireRole, requirePermission, isAdmin } = require('../middleware/auth');

// Require specific role
router.get('/admin', requireRole('admin'), (req, res) => {
  // Admin only route
});

// Require multiple roles
router.get('/manage', requireRole(['admin', 'manager']), (req, res) => {
  // Admin or manager only
});

// Require specific permission
router.post('/content', requirePermission('content.create'), (req, res) => {
  // Users with content.create permission only
});

// Require multiple permissions
router.delete('/content/:id', requirePermission(['content.delete', 'content.moderate']), (req, res) => {
  // Users with both permissions
});

// Admin access (includes managers)
router.get('/dashboard', isAdmin, (req, res) => {
  // Admin or manager access
});
```

### Permission Checking in Code

```javascript
const { hasPermission } = require('../middleware/auth');

// Check if user has permission
if (await hasPermission(req.user, 'content.moderate')) {
  // User can moderate content
}

// Check multiple permissions
if (await hasPermission(req.user, ['files.upload', 'files.analyze'])) {
  // User can upload and analyze files
}
```

## Database Structure

### Tables
- `roles` - Role definitions
- `permissions` - Permission definitions  
- `role_permissions` - Many-to-many relationship between roles and permissions
- `users` - User accounts with `role_id` foreign key

### Seeders
- `20250819000000-add-additional-roles.js` - Creates the new roles
- `20250819000001-add-role-permissions.js` - Creates permissions and assigns them to roles

## Security Features

- **Comprehensive Logging**: All role and permission checks are logged
- **Graceful Degradation**: Missing roles/permissions fail safely
- **AJAX Support**: Proper JSON responses for API calls
- **Session Integration**: Works with existing authentication system
- **Database Backup**: Automatic backup before role changes

## Migration Notes

- Existing users retain their current roles (`admin` or `user`)
- New permissions are automatically assigned based on role mappings
- The system is backward compatible with existing authentication
- Admin users now include both `admin` and `manager` roles for admin access

## Best Practices

1. **Principle of Least Privilege**: Assign the minimum role necessary
2. **Regular Audits**: Use the management script to review user permissions
3. **Role Hierarchy**: Consider the permission levels when assigning roles
4. **Testing**: Always test role assignments in development first
5. **Documentation**: Keep track of custom role assignments

## Troubleshooting

### Common Issues

1. **User has no role**: Assign a role using the management script
2. **Permission denied**: Check user's role permissions with `user-permissions` command
3. **Role not found**: Verify role exists with `list-roles` command

### Debugging

```javascript
// In your routes, check user role and permissions
console.log('User role:', req.user.Role?.name);
console.log('User permissions:', await hasPermission(req.user, 'permission.name'));
```

## Future Enhancements

- Web-based role management interface
- Custom role creation
- Time-based role assignments
- Role inheritance
- Permission groups
- Audit trail for role changes

---

For technical support or questions about the role system, refer to the management script help:

```bash
node scripts/manage-user-roles.js
```
