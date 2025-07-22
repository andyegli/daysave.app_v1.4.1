#!/usr/bin/env node

/**
 * Content Type Detection Test
 * 
 * Verifies that URL patterns are correctly detected
 */

const { ContentTypeDetector } = require('../scripts/populate-content-types');

class ContentTypeTest {
  constructor() {
    this.detector = new ContentTypeDetector();
    this.results = [];
  }

  run() {
    console.log('🎯 Testing Content Type Detection...\n');
    
    this.testUrlDetection();
    this.testFileDetection();
    this.testMimeTypeDetection();
    this.generateReport();
  }

  testUrlDetection() {
    console.log('🌐 Testing URL Detection...');
    
    const testCases = [
      // YouTube
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'video', name: 'YouTube Video' },
      { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'video', name: 'YouTube Short URL' },
      { url: 'https://www.youtube.com/shorts/ABC123', expected: 'video', name: 'YouTube Shorts' },
      
      // Instagram  
      { url: 'https://www.instagram.com/reel/ABC123/', expected: 'video', name: 'Instagram Reel' },
      { url: 'https://www.instagram.com/p/ABC123/', expected: 'video', name: 'Instagram Post' },
      
      // Facebook - RECENTLY FIXED
      { url: 'https://www.facebook.com/share/v/16e76ZjBNt/?mibextid=wwXIfr', expected: 'video', name: 'Facebook Share Video' },
      { url: 'https://www.facebook.com/watch?v=123456789', expected: 'video', name: 'Facebook Watch' },
      { url: 'https://www.facebook.com/video/123456789', expected: 'video', name: 'Facebook Video' },
      { url: 'https://m.facebook.com/watch?v=123', expected: 'video', name: 'Mobile Facebook' },
      
      // Direct Files
      { url: 'https://example.com/video.mp4', expected: 'video', name: 'Direct MP4' },
      { url: 'https://example.com/image.jpg', expected: 'image', name: 'Direct JPG' },
      { url: 'https://example.com/audio.mp3', expected: 'audio', name: 'Direct MP3' },
      
      // Audio Platforms
      { url: 'https://soundcloud.com/artist/track', expected: 'audio', name: 'SoundCloud' },
      { url: 'https://open.spotify.com/track/abc', expected: 'audio', name: 'Spotify' },
      
      // Image Platforms
      { url: 'https://imgur.com/abc123', expected: 'image', name: 'Imgur' },
      { url: 'https://flickr.com/photos/abc', expected: 'image', name: 'Flickr' }
    ];

    for (const test of testCases) {
      const detected = this.detector.detectFromUrl(test.url);
      this.addResult(test.name, detected === test.expected, `Expected: ${test.expected}, Got: ${detected}`, test.url);
    }
  }

  testFileDetection() {
    console.log('\n📁 Testing File Extension Detection...');
    
    const testCases = [
      // Video files
      { filename: 'movie.mp4', expected: 'video', name: 'MP4 Video' },
      { filename: 'clip.avi', expected: 'video', name: 'AVI Video' },
      { filename: 'video.mov', expected: 'video', name: 'MOV Video' },
      { filename: 'recording.webm', expected: 'video', name: 'WebM Video' },
      
      // Audio files
      { filename: 'song.mp3', expected: 'audio', name: 'MP3 Audio' },
      { filename: 'track.wav', expected: 'audio', name: 'WAV Audio' },
      { filename: 'audio.flac', expected: 'audio', name: 'FLAC Audio' },
      { filename: 'voice.m4a', expected: 'audio', name: 'M4A Audio' },
      
      // Image files
      { filename: 'photo.jpg', expected: 'image', name: 'JPG Image' },
      { filename: 'picture.png', expected: 'image', name: 'PNG Image' },
      { filename: 'graphic.gif', expected: 'image', name: 'GIF Image' },
      { filename: 'image.webp', expected: 'image', name: 'WebP Image' },
      
      // Document files
      { filename: 'document.pdf', expected: 'document', name: 'PDF Document' },
      { filename: 'text.txt', expected: 'document', name: 'Text File' },
      { filename: 'data.csv', expected: 'document', name: 'CSV File' }
    ];

    for (const test of testCases) {
      const detected = this.detector.detectFromFilename(test.filename);
      this.addResult(test.name, detected === test.expected, `Expected: ${test.expected}, Got: ${detected}`, test.filename);
    }
  }

  testMimeTypeDetection() {
    console.log('\n🎭 Testing MIME Type Detection...');
    
    const testCases = [
      { mime: 'video/mp4', expected: 'video', name: 'Video MP4 MIME' },
      { mime: 'audio/mpeg', expected: 'audio', name: 'Audio MPEG MIME' },
      { mime: 'image/jpeg', expected: 'image', name: 'Image JPEG MIME' },
      { mime: 'application/pdf', expected: 'document', name: 'PDF MIME' },
      { mime: 'text/plain', expected: 'document', name: 'Text MIME' }
    ];

    for (const test of testCases) {
      const detected = this.detector.detectFromMimeType(test.mime);
      this.addResult(test.name, detected === test.expected, `Expected: ${test.expected}, Got: ${detected}`, test.mime);
    }
  }

  addResult(name, passed, message, input) {
    this.results.push({ name, passed, message, input });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${message}`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CONTENT TYPE DETECTION TEST REPORT');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   ✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(`   ❌ Failed: ${failed}/${total} (${Math.round(failed/total*100)}%)`);
    
    if (failed > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`   • ${r.name}: ${r.message}`));
      
      console.log(`\n🔧 TO FIX: Update ContentTypeDetector patterns in scripts/populate-content-types.js`);
    }
    
    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
      console.log('\n💥 Content type detection tests FAILED');
      process.exit(1);
    } else {
      console.log('\n🎉 All content type detection tests PASSED!');
      process.exit(0);
    }
  }
}

// Main execution
if (require.main === module) {
  const test = new ContentTypeTest();
  test.run();
}

module.exports = ContentTypeTest; 