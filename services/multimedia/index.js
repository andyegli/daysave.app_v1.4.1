/**
 * Multimedia Services Index
 * 
 * Provides a centralized export point for all multimedia analysis services
 * within the DaySave project. This allows for clean imports and service
 * management throughout the application.
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const VoicePrintDatabase = require('./VoicePrintDatabase');
// MultimediaAnalyzer removed - replaced by modular enhanced system
const ThumbnailGenerator = require('./ThumbnailGenerator');
const VideoProcessor = require('./VideoProcessor');
const AudioProcessor = require('./AudioProcessor');
const ImageProcessor = require('./ImageProcessor');
const DocumentProcessor = require('./DocumentProcessor');
const UrlProcessor = require('./UrlProcessor');
const AutomationOrchestrator = require('./AutomationOrchestrator');

module.exports = {
  VoicePrintDatabase,
  // MultimediaAnalyzer removed - replaced by enhanced modular system
  ThumbnailGenerator,
  VideoProcessor,
  AudioProcessor,
  ImageProcessor,
  DocumentProcessor,
  UrlProcessor,
  AutomationOrchestrator
}; 