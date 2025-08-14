# File Type Detection System

## Overview

DaySave implements a comprehensive, multi-layered file type detection system that accurately identifies content types for proper processing and analysis. The system supports video, audio, image, and document files from various sources including direct uploads, URLs, and streaming platforms.

## Architecture

### Detection Hierarchy

The system uses a **hierarchical detection approach** with multiple fallback methods:

1. **Analysis Records** (Most Reliable) - Database queries using Sequelize
2. **URL Patterns** - Platform-specific regex patterns
3. **Filename Extensions** - File extension mapping
4. **MIME Types** - MIME type analysis
5. **Buffer Magic Bytes** - Binary signature matching
6. **Content Inference** - AI-powered analysis results

### Core Implementation

**Primary Class**: `ContentTypeDetector` (located in `scripts/populate-content-types.js`)

**Main Method**: `detectContentType(record, analysisRecords = {})`

```javascript
async detectContentType(record, analysisRecords = {}) {
    // 1. Check analysis records first (most reliable)
    const fromAnalysis = this.detectFromAnalysis(videoAnalysis, audioAnalysis, imageAnalysis);
    if (fromAnalysis) return fromAnalysis;
    
    // 2. Check URL patterns (for content records)
    if (record.url) {
        const fromUrl = this.detectFromUrl(record.url);
        if (fromUrl) return fromUrl;
    }
    
    // 3. Check filename (for file records)
    if (record.filename) {
        const fromFilename = this.detectFromFilename(record.filename);
        if (fromFilename) return fromFilename;
    }
    
    // 4. Check metadata
    if (record.metadata) {
        const fromMetadata = this.detectFromMetadata(record.metadata);
        if (fromMetadata) return fromMetadata;
    }
    
    // 5. Infer from content characteristics
    if (record.transcription && record.transcription.length > 100) {
        if (record.url && record.url.includes('youtube')) return 'video';
        return 'audio';
    }
    
    // 6. Default fallback
    return 'unknown';
}
```

## Detection Methods

### 1. URL Pattern Detection

**Dependencies**: None (Pure JavaScript RegEx)
**Method**: `detectFromUrl(url)`

Identifies content type based on URL patterns from major platforms:

#### Video Platforms
```javascript
const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtube\.com\/shorts/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /tiktok\.com\//i,
    /instagram\.com\/p\//i,
    /instagram\.com\/reel\//i,
    /facebook\.com\/watch/i,
    /facebook\.com\/share\/v\//i,
    /facebook\.com\/video/i,
    /twitter\.com\/.*\/status/i,
    /x\.com\/.*\/status/i,
    /twitch\.tv\/videos/i,
    /dailymotion\.com\/video/i
];
```

#### Audio Platforms
```javascript
const audioPatterns = [
    /soundcloud\.com\//i,
    /spotify\.com\//i,
    /anchor\.fm\//i
];
```

#### Image Platforms
```javascript
const imagePatterns = [
    /imgur\.com\//i,
    /flickr\.com\//i,
    /pinterest\.com\/pin\//i,
    /unsplash\.com\//i,
    /pixabay\.com\//i,
    /pexels\.com\//i
];
```

#### Direct File Patterns
```javascript
const videoFilePatterns = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i;
const audioFilePatterns = /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i;
const imageFilePatterns = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)(\?|$)/i;
const documentFilePatterns = /\.(pdf|txt|csv|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/i;
```

### 2. MIME Type Detection

**Dependencies**: `mime-types` (v3.0.1)
**Method**: `detectFromMimeType(mimeType)`

Primary MIME type detection with comprehensive fallback mapping:

```javascript
// Primary detection using mime-types library
const mime = require('mime-types');
const mimeType = mime.lookup(filePath);

// Detection logic
if (mimeType.startsWith('video/')) return 'video';
if (mimeType.startsWith('audio/')) return 'audio';
if (mimeType.startsWith('image/')) return 'image';
if (mimeType.startsWith('application/pdf') || 
    mimeType.startsWith('text/') || 
    mimeType.includes('document') ||
    mimeType.includes('officedocument')) return 'document';
```

#### Custom MIME Mapping (Fallback)
```javascript
const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json'
};
```

### 3. File Extension Detection

**Dependencies**: Built-in Node.js `path` module
**Method**: `detectFromFilename(filename)`

Comprehensive file extension arrays for each content type:

```javascript
const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];
const documentExts = ['pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

// Implementation
const ext = filename.toLowerCase().split('.').pop();
if (videoExts.includes(ext)) return 'video';
if (audioExts.includes(ext)) return 'audio';
if (imageExts.includes(ext)) return 'image';
if (documentExts.includes(ext)) return 'document';
```

### 4. Magic Bytes / Buffer Header Detection

**Dependencies**: Built-in Node.js Buffer API
**Method**: `detectTypeFromBuffer(buffer)`
**Location**: `services/multimedia/AutomationOrchestrator.js`

Binary signature matching for definitive file type identification:

#### Video Signatures
```javascript
// MP4
if (this.matchesSignature(header, [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])) return 'video';

// WebM/MKV
if (this.matchesSignature(header, [0x1A, 0x45, 0xDF, 0xA3])) return 'video';

// AVI (RIFF header with AVI signature)
if (this.matchesSignature(header, [0x52, 0x49, 0x46, 0x46])) {
    if (buffer.subarray(8, 12).toString() === 'AVI ') return 'video';
}
```

#### Audio Signatures
```javascript
// MP3
if (this.matchesSignature(header, [0xFF, 0xFB]) || 
    this.matchesSignature(header, [0xFF, 0xF3]) || 
    this.matchesSignature(header, [0xFF, 0xF2])) return 'audio';

// FLAC
if (this.matchesSignature(header, [0x66, 0x4C, 0x61, 0x43])) return 'audio';

// OGG
if (this.matchesSignature(header, [0x4F, 0x67, 0x67, 0x53])) return 'audio';

// WAV (RIFF header with WAVE signature)
if (this.matchesSignature(header, [0x52, 0x49, 0x46, 0x46])) {
    if (buffer.subarray(8, 12).toString() === 'WAVE') return 'audio';
}
```

#### Image Signatures
```javascript
// JPEG
if (this.matchesSignature(header, [0xFF, 0xD8, 0xFF])) return 'image';

// PNG
if (this.matchesSignature(header, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'image';

// GIF
if (this.matchesSignature(header, [0x47, 0x49, 0x46, 0x38])) return 'image';

// WebP
if (this.matchesSignature(header, [0x52, 0x49, 0x46, 0x46]) && 
    buffer.subarray(8, 12).toString() === 'WEBP') return 'image';
```

#### Signature Matching Implementation
```javascript
matchesSignature(buffer, signature) {
    for (let i = 0; i < signature.length; i++) {
        if (buffer[i] !== signature[i]) return false;
    }
    return true;
}
```

### 5. Analysis Records Detection

**Dependencies**: Sequelize ORM, Database queries
**Method**: `detectFromAnalysis(videoAnalysis, audioAnalysis, imageAnalysis)`

Uses existing analysis records to determine content type:

```javascript
detectFromAnalysis(videoAnalysis, audioAnalysis, imageAnalysis) {
    // Check for video analysis results
    if (videoAnalysis && (videoAnalysis.transcript || videoAnalysis.summary)) {
        return 'video';
    }
    
    // Check for audio analysis results
    if (audioAnalysis && (audioAnalysis.transcript || audioAnalysis.summary)) {
        return 'audio';
    }
    
    // Check for image analysis results
    if (imageAnalysis) {
        return 'image';
    }
    
    return null;
}
```

## Dependencies

### Primary Dependencies

| Package | Version | Purpose | Usage Location |
|---------|---------|---------|----------------|
| `mime-types` | 3.0.1 | MIME type detection | `services/fileUpload.js` |
| `multer` | 2.0.1 | File upload & MIME detection | File upload routes |
| Node.js `path` | Built-in | File extension extraction | Multiple locations |
| Node.js `Buffer` | Built-in | Magic bytes detection | `AutomationOrchestrator.js` |

### Integration Dependencies

#### For File Processing
- `fluent-ffmpeg` (2.1.2) - Video/audio metadata extraction
- `textract` (2.5.0) - Document text extraction  
- `pdf-parse` (1.1.1) - PDF content extraction
- `mammoth` (1.9.1) - Word document processing

#### For Multimedia Analysis
- `@google-cloud/vision` (4.0.2) - Image analysis and OCR
- `@google-cloud/speech` (7.2.0) - Audio transcription
- `openai` (4.20.1) - AI-powered content analysis

### Dependency Matrix

| Detection Method | Primary Dependency | Fallback | External Library Required |
|------------------|-------------------|----------|--------------------------|
| URL Patterns | JavaScript RegEx | None | ❌ No |
| File Extensions | Node.js `path` | Custom arrays | ❌ No |
| MIME Types | `mime-types` | Custom mapping | ✅ Yes |
| Magic Bytes | Node.js Buffer | None | ❌ No |
| File Upload | `multer` | Manual detection | ✅ Yes |
| Advanced Analysis | Multiple AI APIs | Basic detection | ✅ Yes |

## Integration Points

### File Upload Processing

```javascript
// routes/files.js
const detector = new ContentTypeDetector();
const detected_content_type = detector.detectFromMimeType(mimetype) || 
                              detector.detectFromFilename(fileName) || 
                              'unknown';

// Create file record with detected type
const fileRecord = await File.create({
    user_id: userId,
    filename: fileName,
    content_type: detected_content_type,
    // ... other fields
});
```

### Multimedia Analysis Routing

```javascript
// services/multimedia/AutomationOrchestrator.js
const mediaType = await this.detectMediaType(fileBuffer, metadata);

// Route to appropriate processor
const processor = this.processors.get(mediaType);
if (!processor) {
    throw new Error(`No processor available for media type: ${mediaType}`);
}
```

### Content Processing Pipeline

```javascript
// Comprehensive detection for existing records
const detector = new ContentTypeDetector();
const contentType = await detector.detectContentType(record, {
    videoAnalysis,
    audioAnalysis, 
    imageAnalysis
});

// Update database with detected type
await record.update({ content_type: contentType });
```

## Testing

### Test Suite

**Location**: `tests/content-type-detection.test.js`
**Execution**: `npm run test:content-types`

#### Test Coverage

1. **URL Detection Tests (26 test cases)**
   - YouTube variants (`youtube.com/watch`, `youtu.be`, `youtube.com/shorts`)
   - Social platforms (Instagram, Facebook, Twitter/X, TikTok)
   - Audio platforms (SoundCloud, Spotify)
   - Image platforms (Imgur, Flickr)
   - Direct file URLs

2. **File Extension Tests (15 test cases)**
   - Video files (`.mp4`, `.avi`, `.mov`, `.webm`)
   - Audio files (`.mp3`, `.wav`, `.flac`, `.m4a`)
   - Image files (`.jpg`, `.png`, `.gif`, `.webp`)
   - Document files (`.pdf`, `.txt`, `.csv`)

3. **MIME Type Tests (5 test cases)**
   - `video/mp4`, `audio/mpeg`, `image/jpeg`, `application/pdf`, `text/plain`

#### Running Tests

```bash
# Run content type detection tests
node tests/content-type-detection.test.js

# Or via npm script
npm run test:content-types

# Full regression test suite
npm run test:regression
```

#### Test Output Example

```
🎯 Testing Content Type Detection...

🌐 Testing URL Detection...
✅ YouTube Video: Expected: video, Got: video
✅ Instagram Reel: Expected: video, Got: video
✅ Facebook Share Video: Expected: video, Got: video
✅ Direct MP4: Expected: video, Got: video

📁 Testing File Extension Detection...
✅ MP4 Video: Expected: video, Got: video
✅ MP3 Audio: Expected: audio, Got: audio
✅ JPG Image: Expected: image, Got: image

🎭 Testing MIME Type Detection...
✅ Video MP4 MIME: Expected: video, Got: video

📊 CONTENT TYPE DETECTION TEST REPORT
========================================
📈 SUMMARY:
   ✅ Passed: 46/46 (100%)
   ❌ Failed: 0/46 (0%)

🎉 All content type detection tests PASSED!
```

## Performance Characteristics

### Detection Speed (Approximate)

1. **URL Patterns**: < 1ms (RegEx matching)
2. **File Extensions**: < 1ms (String operations)
3. **MIME Types**: < 5ms (Library lookup + fallback)
4. **Magic Bytes**: < 10ms (Buffer analysis)
5. **Analysis Records**: 10-50ms (Database queries)

### Memory Usage

- **Minimal overhead**: Most detection uses in-memory pattern matching
- **Buffer analysis**: Only reads first 12 bytes of files
- **No large dependencies**: Core detection logic is lightweight

## Error Handling

### Graceful Degradation

The system provides multiple fallback methods:

```javascript
// If one method fails, try the next
try {
    return this.detectFromMimeType(mimeType);
} catch (error) {
    try {
        return this.detectFromFilename(filename);
    } catch (error) {
        return 'unknown'; // Safe fallback
    }
}
```

### Common Error Scenarios

1. **Corrupted files**: Magic bytes detection handles partial headers
2. **Missing extensions**: URL patterns and MIME types provide alternatives
3. **Unknown platforms**: Gracefully returns `null` for unknown URLs
4. **Network issues**: Local detection methods work offline

## Best Practices

### For Developers

1. **Always use comprehensive detection**: Call `detectContentType()` for complete analysis
2. **Handle 'unknown' types**: Provide fallback processing for unidentified content
3. **Test new patterns**: Add test cases when supporting new platforms
4. **Performance optimization**: Use faster methods first (URL patterns, extensions)

### For Adding New File Types

1. **Update extension arrays**: Add new extensions to appropriate arrays
2. **Add MIME mappings**: Include new MIME types in custom mapping
3. **Consider magic bytes**: Add binary signatures for reliable detection
4. **Add test cases**: Ensure new types are covered in test suite

### For Adding New Platforms

1. **Update URL patterns**: Add platform-specific regex patterns
2. **Test thoroughly**: Verify patterns work with various URL formats
3. **Document changes**: Update this documentation with new patterns
4. **Consider edge cases**: Handle mobile URLs, short links, etc.

## Future Enhancements

### Planned Improvements

1. **Enhanced Magic Bytes**: Support for more file formats (HEIC, AV1, etc.)
2. **AI-Powered Detection**: Use machine learning for ambiguous files
3. **Performance Optimization**: Caching for frequently detected types
4. **Extended Platform Support**: More social media and content platforms

### Maintenance

- **Regular Updates**: Keep platform URL patterns current
- **Dependency Updates**: Monitor `mime-types` library for updates
- **Test Expansion**: Add new test cases as formats emerge
- **Performance Monitoring**: Track detection speed and accuracy

## Conclusion

DaySave's file type detection system provides robust, multi-layered content identification with excellent performance and reliability. The combination of pattern matching, MIME analysis, and binary signature detection ensures accurate type identification across diverse content sources and formats.

The system's design prioritizes:
- **Reliability**: Multiple detection methods with graceful fallbacks
- **Performance**: Fast pattern matching with minimal dependencies
- **Extensibility**: Easy addition of new file types and platforms
- **Maintainability**: Clear code organization and comprehensive testing

This foundation enables DaySave's multimedia analysis pipeline to process content accurately and efficiently across all supported platforms and file types.
