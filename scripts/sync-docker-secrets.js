#!/usr/bin/env node

/**
 * Sync Docker Secrets Script
 * 
 * This script safely copies environment variables from your local .env file
 * and updates the docker-compose.override.yml file with actual API keys and secrets.
 * 
 * Usage: node scripts/sync-docker-secrets.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DockerSecretsSyncer {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.rootPath = process.cwd();
    this.envFile = path.join(this.rootPath, '.env');
    this.overrideFile = path.join(this.rootPath, 'docker-compose.override.yml');
    this.secrets = {};
    this.updated = 0;
    this.missing = [];
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🔐 Docker Secrets Sync Starting...');
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
    console.log(`   Source: ${this.envFile}`);
    console.log(`   Target: ${this.overrideFile}`);
    console.log('');

    try {
      // Step 1: Read local .env file
      await this.readLocalEnv();

      // Step 2: Read current Docker override file
      await this.readDockerOverride();

      // Step 3: Update secrets in override file
      await this.updateDockerSecrets();

      // Step 4: Write updated override file
      await this.writeUpdatedOverride();

      // Summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Fatal error during secrets sync:', error.message);
      process.exit(1);
    }
  }

  /**
   * Read and parse local .env file
   */
  async readLocalEnv() {
    console.log('📖 Reading local .env file...');

    if (!fs.existsSync(this.envFile)) {
      throw new Error(`Local .env file not found at: ${this.envFile}\nPlease create a .env file with your API keys first.`);
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) continue;

      // Parse key=value pairs
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        this.secrets[key] = cleanValue;
      }
    }

    console.log(`   ✅ Found ${Object.keys(this.secrets).length} environment variables`);
    
    // Show critical secrets found (without revealing values)
    const criticalKeys = [
      'OPENAI_API_KEY',
      'GOOGLE_API_KEY',
      'GOOGLE_MAPS_API_KEY',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GMAIL_USER',
      'GMAIL_PASS'
    ];

    console.log('   📋 Critical secrets status:');
    for (const key of criticalKeys) {
      const status = this.secrets[key] ? '✅' : '❌';
      const preview = this.secrets[key] ? 
        `${this.secrets[key].substring(0, 6)}...` : 
        'NOT FOUND';
      console.log(`      ${status} ${key}: ${preview}`);
    }
    console.log('');
  }

  /**
   * Read current Docker override file
   */
  async readDockerOverride() {
    console.log('📖 Reading docker-compose.override.yml...');

    if (!fs.existsSync(this.overrideFile)) {
      throw new Error(`Docker override file not found at: ${this.overrideFile}\nPlease run the Docker setup first.`);
    }

    try {
      const overrideContent = fs.readFileSync(this.overrideFile, 'utf8');
      this.dockerConfig = yaml.load(overrideContent);
      console.log('   ✅ Docker override file loaded successfully');
      console.log('');
    } catch (error) {
      throw new Error(`Failed to parse docker-compose.override.yml: ${error.message}`);
    }
  }

  /**
   * Update secrets in Docker configuration
   */
  async updateDockerSecrets() {
    console.log('🔄 Updating Docker secrets...');

    if (!this.dockerConfig.services || !this.dockerConfig.services.app || !this.dockerConfig.services.app.environment) {
      throw new Error('Invalid docker-compose.override.yml structure');
    }

    const environment = this.dockerConfig.services.app.environment;

    // Map of placeholders to environment variable names
    const secretMappings = {
      'your-openai-api-key-here': 'OPENAI_API_KEY',
      'your-google-api-key-here': 'GOOGLE_API_KEY',
      'your-google-maps-api-key-here': 'GOOGLE_MAPS_API_KEY',
      'your-google-client-id-here': 'GOOGLE_CLIENT_ID',
      'your-google-client-secret-here': 'GOOGLE_CLIENT_SECRET',
      'your-gmail-username@gmail.com': 'GMAIL_USER',
      'your-gmail-app-password-here': 'GMAIL_PASS'
    };

    // Update environment variables
    for (let i = 0; i < environment.length; i++) {
      const envVar = environment[i];
      
      if (typeof envVar === 'string' && envVar.includes('=')) {
        const [key, value] = envVar.split('=', 2);
        
        // Check if this needs updating
        for (const [placeholder, secretKey] of Object.entries(secretMappings)) {
          if (value === placeholder && this.secrets[secretKey]) {
            environment[i] = `${key}=${this.secrets[secretKey]}`;
            console.log(`   🔄 Updated ${key}: ${placeholder} → ${this.secrets[secretKey].substring(0, 6)}...`);
            this.updated++;
          } else if (value === placeholder && !this.secrets[secretKey]) {
            this.missing.push(secretKey);
            console.log(`   ⚠️  Missing ${key}: ${placeholder} (not found in .env)`);
          }
        }

        // Also update other common secrets
        if (this.secrets[key.trim()]) {
          const currentValue = value.trim();
          const newValue = this.secrets[key.trim()];
          
          // Only update if it's different and not already updated
          if (currentValue !== newValue && 
              !Object.values(secretMappings).includes(key.trim()) && 
              (currentValue.includes('your-') || currentValue.includes('change-') || currentValue.includes('secure-docker-'))) {
            environment[i] = `${key}=${newValue}`;
            console.log(`   🔄 Updated ${key}: ***hidden*** → ***hidden***`);
            this.updated++;
          }
        }
      }
    }

    console.log('');
  }

  /**
   * Write updated Docker override file
   */
  async writeUpdatedOverride() {
    if (this.updated === 0) {
      console.log('ℹ️  No updates needed - all secrets already configured');
      return;
    }

    console.log('💾 Writing updated docker-compose.override.yml...');

    if (this.dryRun) {
      console.log('   🔍 DRY RUN - Would update file but not writing changes');
      return;
    }

    try {
      // Create backup
      const backupFile = `${this.overrideFile}.backup.${Date.now()}`;
      fs.copyFileSync(this.overrideFile, backupFile);
      console.log(`   💾 Backup created: ${path.basename(backupFile)}`);

      // Write updated file
      const updatedYaml = yaml.dump(this.dockerConfig, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });

      fs.writeFileSync(this.overrideFile, updatedYaml, 'utf8');
      console.log('   ✅ docker-compose.override.yml updated successfully');
      console.log('');
    } catch (error) {
      throw new Error(`Failed to write updated override file: ${error.message}`);
    }
  }

  /**
   * Print summary of changes
   */
  printSummary() {
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Secrets updated: ${this.updated}`);
    console.log(`❌ Missing secrets: ${this.missing.length}`);
    console.log(`🔧 Mode: ${this.dryRun ? 'DRY RUN (no changes made)' : 'LIVE UPDATE'}`);

    if (this.missing.length > 0) {
      console.log('');
      console.log('⚠️  Missing secrets in your .env file:');
      this.missing.forEach(key => {
        console.log(`   • ${key}`);
      });
      console.log('');
      console.log('💡 Add these to your .env file for complete Docker functionality');
    }

    if (this.updated > 0 && !this.dryRun) {
      console.log('');
      console.log('🚀 Next steps:');
      console.log('   1. Restart Docker containers: docker-compose down && docker-compose up -d');
      console.log('   2. Check container logs: docker-compose logs app');
      console.log('   3. Test thumbnail display in your application');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Install js-yaml if not present
  try {
    require('js-yaml');
  } catch (error) {
    console.log('📦 Installing required dependency: js-yaml...');
    const { execSync } = require('child_process');
    execSync('npm install js-yaml', { stdio: 'inherit' });
    console.log('✅ js-yaml installed successfully\n');
  }

  const syncer = new DockerSecretsSyncer({ dryRun });
  await syncer.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = DockerSecretsSyncer; 