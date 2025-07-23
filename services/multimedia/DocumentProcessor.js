const BaseMediaProcessor = require('./BaseMediaProcessor');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * DocumentProcessor Service
 * 
 * Handles document-specific processing operations including text extraction,
 * content analysis, and AI-powered summarization for various document formats.
 * Extends BaseMediaProcessor for standardized interface compliance.
 */
class DocumentProcessor extends BaseMediaProcessor {
    constructor() {
        super();
        this.name = 'DocumentProcessor';
        this.supportedTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
        
        // Initialize Google AI
        if (process.env.GOOGLE_AI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        } else {
            console.warn('DocumentProcessor: Google AI API key not found. Document analysis will be limited.');
        }
    }

    /**
     * Initialize the DocumentProcessor
     */
    async initialize(options = {}) {
        try {
            // Initialize any required components
            if (!this.genAI && process.env.GOOGLE_AI_API_KEY) {
                this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
                this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            }
            
            // Set processing capabilities
            this.capabilities = {
                textExtraction: true,
                contentAnalysis: !!this.genAI,
                summarization: !!this.genAI,
                titleGeneration: !!this.genAI,
                tagGeneration: !!this.genAI
            };
            
            this.initialized = true;
            console.log(`📄 ${this.name} initialized successfully`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Processes document file for AI analysis
     */
    async process(userId, filePath, options = {}) {
        try {
            const startTime = Date.now();
            this.updateProgress(0, 'Starting document processing...');

            // Extract text from document
            this.updateProgress(20, 'Extracting text content...');
            const extractedText = await this.extractText(filePath, options.mimeType || options.metadata?.mimeType);

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No text content could be extracted from document');
            }

            // Generate AI analysis
            this.updateProgress(50, 'Analyzing content with AI...');
            const analysis = await this.performAIAnalysis(extractedText, options);

            this.updateProgress(100, 'Document processing complete');

            const processingTime = Date.now() - startTime;
            return {
                success: true,
                textContent: extractedText.substring(0, 10000), // Store first 10k chars
                wordCount: extractedText.split(/\s+/).length,
                characterCount: extractedText.length,
                summary: analysis.summary,
                tags: analysis.tags,
                generatedTitle: analysis.title,
                processingTime,
                analysisMetadata: analysis.metadata
            };

        } catch (error) {
            this.updateProgress(100, `Error: ${error.message}`);
            console.error('DocumentProcessor error:', error);
            return {
                success: false,
                error: error.message,
                textContent: null,
                summary: null,
                tags: [],
                generatedTitle: null
            };
        }
    }

    /**
     * Extract text content from various document formats
     */
    async extractText(filePath, mimeType) {
        try {
            const extension = path.extname(filePath).toLowerCase();
            
            switch (extension) {
                case '.txt':
                case '.rtf':
                    return await this.extractFromText(filePath);
                
                case '.pdf':
                    return await this.extractFromPDF(filePath);
                
                case '.doc':
                case '.docx':
                    return await this.extractFromWord(filePath);
                
                default:
                    // Fallback: try to read as text
                    return await this.extractFromText(filePath);
            }
        } catch (error) {
            console.error(`Text extraction failed for ${filePath}:`, error);
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from plain text files
     */
    async extractFromText(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read text file: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF files
     */
    async extractFromPDF(filePath) {
        try {
            // Try to use pdf-parse if available
            try {
                const pdfParse = require('pdf-parse');
                const dataBuffer = await fs.readFile(filePath);
                const data = await pdfParse(dataBuffer);
                return data.text;
            } catch (pdfError) {
                console.warn('pdf-parse not available, using fallback method');
                // Fallback: return basic info
                return `PDF document detected. Install 'pdf-parse' package for full text extraction. File: ${path.basename(filePath)}`;
            }
        } catch (error) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from Word documents
     */
    async extractFromWord(filePath) {
        try {
            const extension = path.extname(filePath).toLowerCase();
            
            if (extension === '.docx') {
                // Try to use mammoth for .docx files
                try {
                    const mammoth = require('mammoth');
                    const result = await mammoth.extractRawText({ path: filePath });
                    return result.value;
                } catch (mammothError) {
                    console.warn('mammoth not available for .docx extraction');
                }
            }
            
            // Fallback for .doc files or if mammoth fails
            return `Word document detected. Install 'mammoth' package for full text extraction. File: ${path.basename(filePath)}`;
            
        } catch (error) {
            throw new Error(`Word document extraction failed: ${error.message}`);
        }
    }

    /**
     * Perform AI analysis on extracted text
     */
    async performAIAnalysis(text, metadata = {}) {
        // Try Google AI (Gemini) first
        if (this.model) {
            try {
                const prompt = this.createAnalysisPrompt(text, metadata);
                const result = await this.model.generateContent(prompt);
                const response = result.response;
                const analysisText = response.text();

                return this.parseAIResponse(analysisText, text);

            } catch (error) {
                console.error('Google AI analysis failed:', error);
                // Continue to try OpenAI fallback
            }
        }

        // Try OpenAI as fallback
        if (process.env.OPENAI_API_KEY) {
            try {
                console.log('🔄 Falling back to OpenAI for document analysis...');
                return await this.performOpenAIAnalysis(text, metadata);
            } catch (error) {
                console.error('OpenAI analysis failed:', error);
            }
        }

        // Use fallback analysis
        console.log('⚠️ No AI service available, using fallback analysis');
        return this.createFallbackAnalysis(text, metadata);
    }

    /**
     * Perform AI analysis using OpenAI
     */
    async performOpenAIAnalysis(text, metadata = {}) {
        if (!this.openai) {
            const { OpenAI } = require('openai');
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
        }

        const preview = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
        
        const prompt = `Please analyze this document and provide a JSON response with the following structure:
{
    "title": "Suggested title for the document (max 100 chars)",
    "summary": "Comprehensive summary in 2-3 sentences (max 300 chars)",
    "tags": ["tag1", "tag2", "tag3"],
    "category": "document type category",
    "confidence": 0.95
}

Document content:
${preview}

Requirements:
- Title should be descriptive and capture the main topic
- Summary should be concise but informative
- Tags should be relevant keywords (3-5 tags)
- Category should describe the document type (report, letter, manual, etc.)
- Return only valid JSON, no additional text`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.3
        });

        const analysisText = response.choices[0].message.content;
        return this.parseAIResponse(analysisText, text);
    }

    /**
     * Create analysis prompt for AI
     */
    createAnalysisPrompt(text, metadata) {
        const preview = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
        
        return `
Please analyze this document and provide a JSON response with the following structure:
{
    "title": "Suggested title for the document (max 100 chars)",
    "summary": "Comprehensive summary in 2-3 sentences (max 300 chars)",
    "tags": ["tag1", "tag2", "tag3"],
    "category": "document type category",
    "confidence": 0.95
}

Document content:
${preview}

Requirements:
- Title should be descriptive and capture the main topic
- Summary should be concise but informative
- Tags should be relevant keywords (3-5 tags)
- Category should describe the document type (report, letter, manual, etc.)
- Return only valid JSON, no additional text
        `;
    }

    /**
     * Parse AI response into structured data
     */
    parseAIResponse(responseText, originalText) {
        try {
            // Try to extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                return {
                    title: parsed.title || this.generateFallbackTitle(originalText),
                    summary: parsed.summary || this.generateFallbackSummary(originalText),
                    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
                    category: parsed.category || 'document',
                    confidence: parsed.confidence || 0.8,
                    metadata: {
                        aiAnalyzed: true,
                        analysisMethod: 'google-ai',
                        processedAt: new Date().toISOString()
                    }
                };
            }
            
            throw new Error('No valid JSON found in AI response');
            
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            return this.createFallbackAnalysis(originalText);
        }
    }

    /**
     * Create fallback analysis when AI is unavailable
     */
    createFallbackAnalysis(text, metadata = {}) {
        return {
            title: this.generateFallbackTitle(text),
            summary: this.generateFallbackSummary(text),
            tags: this.generateFallbackTags(text),
            category: 'document',
            confidence: 0.6,
            metadata: {
                aiAnalyzed: false,
                analysisMethod: 'fallback',
                processedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate fallback title from text content
     */
    generateFallbackTitle(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        
        // Try to find a title-like line
        for (const line of lines.slice(0, 5)) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && trimmed.length < 100) {
                return trimmed;
            }
        }
        
        // Fallback to first meaningful sentence
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
            return sentences[0].trim().substring(0, 80) + (sentences[0].length > 80 ? '...' : '');
        }
        
        return 'Document';
    }

    /**
     * Generate fallback summary from text content
     */
    generateFallbackSummary(text) {
        // Take first few sentences as summary
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        if (sentences.length === 0) {
            return `Document with ${text.split(/\s+/).length} words`;
        }
        
        let summary = sentences[0].trim();
        if (sentences.length > 1 && summary.length < 150) {
            summary += '. ' + sentences[1].trim();
        }
        
        return summary.length > 300 ? summary.substring(0, 297) + '...' : summary;
    }

    /**
     * Generate fallback tags from text content
     */
    generateFallbackTags(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Get most frequent words as tags
        const sortedWords = Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
        
        return sortedWords.length > 0 ? sortedWords : ['document', 'text'];
    }

    /**
     * Get file category for routing
     */
    getFileCategory(mimeType) {
        const docTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/rtf',
            'application/rtf'
        ];
        
        return docTypes.includes(mimeType) ? 'document' : null;
    }

    /**
     * Check if file type is supported
     */
    canProcess(mimeType) {
        return this.getFileCategory(mimeType) === 'document';
    }
}

module.exports = DocumentProcessor; 