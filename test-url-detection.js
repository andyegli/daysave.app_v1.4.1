// Test script to check URL detection for multimedia content
function isMultimediaURL(url) {
  if (!url || typeof url !== 'string') return false;
  
  const multimediaPatterns = [
    // Video platforms
    /youtube\.com\/watch/i,
    /youtube\.com\/shorts/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /dailymotion\.com\//i,
    /twitch\.tv\//i,
    /tiktok\.com\//i,
    /instagram\.com\/p\//i,
    /instagram\.com\/reel\//i,
    /facebook\.com\/watch/i,
    /facebook\.com\/share\/v\//i,
    /facebook\.com\/share\/p\//i,
    /facebook\.com\/video\//i,
    /facebook\.com\/.*\/videos\//i,
    /facebook\.com\/.*\/posts\//i,
    /facebook\.com\/.*\/photos\//i,
    /m\.facebook\.com\/watch/i,
    /m\.facebook\.com\/video\//i,
    /fb\.com\//i,
    /twitter\.com\/.*\/status/i,
    /x\.com\/.*\/status/i,
    /linkedin\.com\/posts\//i,
    
    // Direct video/audio file extensions
    /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i,
    /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
    
    // Direct image file extensions
    /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif)(\?|$)/i,
    
    // Image hosting and sharing platforms
    /imgur\.com\//i,
    /flickr\.com\//i,
    /pinterest\.com\/pin\//i,
    /unsplash\.com\//i,
    /pixabay\.com\//i,
    /pexels\.com\//i,
    /shutterstock\.com\//i,
    /gettyimages\.com\//i,
    /istockphoto\.com\//i,
    
    // Streaming platforms
    /soundcloud\.com\//i,
    /spotify\.com\//i,
    /anchor\.fm\//i,
    /podcasts\.apple\.com\//i,
    
    // Video hosting services
    /wistia\.com\//i,
    /brightcove\.com\//i,
    /jwplayer\.com\//i
  ];
  
  return multimediaPatterns.some(pattern => pattern.test(url));
}

// Test URLs from the debug output
const testUrls = [
  'https://www.youtube.com/watch?v=FLpS7OfD5-s',  // Entry #1 - DID work
  'https://www.youtube.com/watch?v=test12345',     // Entry #2 - DIDN'T work
  'https://www.facebook.com/share/v/1AuKBapG4C/?mibextid=wwXIfr', // Entry #3 - DIDN'T work
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',   // Entry #4 & #5 - DIDN'T work
];

console.log('🧪 Testing URL detection for multimedia content...\n');

testUrls.forEach((url, index) => {
  const isMultimedia = isMultimediaURL(url);
  console.log(`${index + 1}. ${isMultimedia ? '✅' : '❌'} ${url}`);
  console.log(`   🎬 Is Multimedia: ${isMultimedia}`);
  
  if (isMultimedia) {
    console.log('   ✅ Should trigger automation');
  } else {
    console.log('   ❌ Will NOT trigger automation');
  }
  console.log('');
});

console.log('🔍 Pattern matching details:\n');

// Test specific patterns
testUrls.forEach((url, index) => {
  console.log(`URL ${index + 1}: ${url}`);
  
  // Test YouTube patterns specifically
  const youtubeWatch = /youtube\.com\/watch/i.test(url);
  const youtubeShorts = /youtube\.com\/shorts/i.test(url);
  const youtubeBe = /youtu\.be\//i.test(url);
  
  console.log(`   YouTube watch: ${youtubeWatch ? '✅' : '❌'}`);
  console.log(`   YouTube shorts: ${youtubeShorts ? '✅' : '❌'}`);
  console.log(`   youtu.be: ${youtubeBe ? '✅' : '❌'}`);
  
  // Test Facebook patterns
  const fbWatch = /facebook\.com\/watch/i.test(url);
  const fbShareV = /facebook\.com\/share\/v\//i.test(url);
  const fbVideo = /facebook\.com\/video\//i.test(url);
  
  console.log(`   Facebook watch: ${fbWatch ? '✅' : '❌'}`);
  console.log(`   Facebook share/v: ${fbShareV ? '✅' : '❌'}`);
  console.log(`   Facebook video: ${fbVideo ? '✅' : '❌'}`);
  
  console.log('');
});

console.log('✅ URL detection test completed'); 