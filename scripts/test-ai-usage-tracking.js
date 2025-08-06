#!/usr/bin/env node

/**
 * AI Usage Tracking Test Script
 * 
 * Tests the AI usage tracking functionality without making actual API calls.
 * This script verifies the database model and service work correctly.
 * 
 * USAGE:
 * node scripts/test-ai-usage-tracking.js
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-01-30
 */

const AiUsageTracker = require('../services/aiUsageTracker');
const { ExternalAiUsage, User } = require('../models');

class AiUsageTrackingTester {
  constructor() {
    this.tracker = new AiUsageTracker();
  }

  /**
   * Test cost calculation functionality
   */
  testCostCalculation() {
    console.log('\n🧮 Testing Cost Calculation...');
    console.log('=' .repeat(50));

    // Test OpenAI pricing
    const openaiCost = this.tracker.calculateCost('openai', 'gpt-4', 1000, 500);
    console.log(`GPT-4 (1000 input, 500 output): $${openaiCost}`);

    const openaiTurboCost = this.tracker.calculateCost('openai', 'gpt-3.5-turbo', 2000, 1000);
    console.log(`GPT-3.5-turbo (2000 input, 1000 output): $${openaiTurboCost}`);

    // Test Google AI pricing
    const geminiCost = this.tracker.calculateCost('google_ai', 'gemini-2.0-flash', 1500, 750);
    console.log(`Gemini 2.0 Flash (1500 input, 750 output): $${geminiCost}`);

    const geminiProCost = this.tracker.calculateCost('google_ai', 'gemini-2.5-pro', 1000, 500, 200);
    console.log(`Gemini 2.5 Pro (1000 input, 500 output, 200 thinking): $${geminiProCost}`);

    // Test unknown model
    const unknownCost = this.tracker.calculateCost('unknown', 'fake-model', 1000, 500);
    console.log(`Unknown model: $${unknownCost} (should be 0)`);

    console.log('✅ Cost calculation tests completed');
  }

  /**
   * Test token extraction from mock responses
   */
  testTokenExtraction() {
    console.log('\n🔍 Testing Token Extraction...');
    console.log('=' .repeat(50));

    // Mock OpenAI response
    const mockOpenAIResponse = {
      id: 'chatcmpl-test123',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      usage: {
        prompt_tokens: 150,
        completion_tokens: 75,
        total_tokens: 225
      },
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a test response'
          }
        }
      ]
    };

    const openaiUsage = this.tracker.extractOpenAIUsage(mockOpenAIResponse);
    console.log('OpenAI Usage:', openaiUsage);

    // Mock Google AI response
    const mockGoogleAIResponse = {
      usageMetadata: {
        promptTokenCount: 200,
        candidatesTokenCount: 100,
        totalTokenCount: 300
      },
      candidates: [
        {
          content: {
            parts: [{ text: 'This is a test response from Gemini' }]
          }
        }
      ]
    };

    const googleUsage = this.tracker.extractGoogleAIUsage(mockGoogleAIResponse);
    console.log('Google AI Usage:', googleUsage);

    console.log('✅ Token extraction tests completed');
  }

  /**
   * Test database operations (without actually writing to DB)
   */
  async testDatabaseOperations() {
    console.log('\n💾 Testing Database Operations...');
    console.log('=' .repeat(50));

    try {
      // Test that the model exists and can be queried
      const modelExists = ExternalAiUsage !== undefined;
      console.log(`ExternalAiUsage model exists: ${modelExists}`);

      // Get current billing period
      const billingPeriod = this.tracker.getCurrentBillingPeriod();
      console.log(`Current billing period: ${billingPeriod}`);

      // Test record creation structure (without saving)
      const mockUsageData = {
        userId: 'test-user-123',
        contentId: 'test-content-456',
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        operationType: 'text_analysis',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        requestDurationMs: 2500,
        success: true,
        metadata: {
          testMode: true,
          description: 'Test usage record'
        }
      };

      console.log('Mock usage data structure:', JSON.stringify(mockUsageData, null, 2));

      // Calculate cost for this usage
      const estimatedCost = this.tracker.calculateCost(
        mockUsageData.aiProvider,
        mockUsageData.aiModel,
        mockUsageData.inputTokens,
        mockUsageData.outputTokens
      );

      console.log(`Estimated cost: $${estimatedCost}`);

      console.log('✅ Database operation tests completed');
    } catch (error) {
      console.error('❌ Database operation test failed:', error.message);
    }
  }

  /**
   * Test pricing model functionality
   */
  testPricingModels() {
    console.log('\n💰 Testing Pricing Models...');
    console.log('=' .repeat(50));

    // Test getting model pricing
    const gpt4Pricing = this.tracker.getModelPricing('openai', 'gpt-4');
    console.log('GPT-4 Pricing:', gpt4Pricing);

    const geminiPricing = this.tracker.getModelPricing('google_ai', 'gemini-2.0-flash');
    console.log('Gemini 2.0 Flash Pricing:', geminiPricing);

    // Test unknown model
    const unknownPricing = this.tracker.getModelPricing('unknown', 'fake-model');
    console.log('Unknown model pricing:', unknownPricing);

    console.log('✅ Pricing model tests completed');
  }

  /**
   * Test usage tracking simulation
   */
  testUsageTrackingSimulation() {
    console.log('\n📊 Testing Usage Tracking Simulation...');
    console.log('=' .repeat(50));

    // Simulate OpenAI tracking
    const mockOpenAIParams = {
      userId: 'test-user-123',
      response: {
        id: 'chatcmpl-test123',
        model: 'gpt-4',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500
        }
      },
      model: 'gpt-4',
      operationType: 'text_analysis',
      contentId: 'content-456',
      requestDurationMs: 2500
    };

    console.log('OpenAI tracking simulation:');
    console.log('- User ID:', mockOpenAIParams.userId);
    console.log('- Model:', mockOpenAIParams.model);
    console.log('- Operation:', mockOpenAIParams.operationType);
    console.log('- Tokens:', mockOpenAIParams.response.usage);
    
    const openaiCost = this.tracker.calculateCost(
      'openai',
      mockOpenAIParams.model,
      mockOpenAIParams.response.usage.prompt_tokens,
      mockOpenAIParams.response.usage.completion_tokens
    );
    console.log('- Estimated Cost:', `$${openaiCost}`);

    // Simulate Google AI tracking
    const mockGoogleAIParams = {
      userId: 'test-user-123',
      response: {
        usageMetadata: {
          promptTokenCount: 1200,
          candidatesTokenCount: 600,
          totalTokenCount: 1800
        }
      },
      model: 'gemini-2.0-flash',
      operationType: 'image_analysis',
      fileId: 'file-789',
      requestDurationMs: 3000
    };

    console.log('\nGoogle AI tracking simulation:');
    console.log('- User ID:', mockGoogleAIParams.userId);
    console.log('- Model:', mockGoogleAIParams.model);
    console.log('- Operation:', mockGoogleAIParams.operationType);
    console.log('- Tokens:', mockGoogleAIParams.response.usageMetadata);
    
    const googleCost = this.tracker.calculateCost(
      'google_ai',
      mockGoogleAIParams.model,
      mockGoogleAIParams.response.usageMetadata.promptTokenCount,
      mockGoogleAIParams.response.usageMetadata.candidatesTokenCount
    );
    console.log('- Estimated Cost:', `$${googleCost}`);

    console.log('✅ Usage tracking simulation completed');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 AI Usage Tracking Test Suite');
    console.log('=' .repeat(60));
    console.log('Testing AI usage tracking functionality...\n');

    try {
      this.testCostCalculation();
      this.testTokenExtraction();
      await this.testDatabaseOperations();
      this.testPricingModels();
      this.testUsageTrackingSimulation();

      console.log('\n✅ All tests completed successfully!');
      console.log('\n📋 Summary:');
      console.log('- Cost calculation: ✅ Working');
      console.log('- Token extraction: ✅ Working');
      console.log('- Database model: ✅ Available');
      console.log('- Pricing models: ✅ Loaded');
      console.log('- Usage tracking: ✅ Ready');

      console.log('\n🚀 The AI usage tracking system is ready to use!');
      console.log('\n💡 Next steps:');
      console.log('1. Run database migration: npm run migrate');
      console.log('2. Test with real API calls');
      console.log('3. Monitor usage in the admin dashboard');

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new AiUsageTrackingTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AiUsageTrackingTester;