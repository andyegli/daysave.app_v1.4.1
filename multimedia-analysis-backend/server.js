/**
 * Multimedia Analysis Backend Server
 * 
 * A comprehensive Express.js server for analyzing multimedia content including:
 * - Object detection in images/videos (Google Vision API)
 * - Audio/video transcription (OpenAI Whisper & Google Speech-to-Text)
 * - Text summarization (OpenAI GPT-4)
 * 
 * Dependencies: OpenAI API, Google Cloud Vision API, Google Cloud Speech-to-Text API
 * Author: Claude
 * Version: 1.0.0
 */

// ===== IMPORTS AND SETUP =====

// Environment and Configuration
require('dotenv').config(); // Load environment variables from .env file for API keys and configuration

// Core Web Framework
const express = require('express'); // Fast, unopinionated web framework for Node.js - handles HTTP requests, routing, middleware

// File Upload and Processing
const multer = require('multer'); // Middleware for handling multipart/form-data file uploads with validation and storage
const fs = require('fs'); // Node.js file system module for reading/writing files, directory operations
const path = require('path'); // Node.js path utilities for working with file and directory paths cross-platform

// Audio/Video Processing
const ffmpeg = require('fluent-ffmpeg'); // FFmpeg wrapper for audio/video processing: conversion, extraction, metadata, chunking

// AI and Machine Learning APIs
const { OpenAI } = require('openai'); // OpenAI API client for GPT-4 text analysis, Whisper transcription, and AI-powered features

// HTTP Client Libraries
const https = require('https'); // Node.js HTTPS client for secure API calls and file downloads
const http = require('http'); // Node.js HTTP client for non-secure requests and file downloads
const fetch = require('node-fetch'); // Modern fetch API for making HTTP requests to external APIs and services

// URL and Web Processing
const { URL } = require('url'); // Node.js URL parser for handling and validating URLs from various sources

// Media Download Libraries
const ytdl = require('ytdl-core'); // YouTube video downloader (deprecated - kept for fallback compatibility)

// Web Scraping and HTML Processing
const cheerio = require('cheerio'); // jQuery-like server-side HTML parsing for extracting metadata from web pages

// System Integration
const { exec } = require('child_process'); // Execute shell commands for yt-dlp and other external tools

// Security and Performance Middleware (loaded inline for better organization)
// const helmet = require('helmet'); // Security headers middleware - protects against common vulnerabilities
// const cors = require('cors'); // Cross-Origin Resource Sharing - enables API access from different domains
// const compression = require('compression'); // Response compression middleware - reduces bandwidth usage
// const morgan = require('morgan'); // HTTP request logger middleware - tracks API usage and debugging

// Initialize Express app
const app = express();

// Increase body size limits for large file uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Configure multer for file uploads with enhanced file type detection
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Enhanced file type detection
    const allowedMimes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
      // Audio
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac',
      // Video
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv',
      // Generic types that might be detected
      'application/octet-stream'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Try to detect file type from extension
      const ext = path.extname(file.originalname).toLowerCase();
      const extToMime = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
        '.bmp': 'image/bmp', '.webp': 'image/webp',
        '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
        '.ogg': 'audio/ogg', '.flac': 'audio/flac',
        '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.webm': 'video/webm', '.mkv': 'video/x-matroska'
      };
      
      if (extToMime[ext]) {
        file.mimetype = extToMime[ext];
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type'), false);
      }
    }
  }
});

// ===== API CLIENT INITIALIZATION =====

// Initialize OpenAI client for transcription and summarization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Google Cloud AI Services
const vision = require('@google-cloud/vision'); // Google Cloud Vision API for object detection, OCR, and image analysis
const speech = require('@google-cloud/speech'); // Google Cloud Speech-to-Text API for audio transcription and speaker diarization

// Configure Google Cloud clients with proper credential handling
let visionClient, speechClient;
let googleApiKey = null;

try {
  // Check if we have a service account file or API key
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Check if it's a file path or API key
    if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      // It's a service account file
      console.log('🔑 Using Google Cloud service account file');
      visionClient = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      speechClient = new speech.SpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    } else {
      // It's an API key - store it for REST API calls
      console.log('🔑 Using Google Cloud API key for REST API calls');
      googleApiKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      visionClient = null;
      speechClient = null;
    }
  } else if (process.env.GOOGLE_API_KEY) {
    // Use separate API key if available
    console.log('🔑 Using Google API key from GOOGLE_API_KEY for REST API calls');
    googleApiKey = process.env.GOOGLE_API_KEY;
    visionClient = null;
    speechClient = null;
  } else {
    console.warn('⚠️ No Google Cloud credentials found - object detection and speech-to-text will not work');
    visionClient = null;
    speechClient = null;
  }
} catch (error) {
  console.error('❌ Error initializing Google Cloud clients:', error);
  visionClient = null;
  speechClient = null;
}

// ===== VOICE PRINT DATABASE =====

/**
 * Voice Print Database for Speaker Recognition
 * 
 * Maintains a persistent database of voice characteristics to recognize
 * speakers across different audio files and sessions.
 */
class VoicePrintDatabase {
  constructor() {
    this.dbPath = './voice_prints.json';
    this.voicePrints = this.loadDatabase();
    this.similarityThreshold = 0.75; // Minimum similarity to consider speakers the same
  }

  /**
   * Load voice print database from file
   * 
   * @returns {Object} Voice print database object with speakers and metadata
   * @description Loads the persistent voice print database from JSON file,
   *              creates empty database if file doesn't exist
   */
  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log(`⚠️ Could not load voice print database: ${error.message}`);
    }
    return {
      speakers: {},
      metadata: {
        totalSpeakers: 0,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  /**
   * Save voice print database to file
   * 
   * @returns {void}
   * @description Persists the current voice print database to JSON file,
   *              updates metadata with current timestamp and speaker count
   */
  saveDatabase() {
    try {
      this.voicePrints.metadata.lastUpdated = new Date().toISOString();
      this.voicePrints.metadata.totalSpeakers = Object.keys(this.voicePrints.speakers).length;
      fs.writeFileSync(this.dbPath, JSON.stringify(this.voicePrints, null, 2));
      console.log(`💾 Voice print database saved with ${this.voicePrints.metadata.totalSpeakers} speakers`);
    } catch (error) {
      console.error(`❌ Could not save voice print database: ${error.message}`);
    }
  }

  /**
   * Generate a unique voice print fingerprint
   * 
   * @param {Object} characteristics - Voice characteristics object
   * @param {Object} speakingStyle - Speaking style analysis object
   * @returns {Object} Voice fingerprint with hash for comparison
   * @description Creates a unique fingerprint based on voice characteristics
   *              and speaking patterns for speaker identification
   */
  generateVoiceFingerprint(characteristics, speakingStyle) {
    // Create a fingerprint based on voice characteristics and speaking patterns
    const fingerprint = {
      pitch: characteristics.estimatedPitch,
      tempo: characteristics.estimatedTempo,
      clarity: characteristics.estimatedClarity,
      volume: characteristics.estimatedVolume,
      wordsPerMinute: speakingStyle.wordsPerMinute || 0,
      avgWordLength: speakingStyle.averageWordLength || 0,
      vocabularyDiversity: speakingStyle.vocabularyDiversity || 0,
      formality: speakingStyle.formality || 'neutral',
      pace: speakingStyle.pace || 'normal'
    };

    // Create a hash of the fingerprint for comparison
    const fingerprintString = JSON.stringify(fingerprint);
    return {
      fingerprint: fingerprint,
      hash: this.hashString(fingerprintString),
      characteristics: characteristics,
      speakingStyle: speakingStyle
    };
  }

  /**
   * Simple hash function for fingerprint comparison
   * 
   * @param {string} str - String to hash
   * @returns {string} Hash value as string
   * @description Creates a simple hash of a string for fingerprint comparison
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Calculate similarity between two voice fingerprints
   * 
   * @param {Object} fingerprint1 - First voice fingerprint
   * @param {Object} fingerprint2 - Second voice fingerprint
   * @returns {number} Similarity score between 0 and 1
   * @description Calculates weighted similarity between voice fingerprints
   *              considering pitch, tempo, clarity, volume, and speaking patterns
   */
  calculateSimilarity(fingerprint1, fingerprint2) {
    let similarity = 0;
    let totalWeight = 0;

    // Compare pitch
    if (fingerprint1.pitch === fingerprint2.pitch) {
      similarity += 0.2;
    }
    totalWeight += 0.2;

    // Compare tempo
    if (fingerprint1.tempo === fingerprint2.tempo) {
      similarity += 0.15;
    }
    totalWeight += 0.15;

    // Compare clarity
    if (fingerprint1.clarity === fingerprint2.clarity) {
      similarity += 0.15;
    }
    totalWeight += 0.15;

    // Compare volume
    if (fingerprint1.volume === fingerprint2.volume) {
      similarity += 0.1;
    }
    totalWeight += 0.1;

    // Compare speaking patterns (with tolerance)
    const wpmDiff = Math.abs(fingerprint1.wordsPerMinute - fingerprint2.wordsPerMinute);
    const wpmSimilarity = Math.max(0, 1 - (wpmDiff / 50)); // 50 WPM tolerance
    similarity += wpmSimilarity * 0.15;
    totalWeight += 0.15;

    const wordLengthDiff = Math.abs(fingerprint1.avgWordLength - fingerprint2.avgWordLength);
    const wordLengthSimilarity = Math.max(0, 1 - (wordLengthDiff / 2)); // 2 char tolerance
    similarity += wordLengthSimilarity * 0.1;
    totalWeight += 0.1;

    const vocabDiff = Math.abs(fingerprint1.vocabularyDiversity - fingerprint2.vocabularyDiversity);
    const vocabSimilarity = Math.max(0, 1 - (vocabDiff / 0.3)); // 0.3 tolerance
    similarity += vocabSimilarity * 0.1;
    totalWeight += 0.1;

    // Compare formality and pace
    if (fingerprint1.formality === fingerprint2.formality) {
      similarity += 0.05;
    }
    totalWeight += 0.05;

    if (fingerprint1.pace === fingerprint2.pace) {
      similarity += 0.05;
    }
    totalWeight += 0.05;

    return similarity / totalWeight;
  }

  /**
   * Find matching speaker in database
   * 
   * @param {Object} voiceFingerprint - Voice fingerprint to match
   * @returns {Object|null} Best matching speaker or null if none found
   * @description Searches database for speakers with similarity above threshold
   */
  findMatchingSpeaker(voiceFingerprint) {
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const [speakerId, speakerData] of Object.entries(this.voicePrints.speakers)) {
      const similarity = this.calculateSimilarity(voiceFingerprint.fingerprint, speakerData.fingerprint);
      
      if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = {
          speakerId: speakerId,
          speakerData: speakerData,
          similarity: similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Add or update speaker in database
   * 
   * @param {string} speakerId - Unique identifier for the speaker
   * @param {Object} voiceFingerprint - Voice fingerprint data
   * @param {Object} profile - Speaker profile information
   * @returns {void}
   * @description Adds new speaker or updates existing speaker data in database
   */
  addSpeaker(speakerId, voiceFingerprint, profile) {
    const existingSpeaker = this.voicePrints.speakers[speakerId];
    
    if (existingSpeaker) {
      // Update existing speaker with new data
      existingSpeaker.fingerprint = voiceFingerprint.fingerprint;
      existingSpeaker.characteristics = voiceFingerprint.characteristics;
      existingSpeaker.speakingStyle = voiceFingerprint.speakingStyle;
      existingSpeaker.profile = profile;
      existingSpeaker.lastSeen = new Date().toISOString();
      existingSpeaker.encounterCount = (existingSpeaker.encounterCount || 0) + 1;
      existingSpeaker.files = existingSpeaker.files || [];
      existingSpeaker.files.push({
        timestamp: new Date().toISOString(),
        confidence: profile.confidence || 0.75
      });
      
      console.log(`🔄 Updated existing speaker ${speakerId} in database`);
    } else {
      // Add new speaker
      this.voicePrints.speakers[speakerId] = {
        fingerprint: voiceFingerprint.fingerprint,
        characteristics: voiceFingerprint.characteristics,
        speakingStyle: voiceFingerprint.speakingStyle,
        profile: profile,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        encounterCount: 1,
        files: [{
          timestamp: new Date().toISOString(),
          confidence: profile.confidence || 0.75
        }]
      };
      
      console.log(`➕ Added new speaker ${speakerId} to database`);
    }

    this.saveDatabase();
  }

  /**
   * Get speaker statistics
   * 
   * @returns {Object} Statistics about speakers in database
   * @description Returns comprehensive statistics about stored speakers
   */
  getSpeakerStats() {
    const speakers = Object.values(this.voicePrints.speakers);
    return {
      totalSpeakers: speakers.length,
      mostFrequent: speakers.sort((a, b) => b.encounterCount - a.encounterCount)[0],
      recentlySeen: speakers.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 5),
      averageEncounters: speakers.reduce((sum, s) => sum + s.encounterCount, 0) / speakers.length
    };
  }

  /**
   * Search for speakers by characteristics
   * 
   * @param {Object} criteria - Search criteria object
   * @returns {Array} Array of matching speakers sorted by relevance
   * @description Searches for speakers matching specified criteria
   */
  searchSpeakers(criteria) {
    const matches = [];
    
    for (const [speakerId, speakerData] of Object.entries(this.voicePrints.speakers)) {
      let matchScore = 0;
      
      if (criteria.pitch && speakerData.fingerprint.pitch === criteria.pitch) matchScore += 1;
      if (criteria.tempo && speakerData.fingerprint.tempo === criteria.tempo) matchScore += 1;
      if (criteria.formality && speakerData.fingerprint.formality === criteria.formality) matchScore += 1;
      if (criteria.name && speakerData.profile.name.toLowerCase().includes(criteria.name.toLowerCase())) matchScore += 2;
      
      if (matchScore > 0) {
        matches.push({
          speakerId: speakerId,
          speakerData: speakerData,
          matchScore: matchScore
        });
      }
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }
}

// Initialize voice print database
const voicePrintDB = new VoicePrintDatabase();

// ===== MAIN ANALYZER CLASS =====

/**
 * MultimediaAnalyzer Class
 * 
 * Handles all multimedia analysis operations including object detection,
 * transcription, and summarization using OpenAI and Google Cloud services.
 */
class MultimediaAnalyzer {
  
  /**
   * Object Detection using Google Vision API
   * 
   * Detects and localizes objects in images with confidence scores and bounding boxes
   * 
   * @param {string} imagePath - Path to the image file
   * @returns {Array} Array of detected objects with name, confidence, and bounding box
   */
  async detectObjects(imagePath) {
    try {
      console.log(`🔍 Detecting objects in: ${imagePath}`);
      
      if (visionClient) {
        // Use Google Cloud Vision client
        const [result] = await visionClient.objectLocalization(imagePath);
        const objects = result.localizedObjectAnnotations;
        
        // Transform the results into a clean format
        return objects.map(object => ({
          name: object.name,                    // Object name (e.g., "Car", "Person")
          confidence: object.score,             // Confidence score (0-1)
          boundingBox: object.boundingPoly.normalizedVertices  // Bounding box coordinates
        }));
      } else if (googleApiKey) {
        // Use REST API with API key
        return await this.detectObjectsREST(imagePath);
      } else {
        throw new Error('Google Cloud Vision API not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY environment variable.');
      }
    } catch (error) {
      console.error('❌ Object detection error:', error);
      throw error;
    }
  }

  /**
   * Object Detection using Google Vision REST API
   * 
   * @param {string} imagePath - Path to the image file
   * @returns {Array} Array of detected objects with name, confidence, and bounding box
   * @description Uses Google Vision REST API for object detection when client library unavailable
   */
  async detectObjectsREST(imagePath) {
    try {
      console.log(`🔍 Using REST API for object detection`);
      
      // Read and encode the image
      const imageBytes = fs.readFileSync(imagePath);
      const encodedImage = imageBytes.toString('base64');
      
      // Prepare the request
      const requestBody = {
        requests: [
          {
            image: {
              content: encodedImage
            },
            features: [
              {
                type: 'OBJECT_LOCALIZATION',
                maxResults: 10
              }
            ]
          }
        ]
      };
      
      // Make REST API call
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Vision API error response: ${errorText}`);
        
        if (response.status === 403) {
          throw new Error(`Google Vision API access denied (403). Please ensure:
1. The Vision API is enabled for your project
2. The API key has the necessary permissions
3. The API key is not restricted to specific APIs or IP addresses`);
        } else if (response.status === 400) {
          throw new Error(`Google Vision API bad request (400). Please check the API key format and request structure.`);
        } else {
          throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      const objects = result.responses[0].localizedObjectAnnotations || [];
      
      // Transform the results into a clean format
      return objects.map(object => ({
        name: object.name,
        confidence: object.score,
        boundingBox: object.boundingPoly.normalizedVertices
      }));
    } catch (error) {
      console.error('❌ REST API object detection error:', error);
      throw error;
    }
  }

  /**
   * Enhanced Object Detection with Labels and Text
   * 
   * Performs comprehensive image analysis including object detection,
   * label detection, and text recognition (OCR)
   * 
   * @param {string} imagePath - Path to the image file
   * @returns {Object} Complete analysis including objects, labels, and text
   */
  async detectObjectsEnhanced(imagePath) {
    try {
      console.log(`🔍✨ Enhanced detection for: ${imagePath}`);
      
      if (visionClient) {
        // Use Google Cloud Vision client
        const [objectResult, labelResult, textResult] = await Promise.all([
          visionClient.objectLocalization(imagePath),    // Detect specific objects
          visionClient.labelDetection(imagePath),        // Detect general labels/categories
          visionClient.textDetection(imagePath)          // Detect and extract text (OCR)
        ]);

        const objects = objectResult[0].localizedObjectAnnotations || [];
        const labels = labelResult[0].labelAnnotations || [];
        const textAnnotations = textResult[0].textAnnotations || [];

        return {
          // Specific objects with locations
          objects: objects.map(object => ({
            name: object.name,
            confidence: object.score,
            boundingBox: object.boundingPoly.normalizedVertices
          })),
          
          // General labels and categories
          labels: labels.map(label => ({
            description: label.description,     // Label description (e.g., "Vehicle", "Outdoor")
            confidence: label.score,           // Confidence score
            topicality: label.topicality       // How relevant the label is to the image
          })),
          
          // Extracted text (if any)
          text: textAnnotations.length > 0 ? textAnnotations[0].description : null,
          
          // Individual text detections with locations
          textDetections: textAnnotations.slice(1).map(text => ({
            text: text.description,
            boundingBox: text.boundingPoly.vertices
          }))
        };
      } else if (googleApiKey) {
        // Use REST API with API key
        return await this.detectObjectsEnhancedREST(imagePath);
      } else {
        throw new Error('Google Cloud Vision API not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY environment variable.');
      }
    } catch (error) {
      console.error('❌ Enhanced object detection error:', error);
      throw error;
    }
  }

  /**
   * Enhanced Object Detection using Google Vision REST API
   * 
   * @param {string} imagePath - Path to the image file
   * @returns {Object} Complete analysis including objects, labels, and text
   * @description Uses REST API for comprehensive image analysis including OCR
   */
  async detectObjectsEnhancedREST(imagePath) {
    try {
      console.log(`🔍✨ Using REST API for enhanced object detection`);
      
      // Read and encode the image
      const imageBytes = fs.readFileSync(imagePath);
      const encodedImage = imageBytes.toString('base64');
      
      // Prepare the request with multiple features
      const requestBody = {
        requests: [
          {
            image: {
              content: encodedImage
            },
            features: [
              {
                type: 'OBJECT_LOCALIZATION',
                maxResults: 10
              },
              {
                type: 'LABEL_DETECTION',
                maxResults: 10
              },
              {
                type: 'TEXT_DETECTION',
                maxResults: 10
              }
            ]
          }
        ]
      };
      
      // Make REST API call
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const responseData = result.responses[0];
      
      const objects = responseData.localizedObjectAnnotations || [];
      const labels = responseData.labelAnnotations || [];
      const textAnnotations = responseData.textAnnotations || [];

      return {
        // Specific objects with locations
        objects: objects.map(object => ({
          name: object.name,
          confidence: object.score,
          boundingBox: object.boundingPoly.normalizedVertices
        })),
        
        // General labels and categories
        labels: labels.map(label => ({
          description: label.description,
          confidence: label.score,
          topicality: label.topicality
        })),
        
        // Extracted text (if any)
        text: textAnnotations.length > 0 ? textAnnotations[0].description : null,
        
        // Individual text detections with locations
        textDetections: textAnnotations.slice(1).map(text => ({
          text: text.description,
          boundingBox: text.boundingPoly.vertices
        }))
      };
    } catch (error) {
      console.error('❌ REST API enhanced object detection error:', error);
      throw error;
    }
  }

  /**
   * Audio Transcription using OpenAI Whisper
   * 
   * Transcribes audio files with high accuracy and word-level timestamps
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text and word timestamps
   */
  async transcribeAudioOpenAI(audioPath) {
    try {
      console.log(`🎤 Transcribing audio with OpenAI Whisper: ${audioPath}`);
      
      // Check if file needs conversion for OpenAI
      const stats = fs.statSync(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      let audioPathForWhisper = audioPath;
      
      // If file is too large or too long, use chunking
      // OpenAI has 25MB limit and works better with shorter segments for very long audio
      if (fileSizeMB > 25) {
        console.log(`📦 File is large (${fileSizeMB.toFixed(1)}MB), using chunking for Whisper...`);
        return await this.transcribeAudioOpenAIWithChunking(audioPath);
      }
      
      // For very long audio (>10 minutes), use chunking even if file size is small
      try {
        const metadata = await this.getAudioMetadata(audioPath);
        if (metadata.format && metadata.format.duration) {
          const audioDuration = parseFloat(metadata.format.duration);
          if (audioDuration > 600) { // > 10 minutes
            console.log(`📦 Audio is very long (${audioDuration.toFixed(1)}s), using chunking for better accuracy...`);
            return await this.transcribeAudioOpenAIWithChunking(audioPath);
          }
        }
      } catch (metadataError) {
        console.log(`⚠️ Could not check audio duration: ${metadataError.message}`);
      }
      
      // Try to ensure the file is in a supported format
      const ext = path.extname(audioPath).toLowerCase();
      if (!['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'].includes(ext)) {
        console.log(`🔄 Converting audio format for OpenAI Whisper...`);
        audioPathForWhisper = await this.convertAudioForWhisper(audioPath);
      }
      
      // Call OpenAI Whisper API for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPathForWhisper),
        model: "whisper-1",                           // Use Whisper v1 model
        response_format: "verbose_json",              // Required for timestamp_granularities
        timestamp_granularities: ["word"]             // Include word-level timestamps
      });
      
      // Clean up converted file if it was created
      if (audioPathForWhisper !== audioPath) {
        try {
          fs.unlinkSync(audioPathForWhisper);
        } catch (cleanupError) {
          console.log(`⚠️ Could not clean up converted file: ${cleanupError.message}`);
        }
      }
      
      return {
        text: transcription.text,                     // Full transcribed text
        words: transcription.words || [],             // Array of words with timestamps
        speakers: [], // Whisper doesn't support speaker diarization
        provider: 'OpenAI Whisper'
      };
    } catch (error) {
      console.error('❌ OpenAI transcription error:', error);
      throw error;
    }
  }

  /**
   * Audio Transcription using Google Speech-to-Text
   * 
   * Enhanced transcription service with speaker diarization and confidence scores
   * Handles long audio files by splitting into chunks if necessary
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text, word timestamps, and speaker info
   */
  async transcribeAudioGoogle(audioPath) {
    try {
      console.log(`🎤 Transcribing audio with Google Speech-to-Text: ${audioPath}`);
      
      if (speechClient) {
        // Use Google Cloud Speech client
        const audioBytes = fs.readFileSync(audioPath).toString('base64');

        const request = {
          audio: {
            content: audioBytes,
          },
          config: {
            encoding: 'LINEAR16',
            // Remove hardcoded sample rate to let Google auto-detect
            languageCode: 'en-US',
            enableWordTimeOffsets: true,      // Get word-level timestamps
            enableAutomaticPunctuation: true, // Add punctuation automatically
            enableSpeakerDiarization: true,   // Identify different speakers
            diarizationSpeakerCount: 10,      // Increased to handle more speakers
            model: 'latest_long',             // Best for longer audio
            useEnhanced: true,                // Use enhanced models for better accuracy
            enableWordConfidence: true,       // Get confidence scores for each word
            // Enhanced diarization settings
            diarizationConfig: {
              enableSpeakerDiarization: true,
              minSpeakerCount: 1,
              maxSpeakerCount: 10,
              speakerTag: 1
            }
          },
        };

        const [response] = await speechClient.recognize(request);
        
        const transcription = response.results
          .map(result => result.alternatives[0].transcript)
          .join('\n');

        const words = response.results.flatMap(result => 
          result.alternatives[0].words || []
        );

        // Extract speaker diarization if available
        const speakers = response.results.flatMap(result => 
          result.alternatives[0].words?.map(word => ({
            word: word.word,
            startTime: word.startTime,
            endTime: word.endTime,
            confidence: word.confidence,
            speakerTag: word.speakerTag
          })) || []
        );

        return {
          text: transcription,
          words: words.map(word => ({
            word: word.word,
            startTime: word.startTime,
            endTime: word.endTime,
            confidence: word.confidence
          })),
          speakers: speakers,
          provider: 'Google Speech-to-Text (Enhanced)'
        };
      } else if (googleApiKey) {
        // Use REST API with API key
        return await this.transcribeAudioGoogleREST(audioPath);
      } else {
        throw new Error('Google Cloud Speech-to-Text API not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_API_KEY environment variable.');
      }
    } catch (error) {
      console.error('❌ Google Speech-to-Text error:', error);
      throw error;
    }
  }

  /**
   * Audio Transcription using Google Speech-to-Text REST API
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text, word timestamps, and speaker info
   * @description Uses Google Speech-to-Text REST API for transcription with smart routing
   */
  async transcribeAudioGoogleREST(audioPath) {
    try {
      console.log(`🎤 Using REST API for Google Speech-to-Text`);
      
      // Check file size and duration to determine if we need LongRunningRecognize
      const stats = fs.statSync(audioPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      // Get audio duration to determine if we need LongRunningRecognize
      let audioDuration = 0;
      try {
        const metadata = await this.getAudioMetadata(audioPath);
        if (metadata.format && metadata.format.duration) {
          audioDuration = parseFloat(metadata.format.duration);
        }
      } catch (metadataError) {
        console.log(`⚠️ Could not get audio duration: ${metadataError.message}`);
      }
      
      // For any audio longer than 30 seconds or larger than 5MB, go straight to OpenAI
      // Google's REST API is too restrictive for longer audio
      if (audioDuration > 30 || fileSizeMB > 5) {
        console.log(`📦 Audio is long (${audioDuration.toFixed(1)}s, ${fileSizeMB.toFixed(1)}MB), using OpenAI Whisper directly...`);
        throw new Error('FALLBACK_TO_OPENAI');
      }
      
      // Read audio file and convert to base64
      const audioBytes = fs.readFileSync(audioPath).toString('base64');

      // Prepare the request with basic features first, then enhance if needed
      const requestBody = {
        audio: {
          content: audioBytes,
        },
        config: {
          encoding: 'LINEAR16',
          // Remove hardcoded sample rate to let Google auto-detect
          languageCode: 'en-US',
          enableWordTimeOffsets: true,      // Get word-level timestamps
          enableAutomaticPunctuation: true, // Add punctuation automatically
          model: 'latest_long'              // Best for longer audio
        },
      };

      // Make REST API call
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Speech-to-Text API error response: ${errorText}`);
        
        if (response.status === 400) {
          // If we get a "too long" error, try LongRunningRecognize
          if (errorText.includes('too long') || errorText.includes('LongRunningRecognize')) {
            console.log(`🔄 Audio too long for sync API, switching to LongRunningRecognize...`);
            return await this.transcribeAudioGoogleLongRunning(audioPath);
          }
          throw new Error(`Google Speech-to-Text API bad request (400). Please check the audio format and API configuration. Error: ${errorText}`);
        } else if (response.status === 403) {
          throw new Error(`Google Speech-to-Text API access denied (403). Please ensure the Speech-to-Text API is enabled for your project.`);
        } else {
          throw new Error(`Google Speech-to-Text API error: ${response.status} ${response.statusText}. ${errorText}`);
        }
      }
      
      const result = await response.json();
      
      // Check if the response has the expected structure
      if (!result.results || !Array.isArray(result.results) || result.results.length === 0) {
        console.log('⚠️ Google Speech-to-Text returned no results or invalid response structure');
        return {
          text: '',
          words: [],
          speakers: [],
          provider: 'Google Speech-to-Text (REST API Enhanced)',
          error: 'No transcription results returned'
        };
      }
      
      // Combine all transcription results
      const transcription = result.results
        .filter(result => result.alternatives && result.alternatives.length > 0)
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      // Extract word-level timestamps and speaker information
      const words = result.results.flatMap(result => 
        (result.alternatives && result.alternatives[0] && result.alternatives[0].words) || []
      );

      // Extract speaker diarization if available
      const speakers = result.results.flatMap(result => 
        (result.alternatives && result.alternatives[0] && result.alternatives[0].words)?.map(word => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime,
          confidence: word.confidence,
          speakerTag: word.speakerTag
        })) || []
      );

      return {
        text: transcription,
        words: words.map(word => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime,
          confidence: word.confidence
        })),
        speakers: speakers,
        provider: 'Google Speech-to-Text (REST API Enhanced)'
      };
    } catch (error) {
      console.error('❌ REST API Google Speech-to-Text error:', error);
      throw error;
    }
  }

  /**
   * Audio Transcription using Google Speech-to-Text LongRunning API
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text, word timestamps, and speaker info
   * @description Uses Google's LongRunningRecognize API for long audio files
   */
  async transcribeAudioGoogleLongRunning(audioPath) {
    try {
      console.log(`🎤 Using LongRunningRecognize for long audio file`);
      
      // Read audio file and convert to base64
      const audioBytes = fs.readFileSync(audioPath).toString('base64');

      // Prepare the request for LongRunningRecognize
      const requestBody = {
        audio: {
          content: audioBytes,
        },
        config: {
          encoding: 'LINEAR16',
          languageCode: 'en-US',
          enableWordTimeOffsets: true,      // Get word-level timestamps
          enableAutomaticPunctuation: true, // Add punctuation automatically
          model: 'latest_long',             // Best for longer audio
          useEnhanced: true,                // Use enhanced models for better accuracy
          enableWordConfidence: true        // Get confidence scores for each word
        },
      };

      // Start LongRunningRecognize operation
      const response = await fetch(`https://speech.googleapis.com/v1/speech:longrunningrecognize?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Speech-to-Text LongRunningRecognize API error response: ${errorText}`);
        
        // If the error is about inline audio exceeding duration limit, fall back to OpenAI
        if (errorText.includes('Inline audio exceeds duration limit') || errorText.includes('GCS URI')) {
          console.log(`🔄 Google LongRunningRecognize requires GCS URI for this file size, falling back to OpenAI Whisper...`);
          throw new Error('FALLBACK_TO_OPENAI');
        }
        
        throw new Error(`Google Speech-to-Text LongRunningRecognize API error: ${response.status} ${response.statusText}. ${errorText}`);
      }
      
      const operation = await response.json();
      const operationName = operation.name;
      
      console.log(`🔄 LongRunningRecognize operation started: ${operationName}`);
      
      // Poll for completion
      let result = null;
      let attempts = 0;
      const maxAttempts = 60; // Wait up to 5 minutes (60 * 5 seconds)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls
        
        const pollResponse = await fetch(`https://speech.googleapis.com/v1/operations/${operationName}?key=${googleApiKey}`);
        
        if (!pollResponse.ok) {
          throw new Error(`Failed to poll operation status: ${pollResponse.status} ${pollResponse.statusText}`);
        }
        
        const operationStatus = await pollResponse.json();
        
        if (operationStatus.done) {
          if (operationStatus.error) {
            throw new Error(`LongRunningRecognize operation failed: ${JSON.stringify(operationStatus.error)}`);
          }
          result = operationStatus.response;
          break;
        }
        
        attempts++;
        console.log(`⏳ LongRunningRecognize operation in progress... (attempt ${attempts}/${maxAttempts})`);
      }
      
      if (!result) {
        throw new Error('LongRunningRecognize operation timed out');
      }
      
      console.log(`✅ LongRunningRecognize operation completed successfully`);
      
      // Check if the response has the expected structure
      if (!result.results || !Array.isArray(result.results) || result.results.length === 0) {
        console.log('⚠️ Google Speech-to-Text LongRunningRecognize returned no results or invalid response structure');
        return {
          text: '',
          words: [],
          speakers: [],
          provider: 'Google Speech-to-Text (LongRunningRecognize)',
          error: 'No transcription results returned'
        };
      }
      
      // Combine all transcription results
      const transcription = result.results
        .filter(result => result.alternatives && result.alternatives.length > 0)
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      // Extract word-level timestamps and speaker information
      const words = result.results.flatMap(result => 
        (result.alternatives && result.alternatives[0] && result.alternatives[0].words) || []
      );

      // Extract speaker diarization if available
      const speakers = result.results.flatMap(result => 
        (result.alternatives && result.alternatives[0] && result.alternatives[0].words)?.map(word => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime,
          confidence: word.confidence,
          speakerTag: word.speakerTag
        })) || []
      );

      return {
        text: transcription,
        words: words.map(word => ({
          word: word.word,
          startTime: word.startTime,
          endTime: word.endTime,
          confidence: word.confidence
        })),
        speakers: speakers,
        provider: 'Google Speech-to-Text (LongRunningRecognize)'
      };
    } catch (error) {
      console.error('❌ LongRunningRecognize Google Speech-to-Text error:', error);
      throw error;
    }
  }

  /**
   * Audio Transcription using OpenAI Whisper with chunking for large files
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text and word timestamps
   * @description Splits large audio files into chunks for better processing with OpenAI Whisper
   */
  async transcribeAudioOpenAIWithChunking(audioPath) {
    try {
      console.log(`🎤 Using OpenAI Whisper with chunking for large audio file`);
      
      // Split audio into smaller chunks for better processing
      const chunks = await this.splitAudioIntoChunks(audioPath, 120); // 2-minute chunks for OpenAI
      console.log(`📦 Split audio into ${chunks.length} chunks for Whisper`);
      
      let allTranscription = '';
      let allWords = [];
      let chunkOffset = 0;
      
      // Process chunks sequentially to maintain correct order
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🎤 Processing Whisper chunk ${i + 1}/${chunks.length}...`);
        
        if (!chunks[i]) {
          console.log(`⚠️ Chunk ${i + 1} was not created, skipping...`);
          chunkOffset += 120; // Still increment offset to maintain timing
          continue;
        }
        
        try {
          // Convert chunk to supported format if needed
          let chunkPath = chunks[i];
          const ext = path.extname(chunks[i]).toLowerCase();
          if (!['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'].includes(ext)) {
            chunkPath = await this.convertAudioForWhisper(chunks[i]);
          }
          
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(chunkPath),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word"]
          });
          
          console.log(`✅ Chunk ${i + 1} transcribed: "${transcription.text.substring(0, 100)}${transcription.text.length > 100 ? '...' : ''}"`);
          allTranscription += (allTranscription ? ' ' : '') + transcription.text;
          
          // Process words with time offset
          if (transcription.words) {
            transcription.words.forEach(word => {
              const startTime = word.start ? word.start + chunkOffset : null;
              const endTime = word.end ? word.end + chunkOffset : null;
              
              allWords.push({
                word: word.word,
                startTime: startTime,
                endTime: endTime
              });
            });
          }
          
          chunkOffset += 120; // Add 120 seconds for next chunk
          
          // Clean up converted chunk file
          if (chunkPath !== chunks[i]) {
            try {
              fs.unlinkSync(chunkPath);
            } catch (cleanupError) {
              console.log(`⚠️ Could not clean up converted chunk file: ${cleanupError.message}`);
            }
          }
          
        } catch (chunkError) {
          console.log(`⚠️ Error processing Whisper chunk ${i + 1}: ${chunkError.message}`);
          chunkOffset += 120; // Still increment offset to maintain timing
        }
        
        // Clean up chunk file
        if (chunks[i] !== audioPath) {
          try {
            fs.unlinkSync(chunks[i]);
          } catch (cleanupError) {
            console.log(`⚠️ Could not clean up chunk file: ${cleanupError.message}`);
          }
        }
      }
      
      return {
        text: allTranscription,
        words: allWords,
        speakers: [], // Whisper doesn't support speaker diarization
        provider: 'OpenAI Whisper (with Chunking)'
      };
      
    } catch (error) {
      console.error('❌ OpenAI Whisper chunking error:', error);
      throw error;
    }
  }

  /**
   * Convert audio file to format compatible with OpenAI Whisper
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<string>} Path to the converted audio file
   * @description Converts audio to 16kHz mono WAV format for optimal Whisper processing
   */
  async convertAudioForWhisper(audioPath) {
    return new Promise((resolve, reject) => {
      const outputPath = audioPath.replace(/\.[^/.]+$/, '') + '_whisper.wav';
      
      ffmpeg(audioPath)
        .toFormat('wav')
        .audioChannels(1) // Mono
        .audioFrequency(16000) // 16kHz
        .on('end', () => {
          console.log(`✅ Audio converted for Whisper: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Audio conversion error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Audio Transcription using Google Speech-to-Text REST API with chunking
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Object} Transcription result with text, word timestamps, and speaker info
   * @description Splits large audio files into chunks for Google Speech-to-Text REST API
   */
  async transcribeAudioGoogleRESTWithChunking(audioPath) {
    try {
      console.log(`🎤 Using REST API with chunking for large audio file`);
      
      // Split audio into chunks
      const chunks = await this.splitAudioIntoChunks(audioPath, 60); // 60-second chunks
      console.log(`📦 Split audio into ${chunks.length} chunks`);
      
      let allTranscription = '';
      let allWords = [];
      let allSpeakers = [];
      let chunkOffset = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`🎤 Processing chunk ${i + 1}/${chunks.length}...`);
        
        try {
          // Read chunk and convert to base64
          const audioBytes = fs.readFileSync(chunks[i]).toString('base64');
          
          const requestBody = {
            audio: {
              content: audioBytes,
            },
            config: {
              encoding: 'LINEAR16',
              languageCode: 'en-US',
              enableWordTimeOffsets: true,
              enableAutomaticPunctuation: true,
              model: 'latest_long'
            },
          };

          const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.log(`⚠️ Chunk ${i + 1} failed: ${errorText}`);
            continue; // Skip this chunk and continue with next
          }
          
          const result = await response.json();
          
          if (result.results && result.results.length > 0) {
            const chunkTranscription = result.results
              .filter(result => result.alternatives && result.alternatives.length > 0)
              .map(result => result.alternatives[0].transcript)
              .join(' ');
            
            allTranscription += (allTranscription ? ' ' : '') + chunkTranscription;
            
            // Process words with time offset
            const chunkWords = result.results.flatMap(result => 
              (result.alternatives && result.alternatives[0] && result.alternatives[0].words) || []
            );
            
            chunkWords.forEach(word => {
              const startTime = word.startTime ? parseFloat(word.startTime.replace('s', '')) + chunkOffset : null;
              const endTime = word.endTime ? parseFloat(word.endTime.replace('s', '')) + chunkOffset : null;
              
              allWords.push({
                word: word.word,
                startTime: startTime,
                endTime: endTime,
                confidence: word.confidence
              });
            });
            
            // Process speakers with time offset
            const chunkSpeakers = result.results.flatMap(result => 
              (result.alternatives && result.alternatives[0] && result.alternatives[0].words)?.map(word => ({
                word: word.word,
                startTime: word.startTime ? parseFloat(word.startTime.replace('s', '')) + chunkOffset : null,
                endTime: word.endTime ? parseFloat(word.endTime.replace('s', '')) + chunkOffset : null,
                confidence: word.confidence,
                speakerTag: word.speakerTag
              })) || []
            );
            
            allSpeakers.push(...chunkSpeakers);
          }
          
          chunkOffset += 60; // Add 60 seconds for next chunk
          
        } catch (chunkError) {
          console.log(`⚠️ Error processing chunk ${i + 1}: ${chunkError.message}`);
          chunkOffset += 60; // Still increment offset
        }
        
        // Clean up chunk file
        if (chunks[i] !== audioPath) {
          try {
            fs.unlinkSync(chunks[i]);
          } catch (cleanupError) {
            console.log(`⚠️ Could not clean up chunk file: ${cleanupError.message}`);
          }
        }
      }
      
      return {
        text: allTranscription,
        words: allWords,
        speakers: allSpeakers,
        provider: 'Google Speech-to-Text (REST API with Chunking)'
      };
      
    } catch (error) {
      console.error('❌ REST API Google Speech-to-Text chunking error:', error);
      throw error;
    }
  }

  /**
   * Voice Print Recognition and Speaker Identification
   * 
   * Analyzes audio characteristics to identify unique speakers and potentially name them
   * 
   * @param {string} audioPath - Path to the audio file
   * @param {Array} speakers - Array of speaker segments from transcription
   * @returns {Object} Voice print analysis results with speaker profiles
   */
  async analyzeVoicePrints(audioPath, speakers) {
    try {
      console.log(`🎤 Analyzing voice prints for speaker identification`);
      
      if (!speakers || speakers.length === 0) {
        return {
          voicePrints: [],
          speakerProfiles: [],
          summary: 'No speaker segments available for voice print analysis',
          provider: 'Voice Print Analysis'
        };
      }

      // Group words by speaker
      const speakerSegments = {};
      speakers.forEach(word => {
        const speakerTag = word.speakerTag || 'unknown';
        if (!speakerSegments[speakerTag]) {
          speakerSegments[speakerTag] = [];
        }
        speakerSegments[speakerTag].push(word);
      });

      // Extract audio segments for each speaker
      const voicePrints = [];
      const speakerProfiles = [];

      for (const [speakerTag, words] of Object.entries(speakerSegments)) {
        try {
          console.log(`🎤 Analyzing voice print for Speaker ${speakerTag}...`);
          
          // Get time range for this speaker - validate times to avoid NaN
          const validStartTimes = words.map(w => w.startTime).filter(time => time !== null && time !== undefined && !isNaN(time));
          const validEndTimes = words.map(w => w.endTime).filter(time => time !== null && time !== undefined && !isNaN(time));
          
          if (validStartTimes.length === 0 || validEndTimes.length === 0) {
            console.log(`⚠️ No valid time data for Speaker ${speakerTag}, skipping segment extraction`);
            continue;
          }
          
          const startTime = Math.min(...validStartTimes);
          const endTime = Math.max(...validEndTimes);
          
          // Validate time range
          if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            console.log(`⚠️ Invalid time range for Speaker ${speakerTag} (${startTime}s - ${endTime}s), skipping segment extraction`);
            continue;
          }
          
          // Extract audio segment for this speaker
          const speakerAudioPath = await this.extractSpeakerSegment(audioPath, startTime, endTime, speakerTag);
          
          // Analyze voice characteristics
          const voiceCharacteristics = await this.analyzeVoiceCharacteristics(speakerAudioPath);
          
          // Generate speaker profile
          const speakerProfile = await this.generateSpeakerProfile(speakerTag, words, voiceCharacteristics);
          
          // Generate voice fingerprint for database lookup
          const voiceFingerprint = voicePrintDB.generateVoiceFingerprint(voiceCharacteristics, speakerProfile.speakingStyle);
          
          // Check if this speaker exists in the database
          const matchingSpeaker = voicePrintDB.findMatchingSpeaker(voiceFingerprint);
          
          let finalSpeakerTag, isRecognized;
          
          if (matchingSpeaker) {
            // Speaker recognized from database
            speakerProfile.name = matchingSpeaker.speakerData.profile.name;
            finalSpeakerTag = matchingSpeaker.speakerId;
            isRecognized = true;
            speakerProfile.confidence = matchingSpeaker.similarity;
            speakerProfile.isRecognized = true;
            speakerProfile.matchSimilarity = matchingSpeaker.similarity;
            speakerProfile.note = `Recognized from database (${(matchingSpeaker.similarity * 100).toFixed(1)}% match)`;
            console.log(`🎯 Recognized existing speaker: ${speakerProfile.name} (${(matchingSpeaker.similarity * 100).toFixed(1)}% match)`);
          } else {
            // New speaker
            finalSpeakerTag = `Speaker_${Date.now()}_${speakerTag}`; // Unique ID for new speaker
            isRecognized = false;
            speakerProfile.isRecognized = false;
            console.log(`🆕 New speaker detected: ${speakerProfile.name}`);
          }
          
          // Update speaker tag
          speakerProfile.speakerTag = finalSpeakerTag;
          
          // Add or update speaker in database
          voicePrintDB.addSpeaker(finalSpeakerTag, voiceFingerprint, speakerProfile);
          
          voicePrints.push({
            speakerTag: finalSpeakerTag,
            audioSegment: speakerAudioPath,
            characteristics: voiceCharacteristics,
            timeRange: { start: startTime, end: endTime },
            wordCount: words.length
          });
          
          speakerProfiles.push(speakerProfile);
          
          // Clean up speaker audio segment
          if (speakerAudioPath !== audioPath) {
            try {
              fs.unlinkSync(speakerAudioPath);
            } catch (cleanupError) {
              console.log(`⚠️ Could not clean up speaker audio: ${cleanupError.message}`);
            }
          }
          
        } catch (speakerError) {
          console.log(`⚠️ Error analyzing Speaker ${speakerTag}: ${speakerError.message}`);
        }
      }

      return {
        voicePrints: voicePrints,
        speakerProfiles: speakerProfiles,
        summary: voicePrints.length > 0 ? 
          `Analyzed ${voicePrints.length} unique voice prints` : 
          'No valid speaker segments found for voice print analysis',
        provider: 'Voice Print Analysis'
      };
      
    } catch (error) {
      console.error('❌ Voice print analysis error:', error);
      return {
        voicePrints: [],
        speakerProfiles: [],
        summary: `Voice print analysis failed: ${error.message}`,
        provider: 'Error'
      };
    }
  }

  /**
   * Analyze Basic Voice Prints (without speaker diarization)
   * 
   * @param {string} audioPath - Path to the audio file
   * @param {Object} transcription - Transcription results
   * @returns {Object} Basic voice print analysis
   */
  async analyzeBasicVoicePrints(audioPath, transcription) {
    try {
      console.log(`🎤 Analyzing basic voice prints for audio file`);
      
      // For basic analysis without speaker diarization, treat the entire audio as one speaker
      const speakerTag = 'Speaker_1';
      
      // Extract basic audio characteristics from the entire file
      const voiceCharacteristics = await this.analyzeVoiceCharacteristics(audioPath);
      
      // Analyze basic speaking style from transcription text
      const speakingStyle = this.analyzeBasicSpeakingStyle(transcription.text || '');
      
      // Generate voice fingerprint for database lookup
      const voiceFingerprint = voicePrintDB.generateVoiceFingerprint(voiceCharacteristics, speakingStyle);
      
      // Check if this speaker exists in the database
      const matchingSpeaker = voicePrintDB.findMatchingSpeaker(voiceFingerprint);
      
      let speakerName, finalSpeakerTag, isRecognized;
      
      if (matchingSpeaker) {
        // Speaker recognized from database
        speakerName = matchingSpeaker.speakerData.profile.name;
        finalSpeakerTag = matchingSpeaker.speakerId;
        isRecognized = true;
        console.log(`🎯 Recognized existing speaker: ${speakerName} (${(matchingSpeaker.similarity * 100).toFixed(1)}% match)`);
      } else {
        // New speaker - generate AI name
        speakerName = await this.generateSpeakerName(speakerTag, transcription.text || '', voiceCharacteristics);
        finalSpeakerTag = `Speaker_${Date.now()}`; // Unique ID for new speaker
        isRecognized = false;
        console.log(`🆕 New speaker detected: ${speakerName}`);
      }
      
      // Create speaker profile
      const speakerProfile = {
        speakerTag: finalSpeakerTag,
        name: speakerName,
        wordCount: (transcription.text || '').split(' ').length,
        speakingTime: voiceCharacteristics.duration,
        wordsPerMinute: voiceCharacteristics.duration > 0 ? 
          ((transcription.text || '').split(' ').length / voiceCharacteristics.duration) * 60 : 0,
        averageWordLength: (transcription.text || '').split(' ').reduce((sum, word) => sum + word.length, 0) / 
          Math.max((transcription.text || '').split(' ').length, 1),
        voiceCharacteristics: voiceCharacteristics,
        speakingStyle: speakingStyle,
        confidence: matchingSpeaker ? matchingSpeaker.similarity : 0.75,
        isRecognized: isRecognized,
        matchSimilarity: matchingSpeaker ? matchingSpeaker.similarity : null,
        note: isRecognized ? 
          `Recognized from database (${(matchingSpeaker.similarity * 100).toFixed(1)}% match)` : 
          'Basic analysis (no speaker diarization available)'
      };
      
      // Add or update speaker in database
      voicePrintDB.addSpeaker(finalSpeakerTag, voiceFingerprint, speakerProfile);
      
      return {
        voicePrints: [{
          speakerTag: finalSpeakerTag,
          audioSegment: audioPath,
          characteristics: voiceCharacteristics,
          timeRange: { start: 0, end: voiceCharacteristics.duration },
          wordCount: (transcription.text || '').split(' ').length
        }],
        speakerProfiles: [speakerProfile],
        summary: isRecognized ? 
          `Recognized existing speaker: ${speakerName}` : 
          `Basic voice print analysis completed for 1 new speaker`,
        provider: 'Voice Print Database Analysis',
        databaseStats: voicePrintDB.getSpeakerStats()
      };
      
    } catch (error) {
      console.error('❌ Basic voice print analysis error:', error);
      return {
        voicePrints: [],
        speakerProfiles: [],
        summary: `Basic voice print analysis failed: ${error.message}`,
        provider: 'Error',
        databaseStats: voicePrintDB.getSpeakerStats()
      };
    }
  }

  /**
   * Analyze Basic Speaking Style from Text
   * 
   * @param {string} text - Transcription text
   * @returns {Object} Basic speaking style analysis
   */
  analyzeBasicSpeakingStyle(text) {
    try {
      const words = text.split(' ').filter(word => word.length > 0);
      const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
      
      const avgWordLength = words.length > 0 ? 
        words.reduce((sum, word) => sum + word.length, 0) / words.length : 0;
      const avgSentenceLength = sentences.length > 0 ? 
        sentences.reduce((sum, sentence) => sum + sentence.split(' ').length, 0) / sentences.length : 0;
      
      // Analyze vocabulary complexity
      const uniqueWords = new Set(words.map(word => word.toLowerCase()));
      const vocabularyDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
      
      // Determine speaking style
      let style = 'neutral';
      let pace = 'normal';
      let formality = 'neutral';
      
      if (avgWordLength > 6) style = 'formal';
      else if (avgWordLength < 4) style = 'casual';
      
      if (avgSentenceLength > 15) pace = 'detailed';
      else if (avgSentenceLength < 8) pace = 'concise';
      
      if (vocabularyDiversity > 0.7) formality = 'sophisticated';
      else if (vocabularyDiversity < 0.4) formality = 'simple';
      
      return {
        overallStyle: style,
        pace: pace,
        formality: formality,
        vocabularyDiversity: Math.round(vocabularyDiversity * 100) / 100,
        averageWordLength: Math.round(avgWordLength * 10) / 10,
        averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        wordCount: words.length,
        sentenceCount: sentences.length
      };
    } catch (error) {
      console.error('❌ Basic speaking style analysis error:', error);
      return {
        overallStyle: 'unknown',
        pace: 'unknown',
        formality: 'unknown',
        vocabularyDiversity: 0,
        averageWordLength: 0,
        averageSentenceLength: 0,
        wordCount: 0,
        sentenceCount: 0
      };
    }
  }

  /**
   * Extract Audio Segment for Specific Speaker
   * 
   * @param {string} audioPath - Path to the full audio file
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {string} speakerTag - Speaker identifier
   * @returns {string} Path to the extracted audio segment
   */
  async extractSpeakerSegment(audioPath, startTime, endTime, speakerTag) {
    return new Promise((resolve, reject) => {
      const outputPath = audioPath.replace(/\.[^/.]+$/, '') + `_speaker_${speakerTag}.wav`;
      
      ffmpeg(audioPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .toFormat('wav')
        .audioChannels(1) // Mono for analysis
        .audioFrequency(16000) // 16kHz for analysis
        .on('end', () => {
          console.log(`✅ Extracted audio segment for Speaker ${speakerTag}: ${startTime}s - ${endTime}s`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(`❌ Speaker segment extraction error: ${err.message}`);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Analyze Voice Characteristics
   * 
   * @param {string} audioPath - Path to speaker audio segment
   * @returns {Object} Voice characteristics analysis
   * @description Analyzes basic audio characteristics like pitch, volume, and clarity
   */
  async analyzeVoiceCharacteristics(audioPath) {
    try {
      // Get audio metadata for basic characteristics
      const metadata = await this.getAudioMetadata(audioPath);
      
      // Basic voice characteristics
      const characteristics = {
        duration: metadata.format.duration || 0,
        sampleRate: metadata.streams?.[0]?.sample_rate || 16000,
        channels: metadata.streams?.[0]?.channels || 1,
        bitRate: metadata.format.bit_rate || 0,
        // These would be calculated with more sophisticated analysis
        estimatedPitch: 'medium', // low, medium, high
        estimatedTempo: 'normal', // slow, normal, fast
        estimatedClarity: 'clear', // clear, muffled, unclear
        estimatedVolume: 'normal' // quiet, normal, loud
      };
      
      return characteristics;
    } catch (error) {
      console.error('❌ Voice characteristics analysis error:', error);
      return {
        duration: 0,
        sampleRate: 16000,
        channels: 1,
        bitRate: 0,
        estimatedPitch: 'unknown',
        estimatedTempo: 'unknown',
        estimatedClarity: 'unknown',
        estimatedVolume: 'unknown'
      };
    }
  }

  /**
   * Generate Speaker Profile
   * 
   * @param {string} speakerTag - Speaker identifier
   * @param {Array} words - Words spoken by this speaker
   * @param {Object} characteristics - Voice characteristics
   * @returns {Promise<Object>} Complete speaker profile
   * @description Creates detailed speaker profile including AI-generated name and speaking patterns
   */
  async generateSpeakerProfile(speakerTag, words, characteristics) {
    try {
      // Combine all words for this speaker
      const fullText = words.map(w => w.word).join(' ');
      
      // Analyze speaking patterns
      const wordCount = words.length;
      const avgWordLength = words.reduce((sum, w) => sum + w.word.length, 0) / wordCount;
      const speakingTime = characteristics.duration;
      const wordsPerMinute = speakingTime > 0 ? (wordCount / speakingTime) * 60 : 0;
      
      // Generate potential name using AI
      const speakerName = await this.generateSpeakerName(speakerTag, fullText, characteristics);
      
      return {
        speakerTag: speakerTag,
        name: speakerName,
        wordCount: wordCount,
        speakingTime: speakingTime,
        wordsPerMinute: Math.round(wordsPerMinute),
        averageWordLength: Math.round(avgWordLength * 10) / 10,
        voiceCharacteristics: characteristics,
        speakingStyle: this.analyzeSpeakingStyle(wordsPerMinute, avgWordLength, characteristics),
        confidence: 0.85 // Placeholder confidence score
      };
    } catch (error) {
      console.error('❌ Speaker profile generation error:', error);
      return {
        speakerTag: speakerTag,
        name: `Speaker ${speakerTag}`,
        wordCount: words.length,
        speakingTime: characteristics.duration,
        wordsPerMinute: 0,
        averageWordLength: 0,
        voiceCharacteristics: characteristics,
        speakingStyle: 'unknown',
        confidence: 0.5
      };
    }
  }

  /**
   * Generate Speaker Name using AI
   * 
   * @param {string} speakerTag - Speaker identifier
   * @param {string} text - Text spoken by this speaker
   * @param {Object} characteristics - Voice characteristics
   * @returns {Promise<string>} Generated speaker name
   * @description Uses OpenAI GPT-4 to generate realistic speaker names based on voice characteristics
   */
  async generateSpeakerName(speakerTag, text, characteristics) {
    try {
      const prompt = `Based on the following information about a speaker, suggest a realistic name for them:

Speaker ID: ${speakerTag}
Text spoken: "${text.substring(0, 500)}..." (truncated)
Voice characteristics:
- Duration: ${characteristics.duration}s
- Estimated pitch: ${characteristics.estimatedPitch}
- Estimated tempo: ${characteristics.estimatedTempo}
- Speaking style: ${this.analyzeSpeakingStyle(0, 0, characteristics)}

Please suggest a realistic first name that might fit this speaker. Consider:
1. The content and tone of what they're saying
2. Their voice characteristics
3. The context (appears to be a business/professional recording)

Respond with just the name, nothing else.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a speaker identification expert. Suggest realistic names based on voice characteristics and speech content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      });

      const name = response.choices[0].message.content.trim();
      return name || `Speaker ${speakerTag}`;
    } catch (error) {
      console.error('❌ Speaker name generation error:', error);
      return `Speaker ${speakerTag}`;
    }
  }

  /**
   * Analyze Speaking Style
   * 
   * @param {number} wordsPerMinute - Speaking rate
   * @param {number} avgWordLength - Average word length
   * @param {Object} characteristics - Voice characteristics
   * @returns {string} Speaking style description
   * @description Analyzes speaking patterns to determine communication style
   */
  analyzeSpeakingStyle(wordsPerMinute, avgWordLength, characteristics) {
    let style = [];
    
    // Analyze speaking rate
    if (wordsPerMinute < 120) style.push('slow speaker');
    else if (wordsPerMinute > 180) style.push('fast speaker');
    else style.push('moderate pace');
    
    // Analyze word complexity
    if (avgWordLength > 8) style.push('uses complex vocabulary');
    else if (avgWordLength < 4) style.push('uses simple vocabulary');
    else style.push('balanced vocabulary');
    
    // Analyze voice characteristics
    if (characteristics.estimatedPitch === 'high') style.push('higher pitched voice');
    else if (characteristics.estimatedPitch === 'low') style.push('deeper voice');
    
    if (characteristics.estimatedTempo === 'fast') style.push('rapid speech');
    else if (characteristics.estimatedTempo === 'slow') style.push('measured speech');
    
    return style.join(', ') || 'standard speaking style';
  }

  /**
   * Extract Named Entities from Text
   * 
   * Uses OpenAI's GPT-4 to identify and extract named entities like people, organizations, locations, dates, etc.
   * 
   * @param {string} text - Text to analyze for named entities
   * @returns {Object} Named entity recognition results with categorized entities
   */
  async extractNamedEntities(text) {
    try {
      console.log(`🏷️ Extracting named entities from text (${text.length} chars)`);
      
      if (!text || text.trim().length === 0) {
        return {
          entities: [],
          summary: 'No text provided for entity extraction',
          provider: 'OpenAI GPT-4 NER'
        };
      }

      const prompt = `Extract all named entities from the following text. Identify and categorize entities into these types:

1. PERSON - Names of people
2. ORGANIZATION - Companies, institutions, government bodies
3. LOCATION - Cities, countries, addresses, geographical places
4. DATE - Dates, times, periods
5. MONEY - Monetary amounts, currencies
6. PERCENT - Percentages
7. QUANTITY - Measurements, amounts, numbers
8. EVENT - Events, conferences, meetings
9. PRODUCT - Products, services, brands
10. TECHNOLOGY - Software, hardware, technical terms

Text to analyze:
"${text}"

Please respond in JSON format with the following structure:
{
  "entities": [
    {
      "text": "entity name",
      "type": "PERSON/ORGANIZATION/LOCATION/etc",
      "confidence": 0.95,
      "context": "brief context where entity appears"
    }
  ],
  "summary": "Brief summary of key entities found"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a named entity recognition expert. Extract and categorize all named entities from the provided text. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const result = response.choices[0].message.content;
      
      try {
        const entityData = JSON.parse(result);
        return {
          ...entityData,
          provider: 'OpenAI GPT-4 Named Entity Recognition'
        };
      } catch (parseError) {
        console.log('⚠️ Failed to parse entity JSON, using fallback extraction');
        
        // Fallback: simple regex-based entity extraction
        const entities = [];
        
        // Extract dates (various formats)
        const datePatterns = [
          /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
          /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
          /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
          /\b\d{4}-\d{2}-\d{2}\b/g
        ];
        
        datePatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(match => {
              entities.push({
                text: match,
                type: 'DATE',
                confidence: 0.8,
                context: 'Date found in text'
              });
            });
          }
        });
        
        // Extract money amounts
        const moneyPattern = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|USD|EUR|GBP)/gi;
        const moneyMatches = text.match(moneyPattern);
        if (moneyMatches) {
          moneyMatches.forEach(match => {
            entities.push({
              text: match,
              type: 'MONEY',
              confidence: 0.8,
              context: 'Monetary amount found in text'
            });
          });
        }
        
        // Extract percentages
        const percentPattern = /\d+(?:\.\d+)?%/g;
        const percentMatches = text.match(percentPattern);
        if (percentMatches) {
          percentMatches.forEach(match => {
            entities.push({
              text: match,
              type: 'PERCENT',
              confidence: 0.8,
              context: 'Percentage found in text'
            });
          });
        }
        
        return {
          entities: entities,
          summary: 'Fallback entity extraction based on regex patterns',
          provider: 'Fallback Regex NER'
        };
      }
    } catch (error) {
      console.error('❌ Named entity recognition error:', error);
      return {
        entities: [],
        summary: `Entity extraction failed: ${error.message}`,
        provider: 'Error'
      };
    }
  }

  /**
   * Analyze Sentiment of Text
   * 
   * Uses OpenAI's GPT-4 to analyze the sentiment, emotions, and tone of transcribed text
   * 
   * @param {string} text - Text to analyze for sentiment
   * @returns {Promise<Object>} Sentiment analysis results including overall sentiment, emotions, and confidence
   * @description Uses OpenAI GPT-4 for comprehensive sentiment analysis including emotions and tone
   */
  async analyzeSentiment(text) {
    try {
      console.log(`😊 Analyzing sentiment of text (${text.length} chars)`);
      
      if (!text || text.trim().length === 0) {
        return {
          overallSentiment: 'neutral',
          confidence: 0,
          emotions: [],
          tone: 'neutral',
          summary: 'No text provided for sentiment analysis'
        };
      }

      const prompt = `Analyze the sentiment and emotional content of the following text. Provide a detailed analysis including:

1. Overall sentiment (positive, negative, neutral, or mixed)
2. Confidence level (0-1)
3. Primary emotions detected (e.g., joy, anger, sadness, fear, surprise, disgust, trust, anticipation)
4. Tone of the conversation (formal, informal, friendly, hostile, professional, casual, etc.)
5. Brief summary of the emotional context

Text to analyze:
"${text}"

Please respond in JSON format with the following structure:
{
  "overallSentiment": "positive/negative/neutral/mixed",
  "confidence": 0.85,
  "emotions": ["joy", "trust"],
  "tone": "friendly",
  "summary": "Brief description of the emotional context"
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the emotional content and tone of the provided text. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const result = response.choices[0].message.content;
      
      try {
        const sentimentData = JSON.parse(result);
        return {
          ...sentimentData,
          provider: 'OpenAI GPT-4 Sentiment Analysis'
        };
      } catch (parseError) {
        console.log('⚠️ Failed to parse sentiment JSON, using fallback analysis');
        
        // Fallback: simple keyword-based sentiment
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like', 'positive', 'success'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'negative', 'problem', 'issue', 'fail', 'sad'];
        
        const words = text.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;
        
        words.forEach(word => {
          if (positiveWords.includes(word)) positiveCount++;
          if (negativeWords.includes(word)) negativeCount++;
        });
        
        let overallSentiment = 'neutral';
        let confidence = 0.5;
        
        if (positiveCount > negativeCount) {
          overallSentiment = 'positive';
          confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1);
        } else if (negativeCount > positiveCount) {
          overallSentiment = 'negative';
          confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1);
        }
        
        return {
          overallSentiment,
          confidence,
          emotions: [],
          tone: 'neutral',
          summary: 'Fallback sentiment analysis based on keyword matching',
          provider: 'Fallback Keyword Analysis'
        };
      }
    } catch (error) {
      console.error('❌ Sentiment analysis error:', error);
      return {
        overallSentiment: 'neutral',
        confidence: 0,
        emotions: [],
        tone: 'neutral',
        summary: `Sentiment analysis failed: ${error.message}`,
        provider: 'Error'
      };
    }
  }

  /**
   * Split Long Audio File into Chunks
   * 
   * Splits audio files longer than 60 seconds into manageable chunks for better processing
   * 
   * @param {string} audioPath - Path to the audio file
   * @param {number} chunkDuration - Duration of each chunk in seconds (default: 60)
   * @returns {Promise<Array<string>>} Array of paths to audio chunks
   */
  async splitAudioIntoChunks(audioPath, chunkDuration = 60) {
    return new Promise((resolve, reject) => {
      // Get audio duration first
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration;
        
        if (duration <= chunkDuration) {
          // No need to split
          resolve([audioPath]);
          return;
        }
        
        const chunkCount = Math.ceil(duration / chunkDuration);
        console.log(`🎵 Splitting audio file (${duration}s) into ${chunkCount} chunks...`);
        
        const chunks = new Array(chunkCount).fill(null); // Pre-allocate array to maintain order
        let completedChunks = 0;
        
        for (let i = 0; i < chunkCount; i++) {
          const startTime = i * chunkDuration;
          const endTime = Math.min((i + 1) * chunkDuration, duration);
          
          // Generate a safe chunk filename with proper extension
          const baseFileName = path.basename(audioPath, path.extname(audioPath));
          const timestamp = Date.now();
          const chunkPath = path.join(path.dirname(audioPath), `chunk_${i}_${timestamp}.wav`);
          
          ffmpeg(audioPath)
            .setStartTime(startTime)
            .setDuration(endTime - startTime)
            .audioCodec('pcm_s16le')    // LINEAR16 codec
            .audioChannels(1)           // Mono audio
            .audioFrequency(16000)      // 16kHz sample rate
            .toFormat('wav')            // Ensure WAV format
            .output(chunkPath)
            .on('end', () => {
              chunks[i] = chunkPath; // Store in correct position
              completedChunks++;
              console.log(`✅ Chunk ${i + 1}/${chunkCount} completed: ${path.basename(chunkPath)}`);
              
              if (completedChunks === chunkCount) {
                console.log(`✅ Audio split into ${chunks.length} chunks in correct order`);
                resolve(chunks.filter(chunk => chunk !== null)); // Remove any failed chunks
              }
            })
            .on('error', (err) => {
              console.error(`❌ Chunk ${i + 1} creation failed: ${err.message}`);
              completedChunks++; // Still count as completed to prevent hanging
              
              if (completedChunks === chunkCount) {
                const validChunks = chunks.filter(chunk => chunk !== null);
                if (validChunks.length === 0) {
                  reject(new Error('All chunks failed to create'));
                } else {
                  console.log(`✅ Audio split into ${validChunks.length} chunks (${chunkCount - validChunks.length} failed)`);
                  resolve(validChunks);
                }
              }
            })
            .run();
        }
      });
    });
  }

  /**
   * Extract Audio from Video Files
   * 
   * Uses FFmpeg to extract audio track from video files and optimize for transcription
   * 
   * @param {string} videoPath - Path to the video file
   * @param {string} provider - Transcription provider ('openai' or 'google')
   * @returns {Promise<string>} Path to the extracted audio file
   */
  async extractAudioFromVideo(videoPath, provider = 'google') {
    return new Promise((resolve, reject) => {
      console.log(`🎬➡️🎵 Extracting audio from video: ${videoPath} (optimized for ${provider})`);
      
      // Fix the path issue - ensure proper path construction
      const outputPath = path.join(path.dirname(videoPath), path.basename(videoPath, path.extname(videoPath)) + '.wav');
      
      let ffmpegChain = ffmpeg(videoPath);
      
      if (provider === 'google') {
        // Optimize for Google Speech-to-Text API
        // Google recommends: LINEAR16, 16kHz, mono, no compression
        ffmpegChain
          .audioCodec('pcm_s16le')    // LINEAR16 codec (uncompressed)
          .audioChannels(1)           // Mono audio
          .audioFrequency(16000)      // 16kHz sample rate (optimal for speech)
          .audioFilters([
            'highpass=f=200',         // Remove low-frequency noise
            'lowpass=f=3000',         // Focus on speech frequencies
            'volume=1.5'              // Boost volume for better recognition
          ])
          .toFormat('wav');
      } else {
        // OpenAI Whisper is more flexible with audio formats
        ffmpegChain
          .audioCodec('pcm_s16le')    // LINEAR16 codec
          .audioChannels(1)           // Mono audio
          .audioFrequency(16000)      // 16kHz sample rate
          .toFormat('wav');
      }
      
      ffmpegChain
        .on('end', () => {
          console.log(`✅ Audio extracted to: ${outputPath} (${provider} optimized)`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Audio extraction error:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Text Summarization using OpenAI GPT-4
   * 
   * Creates intelligent summaries of text content with customizable length
   * 
   * @param {string} text - Text content to summarize
   * @param {number} maxLength - Maximum length of summary in words (default: 150)
   * @returns {Promise<Object>} Summary result with text and provider info
   * @description Creates concise summaries preserving key information and context using OpenAI GPT-4
   */
  async summarizeText(text, maxLength = 150) {
    try {
      console.log(`📝 Summarizing text (${text.length} chars) to ~${maxLength} words`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise, informative summaries while preserving key information and context."
          },
          {
            role: "user",
            content: `Please summarize the following text in approximately ${maxLength} words. Focus on the main points and key information:\n\n${text}`
          }
        ],
        max_tokens: maxLength * 2,    // Allow some buffer for response
        temperature: 0.3              // Low temperature for consistent, focused summaries
      });
      
      return {
        summary: response.choices[0].message.content,
        provider: 'OpenAI GPT-4'
      };
    } catch (error) {
      console.error('❌ Summarization error:', error);
      throw error;
    }
  }

  /**
   * Advanced Text Summarization with Style and Tone Options
   * 
   * Creates summaries with different styles and tones for various use cases
   * 
   * @param {string} text - Text content to summarize
   * @param {Object} options - Summarization options
   * @param {number} options.maxLength - Maximum length in words
   * @param {string} options.style - Summary style ('standard', 'bullet-points', 'executive', 'technical')
   * @param {string} options.tone - Summary tone ('neutral', 'formal', 'casual')
   * @returns {Promise<Object>} Advanced summary result
   * @description Creates customized summaries with different styles and tones using OpenAI GPT-4
   */
  async summarizeTextAdvanced(text, options = {}) {
    const { 
      maxLength = 150, 
      style = 'standard',     // standard, bullet-points, executive, technical
      tone = 'neutral'        // neutral, formal, casual
    } = options;

    try {
      console.log(`📝✨ Advanced summarizing: ${style} style, ${tone} tone, ~${maxLength} words`);
      
      // Build system prompt based on style preference
      let systemPrompt = "You are a helpful assistant that creates summaries.";
      
      switch (style) {
        case 'bullet-points':
          systemPrompt += " Always format your summaries as clear bullet points highlighting key information.";
          break;
        case 'executive':
          systemPrompt += " Write executive-style summaries focusing on key decisions, outcomes, and action items.";
          break;
        case 'technical':
          systemPrompt += " Write technical summaries preserving important details, methods, and specifications.";
          break;
        default:
          systemPrompt += " Write clear, comprehensive summaries preserving the most important information.";
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please create a ${tone} ${style} summary of the following text in approximately ${maxLength} words:\n\n${text}`
          }
        ],
        max_tokens: maxLength * 2,
        temperature: tone === 'casual' ? 0.7 : 0.3    // Higher temp for casual tone
      });
      
      return {
        summary: response.choices[0].message.content,
        style,
        tone,
        provider: 'OpenAI GPT-4'
      };
    } catch (error) {
      console.error('❌ Advanced summarization error:', error);
      throw error;
    }
  }

  /**
   * Extract Single Frame from Video
   * 
   * Extracts a frame at a specific timestamp for object detection
   * 
   * @param {string} videoPath - Path to the video file
   * @param {string} timeStamp - Timestamp in format 'HH:MM:SS' (default: '00:00:00.5')
   * @returns {Promise<string>} Path to the extracted frame image
   * @description Extracts a single frame from video at specified timestamp using FFmpeg
   */
  async extractVideoFrame(videoPath, timeStamp = '00:00:00.5') {
    return new Promise((resolve, reject) => {
      try {
        const fileName = path.basename(videoPath, path.extname(videoPath)) + '_frame.jpg';
        const outputPath = path.join('uploads', fileName);
        
        console.log(`🎬➡️🖼️ Extracting frame at ${timeStamp} from: ${path.basename(videoPath)}`);
        
        // First try: Use -ss for seeking and -vframes for frame count
        ffmpeg(videoPath)
          .inputOptions([`-ss ${timeStamp}`])
          .outputOptions(['-vframes', '1', '-q:v', '2'])
          .output(outputPath)
          .on('end', () => {
            console.log(`✅ Frame extracted to: ${fileName}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.log(`❌ Frame extraction error: ${err.message}`);
            // Try extracting at the beginning if seeking fails
            if (timeStamp !== '00:00:00') {
              console.log('🔄 Retrying frame extraction at 00:00:00...');
              ffmpeg(videoPath)
                .inputOptions(['-ss 00:00:00'])
                .outputOptions(['-vframes', '1', '-q:v', '2'])
                .output(outputPath)
                .on('end', () => {
                  console.log(`✅ Frame extracted to: ${fileName} (fallback)`);
                  resolve(outputPath);
                })
                .on('error', (fallbackErr) => {
                  console.log(`❌ Frame extraction fallback failed: ${fallbackErr.message}`);
                  // Final fallback: try without seeking
                  console.log('🔄 Final fallback: extracting first frame without seeking...');
                  ffmpeg(videoPath)
                    .outputOptions(['-vframes', '1', '-q:v', '2'])
                    .output(outputPath)
                    .on('end', () => {
                      console.log(`✅ Frame extracted to: ${fileName} (final fallback)`);
                      resolve(outputPath);
                    })
                    .on('error', (finalErr) => {
                      console.log(`❌ All frame extraction methods failed: ${finalErr.message}`);
                      reject(finalErr);
                    })
                    .run();
                })
                .run();
            } else {
              reject(err);
            }
          })
          .run();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Comprehensive Multimedia Analysis
   * 
   * Main function that analyzes any multimedia file (image, audio, video)
   * and returns comprehensive results including objects, transcription, and summary
   * 
   * @param {string} filePath - Path to the multimedia file
   * @param {string} fileType - MIME type of the file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis results
   * @description Main analysis function that handles all multimedia types with comprehensive results
   */
  async analyzeMultimedia(filePath, fileType, options = {}) {
    try {
      console.log(`🚀 Starting analysis of ${fileType} file: ${filePath}`);
      
      let results = {
        objects: [],
        transcription: '',
        summary: '',
        sentiment: null,
        entities: null,
        voicePrints: null,
        thumbnails: null,
        ocrCaptions: null,
        metadata: {},
        warnings: []
      };

      // Set default options if not provided
      const analysisOptions = {
        enableObjectDetection: true,
        enableTranscription: true,
        enableVideoAnalysis: true,
        enableSummarization: true,
        enableSentimentAnalysis: true,
        enableNER: true,
        enableSpeakerDiarization: true,
        enableVoicePrintRecognition: true,
        enableProfanityDetection: true,
        enableKeywordDetection: true,
        enableThumbnailGeneration: true,
        enableOCRExtraction: true,
        transcriptionProvider: 'google',
        objectDetectionMode: 'enhanced',
        analysisPriority: 'balanced',
        profanitySensitivity: 'moderate',
        keywordCategories: 'all',
        enableBatchProcessing: false,
        saveToDatabase: true,
        thumbnailOptions: {
          imageSizes: [150, 300, 500],
          thumbnailSize: 300,
          keyMomentsCount: 5,
          keyMomentsSize: 200
        },
        ocrOptions: {
          frameInterval: 2,
          maxFrames: 30,
          confidenceThreshold: 0.5,
          filterShortText: true
        },
        ...options
      };

      console.log(`🔧 Using analysis options:`, analysisOptions);

      if (fileType.startsWith('video/')) {
        console.log('🎬 Processing video file...');
        
        // Extract audio if transcription or voice analysis is enabled
        let audioPath = null;
        if (analysisOptions.enableTranscription || analysisOptions.enableVoicePrintRecognition) {
          console.log('🎬➡️🎵 Extracting audio track from video...');
          audioPath = await this.extractAudioFromVideo(filePath, analysisOptions.transcriptionProvider);
        }
        
        // Extract video frame if object detection is enabled
        let framePath = null;
        if (analysisOptions.enableObjectDetection) {
          try {
            console.log('🎬➡️🖼️ Extracting video frame for analysis...');
            framePath = await this.extractVideoFrame(filePath);
          } catch (frameError) {
            console.log(`⚠️ Frame extraction failed: ${frameError.message}`);
            results.warnings.push(`Video frame extraction failed: ${frameError.message}. Continuing with audio analysis only.`);
            
            if (frameError.message.includes('partial file') || frameError.message.includes('EOF')) {
              results.warnings.push('The video file appears to be corrupted or incomplete. This may be due to download issues or the video being unavailable.');
            }
          }
        }

        // Analyze frame if available and object detection is enabled
        if (framePath && analysisOptions.enableObjectDetection) {
          console.log('🔍 Analyzing extracted video frame...');
          try {
            const objectResults = analysisOptions.objectDetectionMode === 'enhanced' 
              ? await this.detectObjectsEnhanced(framePath)
              : await this.detectObjects(filePath);
            results.objects = objectResults.objects || [];
            results.metadata.frameAnalysis = {
              objects: results.objects.length,
              confidence: objectResults.averageConfidence || 0,
              mode: analysisOptions.objectDetectionMode
            };
            
            // Generate detailed description for video frame
            console.log('📝 Generating video frame description...');
            try {
              results.imageDescription = await this.generateImageDescription(framePath, objectResults);
            } catch (descriptionError) {
              console.log(`⚠️ Video frame description generation failed: ${descriptionError.message}`);
              results.warnings.push(`Video frame description generation failed: ${descriptionError.message}`);
            }
          } catch (objectError) {
            console.log(`❌ Object detection failed: ${objectError.message}`);
            results.warnings.push(`Object detection failed: ${objectError.message}`);
          }
        }

        // Generate video thumbnails and key moments if enabled
        if (analysisOptions.enableThumbnailGeneration) {
          console.log('🎬📏 Generating video thumbnails and key moments...');
          try {
            results.thumbnails = await this.generateVideoThumbnail(filePath, analysisOptions.thumbnailOptions);
            results.metadata.thumbnails = {
              generated: true,
              mainThumbnail: results.thumbnails.mainThumbnail.url,
              keyMomentsCount: results.thumbnails.keyMomentsCount,
              duration: results.thumbnails.duration
            };
          } catch (thumbnailError) {
            console.log(`⚠️ Video thumbnail generation failed: ${thumbnailError.message}`);
            results.warnings.push(`Video thumbnail generation failed: ${thumbnailError.message}`);
          }
        }

        // Extract OCR captions if enabled
        if (analysisOptions.enableOCRExtraction) {
          console.log('🎬📄 Extracting OCR captions from video...');
          try {
            results.ocrCaptions = await this.extractVideoOCRCaptions(filePath, analysisOptions.ocrOptions);
            results.metadata.ocrCaptions = {
              generated: true,
              totalCaptions: results.ocrCaptions.captions.length,
              frameInterval: results.ocrCaptions.frameInterval,
              duration: results.ocrCaptions.duration
            };
          } catch (ocrError) {
            console.log(`⚠️ OCR extraction failed: ${ocrError.message}`);
            results.warnings.push(`OCR extraction failed: ${ocrError.message}`);
          }
        }

        // Transcribe audio if enabled
        if (audioPath && analysisOptions.enableTranscription) {
          console.log('🎤 Transcribing extracted audio...');
          try {
            const audioStats = fs.statSync(audioPath);
            if (audioStats.size < 1000) {
              throw new Error(`Audio file is too small (${audioStats.size} bytes) - likely corrupted or empty`);
            }
            
            // For Google Speech-to-Text, convert to mono if needed
            let audioPathForTranscription = audioPath;
            if (analysisOptions.transcriptionProvider === 'google') {
              try {
                const metadata = await this.getAudioMetadata(audioPath);
                if (metadata.streams && metadata.streams.length > 0) {
                  const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
                  if (audioStream && audioStream.channels > 1) {
                    console.log(`🎵 Converting stereo audio (${audioStream.channels} channels) to mono for Google Speech-to-Text`);
                    audioPathForTranscription = await this.convertAudioToMono(audioPath);
                  }
                }
              } catch (metadataError) {
                console.log(`⚠️ Could not check audio metadata: ${metadataError.message}`);
              }
            }
            
            if (analysisOptions.transcriptionProvider === 'google') {
              try {
                results.transcription = await this.transcribeAudioGoogle(audioPathForTranscription);
              } catch (googleError) {
                // If Google fails with GCS URI requirement, fall back to OpenAI
                if (googleError.message.includes('FALLBACK_TO_OPENAI')) {
                  console.log(`🔄 Google requires GCS URI for this file, falling back to OpenAI Whisper...`);
                  results.transcription = await this.transcribeAudioOpenAI(audioPathForTranscription);
                  results.warnings.push('Used OpenAI Whisper as fallback due to Google file size limits');
                } else {
                  throw googleError;
                }
              }
            } else if (analysisOptions.transcriptionProvider === 'openai') {
              results.transcription = await this.transcribeAudioOpenAI(audioPathForTranscription);
            } else {
              // Auto-select: try Google first, fallback to OpenAI
              try {
                results.transcription = await this.transcribeAudioGoogle(audioPathForTranscription);
              } catch (googleError) {
                console.log(`🔄 Google failed, trying OpenAI: ${googleError.message}`);
                results.transcription = await this.transcribeAudioOpenAI(audioPathForTranscription);
                results.warnings.push('Used OpenAI Whisper as fallback (no speaker diarization available)');
              }
            }
          } catch (transcriptionError) {
            console.log(`❌ Transcription failed: ${transcriptionError.message}`);
            results.warnings.push(`Transcription failed: ${transcriptionError.message}`);
            
            if (transcriptionError.message.includes('too small') || transcriptionError.message.includes('corrupted')) {
              results.warnings.push('The audio file appears to be corrupted or incomplete. This may be due to the original video being unavailable or having download issues.');
            }
          }
        }

      } else if (fileType.startsWith('audio/')) {
        console.log('🎵 Processing audio file...');
        
        // Transcribe audio if enabled
        if (analysisOptions.enableTranscription) {
          console.log('🎤 Transcribing audio file...');
          try {
            if (analysisOptions.transcriptionProvider === 'google') {
              // Smart routing: use Google for short files, OpenAI for long files
              try {
                results.transcription = await this.transcribeAudioGoogle(filePath);
              } catch (googleError) {
                // If Google fails with any limitation, fall back to OpenAI
                if (googleError.message.includes('FALLBACK_TO_OPENAI')) {
                  console.log(`🔄 Google has limitations for this file, using OpenAI Whisper...`);
                  results.transcription = await this.transcribeAudioOpenAI(filePath);
                  results.warnings.push('Used OpenAI Whisper for optimal transcription of long audio');
                } else {
                  throw googleError;
                }
              }
            } else if (analysisOptions.transcriptionProvider === 'openai') {
              results.transcription = await this.transcribeAudioOpenAI(filePath);
            } else {
              // Auto-select: Smart routing based on file characteristics
              try {
                const stats = fs.statSync(filePath);
                const fileSizeMB = stats.size / (1024 * 1024);
                let audioDuration = 0;
                
                try {
                  const metadata = await this.getAudioMetadata(filePath);
                  if (metadata.format && metadata.format.duration) {
                    audioDuration = parseFloat(metadata.format.duration);
                  }
                } catch (metadataError) {
                  console.log(`⚠️ Could not get audio duration: ${metadataError.message}`);
                }
                
                // Use OpenAI for long/large files, Google for short files
                if (audioDuration > 30 || fileSizeMB > 5) {
                  console.log(`🎤 Using OpenAI Whisper for long/large audio (${audioDuration.toFixed(1)}s, ${fileSizeMB.toFixed(1)}MB)`);
                  results.transcription = await this.transcribeAudioOpenAI(filePath);
                  results.warnings.push('Used OpenAI Whisper for optimal transcription of long audio');
                } else {
                  console.log(`🎤 Using Google Speech-to-Text for short audio (${audioDuration.toFixed(1)}s, ${fileSizeMB.toFixed(1)}MB)`);
                  results.transcription = await this.transcribeAudioGoogle(filePath);
                }
              } catch (autoSelectError) {
                console.log(`🔄 Auto-select failed, using OpenAI as final fallback: ${autoSelectError.message}`);
                results.transcription = await this.transcribeAudioOpenAI(filePath);
                results.warnings.push('Used OpenAI Whisper as fallback transcription method');
              }
            }
          } catch (transcriptionError) {
            console.log(`❌ Transcription failed: ${transcriptionError.message}`);
            results.warnings.push(`Transcription failed: ${transcriptionError.message}`);
          }
        }

      } else if (fileType.startsWith('image/')) {
        console.log('🖼️ Processing image file...');
        
        // Analyze image if object detection is enabled
        if (analysisOptions.enableObjectDetection) {
          console.log('🔍 Analyzing image...');
          try {
            const objectResults = analysisOptions.objectDetectionMode === 'enhanced' 
              ? await this.detectObjectsEnhanced(filePath)
              : await this.detectObjects(filePath);
            results.objects = objectResults.objects || [];
            results.metadata.imageAnalysis = {
              objects: results.objects.length,
              confidence: objectResults.averageConfidence || 0,
              mode: analysisOptions.objectDetectionMode
            };
            
            // Generate detailed image description
            console.log('📝 Generating image description...');
            try {
              results.imageDescription = await this.generateImageDescription(filePath, objectResults);
            } catch (descriptionError) {
              console.log(`⚠️ Image description generation failed: ${descriptionError.message}`);
              results.warnings.push(`Image description generation failed: ${descriptionError.message}`);
            }
          } catch (objectError) {
            console.log(`❌ Object detection failed: ${objectError.message}`);
            results.warnings.push(`Object detection failed: ${objectError.message}`);
          }
        }

        // Generate image thumbnails if enabled
        if (analysisOptions.enableThumbnailGeneration) {
          console.log('🖼️📏 Generating image thumbnails...');
          try {
            results.thumbnails = await this.generateImageThumbnail(filePath, analysisOptions.thumbnailOptions.imageSizes);
            results.metadata.thumbnails = {
              generated: true,
              sizes: results.thumbnails.sizes,
              totalThumbnails: results.thumbnails.totalThumbnails
            };
          } catch (thumbnailError) {
            console.log(`⚠️ Image thumbnail generation failed: ${thumbnailError.message}`);
            results.warnings.push(`Image thumbnail generation failed: ${thumbnailError.message}`);
          }
        }
      }

      // Process transcription results if available
      let transcriptionText = typeof results.transcription === 'string'
        ? results.transcription
        : (results.transcription && results.transcription.text) || '';

      // Always generate a summary if enabled, even if transcription failed
      if (analysisOptions.enableSummarization) {
        console.log('📝 Generating summary...');
        try {
          if (transcriptionText && transcriptionText.trim()) {
            // Generate summary from transcription
            const textLength = transcriptionText.length;
            console.log(`📝 Summarizing text (${textLength} chars) to ~150 words`);
            results.summary = await this.summarizeText(transcriptionText);
          } else {
            // Generate summary based on file type and available data
            let summaryContent = '';
            
            if (fileType.startsWith('image/')) {
              if (results.objects && results.objects.length > 0) {
                const objectList = results.objects.map(obj => obj.name).join(', ');
                summaryContent = `This image contains: ${objectList}`;
              } else if (results.imageDescription && results.imageDescription.description) {
                summaryContent = results.imageDescription.description;
              } else {
                summaryContent = 'An image file was analyzed.';
              }
            } else if (fileType.startsWith('video/')) {
              if (results.objects && results.objects.length > 0) {
                const objectList = results.objects.map(obj => obj.name).join(', ');
                summaryContent = `This video contains: ${objectList}`;
              } else {
                summaryContent = 'A video file was analyzed.';
              }
            } else if (fileType.startsWith('audio/')) {
              summaryContent = 'An audio file was analyzed.';
            } else {
              summaryContent = 'A multimedia file was analyzed.';
            }
            
            console.log(`📝 Generating fallback summary for ${fileType}`);
            results.summary = await this.summarizeText(summaryContent);
          }
        } catch (summaryError) {
          console.log(`❌ Summary generation failed: ${summaryError.message}`);
          results.warnings.push(`Summary generation failed: ${summaryError.message}`);
          // Set a basic fallback summary
          results.summary = `Analysis of ${fileType} file completed.`;
        }
      }

      // Process other analysis only if transcription text is available
      if (transcriptionText && transcriptionText.trim()) {
        // Analyze sentiment if enabled
        if (analysisOptions.enableSentimentAnalysis) {
          console.log('😊 Analyzing sentiment...');
          try {
            results.sentiment = await this.analyzeSentiment(transcriptionText);
          } catch (sentimentError) {
            console.log(`❌ Sentiment analysis failed: ${sentimentError.message}`);
            results.warnings.push(`Sentiment analysis failed: ${sentimentError.message}`);
          }
        }

        // Extract named entities if enabled
        if (analysisOptions.enableNER) {
          console.log('🏷️ Extracting named entities...');
          try {
            results.entities = await this.extractNamedEntities(transcriptionText);
          } catch (entityError) {
            console.log(`❌ Named entity recognition failed: ${entityError.message}`);
            results.warnings.push(`Named entity recognition failed: ${entityError.message}`);
          }
        }

        // Analyze voice prints if enabled
        if (analysisOptions.enableVoicePrintRecognition) {
          console.log('🎤 Analyzing voice prints...');
          try {
            const speakers = results.transcription.speakers || [];
            if (speakers.length > 0 && analysisOptions.enableSpeakerDiarization) {
              // Use Google Speech-to-Text speaker diarization data
              results.voicePrints = await this.analyzeVoicePrints(filePath, speakers);
            } else {
              // Fallback: Basic voice print analysis without speaker diarization
              console.log('🔄 No speaker diarization data, using basic voice print analysis...');
              results.voicePrints = await this.analyzeBasicVoicePrints(filePath, results.transcription);
            }
          } catch (voicePrintError) {
            console.log(`❌ Voice print analysis failed: ${voicePrintError.message}`);
            results.warnings.push(`Voice print analysis failed: ${voicePrintError.message}`);
          }
        }

        // Detect profanity if enabled
        if (analysisOptions.enableProfanityDetection) {
          console.log('🚫 Detecting profanity...');
          try {
            results.profanity = await this.detectProfanity(transcriptionText, analysisOptions.profanitySensitivity);
          } catch (profanityError) {
            console.log(`❌ Profanity detection failed: ${profanityError.message}`);
            results.warnings.push(`Profanity detection failed: ${profanityError.message}`);
          }
        }

        // Detect keywords if enabled
        if (analysisOptions.enableKeywordDetection) {
          console.log('🔍 Detecting keywords...');
          try {
            results.keywords = await this.detectKeywords(transcriptionText, analysisOptions.keywordCategories);
          } catch (keywordError) {
            console.log(`❌ Keyword detection failed: ${keywordError.message}`);
            results.warnings.push(`Keyword detection failed: ${keywordError.message}`);
          }
        }
      }

      // Add file metadata
      try {
        const stats = fs.statSync(filePath);
        results.metadata.file = {
          size: stats.size,
          type: fileType,
          name: path.basename(filePath)
        };
      } catch (metadataError) {
        console.log(`⚠️ Could not get file metadata: ${metadataError.message}`);
      }

      // Generate tags and category for the analysis
      console.log('🏷️ Generating tags and category...');
      try {
        const { tags, category } = await this.generateTagsAndCategory(results, fileType, analysisOptions);
        results.tags = tags;
        results.category = category;
        console.log(`📂 Category: ${category}`);
        console.log(`🏷️ Tags: ${tags.join(', ')}`);
        
        // Generate title based on summary
        console.log('📝 Generating content title...');
        const generatedTitle = await this.generateTitle(results, fileType);
        results.generatedTitle = generatedTitle;
        console.log(`📰 Generated Title: "${generatedTitle}"`);
      } catch (tagError) {
        console.log(`⚠️ Tag generation failed: ${tagError.message}`);
        results.tags = ['multimedia', 'analysis'];
        results.category = 'general';
        results.generatedTitle = 'Multimedia Content';
      }

      console.log('✅ Analysis completed successfully!');
      return results;

    } catch (error) {
      console.log(`❌ Analysis error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze Multiple Video Frames
   * 
   * Extracts and analyzes multiple frames from a video for comprehensive visual analysis
   * 
   * @param {string} videoPath - Path to the video file
   * @param {number} frameCount - Number of frames to extract and analyze
   * @returns {Array} Analysis results for each frame
   */
  async analyzeVideoFrames(videoPath, frameCount = 3) {
    try {
      console.log(`🎬🔍 Analyzing ${frameCount} frames from video: ${videoPath}`);
      
      // Get video metadata to calculate frame extraction times
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;
      
      const frames = [];
      const interval = duration / (frameCount + 1);  // Evenly distribute frames
      
      // Extract and analyze each frame
      for (let i = 1; i <= frameCount; i++) {
        const timeStamp = this.secondsToTimeString(interval * i);
        console.log(`📸 Extracting frame ${i}/${frameCount} at ${timeStamp}`);
        
        const framePath = await this.extractVideoFrame(videoPath, timeStamp);
        const analysis = await this.detectObjectsEnhanced(framePath);
        
        frames.push({
          frameNumber: i,
          timeStamp,
          analysis
        });
        
        // Cleanup frame file
        fs.unlinkSync(framePath);
      }
      
      return frames;
    } catch (error) {
      console.error('❌ Video frame analysis error:', error);
      throw error;
    }
  }

  /**
   * Get Video Metadata
   * 
   * Retrieves video file metadata including duration, format, etc.
   * 
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Get Audio Metadata
   * 
   * Retrieves audio file metadata including channels, sample rate, etc.
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Convert Audio to Mono
   * 
   * Converts stereo audio to mono for Google Speech-to-Text compatibility
   * 
   * @param {string} audioPath - Path to the audio file
   * @returns {Promise<string>} Path to the converted mono audio file
   */
  async convertAudioToMono(audioPath) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(path.dirname(audioPath), `mono_${path.basename(audioPath)}`);
      
      ffmpeg(audioPath)
        .audioChannels(1)           // Convert to mono
        .audioFrequency(16000)      // Ensure 16kHz sample rate
        .audioCodec('pcm_s16le')    // LINEAR16 codec
        .toFormat('wav')
        .on('end', () => {
          console.log(`✅ Converted to mono: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('❌ Audio conversion error:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Convert Seconds to Timestamp String
   * 
   * Utility function to convert seconds to HH:MM:SS format
   * 
   * @param {number} seconds - Number of seconds
   * @returns {string} Timestamp in HH:MM:SS format
   */
  secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Detect Profanity in Text
   * 
   * Analyzes text for inappropriate language with severity levels
   * 
   * @param {string} text - Text to analyze
   * @param {string} sensitivity - Sensitivity level (strict, moderate, lenient)
   * @returns {Promise<Object>} Profanity analysis results
   */
  async detectProfanity(text, sensitivity = 'moderate') {
    try {
      console.log(`🚫 Detecting profanity with ${sensitivity} sensitivity...`);
      
      // Define profanity patterns based on sensitivity
      const profanityPatterns = this.getProfanityPatterns(sensitivity);
      
      const detectedWords = [];
      const severityCounts = { none: 0, low: 0, moderate: 0, high: 0, severe: 0 };
      let totalDetected = 0;
      
      // Check each pattern
      profanityPatterns.forEach(pattern => {
        const matches = text.toLowerCase().match(new RegExp(pattern.regex, 'gi'));
        if (matches) {
          matches.forEach(match => {
            detectedWords.push({
              term: match,
              severity: pattern.severity,
              context: this.getWordContext(text, match)
            });
            severityCounts[pattern.severity]++;
            totalDetected++;
          });
        }
      });
      
      // Determine overall severity
      let overallSeverity = 'none';
      if (severityCounts.severe > 0) overallSeverity = 'severe';
      else if (severityCounts.high > 0) overallSeverity = 'high';
      else if (severityCounts.moderate > 0) overallSeverity = 'moderate';
      else if (severityCounts.low > 0) overallSeverity = 'low';
      
      // Calculate confidence based on detection patterns
      const confidence = Math.min(0.95, 0.3 + (totalDetected * 0.1));
      
      // Generate content rating
      const contentRating = this.getContentRating(overallSeverity, totalDetected);
      
      // Generate summary
      const summary = this.generateProfanitySummary(overallSeverity, totalDetected, detectedWords);
      
      return {
        overallSeverity,
        detectedCount: totalDetected,
        severityBreakdown: severityCounts,
        detectedWords: detectedWords.slice(0, 20), // Limit to first 20
        contentRating,
        confidence,
        summary,
        provider: 'Profanity Detection AI'
      };
      
    } catch (error) {
      console.error('❌ Profanity detection error:', error);
      throw error;
    }
  }

  /**
   * Get profanity patterns based on sensitivity level
   * 
   * @param {string} sensitivity - Sensitivity level (strict, moderate, lenient)
   * @returns {Array} Array of profanity patterns with severity levels
   * @description Returns regex patterns for profanity detection based on sensitivity setting
   */
  getProfanityPatterns(sensitivity) {
    const patterns = {
      strict: [
        { regex: '\\b(fuck|shit|bitch|asshole|dick|pussy|cunt)\\b', severity: 'high' },
        { regex: '\\b(damn|hell|god damn|jesus christ)\\b', severity: 'moderate' },
        { regex: '\\b(crap|darn|heck|gosh)\\b', severity: 'low' },
        { regex: '\\b(\\w*[a-z]{2,}\\w*)\\b', severity: 'low' } // Any suspicious patterns
      ],
      moderate: [
        { regex: '\\b(fuck|shit|bitch|asshole|dick|pussy|cunt)\\b', severity: 'high' },
        { regex: '\\b(damn|hell|god damn|jesus christ)\\b', severity: 'moderate' },
        { regex: '\\b(crap|darn|heck|gosh)\\b', severity: 'low' }
      ],
      lenient: [
        { regex: '\\b(fuck|shit|bitch|asshole|dick|pussy|cunt)\\b', severity: 'severe' },
        { regex: '\\b(damn|hell|god damn|jesus christ)\\b', severity: 'high' }
      ]
    };
    
    return patterns[sensitivity] || patterns.moderate;
  }

  /**
   * Get word context for detected profanity
   * 
   * @param {string} text - Full text content
   * @param {string} word - Detected profane word
   * @returns {string} Context surrounding the word
   * @description Extracts surrounding context for better profanity understanding
   */
  getWordContext(text, word) {
    const index = text.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + word.length + 20);
    return text.substring(start, end).replace(/\n/g, ' ').trim();
  }

  /**
   * Get content rating based on profanity analysis
   * 
   * @param {string} severity - Overall severity level
   * @param {number} count - Number of detected profane words
   * @returns {string} Content rating (G, PG, PG-13, R)
   * @description Assigns content rating based on profanity severity and frequency
   */
  getContentRating(severity, count) {
    if (severity === 'severe' || count > 10) return 'R';
    if (severity === 'high' || count > 5) return 'PG-13';
    if (severity === 'moderate' || count > 2) return 'PG';
    return 'G';
  }

  /**
   * Generate profanity analysis summary
   * 
   * @param {string} severity - Overall severity level
   * @param {number} count - Number of detected profane words
   * @param {Array} words - Array of detected profane words
   * @returns {string} Human-readable summary of profanity analysis
   * @description Creates descriptive summary of profanity detection results
   */
  generateProfanitySummary(severity, count, words) {
    if (count === 0) {
      return 'No inappropriate language detected. Content appears suitable for general audiences.';
    }
    
    const severityText = {
      'low': 'mild',
      'moderate': 'moderate',
      'high': 'strong',
      'severe': 'very strong'
    };
    
    return `Content contains ${severityText[severity] || 'some'} inappropriate language with ${count} detected instances. Consider reviewing for audience appropriateness.`;
  }

  /**
   * Detect Keywords in Text
   * 
   * Identifies important keywords and phrases in the text
   * 
   * @param {string} text - Text to analyze
   * @param {string} categories - Keyword categories to detect
   * @returns {Promise<Object>} Keyword analysis results
   */
  async detectKeywords(text, categories = 'all') {
    try {
      console.log(`🔍 Detecting keywords in ${categories} categories...`);
      
      // Define keyword patterns based on categories
      const keywordPatterns = this.getKeywordPatterns(categories);
      
      const detectedKeywords = [];
      const categoryCounts = {};
      let totalRelevance = 0;
      
      // Check each pattern
      keywordPatterns.forEach(pattern => {
        const matches = text.toLowerCase().match(new RegExp(pattern.regex, 'gi'));
        if (matches) {
          matches.forEach(match => {
            const relevance = this.calculateKeywordRelevance(match, pattern.category, text);
            detectedKeywords.push({
              term: match,
              category: pattern.category,
              relevance,
              context: this.getWordContext(text, match)
            });
            
            categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
            totalRelevance += relevance;
          });
        }
      });
      
      // Sort by relevance
      detectedKeywords.sort((a, b) => b.relevance - a.relevance);
      
      // Calculate averages
      const totalKeywords = detectedKeywords.length;
      const averageRelevance = totalKeywords > 0 ? totalRelevance / totalKeywords : 0;
      const categoriesFound = Object.keys(categoryCounts).length;
      
      // Generate summary
      const summary = this.generateKeywordSummary(totalKeywords, categoriesFound, detectedKeywords);
      
      return {
        totalKeywords,
        categoriesFound,
        averageRelevance,
        categoryBreakdown: categoryCounts,
        detectedKeywords: detectedKeywords.slice(0, 30), // Limit to top 30
        summary,
        provider: 'Keyword Detection AI'
      };
      
    } catch (error) {
      console.error('❌ Keyword detection error:', error);
      throw error;
    }
  }

  /**
   * Get keyword patterns based on categories
   * 
   * @param {string} categories - Category to get patterns for (all, business, technical, names, custom)
   * @returns {Array} Array of keyword patterns with regex and category
   * @description Returns keyword detection patterns for specified categories
   */
  getKeywordPatterns(categories) {
    const patterns = {
      business: [
        { regex: '\\b(revenue|profit|sales|marketing|strategy|business|company|corporate)\\b', category: 'Business' },
        { regex: '\\b(finance|investment|stock|market|trading|portfolio|budget|cost)\\b', category: 'Finance' },
        { regex: '\\b(meeting|presentation|report|analysis|data|metrics|kpi|performance)\\b', category: 'Management' }
      ],
      technical: [
        { regex: '\\b(algorithm|code|programming|software|database|api|framework|technology)\\b', category: 'Technology' },
        { regex: '\\b(server|client|network|protocol|interface|system|architecture|design)\\b', category: 'Computing' },
        { regex: '\\b(development|testing|deployment|maintenance|upgrade|version|release)\\b', category: 'Software' }
      ],
      names: [
        { regex: '\\b([A-Z][a-z]+ [A-Z][a-z]+)\\b', category: 'Names' },
        { regex: '\\b([A-Z][a-z]+ (Street|Avenue|Road|Drive|Lane|Place))\\b', category: 'Places' },
        { regex: '\\b([A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Organization))\\b', category: 'Organizations' }
      ],
      custom: [
        { regex: '\\b(important|key|critical|essential|significant|major|primary|main)\\b', category: 'Important Terms' },
        { regex: '\\b(urgent|emergency|priority|deadline|timeline|schedule|plan|goal)\\b', category: 'Action Items' }
      ]
    };
    
    if (categories === 'all') {
      return Object.values(patterns).flat();
    }
    
    return patterns[categories] || patterns.business;
  }

  /**
   * Calculate keyword relevance score
   * 
   * @param {string} term - Detected keyword term
   * @param {string} category - Category of the keyword
   * @param {string} text - Full text content
   * @returns {number} Relevance score between 0 and 1
   * @description Calculates relevance score based on frequency, category, and term length
   */
  calculateKeywordRelevance(term, category, text) {
    let relevance = 0.5; // Base relevance
    
    // Frequency bonus
    const frequency = (text.toLowerCase().match(new RegExp(term.toLowerCase(), 'gi')) || []).length;
    relevance += Math.min(frequency * 0.1, 0.3);
    
    // Category bonus
    const categoryBonus = {
      'Business': 0.1,
      'Finance': 0.1,
      'Technology': 0.1,
      'Names': 0.2,
      'Places': 0.15,
      'Organizations': 0.15,
      'Important Terms': 0.05,
      'Action Items': 0.1
    };
    
    relevance += categoryBonus[category] || 0;
    
    // Length bonus (longer terms are more specific)
    relevance += Math.min(term.length * 0.01, 0.2);
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Generate keyword analysis summary
   * 
   * @param {number} total - Total number of keywords detected
   * @param {number} categories - Number of categories found
   * @param {Array} keywords - Array of detected keywords
   * @returns {string} Human-readable summary of keyword analysis
   * @description Creates descriptive summary of keyword detection results
   */
  generateKeywordSummary(total, categories, keywords) {
    if (total === 0) {
      return 'No significant keywords detected in the content.';
    }
    
    const topKeywords = keywords.slice(0, 5).map(k => k.term).join(', ');
    return `Detected ${total} keywords across ${categories} categories. Key terms include: ${topKeywords}.`;
  }

  /**
   * Generate Detailed Image Description
   * 
   * Uses AI to create a comprehensive description of what's in an image
   * 
   * @param {string} imagePath - Path to the image file
   * @param {Object} objectResults - Results from object detection
   * @returns {Promise<Object>} Detailed image description
   */
  async generateImageDescription(imagePath, objectResults) {
    try {
      console.log(`📝 Generating detailed image description...`);
      
      // Prepare context from object detection results
      let context = '';
      
      if (objectResults && objectResults.objects && objectResults.objects.length > 0) {
        const objectList = objectResults.objects
          .map(obj => `${obj.name} (${(obj.confidence * 100).toFixed(1)}% confidence)`)
          .join(', ');
        context += `Detected objects: ${objectList}\n`;
      }
      
      if (objectResults && objectResults.labels && objectResults.labels.length > 0) {
        const labelList = objectResults.labels
          .map(label => `${label.description} (${(label.confidence * 100).toFixed(1)}% confidence)`)
          .join(', ');
        context += `Detected labels: ${labelList}\n`;
      }
      
      if (objectResults && objectResults.text) {
        context += `Text found in image: "${objectResults.text}"\n`;
      }
      
      // Create prompt for detailed description
      const prompt = `Analyze this image and provide a detailed, natural description of what you see. 

Context from AI analysis:
${context}

Please provide a comprehensive description that includes:
1. What objects, people, or scenes are visible
2. The setting, environment, or background
3. Any text, signs, or written content
4. The overall mood, style, or atmosphere
5. Colors, lighting, and visual composition
6. Any notable details or interesting elements

Write the description in a natural, engaging way that someone would use to describe the image to another person. Be specific and descriptive, but avoid being overly technical.

Respond with just the description, no additional formatting or labels.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert image analyst. Provide detailed, natural descriptions of images based on AI analysis results.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const description = response.choices[0].message.content.trim();
      
      return {
        description: description,
        confidence: objectResults ? 
          (objectResults.objects?.reduce((sum, obj) => sum + obj.confidence, 0) / Math.max(objectResults.objects?.length || 1, 1)) : 0.8,
        provider: 'AI Image Description',
        analysisContext: {
          objectsDetected: objectResults?.objects?.length || 0,
          labelsDetected: objectResults?.labels?.length || 0,
          textDetected: objectResults?.text ? true : false
        }
      };
      
    } catch (error) {
      console.error('❌ Image description generation error:', error);
      return {
        description: 'Unable to generate detailed description due to an error.',
        confidence: 0.5,
        provider: 'Error',
        analysisContext: {
          objectsDetected: 0,
          labelsDetected: 0,
          textDetected: false
        }
      };
    }
  }

  /**
   * Generate Tags and Category for Analysis Results
   * 
   * Uses ChatGPT to intelligently analyze content and generate appropriate tags and category
   * 
   * @param {Object} results - Analysis results
   * @param {string} fileType - File MIME type
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Tags and category
   */
  async generateTagsAndCategory(results, fileType, options) {
    try {
      console.log('🏷️ Starting tag generation with results:', {
        hasSummary: !!results.summary,
        summaryType: typeof results.summary,
        summaryLength: results.summary ? (typeof results.summary === 'string' ? results.summary.length : 'object') : 0,
        summaryValue: results.summary,
        fileType,
        hasOptions: !!options
      });
      
      // Prepare content for analysis - prioritize transcription over summary
      let contentToAnalyze = '';

      // Add file type information
      if (fileType.startsWith('video/')) {
        contentToAnalyze += 'Content Type: Video\n';
      } else if (fileType.startsWith('audio/')) {
        contentToAnalyze += 'Content Type: Audio\n';
      } else if (fileType.startsWith('image/')) {
        contentToAnalyze += 'Content Type: Image\n';
      }

      // Prioritize summary for more focused tag generation
      if (results.summary) {
        let summaryText = '';
        
        // Handle different summary formats
        if (typeof results.summary === 'string') {
          summaryText = results.summary.trim();
        } else if (results.summary && typeof results.summary === 'object') {
          // If summary is an object, try to extract text
          if (results.summary.text) {
            summaryText = results.summary.text.trim();
          } else if (results.summary.summary) {
            summaryText = results.summary.summary.trim();
          } else if (results.summary.description) {
            summaryText = results.summary.description.trim();
          } else {
            // Fallback: stringify the object
            summaryText = JSON.stringify(results.summary);
          }
        }
        
        if (summaryText) {
          console.log(`📝 Using summary text for tag generation (${summaryText.length} chars)`);
          contentToAnalyze += `\nSummary:\n${summaryText}\n`;
        }
      }

      // If no transcription or summary available, return basic tags
      if (!contentToAnalyze.trim()) {
        console.log('⚠️ No transcription or summary available for tag generation, using basic tags');
        console.log('📊 Results object:', JSON.stringify(results, null, 2));
        return {
          tags: ['multimedia', 'analysis'],
          category: 'general'
        };
      }

      // Use ChatGPT to analyze the content based on transcription or summary
      console.log(`🤖 Sending to ChatGPT for tag generation:`);
      console.log(`Content to analyze: ${contentToAnalyze}`);
      console.log(`📋 Full content being sent to ChatGPT:`);
      console.log(`=========================================`);
      console.log(contentToAnalyze);
      console.log(`=========================================`);
      
      const prompt = `Based on the following content (transcription or summary), provide:

1. A primary category from these options:
- general (default)
- video-content
- audio-content
- visual-content
- people-content
- food-content
- technology-content
- health-content
- educational-content
- entertainment-content
- sports-content
- news-content
- music-content
- conversation-content
- mature-content

2. A list of relevant tags that describe the content, including:
- Content type (video, audio, image)
- Main topics discussed
- Tone/mood
- Target audience
- Content style
- Any other relevant descriptors

Content to analyze:
${contentToAnalyze}

Please respond in this exact JSON format:
{
  "category": "category-name",
  "tags": ["tag1", "tag2", "tag3"]
}

Only return the JSON, no other text.`;

      console.log(`📝 Full prompt being sent to ChatGPT:`);
      console.log(`=========================================`);
      console.log(prompt);
      console.log(`=========================================`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst. Analyze multimedia content and provide appropriate categorization and tagging.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const responseText = response.choices[0].message.content.trim();
      console.log(`🤖 ChatGPT raw response:`);
      console.log(`=========================================`);
      console.log(responseText);
      console.log(`=========================================`);
      
      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
        console.log(`✅ Parsed ChatGPT response:`, parsedResponse);
      } catch (parseError) {
        console.log(`⚠️ Failed to parse ChatGPT response: ${parseError.message}`);
        console.log(`Response: ${responseText}`);
        // Fallback to basic tags
        return {
          tags: ['multimedia', 'analysis'],
          category: 'general'
        };
      }

      // Extract tags and category with proper validation
      const tags = new Set();
      let category = 'general';
      
      if (parsedResponse && typeof parsedResponse === 'object') {
        if (Array.isArray(parsedResponse.tags)) {
          parsedResponse.tags.forEach(tag => {
            try {
              if (tag && typeof tag === 'string') {
                const trimmedTag = tag.trim();
                if (trimmedTag) {
                  tags.add(trimmedTag.toLowerCase());
                }
              }
            } catch (tagError) {
              console.log(`⚠️ Error processing tag "${tag}": ${tagError.message}`);
            }
          });
        }
        
        if (parsedResponse.category && typeof parsedResponse.category === 'string') {
          try {
            category = parsedResponse.category.toLowerCase();
          } catch (categoryError) {
            console.log(`⚠️ Error processing category "${parsedResponse.category}": ${categoryError.message}`);
            category = 'general';
          }
        }
      }

      // Analysis type tags removed - keeping only content-based tags from ChatGPT

      // Add platform-specific tags if available
      if (results.metadata && results.metadata.platform) {
        tags.add(results.metadata.platform);
      }

      // Ensure we have at least basic tags
      if (tags.size === 0) {
        tags.add('multimedia');
        tags.add('analysis');
      }

      return {
        tags: Array.from(tags),
        category
      };

    } catch (error) {
      console.log(`⚠️ ChatGPT tag generation failed: ${error.message}`);
      
      // Fallback to basic logic
      const tags = new Set(['multimedia', 'analysis']);
      let category = 'general';

      // Basic file type categorization
      if (fileType.startsWith('video/')) {
        tags.add('video');
        category = 'video-content';
      } else if (fileType.startsWith('audio/')) {
        tags.add('audio');
        category = 'audio-content';
      } else if (fileType.startsWith('image/')) {
        tags.add('image');
        category = 'visual-content';
      }

      return {
        tags: Array.from(tags),
        category
      };
    }
  }

  /**
   * Generate Title based on Summary
   * 
   * Uses ChatGPT to create an engaging title based on content summary
   * 
   * @param {Object} results - Analysis results containing summary
   * @param {string} fileType - File MIME type
   * @returns {Promise<string>} Generated title
   */
  async generateTitle(results, fileType) {
    try {
      console.log('📝 Starting title generation based on summary');
      
      // Get summary text
      let summaryText = '';
      if (results.summary) {
        if (typeof results.summary === 'string') {
          summaryText = results.summary.trim();
        } else if (results.summary && typeof results.summary === 'object') {
          // Handle different summary formats
          if (results.summary.text) {
            summaryText = results.summary.text.trim();
          } else if (results.summary.summary) {
            summaryText = results.summary.summary.trim();
          } else if (results.summary.description) {
            summaryText = results.summary.description.trim();
          }
        }
      }
      
      // If no summary available, use fallback
      if (!summaryText) {
        console.log('⚠️ No summary available for title generation, using fallback');
        if (fileType.startsWith('video/')) {
          return 'Video Content';
        } else if (fileType.startsWith('audio/')) {
          return 'Audio Content';
        } else if (fileType.startsWith('image/')) {
          return 'Image Content';
        }
        return 'Multimedia Content';
      }
      
      // Generate title using ChatGPT
      const prompt = `Based on the following content summary, create an engaging and descriptive title.

The title should be:
- Concise (5-10 words maximum)
- Descriptive of the main topic or theme
- Engaging and clickable
- Professional and appropriate
- Capture the essence of the content

Summary: ${summaryText}

Respond with only the title, no quotes or additional text.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator who specializes in writing engaging titles that capture the essence of content. Create compelling titles that are descriptive yet concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      });

      const generatedTitle = response.choices[0].message.content.trim();
      
      // Clean up title (remove quotes if present)
      let cleanTitle = generatedTitle.replace(/^["']|["']$/g, '');
      
      // Ensure title isn't too long
      if (cleanTitle.length > 60) {
        cleanTitle = cleanTitle.substring(0, 57) + '...';
      }
      
      console.log(`✅ Generated title: "${cleanTitle}"`);
      return cleanTitle;
      
    } catch (error) {
      console.error('❌ Title generation failed:', error);
      
      // Fallback title based on file type
      if (fileType.startsWith('video/')) {
        return 'Video Content';
      } else if (fileType.startsWith('audio/')) {
        return 'Audio Content';
      } else if (fileType.startsWith('image/')) {
        return 'Image Content';
      }
      return 'Multimedia Content';
    }
  }

  /**
   * Generate Image Thumbnail
   * 
   * Creates thumbnails of different sizes for images
   * 
   * @param {string} imagePath - Path to the image file
   * @param {Array} sizes - Array of thumbnail sizes (default: [150, 300, 500])
   * @returns {Promise<Object>} Thumbnail generation results with paths and metadata
   * @description Generates multiple thumbnail sizes for images using FFmpeg
   */
  async generateImageThumbnail(imagePath, sizes = [150, 300, 500]) {
    try {
      console.log(`🖼️📏 Generating image thumbnails for: ${imagePath}`);
      
      const fileName = path.basename(imagePath, path.extname(imagePath));
      const thumbnails = {};
      
      // Create thumbnails directory if it doesn't exist
      const thumbnailsDir = path.join('uploads', 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
      
      // Generate thumbnails for each size
      for (const size of sizes) {
        const thumbnailPath = path.join(thumbnailsDir, `${fileName}_thumb_${size}x${size}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(imagePath)
            .outputOptions([
              `-vf scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:black`,
              '-q:v 2' // High quality
            ])
            .output(thumbnailPath)
            .on('end', () => {
              console.log(`✅ Generated ${size}x${size} thumbnail: ${path.basename(thumbnailPath)}`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`❌ Thumbnail generation error for ${size}x${size}:`, err);
              reject(err);
            })
            .run();
        });
        
        // Store thumbnail info
        thumbnails[`${size}x${size}`] = {
          path: thumbnailPath,
          size: size,
          relativePath: path.relative('uploads', thumbnailPath),
          url: `/thumbnails/${path.basename(thumbnailPath)}`
        };
      }
      
      return {
        success: true,
        originalImage: imagePath,
        thumbnails: thumbnails,
        sizes: sizes,
        totalThumbnails: sizes.length
      };
      
    } catch (error) {
      console.error('❌ Image thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Generate Video Thumbnail and Key Moments
   * 
   * Creates thumbnail from first frame and extracts key moments for preview
   * 
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - Thumbnail generation options
   * @returns {Promise<Object>} Thumbnail and key moments generation results
   * @description Generates video thumbnail and key moments sequence for hover preview
   */
  async generateVideoThumbnail(videoPath, options = {}) {
    try {
      console.log(`🎬📏 Generating video thumbnail and key moments for: ${videoPath}`);
      
      const fileName = path.basename(videoPath, path.extname(videoPath));
      const thumbnailsDir = path.join('uploads', 'thumbnails');
      
      // Create thumbnails directory if it doesn't exist
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
      
      // Get video metadata first
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;
      
      console.log(`📊 Video duration: ${duration.toFixed(2)} seconds`);
      
      // Default options
      const defaultOptions = {
        thumbnailSize: 300,
        keyMomentsCount: 5,
        keyMomentsSize: 200,
        includeFirstFrame: true,
        includeLastFrame: true
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Generate main thumbnail from first frame
      const mainThumbnailPath = path.join(thumbnailsDir, `${fileName}_thumb_main.jpg`);
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .inputOptions(['-ss 00:00:01'])
          .outputOptions([
            `-vf scale=${opts.thumbnailSize}:${opts.thumbnailSize}:force_original_aspect_ratio=decrease,pad=${opts.thumbnailSize}:${opts.thumbnailSize}:(ow-iw)/2:(oh-ih)/2:black`,
            '-vframes 1',
            '-q:v 2'
          ])
          .output(mainThumbnailPath)
          .on('end', () => {
            console.log(`✅ Generated main video thumbnail: ${path.basename(mainThumbnailPath)}`);
            resolve();
          })
          .on('error', (err) => {
            console.error('❌ Main thumbnail generation error:', err);
            reject(err);
          })
          .run();
      });
      
      // Generate key moments for hover preview
      const keyMoments = [];
      const keyMomentsInterval = duration / (opts.keyMomentsCount + 1);
      
      for (let i = 1; i <= opts.keyMomentsCount; i++) {
        const timestamp = keyMomentsInterval * i;
        const timeString = this.secondsToTimeString(timestamp);
        const keyMomentPath = path.join(thumbnailsDir, `${fileName}_moment_${i}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .inputOptions([`-ss ${timeString}`])
            .outputOptions([
              `-vf scale=${opts.keyMomentsSize}:${opts.keyMomentsSize}:force_original_aspect_ratio=decrease,pad=${opts.keyMomentsSize}:${opts.keyMomentsSize}:(ow-iw)/2:(oh-ih)/2:black`,
              '-vframes 1',
              '-q:v 2'
            ])
            .output(keyMomentPath)
            .on('end', () => {
              console.log(`✅ Generated key moment ${i}: ${path.basename(keyMomentPath)}`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`❌ Key moment ${i} generation error:`, err);
              reject(err);
            })
            .run();
        });
        
        keyMoments.push({
          index: i,
          timestamp: timestamp,
          timeString: timeString,
          path: keyMomentPath,
          relativePath: path.relative('uploads', keyMomentPath),
          url: `/thumbnails/${path.basename(keyMomentPath)}`
        });
      }
      
      return {
        success: true,
        originalVideo: videoPath,
        duration: duration,
        mainThumbnail: {
          path: mainThumbnailPath,
          size: opts.thumbnailSize,
          relativePath: path.relative('uploads', mainThumbnailPath),
          url: `/thumbnails/${path.basename(mainThumbnailPath)}`
        },
        keyMoments: keyMoments,
        keyMomentsCount: opts.keyMomentsCount,
        metadata: {
          duration: duration,
          format: metadata.format,
          videoStream: metadata.streams.find(s => s.codec_type === 'video')
        }
      };
      
    } catch (error) {
      console.error('❌ Video thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Convert seconds to time string format (HH:MM:SS)
   * 
   * @param {number} seconds - Time in seconds
   * @returns {string} Time string in HH:MM:SS format
   * @description Helper function to convert seconds to FFmpeg time format
   */
  secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate Comprehensive Thumbnails
   * 
   * Generates appropriate thumbnails based on file type (image or video)
   * 
   * @param {string} filePath - Path to the media file
   * @param {string} fileType - MIME type of the file
   * @param {Object} options - Thumbnail generation options
   * @returns {Promise<Object>} Comprehensive thumbnail generation results
   * @description Main thumbnail generation function that handles both images and videos
   */
  async generateThumbnails(filePath, fileType, options = {}) {
    try {
      console.log(`🖼️🎬 Generating thumbnails for ${fileType}: ${filePath}`);
      
      if (fileType.startsWith('image/')) {
        return await this.generateImageThumbnail(filePath, options.imageSizes);
      } else if (fileType.startsWith('video/')) {
        return await this.generateVideoThumbnail(filePath, options);
      } else {
        throw new Error(`Unsupported file type for thumbnail generation: ${fileType}`);
      }
      
    } catch (error) {
      console.error('❌ Thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Extract Video Frames for OCR at Regular Intervals
   * 
   * Extracts frames from video at specified intervals for OCR text recognition
   * 
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - OCR extraction options
   * @returns {Promise<Array>} Array of extracted frame paths with timestamps
   * @description Extracts video frames at regular intervals for OCR processing
   */
  async extractVideoFramesForOCR(videoPath, options = {}) {
    try {
      console.log(`🎬📄 Extracting video frames for OCR: ${videoPath}`);
      
      // Get video metadata to calculate frame extraction times
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;
      
      console.log(`📊 Video duration: ${duration.toFixed(2)} seconds`);
      
      // Default options
      const defaultOptions = {
        frameInterval: 2, // Extract frame every 2 seconds
        maxFrames: 30,    // Maximum number of frames to extract
        minInterval: 1,   // Minimum interval between frames
        startTime: 0,     // Start time in seconds
        endTime: duration // End time in seconds
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Calculate actual frame extraction times
      const actualDuration = Math.min(opts.endTime, duration) - opts.startTime;
      const maxPossibleFrames = Math.floor(actualDuration / opts.minInterval);
      const frameCount = Math.min(opts.maxFrames, maxPossibleFrames);
      const actualInterval = actualDuration / frameCount;
      
      console.log(`📸 Extracting ${frameCount} frames at ${actualInterval.toFixed(2)}s intervals`);
      
      const frames = [];
      const fileName = path.basename(videoPath, path.extname(videoPath));
      const framesDir = path.join('uploads', 'ocr_frames');
      
      // Create frames directory if it doesn't exist
      if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
      }
      
      // Extract frames at calculated intervals
      for (let i = 0; i < frameCount; i++) {
        const timestamp = opts.startTime + (actualInterval * i);
        const timeString = this.secondsToTimeString(timestamp);
        const framePath = path.join(framesDir, `${fileName}_ocr_frame_${i + 1}.jpg`);
        
        console.log(`📸 Extracting OCR frame ${i + 1}/${frameCount} at ${timeString}`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .inputOptions([`-ss ${timeString}`])
            .outputOptions([
              '-vframes 1',
              '-q:v 2',
              '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black'
            ])
            .output(framePath)
            .on('end', () => {
              console.log(`✅ Extracted OCR frame ${i + 1}: ${path.basename(framePath)}`);
              resolve();
            })
            .on('error', (err) => {
              console.error(`❌ OCR frame ${i + 1} extraction error:`, err);
              reject(err);
            })
            .run();
        });
        
        frames.push({
          index: i + 1,
          timestamp: timestamp,
          timeString: timeString,
          path: framePath,
          relativePath: path.relative('uploads', framePath)
        });
      }
      
      return frames;
    } catch (error) {
      console.error('❌ Video frame extraction for OCR error:', error);
      throw error;
    }
  }

  /**
   * Extract Text from Video Frames using OCR
   * 
   * Performs OCR on video frames and maps text to timestamps
   * 
   * @param {string} videoPath - Path to the video file
   * @param {Object} options - OCR extraction options
   * @returns {Promise<Object>} OCR results with timestamps
   * @description Extracts text from video frames with timestamp mapping
   */
  async extractVideoOCRCaptions(videoPath, options = {}) {
    try {
      console.log(`🎬📄 Extracting OCR captions from video: ${videoPath}`);
      
      // Default options
      const defaultOptions = {
        frameInterval: 2,           // Extract frame every 2 seconds
        maxFrames: 30,              // Maximum number of frames to extract
        minInterval: 1,             // Minimum interval between frames
        confidenceThreshold: 0.5,   // Minimum confidence for text detection
        mergeNearbyText: true,      // Merge text detections that are close together
        filterShortText: true,      // Filter out very short text (< 3 characters)
        startTime: 0,               // Start time in seconds
        endTime: null               // End time in seconds (null = full video)
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;
      
      if (!opts.endTime) {
        opts.endTime = duration;
      }
      
      // Extract frames for OCR
      const frames = await this.extractVideoFramesForOCR(videoPath, opts);
      
      const ocrResults = {
        videoPath: videoPath,
        duration: duration,
        totalFrames: frames.length,
        frameInterval: opts.frameInterval,
        captions: [],
        allText: '',
        textByTimestamp: {},
        provider: 'Google Vision OCR',
        extractionTime: new Date().toISOString()
      };
      
      // Process each frame for OCR
      for (const frame of frames) {
        try {
          console.log(`📄 Processing OCR for frame ${frame.index}/${frames.length} at ${frame.timeString}`);
          
          // Perform OCR on the frame
          let textResult;
          if (visionClient) {
            // Use Google Cloud Vision client
            const [result] = await visionClient.textDetection(frame.path);
            textResult = result.textAnnotations || [];
          } else if (googleApiKey) {
            // Use REST API
            textResult = await this.detectTextREST(frame.path);
          } else {
            throw new Error('Google Cloud Vision API not configured for OCR');
          }
          
          // Process OCR results
          if (textResult && textResult.length > 0) {
            // First annotation contains the full text
            const fullText = textResult[0].description || '';
            
            // Individual text detections with bounding boxes
            const textDetections = textResult.slice(1).map(detection => ({
              text: detection.description,
              confidence: detection.confidence || 1.0,
              boundingBox: detection.boundingPoly ? detection.boundingPoly.vertices : null
            }));
            
            // Filter text based on confidence and length
            const filteredDetections = textDetections.filter(detection => {
              const meetsConfidence = detection.confidence >= opts.confidenceThreshold;
              const meetsLength = opts.filterShortText ? detection.text.length >= 3 : true;
              return meetsConfidence && meetsLength;
            });
            
            if (fullText.trim()) {
              const captionEntry = {
                frameIndex: frame.index,
                timestamp: frame.timestamp,
                timeString: frame.timeString,
                text: fullText.trim(),
                textDetections: filteredDetections,
                confidence: textDetections.length > 0 ? 
                  textDetections.reduce((sum, det) => sum + det.confidence, 0) / textDetections.length : 1.0,
                framePath: frame.relativePath
              };
              
              ocrResults.captions.push(captionEntry);
              ocrResults.textByTimestamp[frame.timestamp] = fullText.trim();
              ocrResults.allText += fullText.trim() + ' ';
              
              console.log(`✅ Found text at ${frame.timeString}: "${fullText.substring(0, 100)}${fullText.length > 100 ? '...' : ''}"`);
            } else {
              console.log(`📄 No text found in frame ${frame.index} at ${frame.timeString}`);
            }
          }
        } catch (frameError) {
          console.error(`❌ OCR processing error for frame ${frame.index}:`, frameError);
          // Continue processing other frames
        }
        
        // Cleanup frame file
        try {
          fs.unlinkSync(frame.path);
        } catch (cleanupError) {
          console.log(`⚠️ Could not cleanup frame file: ${cleanupError.message}`);
        }
      }
      
      // Cleanup frames directory if empty
      try {
        const framesDir = path.join('uploads', 'ocr_frames');
        const remainingFiles = fs.readdirSync(framesDir);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(framesDir);
        }
      } catch (cleanupError) {
        console.log(`⚠️ Could not cleanup frames directory: ${cleanupError.message}`);
      }
      
      ocrResults.allText = ocrResults.allText.trim();
      
      console.log(`✅ OCR extraction complete: ${ocrResults.captions.length} captions found`);
      
      return ocrResults;
    } catch (error) {
      console.error('❌ Video OCR extraction error:', error);
      throw error;
    }
  }

  /**
   * Detect Text using Google Vision REST API
   * 
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Array>} Text detection results
   * @description Uses Google Vision REST API for text detection
   */
  async detectTextREST(imagePath) {
    try {
      // Read image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 50
              }
            ]
          }
        ]
      };

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
        return result.responses[0].textAnnotations;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Google Vision REST API text detection error:', error);
      throw error;
    }
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Download file from URL and save to temporary location
 * 
 * @param {string} url - The URL to download from
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const fileName = path.basename(urlObj.pathname) || 'downloaded_file';
      const filePath = path.join('uploads', `${Date.now()}_${fileName}`);
      
      const file = fs.createWriteStream(filePath);
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
        
        file.on('error', (err) => {
          fs.unlink(filePath, () => {}); // Delete the file if there's an error
          reject(err);
        });
      });
      
      request.on('error', (err) => {
        reject(err);
      });
      
      request.setTimeout(30000, () => { // 30 second timeout
        request.destroy();
        reject(new Error('Download timeout'));
      });
      
    } catch (error) {
      reject(new Error('Invalid URL'));
    }
  });
}

/**
 * Detect streaming platform from URL
 * 
 * @param {string} url - The URL to check
 * @returns {string|null} Platform name or null if not a streaming platform
 */
function detectStreamingPlatform(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'youtube';
    }
    
    // Instagram
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }
    
    // TikTok
    if (hostname.includes('tiktok.com')) {
      return 'tiktok';
    }
    
    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    
    // Facebook
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      return 'facebook';
    }
    
    // Vimeo
    if (hostname.includes('vimeo.com')) {
      return 'vimeo';
    }
    
    // Twitch
    if (hostname.includes('twitch.tv')) {
      return 'twitch';
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validate if URL points to a supported multimedia file or streaming platform
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} True if URL is valid and supported
 */
function isValidMultimediaUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check if it's a streaming platform
    if (detectStreamingPlatform(url)) {
      return true;
    }
    
    // Supported file extensions
    const supportedExtensions = [
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
      // Audio
      '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac',
      // Video
      '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
    ];
    
    return supportedExtensions.some(ext => pathname.endsWith(ext));
  } catch (error) {
    return false;
  }
}

/**
 * Download YouTube video with multiple fallback methods
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadYouTubeVideo(url) {
  const methods = [
            { name: 'yt-dlp primary', fn: (url) => downloadWithYtDlp(url, 'youtube') }
  ];

  for (const method of methods) {
    try {
      console.log(`🎬 Trying YouTube download method: ${method.name}`);
      const result = await method.fn(url);
      console.log(`✅ YouTube download successful with: ${method.name}`);
      return result;
    } catch (error) {
      console.log(`❌ YouTube download failed with ${method.name}: ${error.message}`);
      
      // Check for specific YouTube API issues
      if (error.message.includes('Failed to extract any player response') ||
          error.message.includes('Could not extract functions') || 
          error.message.includes('No suitable format') ||
          error.message.includes('file not found')) {
        throw new Error('YouTube download failed - YouTube has updated their API and video extraction is currently not working. This affects all YouTube download tools. Please try again later or use a different video URL.');
      }
      
      // For other errors, throw the original error
      throw error;
    }
  }

  throw new Error('YouTube download failed - no methods available.');
}

/**
 * Download using ytdl-core with basic settings (deprecated)
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} Path to downloaded file
 * @description Deprecated method - ytdl-core no longer works with current YouTube API
 */
async function downloadWithYtdlCoreBasic(url) {
  throw new Error('ytdl-core is not working with current YouTube API - removed');
}

/**
 * Download using ytdl-core audio only (deprecated)
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} Path to downloaded file
 * @description Deprecated method - ytdl-core no longer works with current YouTube API
 */
async function downloadWithYtdlCoreAudio(url) {
  throw new Error('ytdl-core is not working with current YouTube API - removed');
}

/**
 * Download using direct info extraction (deprecated)
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} Path to downloaded file
 * @description Deprecated method - direct extraction no longer works with current YouTube API
 */
async function downloadWithDirectInfo(url) {
  throw new Error('Direct info extraction is not working with current YouTube API - removed');
}

/**
 * Alternative YouTube download method using different quality settings
 * 
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadYouTubeAlternative(url) {
  // This function is now deprecated in favor of the new downloadYouTubeVideo function
  // that tries multiple methods automatically
  return downloadYouTubeVideo(url);
}

/**
 * Download content from Instagram
 * 
 * @param {string} url - Instagram URL
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadInstagramContent(url) {
  try {
    console.log('📸 Attempting Instagram download...');
    
    // First try yt-dlp as it handles Instagram well
    try {
      console.log('🔧 Trying yt-dlp for Instagram...');
      return await downloadWithYtDlp(url, 'instagram');
    } catch (error) {
      console.log(`❌ yt-dlp Instagram download failed: ${error.message}`);
    }
    
    // Fallback to manual extraction
    console.log('🔍 Falling back to manual Instagram extraction...');
    
    // Extract media URL from Instagram using multiple methods
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Try multiple patterns to find media URL
    let mediaUrl = null;
    
    // Pattern 1: display_url (for images)
    const displayUrlMatch = html.match(/"display_url":"([^"]+)"/);
    if (displayUrlMatch) {
      mediaUrl = displayUrlMatch[1].replace(/\\u0026/g, '&');
      console.log('📷 Found Instagram image URL');
    }
    
    // Pattern 2: video_url (for videos)
    if (!mediaUrl) {
      const videoUrlMatch = html.match(/"video_url":"([^"]+)"/);
      if (videoUrlMatch) {
        mediaUrl = videoUrlMatch[1].replace(/\\u0026/g, '&');
        console.log('🎥 Found Instagram video URL');
      }
    }
    
    // Pattern 3: og:image meta tag
    if (!mediaUrl) {
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogImageMatch) {
        mediaUrl = ogImageMatch[1];
        console.log('🖼️ Found Instagram og:image URL');
      }
    }
    
    // Pattern 4: og:video meta tag
    if (!mediaUrl) {
      const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
      if (ogVideoMatch) {
        mediaUrl = ogVideoMatch[1];
        console.log('🎬 Found Instagram og:video URL');
      }
    }
    
    // Pattern 5: Look for media URL in script tags
    if (!mediaUrl) {
      const scriptMatch = html.match(/"url":"([^"]*\.(?:mp4|jpg|jpeg|png)[^"]*)"/);
      if (scriptMatch) {
        mediaUrl = scriptMatch[1].replace(/\\u0026/g, '&');
        console.log('🔗 Found Instagram media URL in script');
      }
    }
    
    if (!mediaUrl) {
      throw new Error('Could not extract media URL from Instagram page');
    }
    
    console.log(`📥 Downloading Instagram media from: ${mediaUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(mediaUrl);
    
  } catch (error) {
    throw new Error(`Instagram download failed: ${error.message}`);
  }
}

/**
 * Download content from TikTok
 * 
 * @param {string} url - TikTok URL
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadTikTokContent(url) {
  try {
    console.log('🎵 Attempting TikTok download...');
    
    // First try yt-dlp as it handles TikTok well
    try {
      console.log('🔧 Trying yt-dlp for TikTok...');
      return await downloadWithYtDlp(url, 'tiktok');
    } catch (error) {
      console.log(`❌ yt-dlp TikTok download failed: ${error.message}`);
    }
    
    // Fallback to manual extraction
    console.log('🔍 Falling back to manual TikTok extraction...');
    
    // Extract video URL from TikTok using multiple methods
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Try multiple patterns to find video URL
    let videoUrl = null;
    
    // Pattern 1: downloadAddr
    const downloadAddrMatch = html.match(/"downloadAddr":"([^"]+)"/);
    if (downloadAddrMatch) {
      videoUrl = downloadAddrMatch[1].replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
      console.log('📥 Found TikTok downloadAddr URL');
    }
    
    // Pattern 2: playAddr
    if (!videoUrl) {
      const playAddrMatch = html.match(/"playAddr":"([^"]+)"/);
      if (playAddrMatch) {
        videoUrl = playAddrMatch[1].replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
        console.log('▶️ Found TikTok playAddr URL');
      }
    }
    
    // Pattern 3: video URL in og:video meta tag
    if (!videoUrl) {
      const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
      if (ogVideoMatch) {
        videoUrl = ogVideoMatch[1];
        console.log('🎬 Found TikTok og:video URL');
      }
    }
    
    // Pattern 4: Look for video URL in script tags
    if (!videoUrl) {
      const scriptMatch = html.match(/"url":"([^"]*\.mp4[^"]*)"/);
      if (scriptMatch) {
        videoUrl = scriptMatch[1].replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
        console.log('🔗 Found TikTok video URL in script');
      }
    }
    
    // Pattern 5: Look for video URL in JSON data
    if (!videoUrl) {
      const jsonMatch = html.match(/"video":\s*\{[^}]*"url":\s*"([^"]+)"/);
      if (jsonMatch) {
        videoUrl = jsonMatch[1].replace(/\\u0026/g, '&').replace(/\\u002F/g, '/');
        console.log('📄 Found TikTok video URL in JSON');
      }
    }
    
    if (!videoUrl) {
      // Check if this might be a fake URL
      if (url.includes('1234567890123456789')) {
        throw new Error('Could not extract video URL from TikTok page (test URL detected - try with a real TikTok video URL)');
      } else {
        throw new Error('Could not extract video URL from TikTok page (URL may be private, deleted, or require authentication)');
      }
    }
    
    // Decode any remaining Unicode escape sequences
    videoUrl = videoUrl.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    console.log(`📥 Downloading TikTok video from: ${videoUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(videoUrl);
    
  } catch (error) {
    throw new Error(`TikTok download failed: ${error.message}`);
  }
}

/**
 * Download content from Facebook
 * 
 * @param {string} url - Facebook URL
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadFacebookContent(url) {
  try {
    console.log('📘 Attempting Facebook download...');
    
    // First try yt-dlp as it handles Facebook well
    try {
      console.log('🔧 Trying yt-dlp for Facebook...');
      return await downloadWithYtDlp(url);
    } catch (error) {
      console.log(`❌ yt-dlp Facebook download failed: ${error.message}`);
    }
    
    // Fallback to manual extraction
    console.log('🔍 Falling back to manual Facebook extraction...');
    
    // Extract media URL from Facebook using multiple methods
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Try multiple patterns to find media URL
    let mediaUrl = null;
    
    // Pattern 1: og:video meta tag
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      mediaUrl = ogVideoMatch[1];
      console.log('🎬 Found Facebook og:video URL');
    }
    
    // Pattern 2: og:image meta tag (for photos)
    if (!mediaUrl) {
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      if (ogImageMatch) {
        mediaUrl = ogImageMatch[1];
        console.log('🖼️ Found Facebook og:image URL');
      }
    }
    
    // Pattern 3: Look for video URL in script tags
    if (!mediaUrl) {
      const videoMatch = html.match(/"video_url":"([^"]+)"/);
      if (videoMatch) {
        mediaUrl = videoMatch[1].replace(/\\u0026/g, '&');
        console.log('🎥 Found Facebook video_url in script');
      }
    }
    
    // Pattern 4: Look for HD video URL
    if (!mediaUrl) {
      const hdVideoMatch = html.match(/"hd_src":"([^"]+)"/);
      if (hdVideoMatch) {
        mediaUrl = hdVideoMatch[1].replace(/\\u0026/g, '&');
        console.log('📺 Found Facebook hd_src URL');
      }
    }
    
    // Pattern 5: Look for SD video URL
    if (!mediaUrl) {
      const sdVideoMatch = html.match(/"sd_src":"([^"]+)"/);
      if (sdVideoMatch) {
        mediaUrl = sdVideoMatch[1].replace(/\\u0026/g, '&');
        console.log('📱 Found Facebook sd_src URL');
      }
    }
    
    // Pattern 6: Look for video URL in JSON data
    if (!mediaUrl) {
      const jsonMatch = html.match(/"video":\s*\{[^}]*"url":\s*"([^"]+)"/);
      if (jsonMatch) {
        mediaUrl = jsonMatch[1].replace(/\\u0026/g, '&');
        console.log('📄 Found Facebook video URL in JSON');
      }
    }
    
    if (!mediaUrl) {
      // Check if this might be a fake URL
      if (url.includes('123456789012345')) {
        throw new Error('Could not extract media URL from Facebook page (test URL detected - try with a real Facebook video URL)');
      } else {
        throw new Error('Could not extract media URL from Facebook page (URL may be private, deleted, or require authentication)');
      }
    }
    
    console.log(`📥 Downloading Facebook media from: ${mediaUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(mediaUrl);
    
  } catch (error) {
    throw new Error(`Facebook download failed: ${error.message}`);
  }
}

/**
 * Download content from streaming platform
 * 
 * @param {string} url - Streaming platform URL
 * @returns {Promise<{filePath: string, platform: string, metadata: object}>} Download result
 */
async function downloadFromStreamingPlatform(url) {
  console.log(`🌐 Starting download from streaming platform: ${url}`);
  
  const platform = detectStreamingPlatform(url);
  
  if (!platform) {
    throw new Error('Unsupported streaming platform');
  }
  
  console.log(`📱 Detected platform: ${platform}`);
  
  let filePath;
  let metadata = {};
  
  switch (platform) {
    case 'youtube':
      console.log('📺 Processing YouTube video...');
      try {
        filePath = await downloadYouTubeVideo(url);
        console.log('✅ YouTube download successful');
        metadata = { platform: 'YouTube' };
      } catch (error) {
        if (error.message.includes('Could not extract functions')) {
          throw new Error('YouTube download failed - YouTube has updated their API. This is a known issue that affects all YouTube download tools. Please try again later or use a different video URL.');
        } else {
          throw error;
        }
      }
      break;
      
    case 'instagram':
      console.log('📸 Processing Instagram content...');
      filePath = await downloadInstagramContent(url);
      console.log('✅ Instagram download successful');
      metadata = { platform: 'Instagram' };
      break;
      
    case 'tiktok':
      console.log('🎵 Processing TikTok content...');
      filePath = await downloadTikTokContent(url);
      console.log('✅ TikTok download successful');
      metadata = { platform: 'TikTok' };
      break;
      
    case 'facebook':
      console.log('📘 Processing Facebook content...');
      filePath = await downloadFacebookContent(url);
      console.log('✅ Facebook download successful');
      metadata = { platform: 'Facebook' };
      break;
      
    case 'twitter':
      console.log('🐦 Processing Twitter/X content...');
      filePath = await downloadTwitterContent(url);
      console.log('✅ Twitter/X download successful');
      metadata = { platform: 'Twitter/X' };
      break;
      
    case 'vimeo':
      console.log('🎬 Processing Vimeo content...');
      filePath = await downloadVimeoContent(url);
      console.log('✅ Vimeo download successful');
      metadata = { platform: 'Vimeo' };
      break;
      
    case 'twitch':
      console.log('🎮 Processing Twitch content...');
      filePath = await downloadTwitchContent(url);
      console.log('✅ Twitch download successful');
      metadata = { platform: 'Twitch' };
      break;
      
    default:
      throw new Error(`Platform ${platform} not yet implemented`);
  }
  
  console.log(`✅ Download completed successfully from ${platform}`);
  return { filePath, platform, metadata };
}

/**
 * Download using yt-dlp (most reliable fallback)
 * 
 * @param {string} url - URL to download from
 * @param {string} platform - Platform name for format optimization
 * @returns {Promise<string>} Path to downloaded file
 * @description Uses yt-dlp tool with platform-specific optimizations for reliable downloads
 */
async function downloadWithYtDlp(url, platform) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Date.now();
      const outputPath = path.join('uploads', `ytdlp_${timestamp}.%(ext)s`);
      
      console.log(`🔧 Using yt-dlp for download: ${url}...`);
      
      // Base command with --no-check-certificates for all platforms
      let command = `yt-dlp --no-check-certificates -o "${outputPath}"`;
      
      // Platform-specific format preferences
      if (platform === 'youtube') {
        // For YouTube, prefer format 18 (360p with audio) or best available
        command += ' -f "18/best[height<=720]/best"';
      } else if (platform === 'tiktok') {
        // For TikTok, prefer MP4 format
        command += ' -f "best[ext=mp4]/best"';
      } else {
        // For other platforms, use best available
        command += ' -f "best"';
      }
      
      command += ` "${url}"`;
      
      console.log(`🎬 Executing: ${command}`);
      
      exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ yt-dlp download failed: ${error.message}`);
          reject(error);
          return;
        }
        
        // Find the downloaded file
        const files = fs.readdirSync('uploads').filter(file => 
          file.startsWith(`ytdlp_${timestamp}`) && 
          !file.includes('frame') && 
          !file.includes('.wav')
        );
        
        if (files.length === 0) {
          const error = new Error('No file downloaded by yt-dlp');
          console.log(`❌ ${error.message}`);
          reject(error);
          return;
        }
        
        const downloadedFile = files[0];
        const filePath = path.join('uploads', downloadedFile);
        const stats = fs.statSync(filePath);
        
        console.log(`✅ yt-dlp download successful: ${downloadedFile} (${stats.size} bytes)`);
        resolve(filePath);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function downloadTwitterContent(url) {
  console.log('🐦 Processing Twitter/X content...');
  console.log('🐦 Attempting Twitter/X download...');
  
  try {
    // Try yt-dlp first (it supports Twitter/X)
    console.log('🔧 Trying yt-dlp for Twitter/X...');
    const result = await downloadWithYtDlp(url, 'twitter');
    if (result) {
      console.log('✅ Twitter/X download successful with yt-dlp');
      return result;
    }
  } catch (error) {
    console.log(`❌ yt-dlp Twitter/X download failed: ${error.message}`);
  }
  
  console.log('🔍 Falling back to manual Twitter/X extraction...');
  
  // Manual extraction fallback
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    let videoUrl = null;
    
    // Pattern 1: Look for video URL in meta tags
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      videoUrl = ogVideoMatch[1];
      console.log('🎬 Found Twitter/X og:video URL');
    }
    
    // Pattern 2: Look for video URL in JSON-LD data
    if (!videoUrl) {
      const jsonLdMatch = html.match(/"contentUrl":\s*"([^"]*\.mp4[^"]*)"/);
      if (jsonLdMatch) {
        videoUrl = jsonLdMatch[1];
        console.log('📄 Found Twitter/X video URL in JSON-LD');
      }
    }
    
    // Pattern 3: Look for video URL in script tags
    if (!videoUrl) {
      const scriptMatch = html.match(/"url":\s*"([^"]*\.mp4[^"]*)"/);
      if (scriptMatch) {
        videoUrl = scriptMatch[1];
        console.log('🔗 Found Twitter/X video URL in script');
      }
    }
    
    // Pattern 4: Look for video URL in tweet data
    if (!videoUrl) {
      const tweetMatch = html.match(/"video_info":\s*\{[^}]*"variants":\s*\[[^\]]*"url":\s*"([^"]+)"/);
      if (tweetMatch) {
        videoUrl = tweetMatch[1];
        console.log('📱 Found Twitter/X video URL in tweet data');
      }
    }
    
    if (!videoUrl) {
      // Check if this might be a non-video post
      if (html.includes('"type":"tweet"') || html.includes('"type":"Tweet"')) {
        throw new Error('Could not extract video URL from Twitter/X page (post may not contain a video - try with a Twitter post that includes a video)');
      } else {
        throw new Error('Could not extract video URL from Twitter/X page (URL may be private, deleted, or require authentication)');
      }
    }
    
    console.log(`📥 Downloading Twitter/X video from: ${videoUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(videoUrl);
    
  } catch (error) {
    throw new Error(`Twitter/X download failed: ${error.message}`);
  }
}

async function downloadVimeoContent(url) {
  console.log('🎬 Processing Vimeo content...');
  console.log('🎬 Attempting Vimeo download...');
  
  try {
    // Try yt-dlp first (it supports Vimeo)
    console.log('🔧 Trying yt-dlp for Vimeo...');
    const result = await downloadWithYtDlp(url, 'vimeo');
    if (result) {
      console.log('✅ Vimeo download successful with yt-dlp');
      return result;
    }
  } catch (error) {
    console.log(`❌ yt-dlp Vimeo download failed: ${error.message}`);
  }
  
  console.log('🔍 Falling back to manual Vimeo extraction...');
  
  // Manual extraction fallback
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    let videoUrl = null;
    
    // Pattern 1: Look for video URL in meta tags
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      videoUrl = ogVideoMatch[1];
      console.log('🎬 Found Vimeo og:video URL');
    }
    
    // Pattern 2: Look for video URL in JSON-LD data
    if (!videoUrl) {
      const jsonLdMatch = html.match(/"contentUrl":\s*"([^"]*\.mp4[^"]*)"/);
      if (jsonLdMatch) {
        videoUrl = jsonLdMatch[1];
        console.log('📄 Found Vimeo video URL in JSON-LD');
      }
    }
    
    // Pattern 3: Look for video URL in Vimeo player config
    if (!videoUrl) {
      const configMatch = html.match(/"progressive":\s*\[[^\]]*"url":\s*"([^"]+)"/);
      if (configMatch) {
        videoUrl = configMatch[1];
        console.log('🎥 Found Vimeo video URL in player config');
      }
    }
    
    // Pattern 4: Look for video URL in script tags with Vimeo-specific patterns
    if (!videoUrl) {
      const scriptMatch = html.match(/"url":\s*"([^"]*\.mp4[^"]*)"/);
      if (scriptMatch) {
        videoUrl = scriptMatch[1];
        console.log('🔗 Found Vimeo video URL in script');
      }
    }
    
    // Pattern 5: Look for Vimeo-specific video data
    if (!videoUrl) {
      const vimeoMatch = html.match(/"video":\s*\{[^}]*"url":\s*"([^"]+)"/);
      if (vimeoMatch) {
        videoUrl = vimeoMatch[1];
        console.log('📱 Found Vimeo video URL in video data');
      }
    }
    
    // Pattern 6: Look for progressive download URLs
    if (!videoUrl) {
      const progressiveMatch = html.match(/"progressive":\s*\[[^\]]*"url":\s*"([^"]+)"/);
      if (progressiveMatch) {
        videoUrl = progressiveMatch[1];
        console.log('📥 Found Vimeo progressive download URL');
      }
    }
    
    if (!videoUrl) {
      // Check if this might be a private video
      if (html.includes('private') || html.includes('password')) {
        throw new Error('Could not extract video URL from Vimeo page (video appears to be private or password-protected)');
      } else {
        throw new Error('Could not extract video URL from Vimeo page (video may be private or require authentication)');
      }
    }
    
    console.log(`📥 Downloading Vimeo video from: ${videoUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(videoUrl);
    
  } catch (error) {
    throw new Error(`Vimeo download failed: ${error.message}`);
  }
}

async function downloadTwitchContent(url) {
  console.log('🎮 Processing Twitch content...');
  console.log('🎮 Attempting Twitch download...');
  
  try {
    // Try yt-dlp first (it supports Twitch)
    console.log('🔧 Trying yt-dlp for Twitch...');
    const result = await downloadWithYtDlp(url, 'twitch');
    if (result) {
      console.log('✅ Twitch download successful with yt-dlp');
      return result;
    }
  } catch (error) {
    console.log(`❌ yt-dlp Twitch download failed: ${error.message}`);
  }
  
  console.log('🔍 Falling back to manual Twitch extraction...');
  
  // Manual extraction fallback
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    let videoUrl = null;
    
    // Pattern 1: Look for video URL in meta tags
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      videoUrl = ogVideoMatch[1];
      console.log('🎮 Found Twitch og:video URL');
    }
    
    // Pattern 2: Look for video URL in JSON-LD data
    if (!videoUrl) {
      const jsonLdMatch = html.match(/"contentUrl":\s*"([^"]*\.mp4[^"]*)"/);
      if (jsonLdMatch) {
        videoUrl = jsonLdMatch[1];
        console.log('📄 Found Twitch video URL in JSON-LD');
      }
    }
    
    // Pattern 3: Look for video URL in Twitch player config
    if (!videoUrl) {
      const configMatch = html.match(/"playbackAccessToken":\s*\{[^}]*"value":\s*"([^"]+)"/);
      if (configMatch) {
        videoUrl = configMatch[1];
        console.log('🎥 Found Twitch video URL in player config');
      }
    }
    
    // Pattern 4: Look for video URL in script tags
    if (!videoUrl) {
      const scriptMatch = html.match(/"url":\s*"([^"]*\.mp4[^"]*)"/);
      if (scriptMatch) {
        videoUrl = scriptMatch[1];
        console.log('🔗 Found Twitch video URL in script');
      }
    }
    
    if (!videoUrl) {
      throw new Error('Could not extract video URL from Twitch page (stream may be offline or require authentication)');
    }
    
    console.log(`📥 Downloading Twitch video from: ${videoUrl.substring(0, 100)}...`);
    return await downloadFileFromUrl(videoUrl);
    
  } catch (error) {
    throw new Error(`Twitch download failed: ${error.message}`);
  }
}

// ===== INITIALIZE ANALYZER =====
const analyzer = new MultimediaAnalyzer();

// ===== MIDDLEWARE =====

// Built-in Express middleware
app.use(express.json());    // Parse JSON request bodies for API requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form data bodies
app.use(express.static('public'));

// Serve thumbnails statically
app.use('/thumbnails', express.static(path.join(__dirname, 'uploads', 'thumbnails'))); // Serve static files from public directory

// Serve uploaded video files with proper headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path, stat) => {
    // Set proper MIME types for video files
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    } else if (path.endsWith('.ogg')) {
      res.set('Content-Type', 'video/ogg');
    } else if (path.endsWith('.avi')) {
      res.set('Content-Type', 'video/x-msvideo');
    } else if (path.endsWith('.mov')) {
      res.set('Content-Type', 'video/quicktime');
    }
    
    // Enable range requests for video streaming
    res.set('Accept-Ranges', 'bytes');
    
    // Set CORS headers for video files
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Range');
  }
}));

// Security and Performance middleware (loaded inline)
app.use(require('helmet')()); // Security headers - sets various HTTP headers to secure the app
app.use(require('cors')()); // Cross-Origin Resource Sharing - enables API access from different domains
app.use(require('compression')()); // Response compression - reduces bandwidth usage with gzip/deflate
app.use(require('morgan')('combined')); // HTTP request logging - tracks all API requests for debugging

// ===== API ENDPOINTS =====

/**
 * POST /analyze/upload
 * 
 * Main endpoint for comprehensive multimedia analysis
 * Accepts any media file and returns complete analysis based on file type
 */
app.post('/analyze/upload', upload.single('media'), async (req, res) => {
  try {
    console.log('📤 New upload request received');
    
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    
    console.log(`📁 File: ${req.file.originalname} (${fileType}, ${req.file.size} bytes)`);
    
    // Parse options from request body
    const options = {
      transcriptionProvider: req.body.transcriptionProvider || 'openai',
      enhancedDetection: req.body.enhancedDetection === 'true',
      summaryStyle: req.body.summaryStyle === 'true',
      summaryOptions: req.body.summaryOptions ? JSON.parse(req.body.summaryOptions) : {},
      maxSummaryLength: parseInt(req.body.maxSummaryLength) || 150,
      frameTime: req.body.frameTime || '00:00:01'
    };
    
    // Perform analysis
    const analysis = await analyzer.analyzeMultimedia(filePath, fileType, options);
    
    // Don't cleanup video files immediately - they're needed for the video player
    // Video files will be cleaned up by a separate cleanup process
    if (!fileType.startsWith('video/')) {
      fs.unlinkSync(filePath);
      console.log('🧹 Cleaned up uploaded file');
    } else {
      console.log('📹 Video file kept for video player access');
      // Schedule cleanup after 1 hour
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🧹 Cleaned up video file after delay');
        }
      }, 60 * 60 * 1000); // 1 hour
    }
    
    // Return results
    res.json({
      success: true,
      filename: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      filePath: fileType.startsWith('video/') ? filePath : null, // Include file path for videos
      analysis
    });
    
  } catch (error) {
    console.error('❌ Upload analysis error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

/**
 * POST /analyze/objects
 * 
 * Dedicated endpoint for image object detection
 * Returns objects, labels, and text found in images
 */
app.post('/analyze/objects', upload.single('image'), async (req, res) => {
  try {
    console.log('🔍 Object detection request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const enhanced = req.body.enhanced === 'true';
    let result;
    
    if (enhanced) {
      result = await analyzer.detectObjectsEnhanced(req.file.path);
    } else {
      result = await analyzer.detectObjects(req.file.path);
    }
    
    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true,
      enhanced,
      analysis: result 
    });
    
  } catch (error) {
    console.error('❌ Object detection error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /analyze/transcribe
 * 
 * Dedicated endpoint for audio/video transcription
 * Supports both OpenAI Whisper and Google Speech-to-Text
 */
app.post('/analyze/transcribe', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎤 Transcription request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    const provider = req.body.provider || 'openai';
    let transcription;
    
    if (provider === 'google') {
      transcription = await analyzer.transcribeAudioGoogle(req.file.path);
    } else {
      transcription = await analyzer.transcribeAudioOpenAI(req.file.path);
    }
    
    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true,
      transcription 
    });
    
  } catch (error) {
    console.error('❌ Transcription error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /analyze/summarize
 * 
 * Dedicated endpoint for text summarization
 * Supports different styles and tones
 */
app.post('/analyze/summarize', async (req, res) => {
  try {
    console.log('📝 Summarization request received');
    
    const { text, maxLength, style, tone } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided for summarization' });
    }
    
    let summary;
    
    if (style && style !== 'standard') {
      summary = await analyzer.summarizeTextAdvanced(text, {
        maxLength,
        style,
        tone
      });
    } else {
      summary = await analyzer.summarizeText(text, maxLength);
    }
    
    res.json({ 
      success: true,
      originalLength: text.length,
      summary 
    });
    
  } catch (error) {
    console.error('❌ Summarization error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /analyze/video-frames
 * 
 * Dedicated endpoint for analyzing multiple frames from a video
 * Useful for comprehensive video content analysis
 */
app.post('/analyze/video-frames', upload.single('video'), async (req, res) => {
  try {
    console.log('🎬 Video frame analysis request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const frameCount = parseInt(req.body.frameCount) || 3;
    const frames = await analyzer.analyzeVideoFrames(req.file.path, frameCount);
    
    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true,
      frameCount,
      frames 
    });
    
  } catch (error) {
    console.error('❌ Video frame analysis error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /analyze/ocr-captions
 * 
 * Dedicated endpoint for extracting OCR captions from video
 * Extracts text from video frames with timestamps
 */
app.post('/analyze/ocr-captions', upload.single('video'), async (req, res) => {
  try {
    console.log('🎬📄 OCR caption extraction request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const options = {
      frameInterval: parseInt(req.body.frameInterval) || 2,
      maxFrames: parseInt(req.body.maxFrames) || 30,
      confidenceThreshold: parseFloat(req.body.confidenceThreshold) || 0.5,
      filterShortText: req.body.filterShortText !== 'false'
    };
    
    const ocrResults = await analyzer.extractVideoOCRCaptions(req.file.path, options);
    
    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true,
      filename: req.file.originalname,
      ocrResults
    });
    
  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /generate/thumbnails
 * 
 * Dedicated endpoint for generating thumbnails from uploaded media
 * Supports both images and videos with customizable options
 */
app.post('/generate/thumbnails', upload.single('media'), async (req, res) => {
  try {
    console.log('🖼️📏 Thumbnail generation request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No media file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    
    console.log(`📁 File: ${req.file.originalname} (${fileType}, ${req.file.size} bytes)`);
    
    // Parse thumbnail options from request body
    const thumbnailOptions = {
      imageSizes: req.body.imageSizes ? JSON.parse(req.body.imageSizes) : [150, 300, 500],
      thumbnailSize: parseInt(req.body.thumbnailSize) || 300,
      keyMomentsCount: parseInt(req.body.keyMomentsCount) || 5,
      keyMomentsSize: parseInt(req.body.keyMomentsSize) || 200
    };
    
    // Generate thumbnails
    const thumbnails = await analyzer.generateThumbnails(filePath, fileType, thumbnailOptions);
    
    // Cleanup uploaded file
    fs.unlinkSync(filePath);
    console.log('🧹 Cleaned up uploaded file');
    
    res.json({
      success: true,
      filename: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      thumbnails
    });
    
  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Thumbnail generation failed', 
      message: error.message 
    });
  }
});

/**
 * GET /health
 * 
 * Health check endpoint to verify server status and API connectivity
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      google: (visionClient && speechClient) || googleApiKey
    },
    version: '1.0.0'
  });
});

/**
 * Voice Print Database Management Endpoints
 */

// Get voice print database statistics
app.get('/api/voice-prints/stats', (req, res) => {
  try {
    const stats = voicePrintDB.getSpeakerStats();
    res.json({
      success: true,
      stats: stats,
      database: {
        totalSpeakers: voicePrintDB.voicePrints.metadata.totalSpeakers,
        lastUpdated: voicePrintDB.voicePrints.metadata.lastUpdated,
        version: voicePrintDB.voicePrints.metadata.version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all speakers in database
app.get('/api/voice-prints/speakers', (req, res) => {
  try {
    const speakers = Object.entries(voicePrintDB.voicePrints.speakers).map(([id, data]) => ({
      id: id,
      name: data.profile.name,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      encounterCount: data.encounterCount,
      confidence: data.profile.confidence,
      characteristics: data.fingerprint
    }));
    
    res.json({
      success: true,
      speakers: speakers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search speakers by criteria
app.post('/api/voice-prints/search', (req, res) => {
  try {
    const { pitch, tempo, formality, name } = req.body;
    const criteria = { pitch, tempo, formality, name };
    
    const matches = voicePrintDB.searchSpeakers(criteria);
    
    res.json({
      success: true,
      matches: matches,
      criteria: criteria
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a speaker from database
app.delete('/api/voice-prints/speakers/:speakerId', (req, res) => {
  try {
    const { speakerId } = req.params;
    
    if (voicePrintDB.voicePrints.speakers[speakerId]) {
      delete voicePrintDB.voicePrints.speakers[speakerId];
      voicePrintDB.saveDatabase();
      
      res.json({
        success: true,
        message: `Speaker ${speakerId} deleted from database`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Speaker not found in database'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear entire voice print database
app.delete('/api/voice-prints/clear', (req, res) => {
  try {
    voicePrintDB.voicePrints.speakers = {};
    voicePrintDB.saveDatabase();
    
    res.json({
      success: true,
      message: 'Voice print database cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /test-google-api
 * 
 * Test endpoint to verify Google Cloud API connectivity
 */
app.get('/test-google-api', async (req, res) => {
  try {
    if (!googleApiKey && !visionClient) {
      return res.status(400).json({ 
        error: 'Google Cloud API not configured',
        message: 'Please set GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS'
      });
    }

    // Simple test request to Vision API
    const testResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' // 1x1 transparent PNG
          },
          features: [{
            type: 'LABEL_DETECTION',
            maxResults: 1
          }]
        }]
      })
    });

    if (testResponse.ok) {
      res.json({ 
        success: true, 
        message: 'Google Cloud Vision API is working correctly',
        method: visionClient ? 'Service Account' : 'API Key'
      });
    } else {
      const errorText = await testResponse.text();
      res.status(testResponse.status).json({ 
        success: false, 
        error: `Google Cloud Vision API test failed: ${testResponse.status} ${testResponse.statusText}`,
        details: errorText,
        method: visionClient ? 'Service Account' : 'API Key'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Google Cloud API test failed',
      message: error.message
    });
  }
});

/**
 * POST /analyze
 * 
 * Main endpoint for comprehensive multimedia analysis (frontend compatibility)
 * Accepts any media file and returns complete analysis based on file type
 */
app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 New analysis request received');
    
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let fileType = req.file.mimetype;
    
    // Enhanced file type detection - if mimetype is generic, try to detect from extension
    if (fileType === 'application/octet-stream') {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const extToMime = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
        '.bmp': 'image/bmp', '.webp': 'image/webp',
        '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
        '.ogg': 'audio/ogg', '.flac': 'audio/flac',
        '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.webm': 'video/webm', '.mkv': 'video/x-matroska'
      };
      
      if (extToMime[ext]) {
        fileType = extToMime[ext];
        console.log(`🔍 Detected file type from extension: ${fileType}`);
      }
    }
    
    console.log(`📁 File: ${req.file.originalname} (${fileType}, ${req.file.size} bytes)`);
    
    // Get analysis options from form data
    const analysisOptions = {
      enableObjectDetection: req.body.enableObjectDetection === 'true',
      enableTranscription: req.body.enableTranscription === 'true',
      enableVideoAnalysis: req.body.enableVideoAnalysis === 'true',
      enableSummarization: req.body.enableSummarization === 'true',
      enableSentimentAnalysis: req.body.enableSentimentAnalysis === 'true',
      enableNER: req.body.enableNER === 'true',
      enableSpeakerDiarization: req.body.enableSpeakerDiarization === 'true',
      enableVoicePrintRecognition: req.body.enableVoicePrintRecognition === 'true',
      enableProfanityDetection: req.body.enableProfanityDetection === 'true',
      enableKeywordDetection: req.body.enableKeywordDetection === 'true',
      enableThumbnailGeneration: req.body.enableThumbnailGeneration !== 'false', // Default to true
      enableOCRExtraction: req.body.enableOCRExtraction === 'true',
      transcriptionProvider: req.body.transcriptionProvider || 'google',
      objectDetectionMode: req.body.objectDetectionMode || 'enhanced',
      analysisPriority: req.body.analysisPriority || 'balanced',
      profanitySensitivity: req.body.profanitySensitivity || 'moderate',
      keywordCategories: req.body.keywordCategories || 'all',
      enableBatchProcessing: req.body.enableBatchProcessing === 'true',
      saveToDatabase: req.body.saveToDatabase === 'true',
      thumbnailOptions: {
        imageSizes: req.body.imageSizes ? JSON.parse(req.body.imageSizes) : [150, 300, 500],
        thumbnailSize: parseInt(req.body.thumbnailSize) || 300,
        keyMomentsCount: parseInt(req.body.keyMomentsCount) || 5,
        keyMomentsSize: parseInt(req.body.keyMomentsSize) || 200
      },
      ocrOptions: {
        frameInterval: parseInt(req.body.ocrFrameInterval) || 2,
        maxFrames: parseInt(req.body.ocrMaxFrames) || 30,
        confidenceThreshold: parseFloat(req.body.ocrConfidenceThreshold) || 0.5,
        filterShortText: req.body.ocrFilterShortText !== 'false'
      }
    };

    console.log(`🔧 Analysis options:`, analysisOptions);

    // Perform analysis with selected options
    const analysis = await analyzer.analyzeMultimedia(filePath, fileType, analysisOptions);
    
    // Don't cleanup video files immediately - they're needed for the video player
    // Video files will be cleaned up by a separate cleanup process
    if (!fileType.startsWith('video/')) {
      fs.unlinkSync(filePath);
      console.log('🧹 Cleaned up uploaded file');
    } else {
      console.log('📹 Video file kept for video player access');
      // Schedule cleanup after 1 hour
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🧹 Cleaned up video file after delay');
        }
      }, 60 * 60 * 1000); // 1 hour
    }
    
    // Return results in frontend-compatible format
    res.json({
      success: true,
      filename: req.file.originalname,
      fileType,
      fileSize: req.file.size,
      filePath: fileType.startsWith('video/') ? filePath : null, // Include file path for videos
      ...analysis
    });
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    // Cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
});

// URL Cache for storing previous analysis results
const urlCache = new Map();
const URL_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate cache key for URL analysis
 * @param {string} url - The URL to generate cache key for
 * @param {Object} options - Analysis options
 * @returns {string} Cache key
 */
function generateUrlCacheKey(url, options) {
  // Create a simplified options hash for cache key
  const optionsHash = JSON.stringify({
    enableObjectDetection: options.enableObjectDetection,
    enableTranscription: options.enableTranscription,
    enableVideoAnalysis: options.enableVideoAnalysis,
    enableSummarization: options.enableSummarization,
    enableSentimentAnalysis: options.enableSentimentAnalysis,
    enableNER: options.enableNER,
    enableSpeakerDiarization: options.enableSpeakerDiarization,
    enableVoicePrintRecognition: options.enableVoicePrintRecognition,
    enableProfanityDetection: options.enableProfanityDetection,
    enableKeywordDetection: options.enableKeywordDetection,
    enableThumbnailGeneration: options.enableThumbnailGeneration,
    enableOCRExtraction: options.enableOCRExtraction,
    transcriptionProvider: options.transcriptionProvider,
    objectDetectionMode: options.objectDetectionMode
  });
  
  return `${url}:${Buffer.from(optionsHash).toString('base64')}`;
}

/**
 * Check if cached result is still valid
 * @param {Object} cacheEntry - Cache entry to check
 * @returns {boolean} True if cache is still valid
 */
function isCacheValid(cacheEntry) {
  return Date.now() - cacheEntry.timestamp < URL_CACHE_DURATION;
}

/**
 * POST /analyze/url
 * 
 * Analyze multimedia content from URL or streaming platform
 * Downloads the file and performs analysis with caching support
 */
app.post('/analyze/url', async (req, res) => {
  try {
    console.log('🌐 URL analysis request received');
    
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }
    
    console.log(`🔍 Validating URL: ${url}`);
    
    // Validate URL
    if (!isValidMultimediaUrl(url)) {
      console.log('❌ URL validation failed');
      return res.status(400).json({ 
        error: 'Invalid URL or unsupported content type',
        message: 'Please provide a valid URL to a supported multimedia file or streaming platform'
      });
    }
    
    console.log('✅ URL validation passed');
    
    // Get analysis options from request body
    const analysisOptions = req.body.options || {
      enableObjectDetection: true,
      enableTranscription: true,
      enableVideoAnalysis: true,
      enableSummarization: true,
      enableSentimentAnalysis: true,
      enableNER: true,
      enableSpeakerDiarization: true,
      enableVoicePrintRecognition: true,
      enableProfanityDetection: true,
      enableKeywordDetection: true,
      enableThumbnailGeneration: true,
      enableOCRExtraction: true,
      transcriptionProvider: 'google',
      objectDetectionMode: 'enhanced',
      analysisPriority: 'balanced',
      profanitySensitivity: 'moderate',
      keywordCategories: 'all',
      enableBatchProcessing: false,
      saveToDatabase: true,
      thumbnailOptions: {
        imageSizes: [150, 300, 500],
        thumbnailSize: 300,
        keyMomentsCount: 5,
        keyMomentsSize: 200
      },
      ocrOptions: {
        frameInterval: 2,
        maxFrames: 30,
        confidenceThreshold: 0.5,
        filterShortText: true
      }
    };

    // Check cache first
    const cacheKey = generateUrlCacheKey(url, analysisOptions);
    const cachedResult = urlCache.get(cacheKey);
    
    if (cachedResult && isCacheValid(cachedResult)) {
      console.log('📦 Returning cached result for URL:', url);
      return res.json({
        ...cachedResult.result,
        cached: true,
        cacheTimestamp: cachedResult.timestamp
      });
    }
    
    if (cachedResult && !isCacheValid(cachedResult)) {
      console.log('🗑️ Removing expired cache entry for URL:', url);
      urlCache.delete(cacheKey);
    }
    
    // Check if it's a streaming platform
    const platform = detectStreamingPlatform(url);
    let filePath, fileType, stats, metadata = {};
    
    if (platform) {
      console.log(`📺 Detected streaming platform: ${platform}`);
      console.log(`🎬 Starting download from ${platform}: ${url}`);
      
      // Download from streaming platform
      const result = await downloadFromStreamingPlatform(url);
      filePath = result.filePath;
      fileType = 'video/mp4'; // Most streaming content is video
      metadata = result.metadata;
      
      console.log(`✅ Successfully downloaded from ${platform}`);
      
    } else {
      console.log(`📥 Detected direct file URL: ${url}`);
      console.log(`⬇️ Starting file download...`);
      
      // Download regular file
      filePath = await downloadFileFromUrl(url);
      
      // Determine file type from URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      fileType = 'application/octet-stream';
      
      console.log(`🔍 Determining file type from URL: ${pathname}`);
      
      // Map file extensions to MIME types
      if (pathname.match(/\.(jpg|jpeg)$/)) fileType = 'image/jpeg';
      else if (pathname.match(/\.png$/)) fileType = 'image/png';
      else if (pathname.match(/\.gif$/)) fileType = 'image/gif';
      else if (pathname.match(/\.bmp$/)) fileType = 'image/bmp';
      else if (pathname.match(/\.webp$/)) fileType = 'image/webp';
      else if (pathname.match(/\.mp3$/)) fileType = 'audio/mpeg';
      else if (pathname.match(/\.wav$/)) fileType = 'audio/wav';
      else if (pathname.match(/\.m4a$/)) fileType = 'audio/mp4';
      else if (pathname.match(/\.aac$/)) fileType = 'audio/aac';
      else if (pathname.match(/\.ogg$/)) fileType = 'audio/ogg';
      else if (pathname.match(/\.flac$/)) fileType = 'audio/flac';
      else if (pathname.match(/\.mp4$/)) fileType = 'video/mp4';
      else if (pathname.match(/\.avi$/)) fileType = 'video/x-msvideo';
      else if (pathname.match(/\.mov$/)) fileType = 'video/quicktime';
      else if (pathname.match(/\.wmv$/)) fileType = 'video/x-ms-wmv';
      else if (pathname.match(/\.flv$/)) fileType = 'video/x-flv';
      else if (pathname.match(/\.webm$/)) fileType = 'video/webm';
      else if (pathname.match(/\.mkv$/)) fileType = 'video/x-matroska';
      
      console.log(`📁 Determined file type: ${fileType}`);
      console.log(`✅ File download completed`);
    }
    
    // Get file stats
    stats = fs.statSync(filePath);
    
    console.log(`📊 File details: ${path.basename(filePath)} (${fileType}, ${stats.size} bytes)`);
    console.log(`🔬 Starting multimedia analysis...`);
    
    console.log(`🔧 Analysis options:`, analysisOptions);

    // Perform analysis with selected options
    const analysis = await analyzer.analyzeMultimedia(filePath, fileType, analysisOptions);
    
    console.log(`✅ Analysis completed successfully`);
    
    // Prepare result object
    const result = {
      success: true,
      sourceUrl: url,
      platform: platform || null,
      filename: platform ? `${platform}_content` : path.basename(new URL(url).pathname),
      fileType,
      fileSize: stats.size,
      metadata,
      ...analysis
    };
    
    // Cache the result for future requests
    urlCache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });
    console.log('💾 Cached analysis result for future requests');
    
    // Don't cleanup video files immediately - they're needed for the video player
    // Video files will be cleaned up by a separate cleanup process
    if (!fileType.startsWith('video/')) {
      fs.unlinkSync(filePath);
      console.log('🧹 Cleaned up downloaded file');
    } else {
      console.log('📹 Video file kept for video player access');
      // Schedule cleanup after 1 hour
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🧹 Cleaned up video file after delay');
        }
      }, 60 * 60 * 1000); // 1 hour
      
      // Add file path to result for video player access
      result.filePath = filePath;
    }
    
    // Return results
    res.json(result);
    
  } catch (error) {
    console.error('❌ URL analysis error:', error);
    
    res.status(500).json({ 
      error: 'URL analysis failed', 
      message: error.message 
    });
  }
});

/**
 * GET /
 * 
 * Root endpoint - serve the frontend
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /dashboard
 * 
 * Dashboard endpoint - serve dashboard interface
 */
app.get('/dashboard', (req, res) => {
  res.json({
    message: 'Dashboard endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      google: (visionClient && speechClient) || googleApiKey
    }
  });
});

/**
 * GET /content
 * 
 * Content endpoint - retrieve analyzed content
 */
app.get('/content', (req, res) => {
  const { tag, from, to } = req.query;
  
  res.json({
    message: 'Content retrieval endpoint',
    filters: {
      tag: tag || 'all',
      from: from || null,
      to: to || null
    },
    content: [],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /admin/users
 * 
 * Admin users endpoint - user management
 */
app.get('/admin/users', (req, res) => {
  res.json({
    message: 'User management endpoint',
    users: [],
    timestamp: new Date().toISOString()
  });
});

// ===== ERROR HANDLING =====

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /dashboard',
      'GET /content',
      'GET /admin/users',
      'POST /analyze',
      'POST /analyze/url',
      'POST /analyze/upload',
      'POST /analyze/objects', 
      'POST /analyze/transcribe',
      'POST /analyze/summarize',
      'POST /analyze/video-frames'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ===== SERVER STARTUP =====

/**
 * Try to start server on specified port with fallback to next available port
 * 
 * @param {number} port - Port to try first
 * @param {number} maxPort - Maximum port to try (default: 3010)
 * @description Attempts to start server on specified port, falls back to next port if occupied
 */
const tryListen = (port, maxPort = 3010) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Multimedia Analysis Server running on port ${port}`);
    console.log(`📍 Server URL: http://localhost:${port}`);
    console.log('🔧 Available services:', {
      openai: !!process.env.OPENAI_API_KEY,
      google: (visionClient && speechClient) || googleApiKey
    });
    console.log('📚 API Documentation available at: http://localhost:' + port);
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
      console.log('📁 Created uploads directory');
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < maxPort) {
      console.warn(`⚠️ Port ${port} in use, trying port ${port + 1}...`);
      tryListen(port + 1, maxPort);
    } else {
      console.error('❌ Server failed to start:', err);
      process.exit(1);
    }
  });
};

const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000;
tryListen(PORT);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

// Export the app for testing
module.exports = app;