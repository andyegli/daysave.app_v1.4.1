# Content Submission Test Suite

Comprehensive test suite for validating DaySave's AI pipeline functionality when submitting content items.

## Overview

This test suite validates that the AI pipeline correctly processes different types of content submissions, including:

- **Social Media Videos** (YouTube, Facebook, Instagram, TikTok)
- **Long-form Content** (YouTube videos, Vimeo, etc.)
- **Documents and Articles** (Pinterest, news articles, web pages)
- **Edge Cases** (invalid URLs, private content, timeouts)

## Test Types

### 1. Functional Tests (`content-submission-test-suite.js`)

Validates that all AI pipeline features work correctly:

- ✅ **Transcription**: Speech-to-text conversion
- ✅ **Summary**: AI-generated content summaries
- ✅ **Title Generation**: AI-generated titles
- ✅ **Thumbnail Generation**: Video frame extraction
- ✅ **Tag Generation**: AI-powered content tagging
- ✅ **Category Classification**: Content categorization
- ✅ **Database Persistence**: Data saved correctly

### 2. Performance Tests (`performance-test-suite.js`)

Validates system performance under various conditions:

- ⚡ **Processing Speed**: Content processing within target times
- 🔄 **Concurrent Processing**: Multiple content items simultaneously
- 🧠 **Memory Usage**: Memory consumption within limits
- ⏱️ **Timeout Handling**: Graceful handling of slow content

### 3. Configuration Tests (`test-config.js`)

Provides test configuration for different environments and scenarios.

## Quick Start

### Prerequisites

Before running tests, ensure you have:

1. **Database running** (MySQL/MariaDB)
2. **Environment variables configured**:
   ```bash
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
   OPENAI_API_KEY=your_openai_api_key
   ```
3. **Dependencies installed**: `npm install`

### Running Tests

#### Smoke Test (Quick - 1-2 minutes)
```bash
# Run minimal tests to verify system is working
node tests/run-tests.js --smoke
```

#### Performance Tests (5-10 minutes)
```bash
# Test system performance and resource usage
node tests/run-tests.js --performance
```

#### Full Test Suite (10-20 minutes)
```bash
# Run comprehensive tests covering all scenarios
node tests/run-tests.js --full
```

#### Individual Test Suites
```bash
# Run only functional tests
node tests/content-submission-test-suite.js

# Run only performance tests
node tests/performance-test-suite.js
```

## Test Categories

### Social Media Videos

Tests AI pipeline with popular social media platforms:

| Platform | Content Type | Expected Features |
|----------|--------------|------------------|
| YouTube | Short videos | Transcription, Summary, Title, Thumbnails, Tags |
| Facebook | Video posts | Transcription, Summary, Title, Thumbnails |
| Instagram | Reels | Transcription, Summary, Title, Thumbnails |
| TikTok | Short videos | Transcription, Summary, Title, Thumbnails |

### Long-form Content

Tests processing of longer content:

| Content Type | Timeout | Expected Features |
|--------------|---------|------------------|
| YouTube videos (>5min) | 3 minutes | Full transcription, detailed summary |
| Vimeo videos | 2 minutes | Transcription, summary |
| Podcasts | 5 minutes | Full transcription, chapter detection |

### Documents & Articles

Tests text-based content processing:

| Content Type | Expected Features |
|--------------|------------------|
| Pinterest articles | Text extraction, summary, tags |
| News articles | Summary, category classification |
| Blog posts | Content analysis, tagging |

### Edge Cases

Tests error handling and resilience:

| Scenario | Expected Behavior |
|----------|------------------|
| Invalid URLs | Graceful failure with error message |
| Private content | Access denied handling |
| Network timeouts | Timeout detection and cleanup |
| Slow processing | Progress tracking and limits |

## Understanding Test Results

### Success Indicators

✅ **Passed**: Feature worked correctly
- Transcription generated with sufficient content
- Summary created with meaningful content
- Title generated that's descriptive
- Thumbnails extracted successfully
- Tags generated that are relevant
- Processing completed within time limits

### Warning Indicators

⚠️ **Warning**: Feature worked but with issues
- Transcription too short for content length
- Summary quality below optimal
- Processing took longer than target time
- Memory usage higher than expected

### Failure Indicators

❌ **Failed**: Feature didn't work
- No transcription generated
- No summary created
- Processing crashed or timed out
- Database updates failed

### Test Output Example

```
📱 Testing Social Media Videos...

🧪 Testing: YouTube Short Video
   URL: https://www.youtube.com/shorts/P8LeyCTibms
   📝 Content created: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   🚀 Starting AI processing...
   ✅ Result: PASSED (45,321ms)
   
   Features validated:
   ✅ Transcription: 156 chars
   ✅ Summary: 847 chars  
   ✅ Title: "Effective Hip Mobility Exercise for Back Pain Relief"
   ✅ Thumbnails: 4 generated
   ✅ Tags: 8 generated
```

## Performance Benchmarks

### Target Processing Times

| Content Type | Target Time | Good | Acceptable | Slow |
|--------------|-------------|------|------------|------|
| YouTube Short | 45s | < 30s | 30-60s | > 60s |
| Facebook Video | 60s | < 45s | 45-90s | > 90s |
| Long YouTube | 180s | < 120s | 120-240s | > 240s |
| Document | 30s | < 20s | 20-45s | > 45s |

### Memory Usage Limits

- **Heap Usage**: < 512MB per processing job
- **RSS Usage**: < 1GB total system memory
- **Concurrent Jobs**: Max 5 simultaneous processing

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database is running
sudo systemctl status mysql

# Test connection manually
mysql -u root -p daysave_v141
```

#### Google Cloud Authentication Failed
```bash
# Verify credentials file exists
ls -la config/credentials/

# Test Google API access
node -e "console.log(process.env.GOOGLE_API_KEY ? 'API Key set' : 'API Key missing')"
```

#### AI Processing Timeouts
- Check internet connection speed
- Verify Google Cloud and OpenAI API limits
- Reduce concurrent processing (`maxConcurrentTests` in config)

#### Memory Issues
- Monitor system memory during tests
- Reduce test concurrency
- Check for memory leaks in processing code

### Debug Mode

Enable verbose logging:
```bash
NODE_ENV=development node tests/run-tests.js --full
```

### Test Data Cleanup

Tests automatically clean up created content, but if needed:
```bash
# Manual cleanup of test data
node -e "
const { Content } = require('./models');
Content.destroy({ where: { title: { [Op.like]: 'Test:%' } } });
"
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Content Submission Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:content-submission
    env:
      GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Pre-deployment Checklist

Before deploying changes:

1. ✅ Run smoke tests: `node tests/run-tests.js --smoke`
2. ✅ Verify critical platforms work (YouTube, Facebook)
3. ✅ Check performance benchmarks met
4. ✅ Ensure no memory leaks detected
5. ✅ Validate error handling works

## Contributing

When adding new test cases:

1. **Add to appropriate category** in `content-submission-test-suite.js`
2. **Set realistic timeouts** based on content complexity
3. **Define expected features** for validation
4. **Update documentation** with new test coverage
5. **Test both success and failure scenarios**

### Adding New Platform Support

1. Add test URLs to `test-config.js`
2. Create test case in appropriate category
3. Define expected features and timeouts
4. Add platform-specific validation logic
5. Update documentation

## Support

For test suite issues:

- Check logs for detailed error messages
- Verify all prerequisites are met
- Run tests individually to isolate issues
- Check test configuration matches your environment

For AI pipeline issues discovered by tests:

- Review processing logs in application
- Check Google Cloud and OpenAI API status
- Verify content URLs are accessible
- Monitor system resources during processing