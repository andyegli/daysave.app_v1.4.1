# 🧪 Test Files Directory

This directory contains sample multimedia files for testing the AI analysis pipeline. Files are organized by type and used to validate that all implemented AI jobs work correctly.

## Directory Structure

```
testfiles/
├── images/          # Image files for object detection and OCR testing
├── audio/           # Audio files for transcription and speaker identification
├── video/           # Video files for comprehensive analysis
├── test-urls.json   # Configuration file with public URLs for streaming platforms
└── README.md        # This file
```

## Supported File Types

### Images
- **Formats**: JPG, JPEG, PNG, GIF, BMP, WebP, SVG, TIFF
- **AI Jobs**: Object Detection, OCR Text Extraction, Image Description
- **Test Scenarios**: Objects, text overlay, complex scenes, different qualities

### Audio
- **Formats**: MP3, WAV, M4A, AAC, OGG, FLAC, WMA
- **AI Jobs**: Audio Transcription, Speaker Diarization, Voice Print Recognition, Sentiment Analysis
- **Test Scenarios**: Multiple speakers, single speaker, background noise, different qualities

### Video
- **Formats**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **AI Jobs**: All audio jobs + Thumbnail Generation, OCR from frames, Object Detection
- **Test Scenarios**: Short clips, long videos, talking heads, action scenes, text overlays

## Adding Test Files

1. **Place files in appropriate directories** based on their type
2. **Use descriptive filenames** that indicate content (e.g., `two_speakers_conversation.mp3`)
3. **Include variety** in content types, quality levels, and scenarios
4. **Keep file sizes reasonable** for testing (under 100MB per file)
5. **Use real content** rather than synthetic test files when possible

## Test URLs Configuration

Edit `test-urls.json` to add public URLs for testing streaming platform analysis:

```json
{
  "youtube": ["https://www.youtube.com/watch?v=example"],
  "instagram": ["https://www.instagram.com/p/example"],
  "tiktok": ["https://www.tiktok.com/@user/video/example"],
  "facebook": ["https://www.facebook.com/watch/?v=example"],
  "twitter": ["https://twitter.com/user/status/example"],
  "vimeo": ["https://vimeo.com/example"],
  "twitch": ["https://www.twitch.tv/videos/example"]
}
```

## Testing Process

1. **Admin Interface**: Access the testing interface via admin dashboard
2. **Select Files/URLs**: Multi-select from available files and URLs
3. **Choose AI Jobs**: Select which analysis jobs to run
4. **Monitor Progress**: Real-time progress indicators show completion status
5. **View Results**: Detailed results with pass/fail status and reasoning
6. **History Tracking**: All test results are stored for performance analysis

## Test Success Criteria

- **Pass**: AI job completes successfully and produces expected output
- **Fail**: AI job fails to complete or produces invalid output (with reason logged)
- **Performance**: Processing time, API costs, and accuracy metrics are tracked 