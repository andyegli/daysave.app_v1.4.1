# DaySave.app Database Schema - Complete Table List

**Total Tables**: 41 (+ 1 Sessions table = 42 total)

## Core User Management (7 tables)
1. **users** - User accounts with authentication and profile data
2. **roles** - User role definitions (admin, user, etc.)
3. **permissions** - System permission definitions
4. **role_permissions** - Many-to-many relationship between roles and permissions
5. **user_devices** - Device tracking and fingerprinting for security
6. **user_passkeys** - WebAuthn/Passkey credentials for biometric authentication
7. **social_accounts** - OAuth social media account connections

## Content Management (8 tables)
8. **content** - User-submitted URLs and social media content
9. **files** - Uploaded files (images, videos, documents, audio)
10. **content_groups** - User-defined content collections
11. **content_group_members** - Many-to-many relationship for content in groups
12. **content_relations** - Relationships between content items
13. **share_logs** - Content sharing activity tracking
14. **processing_jobs** - Background job queue for content analysis
15. **external_ai_usage** - AI API usage tracking and quotas

## AI Analysis & Multimedia (8 tables)
16. **video_analysis** - Video processing results and metadata
17. **audio_analysis** - Audio processing and transcription results
18. **image_analysis** - Image recognition and analysis results
19. **speakers** - Voice print identification and speaker recognition
20. **thumbnails** - Generated video thumbnails and key frames
21. **ocr_captions** - Text extraction from video frames and images
22. **faces** - Face recognition and identification results
23. **storage_usage** - File storage tracking and quotas

## Contact Management (7 tables)
24. **contacts** - Personal contact information management
25. **contact_groups** - Contact organization groups
26. **contact_group_members** - Many-to-many relationship for contacts in groups
27. **contact_relations** - Relationships between contacts
28. **contact_submissions** - Contact form submissions and inquiries
29. **relationships** - Relationship type definitions
30. **login_attempts** - Security tracking for login attempts

## API & Integration (3 tables)
31. **api_keys** - API key management for external access
32. **api_key_usage** - API usage tracking and rate limiting
33. **api_key_audit_logs** - Audit trail for API key operations

## Subscription & Billing (3 tables)
34. **subscription_plans** - Available subscription tiers
35. **user_subscriptions** - User subscription status and history
36. **subscription_transactions** - Payment and billing transaction records

## Testing & Quality Assurance (3 tables)
37. **test_runs** - Automated test execution records
38. **test_results** - Individual test case results
39. **test_metrics** - Performance and quality metrics

## System Administration (3 tables)
40. **admin_settings** - System configuration and settings
41. **audit_logs** - Comprehensive system activity audit trail
42. **sessions** - User session management (Express session store)

---

## Table Categories Summary

| Category | Tables | Primary Function |
|----------|--------|------------------|
| **User Management** | 7 | Authentication, authorization, device tracking |
| **Content Management** | 8 | Content storage, organization, sharing |
| **AI Analysis** | 8 | Multimedia processing, AI-powered analysis |
| **Contact Management** | 7 | Personal contact organization and relationships |
| **API Integration** | 3 | External API access and monitoring |
| **Subscription System** | 3 | Billing and subscription management |
| **Testing Framework** | 3 | Quality assurance and performance monitoring |
| **System Administration** | 3 | Configuration and audit trails |
| **Session Management** | 1 | User session storage |
| **TOTAL** | **42** | **Complete application ecosystem** |

---

## Key Database Features

### Enterprise-Grade Design
- **UUID Primary Keys**: All tables use CHAR(36) UUID primary keys for scalability
- **Foreign Key Relationships**: Comprehensive referential integrity constraints
- **Migration-Based Schema**: Version-controlled database evolution using Sequelize CLI
- **JSON Data Types**: Flexible metadata and configuration storage

### Security & Audit
- **Comprehensive Audit Trails**: All user actions logged in audit_logs table
- **Device Fingerprinting**: Security tracking in user_devices and login_attempts
- **API Security**: Complete API key management with usage tracking and audit logs
- **Session Security**: Secure session storage with Express session management

### AI & Multimedia Processing
- **Multi-Modal Analysis**: Separate tables for video, audio, and image analysis
- **Speaker Recognition**: Voice print storage and identification
- **OCR Capabilities**: Text extraction from multimedia content
- **Face Recognition**: Facial analysis and identification features
- **Thumbnail Generation**: Automated video thumbnail creation

### Scalability Features
- **Background Processing**: Dedicated processing_jobs table for async operations
- **Usage Tracking**: Storage and API usage monitoring for resource management
- **Subscription Management**: Complete billing and subscription tier system
- **Testing Infrastructure**: Built-in quality assurance and performance monitoring

This database architecture demonstrates enterprise-level design principles with proper normalization, comprehensive relationships, and scalable structure supporting all application features from basic content management to advanced AI analysis capabilities.
