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
const MultimediaAnalyzer = require('./MultimediaAnalyzer');
const ThumbnailGenerator = require('./ThumbnailGenerator');
const VideoProcessor = require('./VideoProcessor');
const AutomationOrchestrator = require('./AutomationOrchestrator');

module.exports = {
  VoicePrintDatabase,
  MultimediaAnalyzer,
  ThumbnailGenerator,
  VideoProcessor,
  AutomationOrchestrator
}; 