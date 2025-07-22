# DaySave Development Process

## 🔄 **BEFORE MAKING ANY CHANGES**

### **1. 🧪 Run Current Health Check**
```bash
npm run test:health
```
**Expected**: All tests should pass (✅ 34/34)

### **2. 📝 Document What You're Changing**
- Update `TESTING.md` with new functionality
- Note any breaking changes
- Update version in `package.json` if needed

---

## 🛠️ **DEVELOPMENT WORKFLOW**

### **1. 🎯 Development Phase**
```bash
# Start development server
npm run dev

# Make your changes...

# Test specific functionality you changed
npm run test:content-types  # If changing content detection
npm run test:health         # Full system check
```

### **2. 🧪 Testing Phase**
```bash
# Run regression tests
npm run test:regression

# Expected output:
# ✅ Health check: 34/34 passed
# ✅ Content types: 36/36 passed
```

### **3. 📚 Documentation Phase**
```bash
# Update TESTING.md status table
# Update any relevant documentation
# Commit with descriptive message
```

---

## 🚨 **CRITICAL RULES**

### **❌ NEVER:**
- Deploy without running `npm run test:health`
- Change ContentTypeDetector without testing all URL types
- Modify database models without migration script
- Skip testing after "small" changes
- Fix data manually without fixing the code

### **✅ ALWAYS:**
- Test both URL imports AND file uploads after changes
- Verify all content types still work (video, audio, image)  
- Check that AI analysis still triggers
- Test Facebook, Instagram, and YouTube specifically
- Run health check before and after changes

---

## 🔧 **COMMON CHANGE TYPES & TESTING**

### **🎯 Content Type Detection Changes**
```bash
# Test this specifically:
npm run test:content-types

# Manual verification:
node -e "
const d = require('./scripts/populate-content-types').ContentTypeDetector;
const detector = new d();
console.log('Facebook:', detector.detectFromUrl('https://www.facebook.com/share/v/test/'));
console.log('Instagram:', detector.detectFromUrl('https://www.instagram.com/reel/test/'));
console.log('YouTube:', detector.detectFromUrl('https://www.youtube.com/watch?v=test'));
"
```

### **🎬 Multimedia Analysis Changes**
```bash
# Test specific platform:
node -e "
const { MultimediaAnalyzer } = require('./services/multimedia');
const analyzer = new MultimediaAnalyzer();
console.log('Platform detection working:', analyzer.detectPlatform('https://www.facebook.com/share/v/test/'));
console.log('Multimedia detection working:', analyzer.isMultimediaUrl('https://www.facebook.com/share/v/test/'));
"
```

### **📊 Database Model Changes**
```bash
# ALWAYS run migrations:
npm run migrate

# Test database connectivity:
npm run test:health

# Check model relationships still work
```

### **🔗 Route Changes**
```bash
# Test all major endpoints manually:
# 1. POST /content (URL submission)
# 2. POST /files/upload (file upload)  
# 3. GET /content/:id/analysis (analysis results)
# 4. GET /files/:id/analysis (file analysis)
```

---

## 📋 **TROUBLESHOOTING CHECKLIST**

### **❌ "Content Type Unknown"**
1. Check `ContentTypeDetector.detectFromUrl()` patterns
2. Run `npm run test:content-types`
3. Verify URL structure matches patterns
4. Check if new URL format needs new pattern

### **❌ "Analysis Not Running"**
1. Check content type is correctly detected (`video`, `audio`, `image`)
2. Verify `isMultimediaUrl()` returns true
3. Check if platform has download method (YouTube ✅, Instagram ✅, Facebook ✅)
4. Look for errors in multimedia analyzer logs

### **❌ "Thumbnails Not Generated"**
1. Check `Thumbnail.create()` validation errors
2. Verify `file_path` and `file_name` are not null
3. Check ffmpeg/processing pipeline logs
4. Ensure analysis completes successfully

### **❌ "Database Errors"**
1. Run `npm run migrate` to update schema
2. Check for `notNull` violations in logs  
3. Verify all required fields are populated
4. Check foreign key constraints

---

## 🎯 **DEPLOYMENT CHECKLIST**

### **Before Deployment:**
- [ ] `npm run test:health` passes (34/34)
- [ ] `npm run test:content-types` passes (36/36)
- [ ] Manual test of URL content creation
- [ ] Manual test of file upload
- [ ] Database migrations run successfully
- [ ] No error logs during testing

### **After Deployment:**
- [ ] Run health check on production
- [ ] Test one URL of each type (YouTube, Instagram, Facebook)
- [ ] Verify AI analysis is working
- [ ] Check logs for errors
- [ ] Update status in `TESTING.md`

---

## 📈 **SUCCESS METRICS**

### **Healthy System Indicators:**
✅ Health check: 34/34 passed  
✅ Content detection: 36/36 passed  
✅ Zero critical errors in logs  
✅ All content types properly detected  
✅ AI analysis completing successfully  
✅ Thumbnails generating without errors  

### **Warning Signs:**
⚠️ Health check warnings increasing  
⚠️ Content type detection failures  
⚠️ Database validation errors in logs  
⚠️ Analysis jobs stuck in "processing"  
⚠️ Manual data fixes needed frequently  

---

## 🚀 **QUICK COMMANDS REFERENCE**

```bash
# Daily development
npm run dev                 # Start development server
npm run test:health         # Full system health check
npm run test:content-types  # Content detection verification

# Before commits
npm run test:regression     # Full regression test suite

# Troubleshooting
npm run migrate            # Update database schema
tail -f logs/error.log     # Monitor error logs
tail -f logs/app.log       # Monitor application logs

# Manual testing
node scripts/health-check.js  # Detailed health report
``` 