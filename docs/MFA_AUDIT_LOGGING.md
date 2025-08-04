# MFA Audit Logging Documentation

## Overview
This document details all Multi-Factor Authentication (MFA) related events that are logged for security auditing and compliance purposes. All events are logged both to file logs and the database audit table.

## User-Initiated MFA Events

### MFA Setup Process
| Event | Description | Key Fields |
|-------|-------------|------------|
| `MFA_SETUP_ALREADY_ENABLED` | User attempts to setup MFA when already enabled | userId, ip, userAgent |
| `MFA_SETUP_INITIATED` | User begins MFA setup process | userId, userEmail, ip, userAgent |
| `MFA_SETUP_ERROR` | Error during MFA setup | userId, userEmail, error details |

### MFA Verification & Enablement
| Event | Description | Key Fields |
|-------|-------------|------------|
| `MFA_VERIFY_NO_SECRET` | User attempts verification without secret | userId, ip, userAgent |
| `MFA_TOTP_VERIFY_SUCCESS` | Successful TOTP code verification | userId, userEmail, codeLength, attemptedAt |
| `MFA_TOTP_VERIFY_FAILED` | Failed TOTP code verification | userId, userEmail, codeLength, attemptedAt |
| `MFA_VERIFY_FAILED` | General MFA verification failure | userId, reason |
| `MFA_BACKUP_CODES_GENERATED` | Backup codes generated for user | userId, userEmail, codeCount, generatedAt |
| `MFA_ENABLED_SUCCESS` | MFA successfully enabled for user | userId, userEmail |

### MFA Disable Process  
| Event | Description | Key Fields |
|-------|-------------|------------|
| `MFA_DISABLE_FAILED` | Failed MFA disable attempt | userId, reason (invalid_password/invalid_code) |
| `MFA_DISABLE_TOTP_VERIFY_SUCCESS` | Successful TOTP verification for disable | userId, userEmail, codeLength, attemptedAt |
| `MFA_DISABLE_TOTP_VERIFY_FAILED` | Failed TOTP verification for disable | userId, userEmail, codeLength, attemptedAt |
| `MFA_DISABLED_SUCCESS` | MFA successfully disabled | userId, userEmail |

### MFA Status Checking
| Event | Description | Key Fields |
|-------|-------------|------------|
| `MFA_STATUS_CHECK` | User checks MFA status | userId, enabled, hasBackupCodes |

## Password Management Events

### Password Change Process
| Event | Description | Key Fields |
|-------|-------------|------------|
| `PASSWORD_VERIFY_SUCCESS` | Current password verified successfully | userId, userEmail, attemptedAt |
| `PASSWORD_VERIFY_FAILED` | Current password verification failed | userId, userEmail, attemptedAt |
| `PASSWORD_CHANGE_OAUTH_USER` | OAuth user attempted password change | userId, userEmail, attemptedAt |
| `PASSWORD_CHANGE_FAILED` | Password change failed | userId, reason |
| `PASSWORD_CHANGE_SUCCESS` | Password changed successfully | userId, username |

## Admin-Initiated MFA Events

### MFA Status Management
| Event | Description | Key Fields |
|-------|-------------|------------|
| `ADMIN_MFA_STATUS_VIEW` | Admin viewed user MFA status | adminId, adminUsername, targetUserId, targetUsername |

### MFA Requirement Management
| Event | Description | Key Fields |
|-------|-------------|------------|
| `ADMIN_MFA_REQUIRED_ENFORCED` | Admin enforced MFA requirement | adminId, targetUserId, previousState, newState, enforcedAt |
| `ADMIN_MFA_REQUIREMENT_REMOVED` | Admin removed MFA requirement | adminId, targetUserId, previousState, newState, removedAt |

### MFA Reset & Control
| Event | Description | Key Fields |
|-------|-------------|------------|
| `ADMIN_MFA_RESET` | Admin reset user's MFA | adminId, targetUserId, previousState, newState, resetAt |
| `ADMIN_MFA_FORCE_ENABLED` | Admin force-enabled user's MFA | adminId, targetUserId, previousState, newState, forceEnabledAt |
| `ADMIN_MFA_FORCE_DISABLED` | Admin force-disabled user's MFA | adminId, targetUserId, previousState, newState, forceDisabledAt |

## Admin Error Events

### Error Logging
| Event | Description | Key Fields |
|-------|-------------|------------|
| `ADMIN_MFA_REQUIRE_ERROR` | Error enforcing MFA requirement | adminId, targetUserId, error details |
| `ADMIN_MFA_UNREQUIRE_ERROR` | Error removing MFA requirement | adminId, targetUserId, error details |
| `ADMIN_MFA_RESET_ERROR` | Error resetting user MFA | adminId, targetUserId, error details |
| `ADMIN_MFA_FORCE_ENABLE_ERROR` | Error force-enabling MFA | adminId, targetUserId, error details |
| `ADMIN_MFA_FORCE_DISABLE_ERROR` | Error force-disabling MFA | adminId, targetUserId, error details |

## System-Level MFA Events

### Enforcement & Access Control
| Event | Description | Key Fields |
|-------|-------------|------------|
| `MFA_ENFORCEMENT_REDIRECT` | User redirected due to MFA requirement | userId, username, requestedUrl |

## Common Audit Fields

All MFA-related events include the following standard audit fields:

- **Timestamp**: ISO 8601 formatted timestamp
- **IP Address**: Client IP address
- **User Agent**: Browser/client user agent
- **Session ID**: Session identifier (where applicable)
- **Request ID**: Unique request identifier for tracing

## State Tracking

### Previous vs New State
Admin operations log both previous and new states for complete audit trails:

```json
{
  "previousState": {
    "totp_enabled": false,
    "mfa_required": false,
    "hasSecret": false,
    "hasBackupCodes": false
  },
  "newState": {
    "totp_enabled": true,
    "mfa_required": true,
    "hasSecret": true,
    "hasBackupCodes": true
  }
}
```

## Security Considerations

1. **Sensitive Data**: TOTP secrets and backup codes are never logged
2. **Code Length Only**: Only the length of verification codes is logged, not the actual codes
3. **IP Tracking**: All MFA events track client IP for geographic analysis
4. **Timestamping**: All events use UTC timestamps for consistency
5. **Database Integrity**: Events are logged to both files and database for redundancy

## Compliance & Retention

- All MFA events support compliance with SOC 2, ISO 27001, and similar frameworks
- Events are retained according to the configured log retention policy
- Database audit logs can be exported for external security analysis
- Log integrity is maintained through the AuditLog model with foreign key constraints

## Monitoring & Alerting

Recommended alerts based on these events:

1. **Multiple Failed Verifications**: Alert on repeated `MFA_TOTP_VERIFY_FAILED` events
2. **Admin MFA Changes**: Alert on all admin-initiated MFA modifications
3. **Mass MFA Enforcement**: Alert on bulk MFA requirement changes
4. **MFA Bypass Attempts**: Alert on `MFA_ENFORCEMENT_REDIRECT` followed by direct access attempts
5. **Error Patterns**: Alert on repeated MFA error events

## Query Examples

### Find all MFA changes for a user
```sql
SELECT * FROM audit_logs 
WHERE (user_id = ? OR details->>'$.targetUserId' = ?)
AND action LIKE '%MFA%'
ORDER BY created_at DESC;
```

### Find admin MFA enforcement activities
```sql
SELECT * FROM audit_logs 
WHERE action LIKE 'ADMIN_MFA_%'
AND details->>'$.adminId' = ?
ORDER BY created_at DESC;
```

### Monitor failed MFA attempts
```sql
SELECT * FROM audit_logs 
WHERE action IN ('MFA_TOTP_VERIFY_FAILED', 'MFA_VERIFY_FAILED')
AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```