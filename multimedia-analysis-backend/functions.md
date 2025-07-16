# Multimedia Analysis Backend - Functions Documentation

## Overview
This document provides comprehensive documentation for all functions in the multimedia analysis backend server. The server provides AI-powered analysis of multimedia content including object detection, transcription, sentiment analysis, and more.

## Table of Contents
- [VoicePrintDatabase Class](#voiceprintdatabase-class)
- [MultimediaAnalyzer Class](#multimediaanalyzer-class)
- [Standalone Functions](#standalone-functions)
- [API Endpoints](#api-endpoints)

---

## VoicePrintDatabase Class

### Constructor
```javascript
constructor()
```
Initializes the voice print database with persistent storage and similarity threshold settings.

### Core Methods

#### `loadDatabase()`
- **Returns**: `Object` - Voice print database object with speakers and metadata
- **Description**: Loads the persistent voice print database from JSON file, creates empty database if file doesn't exist

#### `saveDatabase()`
- **Returns**: `void`
- **Description**: Persists the current voice print database to JSON file, updates metadata with current timestamp and speaker count

#### `generateVoiceFingerprint(characteristics, speakingStyle)`
- **Parameters**:
  - `characteristics` (Object) - Voice characteristics object
  - `speakingStyle` (Object) - Speaking style analysis object
- **Returns**: `Object` - Voice fingerprint with hash for comparison
- **Description**: Creates a unique fingerprint based on voice characteristics and speaking patterns for speaker identification

#### `hashString(str)`
- **Parameters**:
  - `str` (string) - String to hash
- **Returns**: `string` - Hash value as string
- **Description**: Creates a simple hash of a string for fingerprint comparison

#### `calculateSimilarity(fingerprint1, fingerprint2)`
- **Parameters**:
  - `fingerprint1` (Object) - First voice fingerprint
  - `fingerprint2` (Object) - Second voice fingerprint
- **Returns**: `number` - Similarity score between 0 and 1
- **Description**: Calculates weighted similarity between voice fingerprints considering pitch, tempo, clarity, volume, and speaking patterns

#### `findMatchingSpeaker(voiceFingerprint)`
- **Parameters**:
  - `voiceFingerprint` (Object) - Voice fingerprint to match
- **Returns**: `Object|null` - Best matching speaker or null if none found
- **Description**: Searches database for speakers with similarity above threshold

#### `addSpeaker(speakerId, voiceFingerprint, profile)`
- **Parameters**:
  - `speakerId` (string) - Unique identifier for the speaker
  - `voiceFingerprint` (Object) - Voice fingerprint data
  - `profile` (Object) - Speaker profile information
- **Returns**: `void`
- **Description**: Adds new speaker or updates existing speaker data in database

#### `getSpeakerStats()`
- **Returns**: `Object` - Statistics about speakers in database
- **Description**: Returns comprehensive statistics about stored speakers

#### `searchSpeakers(criteria)`
- **Parameters**:
  - `criteria` (Object) - Search criteria object
- **Returns**: `Array` - Array of matching speakers sorted by relevance
- **Description**: Searches for speakers matching specified criteria

---

## MultimediaAnalyzer Class

### Object Detection Methods

#### `detectObjects(imagePath)`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
- **Returns**: `Promise<Array>` - Array of detected objects with name, confidence, and bounding box
- **Description**: Detects and localizes objects in images with confidence scores and bounding boxes using Google Vision API

#### `detectObjectsREST(imagePath)`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
- **Returns**: `Promise<Array>` - Array of detected objects with name, confidence, and bounding box
- **Description**: Uses Google Vision REST API for object detection when client library unavailable

#### `detectObjectsEnhanced(imagePath)`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
- **Returns**: `Promise<Object>` - Complete analysis including objects, labels, and text
- **Description**: Performs comprehensive image analysis including object detection, label detection, and text recognition (OCR)

#### `detectObjectsEnhancedREST(imagePath)`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
- **Returns**: `Promise<Object>` - Complete analysis including objects, labels, and text
- **Description**: Uses REST API for comprehensive image analysis including OCR

### Transcription Methods

#### `transcribeAudioOpenAI(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text and word timestamps
- **Description**: Transcribes audio files with high accuracy and word-level timestamps using OpenAI Whisper

#### `transcribeAudioGoogle(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text, word timestamps, and speaker info
- **Description**: Enhanced transcription service with speaker diarization and confidence scores. Handles long audio files by splitting into chunks if necessary

#### `transcribeAudioGoogleREST(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text, word timestamps, and speaker info
- **Description**: Uses Google Speech-to-Text REST API for transcription with smart routing

#### `transcribeAudioGoogleLongRunning(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text, word timestamps, and speaker info
- **Description**: Uses Google's LongRunningRecognize API for long audio files

#### `transcribeAudioOpenAIWithChunking(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text and word timestamps
- **Description**: Splits large audio files into chunks for better processing with OpenAI Whisper

#### `convertAudioForWhisper(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<string>` - Path to the converted audio file
- **Description**: Converts audio to 16kHz mono WAV format for optimal Whisper processing

#### `transcribeAudioGoogleRESTWithChunking(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Transcription result with text, word timestamps, and speaker info
- **Description**: Splits large audio files into chunks for Google Speech-to-Text REST API

### Voice Analysis Methods

#### `analyzeVoicePrints(audioPath, speakers)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
  - `speakers` (Array) - Array of speaker segments from transcription
- **Returns**: `Promise<Object>` - Voice print analysis results with speaker profiles
- **Description**: Analyzes audio characteristics to identify unique speakers and potentially name them

#### `analyzeBasicVoicePrints(audioPath, transcription)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
  - `transcription` (Object) - Transcription results
- **Returns**: `Promise<Object>` - Basic voice print analysis
- **Description**: Analyzes basic voice prints without speaker diarization

#### `analyzeBasicSpeakingStyle(text)`
- **Parameters**:
  - `text` (string) - Transcription text
- **Returns**: `Object` - Basic speaking style analysis
- **Description**: Analyzes basic speaking style from text

#### `extractSpeakerSegment(audioPath, startTime, endTime, speakerTag)`
- **Parameters**:
  - `audioPath` (string) - Path to the full audio file
  - `startTime` (number) - Start time in seconds
  - `endTime` (number) - End time in seconds
  - `speakerTag` (string) - Speaker identifier
- **Returns**: `Promise<string>` - Path to the extracted audio segment
- **Description**: Extracts audio segment for specific speaker

#### `analyzeVoiceCharacteristics(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to speaker audio segment
- **Returns**: `Promise<Object>` - Voice characteristics analysis
- **Description**: Analyzes basic audio characteristics like pitch, volume, and clarity

#### `generateSpeakerProfile(speakerTag, words, characteristics)`
- **Parameters**:
  - `speakerTag` (string) - Speaker identifier
  - `words` (Array) - Array of words spoken by this speaker
  - `characteristics` (Object) - Voice characteristics
- **Returns**: `Promise<Object>` - Complete speaker profile
- **Description**: Creates detailed speaker profile including AI-generated name and speaking patterns

#### `generateSpeakerName(speakerTag, text, characteristics)`
- **Parameters**:
  - `speakerTag` (string) - Speaker identifier
  - `text` (string) - Text spoken by this speaker
  - `characteristics` (Object) - Voice characteristics
- **Returns**: `Promise<string>` - Generated speaker name
- **Description**: Uses OpenAI GPT-4 to generate realistic speaker names based on voice characteristics

#### `analyzeSpeakingStyle(wordsPerMinute, avgWordLength, characteristics)`
- **Parameters**:
  - `wordsPerMinute` (number) - Speaking rate
  - `avgWordLength` (number) - Average word length
  - `characteristics` (Object) - Voice characteristics
- **Returns**: `string` - Speaking style description
- **Description**: Analyzes speaking patterns to determine communication style

### NLP and Analysis Methods

#### `extractNamedEntities(text)`
- **Parameters**:
  - `text` (string) - Text to analyze for named entities
- **Returns**: `Promise<Object>` - Named entity recognition results with categorized entities
- **Description**: Uses OpenAI's GPT-4 to identify and extract named entities like people, organizations, locations, dates, etc.

#### `analyzeSentiment(text)`
- **Parameters**:
  - `text` (string) - Text to analyze for sentiment
- **Returns**: `Promise<Object>` - Sentiment analysis results including overall sentiment, emotions, and confidence
- **Description**: Uses OpenAI GPT-4 for comprehensive sentiment analysis including emotions and tone

#### `summarizeText(text, maxLength = 150)`
- **Parameters**:
  - `text` (string) - Text content to summarize
  - `maxLength` (number) - Maximum length of summary in words (default: 150)
- **Returns**: `Promise<Object>` - Summary result with text and provider info
- **Description**: Creates concise summaries preserving key information and context using OpenAI GPT-4

#### `summarizeTextAdvanced(text, options = {})`
- **Parameters**:
  - `text` (string) - Text content to summarize
  - `options` (Object) - Summarization options
    - `maxLength` (number) - Maximum length in words
    - `style` (string) - Summary style ('standard', 'bullet-points', 'executive', 'technical')
    - `tone` (string) - Summary tone ('neutral', 'formal', 'casual')
- **Returns**: `Promise<Object>` - Advanced summary result
- **Description**: Creates customized summaries with different styles and tones using OpenAI GPT-4

#### `detectProfanity(text, sensitivity = 'moderate')`
- **Parameters**:
  - `text` (string) - Text to analyze
  - `sensitivity` (string) - Sensitivity level (strict, moderate, lenient)
- **Returns**: `Promise<Object>` - Profanity analysis results
- **Description**: Analyzes text for inappropriate language with severity levels

#### `detectKeywords(text, categories = 'all')`
- **Parameters**:
  - `text` (string) - Text to analyze
  - `categories` (string) - Keyword categories to detect
- **Returns**: `Promise<Object>` - Keyword analysis results
- **Description**: Identifies important keywords and phrases in the text

### Utility Methods

#### `splitAudioIntoChunks(audioPath, chunkDuration = 60)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
  - `chunkDuration` (number) - Duration of each chunk in seconds (default: 60)
- **Returns**: `Promise<Array<string>>` - Array of paths to audio chunks
- **Description**: Splits audio files longer than 60 seconds into manageable chunks for better processing

#### `extractAudioFromVideo(videoPath, provider = 'google')`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
  - `provider` (string) - Transcription provider ('openai' or 'google')
- **Returns**: `Promise<string>` - Path to the extracted audio file
- **Description**: Uses FFmpeg to extract audio track from video files and optimize for transcription

#### `extractVideoFrame(videoPath, timeStamp = '00:00:00.5')`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
  - `timeStamp` (string) - Timestamp in format 'HH:MM:SS' (default: '00:00:00.5')
- **Returns**: `Promise<string>` - Path to the extracted frame image
- **Description**: Extracts a single frame from video at specified timestamp using FFmpeg

#### `analyzeMultimedia(filePath, fileType, options = {})`
- **Parameters**:
  - `filePath` (string) - Path to the multimedia file
  - `fileType` (string) - MIME type of the file
  - `options` (Object) - Analysis options
- **Returns**: `Promise<Object>` - Complete analysis results
- **Description**: Main analysis function that handles all multimedia types with comprehensive results

#### `getVideoMetadata(videoPath)`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
- **Returns**: `Promise<Object>` - Video metadata
- **Description**: Retrieves video file metadata including duration, resolution, etc.

#### `getAudioMetadata(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<Object>` - Audio metadata
- **Description**: Retrieves audio file metadata including channels, sample rate, etc.

#### `convertAudioToMono(audioPath)`
- **Parameters**:
  - `audioPath` (string) - Path to the audio file
- **Returns**: `Promise<string>` - Path to the converted mono audio file
- **Description**: Converts stereo audio to mono for Google Speech-to-Text compatibility

#### `secondsToTimeString(seconds)`
- **Parameters**:
  - `seconds` (number) - Number of seconds
- **Returns**: `string` - Timestamp in HH:MM:SS format
- **Description**: Utility function to convert seconds to HH:MM:SS format

#### `generateImageThumbnail(imagePath, sizes = [150, 300, 500])`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
  - `sizes` (Array) - Array of thumbnail sizes (default: [150, 300, 500])
- **Returns**: `Promise<Object>` - Thumbnail generation results with paths and metadata
- **Description**: Generates multiple thumbnail sizes for images using FFmpeg with proper aspect ratio preservation

#### `generateVideoThumbnail(videoPath, options = {})`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
  - `options` (Object) - Thumbnail generation options
- **Returns**: `Promise<Object>` - Thumbnail and key moments generation results
- **Description**: Creates thumbnail from first frame and extracts key moments for preview

#### `generateThumbnails(filePath, fileType, options = {})`
- **Parameters**:
  - `filePath` (string) - Path to the media file
  - `fileType` (string) - MIME type of the file
  - `options` (Object) - Thumbnail generation options
- **Returns**: `Promise<Object>` - Comprehensive thumbnail generation results
- **Description**: Main thumbnail generation function that handles both images and videos

#### `extractVideoFramesForOCR(videoPath, options = {})`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
  - `options` (Object) - OCR extraction options (frameInterval, maxFrames, minInterval, startTime, endTime)
- **Returns**: `Promise<Array>` - Array of extracted frame paths with timestamps
- **Description**: Extracts video frames at regular intervals for OCR processing with configurable timing

#### `extractVideoOCRCaptions(videoPath, options = {})`
- **Parameters**:
  - `videoPath` (string) - Path to the video file
  - `options` (Object) - OCR extraction options (frameInterval, maxFrames, confidenceThreshold, filterShortText)
- **Returns**: `Promise<Object>` - OCR results with timestamps, captions, and metadata
- **Description**: Extracts text from video frames with timestamp mapping using Google Vision API for caption generation

#### `detectTextREST(imagePath)`
- **Parameters**:
  - `imagePath` (string) - Path to the image file
- **Returns**: `Promise<Array>` - Text detection results with confidence scores and bounding boxes
- **Description**: Uses Google Vision REST API for text detection in images with detailed annotation data

### Helper Methods

#### `getProfanityPatterns(sensitivity)`
- **Parameters**:
  - `sensitivity` (string) - Sensitivity level (strict, moderate, lenient)
- **Returns**: `Array` - Array of profanity patterns with severity levels
- **Description**: Returns regex patterns for profanity detection based on sensitivity setting

#### `getWordContext(text, word)`
- **Parameters**:
  - `text` (string) - Full text content
  - `word` (string) - Detected profane word
- **Returns**: `string` - Context surrounding the word
- **Description**: Extracts surrounding context for better profanity understanding

#### `getContentRating(severity, count)`
- **Parameters**:
  - `severity` (string) - Overall severity level
  - `count` (number) - Number of detected profane words
- **Returns**: `string` - Content rating (G, PG, PG-13, R)
- **Description**: Assigns content rating based on profanity severity and frequency

#### `generateProfanitySummary(severity, count, words)`
- **Parameters**:
  - `severity` (string) - Overall severity level
  - `count` (number) - Number of detected profane words
  - `words` (Array) - Array of detected profane words
- **Returns**: `string` - Human-readable summary of profanity analysis
- **Description**: Creates descriptive summary of profanity detection results

#### `getKeywordPatterns(categories)`
- **Parameters**:
  - `categories` (string) - Category to get patterns for (all, business, technical, names, custom)
- **Returns**: `Array` - Array of keyword patterns with regex and category
- **Description**: Returns keyword detection patterns for specified categories

#### `calculateKeywordRelevance(term, category, text)`
- **Parameters**:
  - `term` (string) - Detected keyword term
  - `category` (string) - Category of the keyword
  - `text` (string) - Full text content
- **Returns**: `number` - Relevance score between 0 and 1
- **Description**: Calculates relevance score based on frequency, category, and term length

#### `generateKeywordSummary(total, categories, keywords)`
- **Parameters**:
  - `total` (number) - Total number of keywords detected
  - `categories` (number) - Number of categories found
  - `keywords` (Array) - Array of detected keywords
- **Returns**: `string` - Human-readable summary of keyword analysis
- **Description**: Creates descriptive summary of keyword detection results

---

## Standalone Functions

### Download and Streaming Functions

#### `downloadFileFromUrl(url)`
- **Parameters**:
  - `url` (string) - The URL to download from
- **Returns**: `Promise<string>` - Path to the downloaded file
- **Description**: Downloads file from URL and saves to temporary location

#### `detectStreamingPlatform(url)`
- **Parameters**:
  - `url` (string) - The URL to check
- **Returns**: `string|null` - Platform name or null if not a streaming platform
- **Description**: Detects streaming platform from URL (YouTube, Instagram, TikTok, etc.)

#### `isValidMultimediaUrl(url)`
- **Parameters**:
  - `url` (string) - The URL to validate
- **Returns**: `boolean` - True if URL is valid and supported
- **Description**: Validates if URL points to a supported multimedia file or streaming platform

#### `downloadYouTubeVideo(url)`
- **Parameters**:
  - `url` (string) - YouTube URL
- **Returns**: `Promise<string>` - Path to the downloaded file
- **Description**: Downloads YouTube video with multiple fallback methods

#### `downloadFromStreamingPlatform(url)`
- **Parameters**:
  - `url` (string) - Streaming platform URL
- **Returns**: `Promise<{filePath: string, platform: string, metadata: object}>` - Download result
- **Description**: Downloads content from streaming platform with platform-specific handling

#### `downloadWithYtDlp(url, platform)`
- **Parameters**:
  - `url` (string) - URL to download from
  - `platform` (string) - Platform name for format optimization
- **Returns**: `Promise<string>` - Path to downloaded file
- **Description**: Uses yt-dlp tool with platform-specific optimizations for reliable downloads

### Deprecated Functions

#### `downloadWithYtdlCoreBasic(url)` (Deprecated)
- **Parameters**:
  - `url` (string) - YouTube URL
- **Returns**: `Promise<string>` - Path to downloaded file
- **Description**: Deprecated method - ytdl-core no longer works with current YouTube API

#### `downloadWithYtdlCoreAudio(url)` (Deprecated)
- **Parameters**:
  - `url` (string) - YouTube URL
- **Returns**: `Promise<string>` - Path to downloaded file
- **Description**: Deprecated method - ytdl-core no longer works with current YouTube API

#### `downloadWithDirectInfo(url)` (Deprecated)
- **Parameters**:
  - `url` (string) - YouTube URL
- **Returns**: `Promise<string>` - Path to downloaded file
- **Description**: Deprecated method - direct extraction no longer works with current YouTube API

---

## API Endpoints

### Core Analysis Endpoints

#### `POST /analyze`
- **Description**: Comprehensive multimedia analysis for uploaded files

#### `POST /analyze/url`
- **Description**: Comprehensive multimedia analysis for URLs with caching support
- **Features**:
  - Downloads content from URLs or streaming platforms
  - 24-hour intelligent caching to avoid re-downloading
  - Supports all major streaming platforms (YouTube, Instagram, TikTok, etc.)
  - Cache key generation based on URL and analysis options
  - Automatic cache cleanup for expired entries
- **Body**: FormData with file upload
- **Returns**: Complete analysis results including objects, transcription, summary, sentiment, etc.

#### `POST /analyze/url`
- **Description**: Analyze multimedia content from URL
- **Body**: `{ url: string, options: object }`
- **Returns**: Analysis results for downloaded content

#### `POST /analyze/upload`
- **Description**: Upload and analyze multimedia file
- **Body**: FormData with file upload
- **Returns**: Analysis results

#### `POST /analyze/objects`
- **Description**: Object detection only
- **Body**: FormData with image file
- **Returns**: Object detection results

#### `POST /analyze/transcribe`
- **Description**: Audio transcription only
- **Body**: FormData with audio file
- **Returns**: Transcription results

#### `POST /analyze/summarize`
- **Description**: Text summarization only
- **Body**: `{ text: string, options: object }`
- **Returns**: Summary results

#### `POST /analyze/video-frames`
- **Description**: Video frame analysis
- **Body**: FormData with video file
- **Returns**: Frame analysis results

#### `POST /generate/thumbnails`
- **Description**: Generate thumbnails from uploaded media
- **Body**: FormData with media file and thumbnail options
- **Returns**: Thumbnail generation results with URLs and metadata

#### `POST /analyze/ocr-captions`
- **Description**: Extract OCR captions from video frames
- **Body**: FormData with video file and OCR options (frameInterval, maxFrames, confidenceThreshold, filterShortText)
- **Returns**: OCR caption results with timestamps and text detection data

### Utility Endpoints

#### `GET /`
- **Description**: Root endpoint - serves the frontend
- **Returns**: HTML frontend interface

#### `GET /health`
- **Description**: Health check endpoint
- **Returns**: Server status and API availability

#### `GET /dashboard`
- **Description**: Dashboard endpoint
- **Returns**: Dashboard interface data

#### `GET /content`
- **Description**: Content retrieval endpoint
- **Query Parameters**: `tag`, `from`, `to`
- **Returns**: Filtered content results

#### `GET /admin/users`
- **Description**: User management endpoint
- **Returns**: User management interface

#### `GET /thumbnails/:filename`
- **Description**: Serve generated thumbnail files
- **Parameters**: filename - Name of the thumbnail file
- **Returns**: Static thumbnail image file

---

## Error Handling

The server includes comprehensive error handling:
- 404 errors for unknown endpoints
- 500 errors for internal server errors
- Specific error messages for API failures
- Graceful degradation for service unavailability

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY` - OpenAI API key for transcription and NLP
- `GOOGLE_APPLICATION_CREDENTIALS` - Google Cloud credentials file path or API key
- `GOOGLE_API_KEY` - Alternative Google API key
- `APP_PORT` - Server port (default: 3000)

## Dependencies

Key dependencies:
- Express.js for web server
- OpenAI SDK for AI services
- Google Cloud Vision and Speech APIs
- FFmpeg for audio/video processing
- Multer for file uploads
- Various streaming platform downloaders

---

*This documentation covers all major functions and endpoints in the multimedia analysis backend. For implementation details, refer to the source code with JSDoc comments.* 