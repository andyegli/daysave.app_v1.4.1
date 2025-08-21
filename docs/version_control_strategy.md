# DaySave.app Version Control Strategy & Features

## 🔄 **Overview**

This document outlines the comprehensive version control features and strategies implemented in the DaySave project, including Git workflows, CI/CD pipelines, and development best practices.

## **1. Git Repository Structure**

### **Repository Configuration**
- **Repository**: `daysave.app_v1.4.1` hosted on GitHub
- **Current Branch**: `develop` (active development branch)
- **Branching Strategy**: Feature branch workflow with develop/main branches
- **Version**: v1.4.2 (Modular multimedia processing system)

### **Branch Strategy**
```
main (production)
├── develop (staging)
    ├── feature/branch-name
    └── hotfix/branch-name
```

## **2. GitHub Actions CI/CD Pipeline**

### **Current Workflow Status**
- **Active Workflow**: `staging-deploy.yml` (Professional v4.0)
- **Status**: Single authoritative deployment workflow
- **Cleanup**: Removed 10+ legacy workflows to avoid confusion
- **Location**: `.github/workflows/staging-deploy.yml`

### **CI/CD Features**
- ✅ **Automated Deployment**: Manual trigger with configurable VM options
- ✅ **Multi-Environment**: Staging and production environments
- ✅ **Infrastructure as Code**: Docker Compose with persistent storage
- ✅ **Database Migrations**: Professional migration pipeline with verification
- ✅ **Health Checks**: 11 comprehensive health tests
- ✅ **SSL/TLS**: Automated certificate management with Let's Encrypt
- ✅ **Rollback Capability**: Failure detection and cleanup procedures

### **Deployment Pipeline Architecture**

#### **Step-by-Step Process**
1. **VM Setup**: Create/reuse Google Cloud VM instances (`e2-medium` default)
2. **Persistent Storage**: 100GB persistent disk with auto-delete protection
3. **Code Deployment**: Clone repository and configure environment variables
4. **Container Preparation**: Build Docker images (don't start app yet)
5. **Database Services**: Start MySQL and Redis only
6. **Database Migration**: Run all migrations while app offline
7. **Schema Verification**: Confirm all tables exist properly
8. **User Seeding**: Create test admin and test user accounts
9. **Application Start**: Launch app in production mode (no auto-sync)
10. **Reverse Proxy & SSL**: Configure Nginx and certificates
11. **Health Validation**: Comprehensive service testing

#### **Professional Migration Pipeline**
- **Clean Migration State**: Isolated migration container with proper dependencies
- **Dynamic Password Handling**: Secure credential management
- **Comprehensive Error Handling**: Step-by-step verification
- **Production Mode**: App skips `sequelize.sync()` - migrations are single source of truth

## **3. Git Integration with Project Management**

### **Jira Integration**
- **Commit Tracking**: 50 recent commits mapped to Jira stories
- **Story Mapping**: Commits linked to user stories and epics
- **Sprint Assignment**: Commits organized by development sprints
- **Traceability**: Full requirement → story → commit → deployment chain

#### **Commit-Story Mapping Structure**
```
Commit: ea7c935 "Make related contacts clickable in relationship modals"
→ Related Story: 140 "View relationship graphs and connections"
→ Epic: 4 "Contacts Management System"
→ Sprint: Sprint 4
```

#### **Key Integration Files**
- `git-commits-to-stories-mapping.csv`: Task issues for each commit
- `git-commits-links-import.csv`: Direct commit-to-story relationships

### **Commit Standards**
- **Conventional Commits**: Structured commit messages
- **Descriptive Messages**: Clear descriptions of changes
- **Story References**: Links to related user stories
- **Example Format**: `"Fix YouTube URL submission - improve error handling (Story-60)"`

#### **Commit Message Best Practices**
```bash
✅ Good: "Fix YouTube URL submission - improve error handling (Story-60)"
✅ Good: "Implement contact groups functionality for UC-136"
❌ Bad: "bug fix"
❌ Bad: "updates"
```

## **4. Development Workflow**

### **Development Process**
1. **Pre-Development Health Check**: Run `npm run test:health` (34/34 tests)
2. **Feature Development**: Create feature branches from develop
3. **Testing Phase**: 
   - `npm run test:regression`
   - `npm run test:content-types` (36/36 tests)
4. **Documentation**: Update TESTING.md and relevant docs
5. **Commit & Push**: Follow conventional commit standards
6. **Deployment**: Automated via GitHub Actions

### **Repository Rules**
- **Always commit related changes together** with descriptive messages
- **Update TASK.md and TODO lists** when completing work
- **Follow pattern**: `git add . && git commit -m "descriptive message" && git push`
- **Include tests and documentation** in the same commit

### **Critical Development Rules**

#### **❌ NEVER:**
- Deploy without running `npm run test:health`
- Change ContentTypeDetector without testing all URL types
- Modify database models without migration script
- Skip testing after "small" changes
- Fix data manually without fixing the code

#### **✅ ALWAYS:**
- Test both URL imports AND file uploads after changes
- Verify all content types still work (video, audio, image)
- Check that AI analysis still triggers
- Test Facebook, Instagram, and YouTube specifically
- Run health check before and after changes

## **5. Automated Quality Assurance**

### **Testing Integration**
- **Health Checks**: 34 automated health tests
- **Content Type Detection**: 36 content type validation tests
- **Regression Testing**: Full system regression suite
- **Database Testing**: Migration and connectivity validation

### **Code Quality Tools**
- **Linting**: ESLint with industry standards
- **Security Scanning**: npm audit and dependency checking
- **Performance Testing**: Load testing with concurrent users
- **Documentation**: JSDoc for API documentation

### **Success Metrics**
```
✅ Health check: 34/34 passed
✅ Content detection: 36/36 passed
✅ Zero critical errors in logs
✅ All content types properly detected
✅ AI analysis completing successfully
✅ Thumbnails generating without errors
```

## **6. Deployment Strategies**

### **Blue-Green Deployment**
- **Zero Downtime**: Seamless production deployments
- **Health Validation**: Comprehensive checks before traffic switch
- **Automatic Rollback**: Failure detection and recovery
- **Persistent Storage**: 100GB persistent disk with auto-delete protection

### **Environment Management**
- **Development**: Local Docker Compose setup (`npm run dev`)
- **Staging**: Google Cloud VM with full feature set
- **Production**: Scalable cloud infrastructure with monitoring

### **Comprehensive Health Checks (11 Tests)**
1. **HTTP Redirect**: Verify HTTP to HTTPS redirection
2. **HTTPS Connectivity**: SSL certificate validation
3. **Application Health**: `/health` endpoint response
4. **Database Connectivity**: MySQL connection and query tests
5. **Authentication Endpoints**: Login page accessibility
6. **OAuth Providers**: Google and Microsoft OAuth endpoints
7. **Email Functionality**: Gmail SMTP configuration
8. **AI Services**: OpenAI API configuration
9. **Google Maps**: Maps API configuration
10. **File Upload**: Upload endpoint accessibility
11. **Multimedia Analysis**: Processing pipeline configuration

## **7. Security & Protocol Guidelines**

### **Content Security Policy (CSP) Compliance**
- **❌ NEVER** use inline scripts or event handlers in HTML/EJS
- **✅ ALWAYS** create external `.js` files in `public/js/`
- **✅ ALWAYS** use `addEventListener` instead of `onclick` attributes
- **✅ ALWAYS** move JavaScript from `<script>` tags to external files

### **Development SSL/HTTPS**
- **❌ NEVER** hardcode `https://localhost` URLs
- **✅ ALWAYS** use `http://localhost` for development
- **✅ ALWAYS** disable HSTS and upgrade-insecure-requests in dev mode
- **✅ ALWAYS** return JSON from upload routes (avoid redirects)

### **Secrets Management**
- **GitHub Secrets**: Secure storage of sensitive configuration
- **Environment Isolation**: Separate staging/production configs
- **Access Control**: Protected branches and required reviews
- **Audit Trail**: Comprehensive logging of all changes

## **8. Monitoring & Maintenance**

### **Deployment Tracking**
- **Workflow Evolution**: Documented version history (v1.0 → v4.0)
- **Change Logs**: Comprehensive workflow changelog (`WORKFLOW_CHANGELOG.md`)
- **Status Matrix**: Current workflow status tracking (`WORKFLOW_STATUS_MATRIX.md`)
- **Migration Tracking**: Database migration history (`WORKFLOW_MIGRATION_TRACKING.md`)

### **Performance Monitoring**
- **Health Endpoints**: Real-time system health monitoring
- **Database Connectivity**: Automated connection testing
- **Service Validation**: OAuth, email, AI services testing
- **SSL Certificate**: Automated certificate renewal

### **Workflow Version History**

#### **Version 4.0 Professional (2025-08-18) ⭐ CURRENT**
- **Features**: Migration-only database initialization, production mode, persistent storage
- **Fixes**: Data type consistency, auto-sync conflicts, schema mismatches
- **Status**: ✅ Active

#### **Version 3.0 Staging (2025-08-17)**
- **Status**: 🗑️ Deleted
- **Issues**: Schema conflicts, auto-sync problems

#### **Version 2.0 Development (2025-07-24)**
- **Status**: 🗑️ Deleted
- **Issues**: Various deployment failures

#### **Version 1.0 Initial (2025-06-27)**
- **Status**: 🗑️ Deleted
- **Purpose**: Basic CI/CD setup

## **9. Documentation & Knowledge Management**

### **Comprehensive Documentation**
- **Development Process**: `DEVELOPMENT_PROCESS.md` - Step-by-step guidelines
- **GitHub Actions Setup**: `docs/GITHUB_ACTIONS_SETUP.md` - Complete CI/CD guide
- **Git Integration**: `docs/GIT_COMMITS_TO_JIRA_INTEGRATION_GUIDE.md`
- **Troubleshooting**: Common issues and solutions

### **Project Tracking Files**
- **Task Management**: `TASK.md` with current priorities
- **TODO Lists**: `TODO.md` organized by priority levels
- **Story Mapping**: User stories mapped to development work
- **Progress Tracking**: Completed features and milestones

## **10. Quick Commands Reference**

### **Daily Development**
```bash
npm run dev                 # Start development server
npm run test:health         # Full system health check (34 tests)
npm run test:content-types  # Content detection verification (36 tests)
```

### **Before Commits**
```bash
npm run test:regression     # Full regression test suite
```

### **Troubleshooting**
```bash
npm run migrate            # Update database schema
tail -f logs/error.log     # Monitor error logs
tail -f logs/app.log       # Monitor application logs
node scripts/health-check.js  # Detailed health report
```

### **Manual Deployment**
1. Go to: https://github.com/andyegli/daysave.app_v1.4.1/actions
2. Click on **"Staging Deploy"** workflow
3. Click **"Run workflow"**
4. Select options:
   - VM Action: `recreate`
   - Instance Type: `e2-medium`
5. Click **"Run workflow"**

## **11. Troubleshooting Common Issues**

### **Content Type Detection Issues**
```bash
# Test specific functionality
npm run test:content-types

# Manual verification
node -e "
const d = require('./scripts/populate-content-types').ContentTypeDetector;
const detector = new d();
console.log('Facebook:', detector.detectFromUrl('https://www.facebook.com/share/v/test/'));
console.log('Instagram:', detector.detectFromUrl('https://www.instagram.com/reel/test/'));
console.log('YouTube:', detector.detectFromUrl('https://www.youtube.com/watch?v=test'));
"
```

### **Database Migration Issues**
```bash
# Always run migrations after model changes
npm run migrate

# Test database connectivity
npm run test:health

# Check model relationships
```

### **Deployment Failures**
- Check GitHub Actions logs
- Verify all secrets are configured
- Test individual components manually
- Review GCP Console logs

## **12. Future Enhancements**

### **Planned Improvements**
- **Automated Token Management**: Social media token refresh system
- **Enhanced Security**: Advanced rate limiting and monitoring
- **Performance Optimization**: Redis caching and CDN integration
- **Mobile Development**: React Native cross-platform app

### **Enterprise Features**
- **Multi-tenant Architecture**: Organization support
- **Advanced RBAC**: Enhanced role management
- **Compliance Features**: GDPR, SOC 2 compliance
- **White-label Options**: Customization capabilities

---

## **Summary**

This version control strategy provides a robust, professional-grade development workflow with:

- ✅ **Automated CI/CD**: Professional deployment pipeline with health checks
- ✅ **Quality Assurance**: Comprehensive testing and validation
- ✅ **Security**: CSP compliance, secrets management, SSL automation
- ✅ **Monitoring**: Real-time health checks and performance tracking
- ✅ **Documentation**: Complete development and deployment guides
- ✅ **Integration**: Jira story mapping and commit tracking
- ✅ **Scalability**: Cloud infrastructure with persistent storage

The strategy ensures reliable, secure, and traceable development from requirements through to production deployment.
