#!/usr/bin/env node

/**
 * AI Cost Calculator Utility
 * 
 * Command-line utility for calculating AI usage costs across different providers.
 * Useful for estimating costs before making API calls and for billing analysis.
 * 
 * USAGE:
 * node scripts/ai-cost-calculator.js --provider openai --model gpt-4 --input-tokens 1000 --output-tokens 500
 * node scripts/ai-cost-calculator.js --provider google_ai --model gemini-2.5-pro --input-tokens 2000 --output-tokens 1000
 * node scripts/ai-cost-calculator.js --list-models
 * node scripts/ai-cost-calculator.js --compare --input-tokens 1000 --output-tokens 500
 * 
 * FEATURES:
 * - Calculate costs for specific provider/model combinations
 * - Compare costs across different providers
 * - List available models and their pricing
 * - Batch cost calculations
 * - Export results to CSV/JSON
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-01-30
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const AiUsageTracker = require('../services/aiUsageTracker');

class AiCostCalculator {
  constructor() {
    this.tracker = new AiUsageTracker();
  }

  /**
   * Calculate cost for a specific provider and model
   * @param {string} provider - AI provider
   * @param {string} model - Model name
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @param {number} thinkingTokens - Thinking tokens (for Gemini 2.5)
   * @returns {Object} Cost calculation result
   */
  calculateCost(provider, model, inputTokens, outputTokens, thinkingTokens = 0) {
    const cost = this.tracker.calculateCost(provider, model, inputTokens, outputTokens, thinkingTokens);
    const totalTokens = inputTokens + outputTokens + thinkingTokens;
    
    const pricing = this.tracker.getModelPricing(provider, model);
    if (!pricing) {
      return {
        error: `Unknown provider/model: ${provider}/${model}`
      };
    }

    return {
      provider,
      model,
      inputTokens,
      outputTokens,
      thinkingTokens,
      totalTokens,
      estimatedCost: cost,
      pricing,
      costPerToken: totalTokens > 0 ? (cost / totalTokens) : 0
    };
  }

  /**
   * Compare costs across multiple providers for the same token usage
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @returns {Array} Comparison results
   */
  compareCosts(inputTokens, outputTokens) {
    const results = [];
    
    // Get all available models
    Object.keys(this.tracker.pricingModels).forEach(provider => {
      Object.keys(this.tracker.pricingModels[provider]).forEach(model => {
        const result = this.calculateCost(provider, model, inputTokens, outputTokens);
        if (!result.error) {
          results.push(result);
        }
      });
    });

    // Sort by cost (lowest first)
    return results.sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  /**
   * List all available models and their pricing
   * @returns {Object} All models and pricing
   */
  listModels() {
    const models = {};
    
    Object.keys(this.tracker.pricingModels).forEach(provider => {
      models[provider] = {};
      Object.keys(this.tracker.pricingModels[provider]).forEach(model => {
        models[provider][model] = this.tracker.pricingModels[provider][model];
      });
    });

    return models;
  }

  /**
   * Calculate costs for a batch of operations
   * @param {Array} operations - Array of operation objects
   * @returns {Array} Batch results
   */
  batchCalculate(operations) {
    return operations.map(op => {
      return this.calculateCost(
        op.provider,
        op.model,
        op.inputTokens || 0,
        op.outputTokens || 0,
        op.thinkingTokens || 0
      );
    });
  }

  /**
   * Export results to CSV format
   * @param {Array} results - Calculation results
   * @returns {string} CSV content
   */
  exportToCsv(results) {
    const headers = [
      'Provider',
      'Model',
      'Input Tokens',
      'Output Tokens',
      'Thinking Tokens',
      'Total Tokens',
      'Estimated Cost (USD)',
      'Cost Per Token',
      'Input Price (per 1M)',
      'Output Price (per 1M)',
      'Thinking Price (per 1M)'
    ];

    const rows = results.map(result => [
      result.provider,
      result.model,
      result.inputTokens,
      result.outputTokens,
      result.thinkingTokens || 0,
      result.totalTokens,
      result.estimatedCost.toFixed(6),
      result.costPerToken.toFixed(8),
      result.pricing.input || 'N/A',
      result.pricing.output || 'N/A',
      result.pricing.thinking || 'N/A'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export results to JSON format
   * @param {Array} results - Calculation results
   * @returns {string} JSON content
   */
  exportToJson(results) {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Format results for console display
   * @param {Array} results - Calculation results
   * @returns {string} Formatted output
   */
  formatForConsole(results) {
    if (!Array.isArray(results)) {
      results = [results];
    }

    let output = '\n📊 AI Cost Calculation Results\n';
    output += '=' .repeat(50) + '\n\n';

    results.forEach((result, index) => {
      if (result.error) {
        output += `❌ Error: ${result.error}\n\n`;
        return;
      }

      output += `${index + 1}. ${result.provider.toUpperCase()} - ${result.model}\n`;
      output += `   Input Tokens: ${result.inputTokens.toLocaleString()}\n`;
      output += `   Output Tokens: ${result.outputTokens.toLocaleString()}\n`;
      if (result.thinkingTokens > 0) {
        output += `   Thinking Tokens: ${result.thinkingTokens.toLocaleString()}\n`;
      }
      output += `   Total Tokens: ${result.totalTokens.toLocaleString()}\n`;
      output += `   💰 Estimated Cost: $${result.estimatedCost.toFixed(6)}\n`;
      output += `   📈 Cost per Token: $${result.costPerToken.toFixed(8)}\n`;
      
      if (result.pricing) {
        output += `   Pricing: Input $${result.pricing.input}/1M`;
        if (result.pricing.output) {
          output += `, Output $${result.pricing.output}/1M`;
        }
        if (result.pricing.thinking) {
          output += `, Thinking $${result.pricing.thinking}/1M`;
        }
        output += '\n';
      }
      
      output += '\n';
    });

    return output;
  }

  /**
   * Display pricing table for all models
   */
  displayPricingTable() {
    console.log('\n💰 AI Model Pricing Table');
    console.log('=' .repeat(80));
    
    Object.keys(this.tracker.pricingModels).forEach(provider => {
      console.log(`\n🔥 ${provider.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      Object.keys(this.tracker.pricingModels[provider]).forEach(model => {
        const pricing = this.tracker.pricingModels[provider][model];
        let priceStr = `Input: $${pricing.input || 0}/1M`;
        if (pricing.output) {
          priceStr += `, Output: $${pricing.output}/1M`;
        }
        if (pricing.thinking) {
          priceStr += `, Thinking: $${pricing.thinking}/1M`;
        }
        console.log(`  ${model.padEnd(25)} ${priceStr}`);
      });
    });
    console.log('');
  }
}

// CLI Configuration
program
  .name('ai-cost-calculator')
  .description('Calculate AI usage costs across different providers')
  .version('1.0.0');

program
  .command('calculate')
  .description('Calculate cost for specific provider and model')
  .option('-p, --provider <provider>', 'AI provider (openai, google_ai, google_cloud)')
  .option('-m, --model <model>', 'Model name')
  .option('-i, --input-tokens <number>', 'Input tokens', parseInt, 0)
  .option('-o, --output-tokens <number>', 'Output tokens', parseInt, 0)
  .option('-t, --thinking-tokens <number>', 'Thinking tokens (for Gemini 2.5)', parseInt, 0)
  .option('--export <format>', 'Export format (csv, json)')
  .option('--output-file <file>', 'Output file path')
  .action((options) => {
    const calculator = new AiCostCalculator();
    
    if (!options.provider || !options.model) {
      console.error('❌ Provider and model are required');
      process.exit(1);
    }

    const result = calculator.calculateCost(
      options.provider,
      options.model,
      options.inputTokens,
      options.outputTokens,
      options.thinkingTokens
    );

    if (options.export) {
      let content;
      if (options.export === 'csv') {
        content = calculator.exportToCsv([result]);
      } else if (options.export === 'json') {
        content = calculator.exportToJson([result]);
      }

      if (options.outputFile) {
        fs.writeFileSync(options.outputFile, content);
        console.log(`✅ Results exported to ${options.outputFile}`);
      } else {
        console.log(content);
      }
    } else {
      console.log(calculator.formatForConsole(result));
    }
  });

program
  .command('compare')
  .description('Compare costs across all providers')
  .option('-i, --input-tokens <number>', 'Input tokens', parseInt, 1000)
  .option('-o, --output-tokens <number>', 'Output tokens', parseInt, 500)
  .option('--export <format>', 'Export format (csv, json)')
  .option('--output-file <file>', 'Output file path')
  .option('--top <number>', 'Show top N cheapest options', parseInt, 10)
  .action((options) => {
    const calculator = new AiCostCalculator();
    const results = calculator.compareCosts(options.inputTokens, options.outputTokens);
    const topResults = results.slice(0, options.top);

    if (options.export) {
      let content;
      if (options.export === 'csv') {
        content = calculator.exportToCsv(topResults);
      } else if (options.export === 'json') {
        content = calculator.exportToJson(topResults);
      }

      if (options.outputFile) {
        fs.writeFileSync(options.outputFile, content);
        console.log(`✅ Results exported to ${options.outputFile}`);
      } else {
        console.log(content);
      }
    } else {
      console.log(calculator.formatForConsole(topResults));
    }
  });

program
  .command('list-models')
  .description('List all available models and their pricing')
  .action(() => {
    const calculator = new AiCostCalculator();
    calculator.displayPricingTable();
  });

program
  .command('batch')
  .description('Calculate costs for multiple operations from a JSON file')
  .option('-f, --file <file>', 'JSON file with operations')
  .option('--export <format>', 'Export format (csv, json)')
  .option('--output-file <file>', 'Output file path')
  .action((options) => {
    if (!options.file) {
      console.error('❌ Input file is required');
      process.exit(1);
    }

    if (!fs.existsSync(options.file)) {
      console.error(`❌ File not found: ${options.file}`);
      process.exit(1);
    }

    const calculator = new AiCostCalculator();
    const operations = JSON.parse(fs.readFileSync(options.file, 'utf8'));
    const results = calculator.batchCalculate(operations);

    if (options.export) {
      let content;
      if (options.export === 'csv') {
        content = calculator.exportToCsv(results);
      } else if (options.export === 'json') {
        content = calculator.exportToJson(results);
      }

      if (options.outputFile) {
        fs.writeFileSync(options.outputFile, content);
        console.log(`✅ Results exported to ${options.outputFile}`);
      } else {
        console.log(content);
      }
    } else {
      console.log(calculator.formatForConsole(results));
    }
  });

// If no command provided, show help
if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);