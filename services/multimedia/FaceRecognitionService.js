/**
 * Face Recognition Service
 * 
 * Comprehensive face recognition and identification service using AI-powered
 * name suggestions, face encoding, and learning capabilities. Integrates with
 * OpenAI Vision API for celebrity/public figure recognition and Google Vision
 * for face detection and analysis.
 * 
 * Features:
 * - Face detection and encoding generation
 * - AI-powered name suggestion for recognized faces
 * - Face grouping and similarity matching
 * - User confirmation and learning system
 * - Privacy controls and face anonymization
 * - Face database management and optimization
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const { OpenAI } = require('openai');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { Face, User, Content, File, ImageAnalysis, VideoAnalysis } = require('../../models');

class FaceRecognitionService {
  constructor(options = {}) {
    this.openai = options.openai || null;
    this.visionClient = options.visionClient || null;
    this.enableLogging = options.enableLogging !== false;
    
    // Face recognition configuration
    this.config = {
      // Recognition thresholds
      nameConfidenceThreshold: 0.7,     // Minimum confidence for AI name suggestions
      recognitionScoreThreshold: 0.8,   // Minimum score for face matching
      faceQualityThreshold: 0.6,        // Minimum face quality for processing
      
      // Face processing options
      maxFacesPerImage: 20,              // Maximum faces to process per image
      faceEncodingDimensions: 128,       // Face encoding vector size
      groupingDistanceThreshold: 0.6,    // Distance threshold for face grouping
      
      // AI analysis options
      aiAnalysisEnabled: true,           // Enable AI name suggestions
      celebrityRecognitionEnabled: true, // Enable celebrity/public figure recognition
      contextAnalysisEnabled: true,     // Use image context for better identification
      
      // Privacy and learning
      privacyMode: false,                // Anonymize faces by default
      learningEnabled: true,             // Enable learning from user corrections
      autoGroupingEnabled: true,         // Automatically group similar faces
      
      // Performance options
      batchProcessingSize: 5,            // Number of faces to process in batch
      cacheExpiryHours: 24,             // Cache expiry for AI suggestions
      maxRetries: 3                      // Maximum retries for failed operations
    };

    // Initialize OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Google Vision if available
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_API_KEY) {
      try {
        this.visionClient = new vision.ImageAnnotatorClient();
      } catch (error) {
        if (this.enableLogging) {
          console.warn('⚠️ Google Vision not available:', error.message);
        }
      }
    }

    if (this.enableLogging) {
      console.log('🎭 Face Recognition Service initialized', {
        openai: !!this.openai,
        googleVision: !!this.visionClient,
        aiAnalysis: this.config.aiAnalysisEnabled,
        celebrityRecognition: this.config.celebrityRecognitionEnabled
      });
    }
  }

  /**
   * Process faces in image/video for recognition and name identification
   * 
   * @param {string} userId - User ID
   * @param {string} mediaPath - Path to image/video file
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of face recognition results
   */
  async processFaces(userId, mediaPath, options = {}) {
    try {
      if (this.enableLogging) {
        console.log('🎭 Processing faces for recognition', {
          userId: userId.substring(0, 8),
          mediaPath: path.basename(mediaPath)
        });
      }

      // Step 1: Detect faces using Google Vision
      const detectedFaces = await this.detectFaces(mediaPath, options);
      
      if (!detectedFaces || detectedFaces.length === 0) {
        if (this.enableLogging) {
          console.log('👥 No faces detected in media');
        }
        return [];
      }

      if (this.enableLogging) {
        console.log(`👥 Detected ${detectedFaces.length} faces`);
      }

      // Step 2: Process each face for AI name identification
      const processedFaces = [];
      
      for (let i = 0; i < detectedFaces.length && i < this.config.maxFacesPerImage; i++) {
        const face = detectedFaces[i];
        
        try {
          // Generate AI name suggestion
          const nameResult = await this.generateAINameSuggestion(mediaPath, face, options);
          
          // Check for existing similar faces
          const similarFaces = await this.findSimilarFaces(userId, nameResult.faceEncoding);
          
          // Create face record
          const faceRecord = {
            id: uuidv4(),
            user_id: userId,
            content_id: options.contentId || null,
            file_id: options.fileId || null,
            image_analysis_id: options.imageAnalysisId || null,
            video_analysis_id: options.videoAnalysisId || null,
            
            // AI name suggestion results
            ai_suggested_name: nameResult.suggestedName,
            name_confidence: nameResult.confidence,
            name_source: nameResult.source,
            user_confirmed: false,
            
            // Face technical data
            face_encoding: nameResult.faceEncoding,
            detection_metadata: {
              confidence: face.confidence,
              boundingBox: face.boundingBox,
              landmarks: face.landmarks,
              emotions: face.emotions,
              age: face.age,
              gender: face.gender,
              quality: nameResult.quality
            },
            
            // Face grouping
            face_group_id: this.determineFaceGroup(similarFaces, nameResult),
            recognition_score: nameResult.recognitionScore,
            is_primary_face: this.isPrimaryFace(similarFaces, nameResult),
            
            // Privacy settings
            privacy_settings: {
              anonymize: this.config.privacyMode,
              blur_level: 0,
              hide_name: false,
              sharing_allowed: !this.config.privacyMode
            },
            
            // Learning data
            learning_data: {
              ai_analysis_context: nameResult.context,
              confidence_factors: nameResult.factors,
              recognition_attempts: [],
              user_corrections: []
            },
            
            processing_status: 'completed'
          };

          processedFaces.push(faceRecord);
          
          if (this.enableLogging) {
            console.log(`✨ Face ${i + 1} processed:`, {
              suggestedName: nameResult.suggestedName,
              confidence: Math.round(nameResult.confidence * 100) + '%',
              source: nameResult.source
            });
          }
          
        } catch (faceError) {
          console.error(`❌ Failed to process face ${i + 1}:`, faceError);
          
          // Create basic face record without AI analysis
          const basicFaceRecord = {
            id: uuidv4(),
            user_id: userId,
            content_id: options.contentId || null,
            file_id: options.fileId || null,
            detection_metadata: {
              confidence: face.confidence,
              boundingBox: face.boundingBox,
              landmarks: face.landmarks,
              emotions: face.emotions,
              age: face.age,
              gender: face.gender
            },
            processing_status: 'failed',
            error_message: faceError.message
          };
          
          processedFaces.push(basicFaceRecord);
        }
      }

      // Step 3: Save face records to database
      if (processedFaces.length > 0) {
        await Face.bulkCreate(processedFaces);
        
        if (this.enableLogging) {
          console.log(`✅ Saved ${processedFaces.length} face records to database`);
        }
      }

      return processedFaces;

    } catch (error) {
      console.error('❌ Face processing failed:', error);
      throw error;
    }
  }

  /**
   * Detect faces in image using Google Vision API
   * 
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of detected faces
   */
  async detectFaces(imagePath, options = {}) {
    try {
      if (!this.visionClient) {
        if (this.enableLogging) {
          console.log('⚠️ Google Vision not available, skipping face detection');
        }
        return [];
      }

      const [result] = await this.visionClient.faceDetection(imagePath);
      const faces = result.faceAnnotations || [];

      if (this.enableLogging) {
        console.log(`🔍 Google Vision detected ${faces.length} faces`);
      }

      return faces.map((face, index) => ({
        id: index,
        confidence: face.detectionConfidence || 0,
        boundingBox: face.boundingPoly?.vertices || [],
        landmarks: face.landmarks || [],
        emotions: {
          joy: face.joyLikelihood || 'UNKNOWN',
          sorrow: face.sorrowLikelihood || 'UNKNOWN',
          anger: face.angerLikelihood || 'UNKNOWN',
          surprise: face.surpriseLikelihood || 'UNKNOWN'
        },
        age: {
          detected: false  // Google Vision doesn't provide age directly
        },
        gender: {
          detected: false  // Google Vision doesn't provide gender directly
        },
        quality: {
          blurred: face.blurredLikelihood || 'UNKNOWN',
          underExposed: face.underExposedLikelihood || 'UNKNOWN'
        }
      }));

    } catch (error) {
      console.error('❌ Face detection failed:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered name suggestion for detected face
   * 
   * @param {string} imagePath - Path to image file
   * @param {Object} face - Face detection data
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Name suggestion result
   */
  async generateAINameSuggestion(imagePath, face, options = {}) {
    try {
      if (!this.openai || !this.config.aiAnalysisEnabled) {
        return {
          suggestedName: null,
          confidence: 0.0,
          source: 'none',
          faceEncoding: null,
          quality: face.quality,
          recognitionScore: 0.0,
          context: null,
          factors: []
        };
      }

      if (this.enableLogging) {
        console.log('🤖 Generating AI name suggestion for face');
      }

      // Read image and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);

      // Create AI analysis prompt
      const analysisPrompt = this.buildNameAnalysisPrompt(face, options);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Vision-enabled model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: analysisPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.2  // Lower temperature for more consistent results
      });

      const aiResponse = response.choices[0].message.content;
      
      // Parse AI response
      const nameResult = this.parseAINameResponse(aiResponse);
      
      // Generate face encoding (simplified - in production use a proper face recognition library)
      const faceEncoding = this.generateFaceEncoding(face);
      
      if (this.enableLogging) {
        console.log('🤖 AI name suggestion result:', {
          suggestedName: nameResult.suggestedName,
          confidence: Math.round(nameResult.confidence * 100) + '%',
          source: nameResult.source
        });
      }

      return {
        suggestedName: nameResult.suggestedName,
        confidence: nameResult.confidence,
        source: nameResult.source,
        faceEncoding: faceEncoding,
        quality: face.quality,
        recognitionScore: nameResult.confidence,
        context: nameResult.context,
        factors: nameResult.factors
      };

    } catch (error) {
      console.error('❌ AI name suggestion failed:', error);
      return {
        suggestedName: null,
        confidence: 0.0,
        source: 'error',
        faceEncoding: this.generateFaceEncoding(face),
        quality: face.quality,
        recognitionScore: 0.0,
        context: null,
        factors: [`Error: ${error.message}`]
      };
    }
  }

  /**
   * Build AI analysis prompt for name identification
   * 
   * @param {Object} face - Face detection data
   * @param {Object} options - Analysis options
   * @returns {string} Analysis prompt
   */
  buildNameAnalysisPrompt(face, options = {}) {
    let prompt = `Analyze this image and identify any recognizable people. Focus on faces that appear to be:

1. **Celebrities, public figures, or well-known personalities**
2. **Politicians, actors, musicians, athletes, or other famous individuals**
3. **Historical figures or notable people**

For each person you can identify with confidence, provide:
- name: Full name of the person
- confidence: Your confidence level (0.0-1.0) in the identification
- context: Why you recognize them (profession, known for, etc.)
- reasoning: Key facial features or context that led to identification

**Important Guidelines:**
- Only suggest names for people you can identify with HIGH confidence (>0.7)
- Focus on globally recognized celebrities and public figures
- Do NOT guess or suggest names for ordinary people
- Consider the image context (event, setting, time period) for better accuracy
- If uncertain, it's better to not suggest a name

Return your response as JSON in this exact format:
{
  "faces": [
    {
      "name": "Full Name",
      "confidence": 0.95,
      "context": "Academy Award-winning actor known for...",
      "reasoning": "Distinctive facial features including...",
      "profession": "Actor/Musician/etc"
    }
  ],
  "context": "Brief description of image context",
  "analysis_notes": "Any additional observations"
}

If no recognizable celebrities/public figures are found, return:
{
  "faces": [],
  "context": "Image contains people but no recognizable public figures",
  "analysis_notes": "No celebrity identification possible"
}`;

    // Add context from content metadata if available
    if (options.contentContext) {
      prompt += `\n\nAdditional context: ${options.contentContext}`;
    }

    return prompt;
  }

  /**
   * Parse AI response for name suggestion
   * 
   * @param {string} aiResponse - AI response text
   * @returns {Object} Parsed name result
   */
  parseAINameResponse(aiResponse) {
    try {
      // Try to parse JSON response
      const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      
      if (parsed.faces && parsed.faces.length > 0) {
        const face = parsed.faces[0]; // Take first identified face
        
        return {
          suggestedName: face.name || null,
          confidence: Math.min(face.confidence || 0.0, 1.0),
          source: 'ai_celebrity_recognition',
          context: parsed.context || null,
          factors: [
            face.reasoning || 'AI analysis',
            face.profession || 'Unknown profession',
            `Context: ${parsed.context || 'None'}`
          ]
        };
      }
      
      return {
        suggestedName: null,
        confidence: 0.0,
        source: 'ai_no_recognition',
        context: parsed.context || 'No recognizable public figures found',
        factors: [parsed.analysis_notes || 'No celebrity identification possible']
      };
      
    } catch (parseError) {
      // Fallback parsing for non-JSON responses
      if (this.enableLogging) {
        console.warn('⚠️ Failed to parse AI response as JSON, trying fallback parsing');
      }
      
      // Look for name patterns in text response
      const namePatterns = [
        /name[:\s]+"?([A-Z][a-z]+ [A-Z][a-z]+)"?/i,
        /identified[:\s]+"?([A-Z][a-z]+ [A-Z][a-z]+)"?/i,
        /appears to be[:\s]+"?([A-Z][a-z]+ [A-Z][a-z]+)"?/i
      ];
      
      for (const pattern of namePatterns) {
        const match = aiResponse.match(pattern);
        if (match && match[1]) {
          return {
            suggestedName: match[1],
            confidence: 0.6, // Lower confidence for fallback parsing
            source: 'ai_text_parsing',
            context: 'Extracted from text response',
            factors: ['Fallback text parsing', 'Lower confidence due to parsing method']
          };
        }
      }
      
      return {
        suggestedName: null,
        confidence: 0.0,
        source: 'parsing_failed',
        context: 'Failed to parse AI response',
        factors: [`Parse error: ${parseError.message}`]
      };
    }
  }

  /**
   * Generate face encoding for recognition (simplified implementation)
   * In production, use a proper face recognition library like face-api.js or dlib
   * 
   * @param {Object} face - Face detection data
   * @returns {Array} Face encoding vector
   */
  generateFaceEncoding(face) {
    // This is a simplified implementation
    // In production, use proper face recognition libraries
    const encoding = new Array(this.config.faceEncodingDimensions).fill(0);
    
    // Use bounding box and landmarks to create a basic encoding
    if (face.boundingBox && face.boundingBox.length > 0) {
      const box = face.boundingBox[0];
      encoding[0] = (box.x || 0) / 1000;
      encoding[1] = (box.y || 0) / 1000;
    }
    
    if (face.landmarks && face.landmarks.length > 0) {
      face.landmarks.slice(0, 126).forEach((landmark, i) => {
        if (i + 2 < encoding.length) {
          encoding[i + 2] = ((landmark.position?.x || 0) + (landmark.position?.y || 0)) / 2000;
        }
      });
    }
    
    return encoding;
  }

  /**
   * Find similar faces for the current user
   * 
   * @param {string} userId - User ID
   * @param {Array} faceEncoding - Face encoding to compare
   * @returns {Promise<Array>} Array of similar faces
   */
  async findSimilarFaces(userId, faceEncoding) {
    try {
      if (!faceEncoding) {
        return [];
      }

      // Get all faces for this user
      const userFaces = await Face.findAll({
        where: { 
          user_id: userId,
          processing_status: 'completed',
          face_encoding: { [require('sequelize').Op.ne]: null }
        },
        limit: 100 // Limit for performance
      });

      const similarFaces = [];
      
      for (const existingFace of userFaces) {
        if (existingFace.face_encoding) {
          const similarity = this.calculateFaceSimilarity(faceEncoding, existingFace.face_encoding);
          
          if (similarity > this.config.groupingDistanceThreshold) {
            similarFaces.push({
              ...existingFace.toJSON(),
              similarity
            });
          }
        }
      }

      return similarFaces.sort((a, b) => b.similarity - a.similarity);

    } catch (error) {
      console.error('❌ Error finding similar faces:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two face encodings
   * 
   * @param {Array} encoding1 - First face encoding
   * @param {Array} encoding2 - Second face encoding
   * @returns {number} Similarity score (0.0-1.0)
   */
  calculateFaceSimilarity(encoding1, encoding2) {
    if (!encoding1 || !encoding2 || encoding1.length !== encoding2.length) {
      return 0.0;
    }

    // Calculate Euclidean distance
    let distance = 0;
    for (let i = 0; i < encoding1.length; i++) {
      const diff = encoding1[i] - encoding2[i];
      distance += diff * diff;
    }
    
    distance = Math.sqrt(distance);
    
    // Convert distance to similarity (0.0-1.0)
    const maxDistance = Math.sqrt(encoding1.length); // Maximum possible distance
    const similarity = Math.max(0, 1 - (distance / maxDistance));
    
    return similarity;
  }

  /**
   * Determine face group ID for grouping similar faces
   * 
   * @param {Array} similarFaces - Array of similar faces
   * @param {Object} nameResult - Name analysis result
   * @returns {string|null} Face group ID
   */
  determineFaceGroup(similarFaces, nameResult) {
    if (!this.config.autoGroupingEnabled) {
      return null;
    }

    // If we have similar faces, use existing group
    if (similarFaces.length > 0) {
      const groupedFace = similarFaces.find(f => f.face_group_id);
      if (groupedFace) {
        return groupedFace.face_group_id;
      }
    }

    // Create new group if we have a confident name suggestion
    if (nameResult.suggestedName && nameResult.confidence > this.config.nameConfidenceThreshold) {
      return uuidv4();
    }

    return null;
  }

  /**
   * Determine if this is the primary face for a person
   * 
   * @param {Array} similarFaces - Array of similar faces
   * @param {Object} nameResult - Name analysis result
   * @returns {boolean} Whether this is the primary face
   */
  isPrimaryFace(similarFaces, nameResult) {
    // If no similar faces, this could be primary
    if (similarFaces.length === 0) {
      return nameResult.confidence > this.config.nameConfidenceThreshold;
    }

    // Check if this face has better quality/confidence than existing ones
    const bestExisting = similarFaces.reduce((best, face) => {
      const existingConfidence = face.name_confidence || 0;
      const bestConfidence = best.name_confidence || 0;
      return existingConfidence > bestConfidence ? face : best;
    }, { name_confidence: 0 });

    return nameResult.confidence > (bestExisting.name_confidence || 0);
  }

  /**
   * Get MIME type from file path
   * 
   * @param {string} filePath - File path
   * @returns {string} MIME type
   */
  getMimeTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Update face name and confirmation status
   * 
   * @param {string} faceId - Face ID
   * @param {string} faceName - Confirmed face name
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated face record
   */
  async updateFaceName(faceId, faceName, userId) {
    try {
      const face = await Face.findOne({
        where: { id: faceId, user_id: userId }
      });

      if (!face) {
        throw new Error('Face not found');
      }

      // Update face with user confirmation
      await face.update({
        face_name: faceName,
        user_confirmed: true,
        name_source: 'user_input',
        name_confidence: 1.0, // Full confidence for user input
        learning_data: {
          ...face.learning_data,
          user_corrections: [
            ...(face.learning_data?.user_corrections || []),
            {
              timestamp: new Date(),
              original_suggestion: face.ai_suggested_name,
              user_correction: faceName,
              confidence_improvement: 1.0 - (face.name_confidence || 0)
            }
          ]
        }
      });

      if (this.enableLogging) {
        console.log('✅ Face name updated:', {
          faceId: faceId.substring(0, 8),
          faceName,
          previousSuggestion: face.ai_suggested_name
        });
      }

      return await face.reload();

    } catch (error) {
      console.error('❌ Error updating face name:', error);
      throw error;
    }
  }

  /**
   * Get faces for content or file
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of faces
   */
  async getFaces(userId, options = {}) {
    try {
      const whereClause = { user_id: userId };
      
      if (options.contentId) {
        whereClause.content_id = options.contentId;
      }
      
      if (options.fileId) {
        whereClause.file_id = options.fileId;
      }

      const faces = await Face.findAll({
        where: whereClause,
        order: [['name_confidence', 'DESC'], ['createdAt', 'ASC']],
        limit: options.limit || 50
      });

      return faces;

    } catch (error) {
      console.error('❌ Error getting faces:', error);
      throw error;
    }
  }
}

module.exports = FaceRecognitionService; 