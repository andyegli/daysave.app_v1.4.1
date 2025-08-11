'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();
    
    console.log('Populating cost configuration with current pricing...');

    // Populate AI pricing from current hardcoded values
    const aiPricingData = [
      // OpenAI Models
      { provider: 'openai', model: 'gpt-4', input_cost: 30.00, output_cost: 60.00 },
      { provider: 'openai', model: 'gpt-4-turbo', input_cost: 10.00, output_cost: 30.00 },
      { provider: 'openai', model: 'gpt-4o', input_cost: 5.00, output_cost: 15.00 },
      { provider: 'openai', model: 'gpt-4o-mini', input_cost: 0.15, output_cost: 0.60 },
      { provider: 'openai', model: 'gpt-3.5-turbo', input_cost: 0.50, output_cost: 1.50 },
      { provider: 'openai', model: 'whisper-1', input_cost: 6.00, output_cost: 0, special_unit: 'per_minute', special_cost: 6.00 },
      { provider: 'openai', model: 'dall-e-3', input_cost: 0, output_cost: 0, special_unit: 'per_image', special_cost: 0.04 },
      { provider: 'openai', model: 'dall-e-2', input_cost: 0, output_cost: 0, special_unit: 'per_image', special_cost: 0.02 },
      { provider: 'openai', model: 'text-embedding-3-large', input_cost: 0.13, output_cost: 0 },
      { provider: 'openai', model: 'text-embedding-3-small', input_cost: 0.02, output_cost: 0 },
      { provider: 'openai', model: 'text-embedding-ada-002', input_cost: 0.10, output_cost: 0 },

      // Google AI Models
      { provider: 'google_ai', model: 'gemini-2.5-flash', input_cost: 0.15, output_cost: 0.60, thinking_cost: 3.50 },
      { provider: 'google_ai', model: 'gemini-2.5-pro', input_cost: 1.25, output_cost: 10.00, thinking_cost: 15.00 },
      { provider: 'google_ai', model: 'gemini-2.0-flash', input_cost: 0.10, output_cost: 0.40 },
      { provider: 'google_ai', model: 'gemini-2.0-flash-lite', input_cost: 0.075, output_cost: 0.30 },
      { provider: 'google_ai', model: 'gemini-1.5-flash', input_cost: 0.075, output_cost: 0.30 },
      { provider: 'google_ai', model: 'gemini-1.5-flash-8b', input_cost: 0.0375, output_cost: 0.15 },
      { provider: 'google_ai', model: 'gemini-1.5-pro', input_cost: 1.25, output_cost: 5.00 },
      { provider: 'google_ai', model: 'text-embedding-004', input_cost: 0, output_cost: 0 },
      { provider: 'google_ai', model: 'imagen-3', input_cost: 0, output_cost: 0, special_unit: 'per_image', special_cost: 0.03 },
      { provider: 'google_ai', model: 'veo-2', input_cost: 0, output_cost: 0, special_unit: 'per_second', special_cost: 0.35 },

      // Google Cloud Services
      { provider: 'google_cloud', model: 'vision-api', input_cost: 1.50, output_cost: 0, special_unit: 'per_1k_requests', special_cost: 1.50 },
      { provider: 'google_cloud', model: 'speech-to-text', input_cost: 1.44, output_cost: 0, special_unit: 'per_hour', special_cost: 1.44 },
      { provider: 'google_cloud', model: 'translation', input_cost: 20.00, output_cost: 0, special_unit: 'per_million_chars', special_cost: 20.00 }
    ];

    const aiRecords = aiPricingData.map(item => ({
      id: uuidv4(),
      provider: item.provider,
      model: item.model,
      input_cost_per_million_tokens: item.input_cost || 0,
      output_cost_per_million_tokens: item.output_cost || 0,
      thinking_cost_per_million_tokens: item.thinking_cost || null,
      special_pricing_unit: item.special_unit || null,
      special_pricing_cost: item.special_cost || null,
      is_active: true,
      effective_date: now,
      notes: `Initial pricing configuration migrated from hardcoded values - ${new Date().toISOString()}`,
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('ai_pricing_config', aiRecords, {});

    // Populate storage pricing from current hardcoded values
    const storagePricingData = [
      // Google Cloud Storage
      { provider: 'google_cloud_storage', storage_class: 'standard', storage_cost: 0.020, operation_cost: 0.0050, egress_cost: 0.01 },
      { provider: 'google_cloud_storage', storage_class: 'nearline', storage_cost: 0.010, operation_cost: 0.0050, egress_cost: 0.01 },
      { provider: 'google_cloud_storage', storage_class: 'coldline', storage_cost: 0.004, operation_cost: 0.0050, egress_cost: 0.01 },
      { provider: 'google_cloud_storage', storage_class: 'archive', storage_cost: 0.0012, operation_cost: 0.0050, egress_cost: 0.01 },
      
      // Local storage (free)
      { provider: 'local', storage_class: 'standard', storage_cost: 0.00, operation_cost: 0.00, egress_cost: 0.00 }
    ];

    const storageRecords = storagePricingData.map(item => ({
      id: uuidv4(),
      provider: item.provider,
      storage_class: item.storage_class,
      storage_cost_per_gb_month: item.storage_cost,
      operation_cost_per_1k: item.operation_cost,
      egress_cost_per_gb: item.egress_cost,
      is_active: true,
      effective_date: now,
      notes: `Initial pricing configuration migrated from hardcoded values - ${new Date().toISOString()}`,
      created_at: now,
      updated_at: now
    }));

    await queryInterface.bulkInsert('storage_pricing_config', storageRecords, {});

    console.log('✅ Populated cost configuration tables');
    console.log(`   📊 AI Models: ${aiRecords.length} pricing entries`);
    console.log(`   💾 Storage: ${storageRecords.length} pricing entries`);
    console.log('\n🔧 Cost configuration can now be managed via:');
    console.log('   - Admin interface: /admin/cost-configuration');
    console.log('   - Database: ai_pricing_config & storage_pricing_config tables');
    console.log('   - API: Cost tracking services will auto-load from database');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing cost configuration data...');
    
    await queryInterface.bulkDelete('storage_pricing_config', null, {});
    await queryInterface.bulkDelete('ai_pricing_config', null, {});
    
    console.log('✅ Removed cost configuration data');
  }
};
