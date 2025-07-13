const { Content } = require('./models');
const { Op } = require('sequelize');

async function testAnalysisEndpoint() {
  try {
    console.log('🔍 Testing Analysis Endpoint Response...');
    
    // Find the YouTube content
    const content = await Content.findOne({
      where: {
        url: {
          [Op.like]: '%LfdyIdJbkxQ%'
        }
      }
    });
    
    if (!content) {
      console.log('❌ Content not found');
      return;
    }
    
    console.log('✅ Found content:', content.id);
    console.log('📝 User Comments:', content.user_comments);
    console.log('📊 Has Transcription:', !!content.transcription);
    console.log('📏 Transcription Length:', content.transcription ? content.transcription.length : 0);
    console.log('😊 Sentiment:', content.sentiment);
    
    // Simulate the analysis endpoint logic
    const hasContentTranscription = content.transcription && content.transcription.length > 0;
    
    if (hasContentTranscription) {
      const transcriptionText = content.transcription;
      const wordCount = transcriptionText.split(' ').length;
      
      // Get sentiment from content.sentiment field
      let sentiment = null;
      if (content.sentiment) {
        try {
          sentiment = typeof content.sentiment === 'string' ? JSON.parse(content.sentiment) : content.sentiment;
        } catch (e) {
          console.log('⚠️ Could not parse sentiment, using default');
          sentiment = {
            label: 'positive',
            confidence: 0.75
          };
        }
      } else {
        sentiment = {
          label: 'positive',
          confidence: 0.75
        };
      }
      
      const response = {
        success: true,
        status: 'completed',
        analysis: {
          id: content.id,
          title: content.metadata?.title || 'Content Analysis',
          description: content.metadata?.description || '',
          duration: 0,
          transcription: transcriptionText,
          sentiment: sentiment,
          language: 'en',
          processing_time: null,
          quality_score: null,
          created_at: content.createdAt
        },
        thumbnails: [],
        speakers: [
          { id: 'speaker-1', name: 'Speaker 1', confidence: 0.8, gender: 'unknown', language: 'unknown' },
          { id: 'speaker-2', name: 'Speaker 2', confidence: 0.8, gender: 'unknown', language: 'unknown' },
          { id: 'speaker-3', name: 'Speaker 3', confidence: 0.8, gender: 'unknown', language: 'unknown' }
        ],
        ocr_captions: []
      };
      
      console.log('');
      console.log('🎯 ANALYSIS ENDPOINT RESPONSE:');
      console.log('✅ Success:', response.success);
      console.log('📊 Status:', response.status);
      console.log('📝 Has Transcription:', !!response.analysis.transcription);
      console.log('📏 Word Count:', wordCount);
      console.log('😊 Sentiment:', response.analysis.sentiment);
      console.log('🎤 Speakers:', response.speakers.length);
      console.log('📄 Preview:', transcriptionText.substring(0, 100) + '...');
      console.log('');
      console.log('🎬 This data should trigger:');
      console.log('  - Transcription summary in content card');
      console.log('  - Sentiment indicator badge');
      console.log('  - Brain icon (clickable)');
      console.log('  - Word count badge');
      
    } else {
      console.log('❌ No transcription data found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAnalysisEndpoint().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
}); 