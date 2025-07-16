# 🎯 Multimedia Analysis Backend

A comprehensive Express.js backend for analyzing multimedia content including object detection, transcription, and summarization using OpenAI and Google Cloud APIs.

## ✨ Features

- **🔍 Object Detection**: Detect and localize objects in images using Google Vision API
- **🎤 Audio Transcription**: Transcribe audio files using OpenAI Whisper or Google Speech-to-Text
- **📹 Video Analysis**: Extract frames and analyze video content
- **📝 Text Recognition**: OCR capabilities for extracting text from images
- **📊 Text Summarization**: Summarize text content using OpenAI GPT-4
- **🖼️ Thumbnail Generation**: Automatic thumbnail generation for images and videos with key moments preview
- **📄 OCR Caption Extraction**: Extract text from video frames with timestamps for video navigation
- **🔗 URL Analysis**: Analyze multimedia content directly from URLs
- **📺 Streaming Platforms**: Analyze content from YouTube, Instagram, TikTok, Facebook, Twitter, Vimeo, Twitch
- **📁 File Upload**: Upload files directly from your device
- **🎨 Modern Frontend**: Beautiful Bootstrap-based web interface with tabbed interface and thumbnail hover effects
- **🛡️ Security**: Built-in security middleware and error handling
- **🎥 Integrated Video Player**: In-browser video player with clickable word-level timestamps and scrubbing controls
- **💾 Smart Caching**: 24-hour URL caching system to avoid re-downloading previously processed content

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key
- Google Cloud API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multimedia-analysis-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   GOOGLE_API_KEY=AIzaSy-your-google-api-key-here
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to access the web interface.

## 🔑 API Key Setup

### OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)

### Google Cloud API Key
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable **Cloud Vision API** and **Cloud Speech-to-Text API**
4. Go to **APIs & Services** → **Credentials**
5. Click **"Create Credentials"** → **"API Key"**
6. Copy the generated key (starts with `AIza`)

**Alternative: Service Account (Recommended for Production)**
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in service account details
4. Create and download the JSON key file
5. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of this file

**Environment Variable Options:**
- `GOOGLE_API_KEY` - Use API key directly
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON file

## 📡 API Endpoints

### Main Analysis Endpoints
- **POST** `/analyze` - Comprehensive multimedia analysis from file upload
  - Accepts: `multipart/form-data` with `file` field
  - Returns: Complete analysis results
- **POST** `/analyze/url` - Comprehensive multimedia analysis from URL with caching
  - Accepts: `application/json` with `url` field
  - Returns: Complete analysis results with source URL
  - Features: 24-hour intelligent caching, streaming platform support

### Specialized Endpoints
- **POST** `/analyze/objects` - Image object detection
- **POST** `/analyze/transcribe` - Audio/video transcription
- **POST** `/analyze/summarize` - Text summarization
- **POST** `/analyze/video-frames` - Multi-frame video analysis
- **POST** `/analyze/ocr-captions` - OCR caption extraction from video frames

### Utility Endpoints
- **GET** `/health` - Health check and API status
- **GET** `/` - Web interface

## 🎨 Web Interface

The project includes a modern, responsive web interface built with Bootstrap 5:

- **Tabbed Interface**: Switch between file upload and URL input
- **Drag & Drop Upload**: Easy file upload with drag-and-drop support
- **URL Input**: Paste URLs to analyze remote multimedia content
- **Streaming Platform Support**: Automatic detection and analysis of content from social media platforms
- **URL Validation**: Real-time validation of multimedia URLs and streaming platforms
- **File Preview**: Preview images before analysis
- **Progress Tracking**: Real-time progress indicators
- **Results Display**: Beautiful, organized results presentation with source attribution and platform metadata
- **OCR Caption Display**: Video captions with clickable timestamps for video navigation
- **Integrated Video Player**: In-browser video player with clickable word-level timestamps and scrubbing controls
- **Frame Preview**: Real-time frame preview while scrubbing through video timeline
- **Keyboard Shortcuts**: Arrow keys for seeking, spacebar for play/pause
- **Smart Caching**: Automatic caching of URL analysis results to avoid re-processing
- **API Status**: Live API connectivity status

## 📁 Project Structure

```
multimedia-analysis-backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── setupguid.md          # Detailed API key setup guide
├── TASK.md               # Project task tracker
├── public/               # Static files
│   ├── index.html        # Web interface
│   └── app.js           # Frontend JavaScript
└── uploads/              # Temporary file storage
```

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for transcription and summarization | Yes |
| `GOOGLE_API_KEY` | Google Cloud API key for object detection and speech-to-text | Yes* |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud service account JSON file | Yes* |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

*Either `GOOGLE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` is required for Google Cloud services

## 🔧 Configuration

### Supported Content Sources
- **Direct URLs**: JPG, JPEG, PNG, GIF, BMP, WebP, MP3, WAV, M4A, AAC, OGG, FLAC, MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **Streaming Platforms**: YouTube, Instagram, TikTok, Facebook, Twitter/X, Vimeo, Twitch

### File Upload Limits
- Maximum file size: 100MB
- Supported formats: Images (JPG, PNG, GIF), Audio (MP3, WAV, M4A), Video (MP4, AVI, MOV)

### Analysis Options
- Object detection confidence threshold
- Transcription provider selection (OpenAI/Google)
- Summary length and style customization
- Video frame extraction timing
- Thumbnail generation settings (size, key moments count)
- OCR caption extraction settings (frame interval, confidence threshold, maximum frames)

### Thumbnail System
- **Image Thumbnails**: Multiple sizes (150x150, 300x300, 500x500) with aspect ratio preservation
- **Video Thumbnails**: Main thumbnail from first frame plus key moments preview
- **Key Moments**: Evenly distributed moments throughout video duration for hover preview
- **Responsive Display**: Grid layout with hover effects and time indicators
- **Automatic Generation**: Integrated into all analysis workflows

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: File type and size validation
- **Error Handling**: Comprehensive error handling middleware
- **File Cleanup**: Automatic cleanup of uploaded files

## 📊 Performance

- **Compression**: Response compression for faster loading
- **Streaming**: Efficient file processing
- **Caching**: Static file caching
- **Logging**: Request logging with Morgan

## 🐛 Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY environment variable is missing"**
   - Ensure your `.env` file exists and contains the correct API key
   - Restart the server after adding the key

2. **"Google API key not configured"**
   - Verify the Google Cloud APIs are enabled (Vision API and Speech-to-Text API)
   - Check that your API key has the necessary permissions
   - Ensure you're using either `GOOGLE_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`
   - For service accounts, verify the JSON file path is correct

3. **File upload fails**
   - Check file size (max 100MB)
   - Verify file format is supported
   - Ensure uploads directory exists

4. **Analysis fails**
   - Check API quotas and billing
   - Verify internet connectivity
   - Review server logs for detailed error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for Whisper and GPT-4 APIs
- Google Cloud for Vision and Speech-to-Text APIs
- Bootstrap for the beautiful UI components
- Express.js community for the excellent framework

## 📞 Support

For support and questions:
- Check the troubleshooting section above
- Review the `setupguid.md` file for API setup help
- Open an issue on GitHub

---

**Happy Analyzing! 🚀** 