# 🚀 Deploy Workflow Trigger Guide

## Current Status
- ✅ **Deploy workflow is ready**: `.github/workflows/deploy.yml`
- ✅ **Conflicting workflows disabled**: `full-staging-deploy.yml.disabled`
- ✅ **Professional migration fixes applied**

## How to Trigger the Deploy Workflow

### Method 1: GitHub Web Interface (Recommended)
1. Go to: https://github.com/andyegli/daysave.app_v1.4.1/actions
2. Look for **"Deploy"** workflow in the left sidebar
3. Click **"Deploy"**
4. Click **"Run workflow"** button (top right)
5. Select options:
   - **VM Action**: `recreate` (recommended for fresh start)
   - **Instance Type**: `e2-medium` (default)
6. Click **"Run workflow"**

### Method 2: GitHub CLI (if available)
```bash
gh workflow run deploy.yml --ref develop
```

### Method 3: Force Trigger via Commit
```bash
git commit --allow-empty -m "trigger: Deploy workflow - professional migration fixes"
git push
```

## What the Deploy Workflow Will Do
1. 🏗️ Create fresh VM with persistent storage
2. 🔄 Run professional database migrations (no conflicts)
3. 🚀 Start app in production mode (no auto-sync)
4. 🔒 Setup SSL certificates properly
5. 🏥 Run comprehensive health checks

## Expected Results
- ✅ Database: Clean migration state, all tables created
- ✅ Application: Starts without schema conflicts
- ✅ SSL: Proper certificate generation
- ✅ Health: All services accessible at https://daysave.app
