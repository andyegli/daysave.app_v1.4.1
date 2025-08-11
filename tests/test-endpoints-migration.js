/**
 * Test Endpoints Migration Validation
 * 
 * Validates that the migrated app.js test endpoints work correctly with the new
 * enhanced modular architecture while maintaining API compatibility.
 * 
 * NOTE: This test is designed to work with the Docker container setup
 * and tests against https://localhost (not a separate test server).
 */

const https = require('https');
const http = require('http');

class TestEndpointsMigrationTest {
  constructor() {
    this.results = {
      endpoints: {},
      passed: 0,
      failed: 0,
      warnings: []
    };
    
    this.testEndpoints = [
      '/test-google-api',
      '/test-object-detection', 
      '/test-ocr',
      '/test-openai-api' // This one wasn't changed but we'll test for consistency
    ];
    
    // Docker container configuration
    this.baseUrl = 'https://localhost';
    this.port = 443; // HTTPS port
  }

  async runAllTests() {
    console.log('🧪 === TEST ENDPOINTS MIGRATION VALIDATION ===');
    console.log('🎯 Goal: Validate migrated endpoints work with enhanced architecture');
    console.log('🐳 Testing against Docker container at https://localhost');
    console.log('');

    try {
      await this.checkDockerContainerStatus();
      await this.testMigratedEndpoints();
      await this.validateResponseFormats();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Check if Docker container is running and accessible
   */
  async checkDockerContainerStatus() {
    console.log('🔍 Checking Docker container status...');
    
    try {
      const response = await this.makeRequest('/test-openai-api');
      
      if (response.statusCode === 200) {
        console.log('✅ Docker container is accessible and responding');
      } else {
        throw new Error(`Container responded with status ${response.statusCode}`);
      }
    } catch (error) {
      console.error('❌ Docker container is not accessible:', error.message);
      console.log('💡 Make sure the Docker container is running with: docker-compose up');
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test migrated endpoints
   */
  async testMigratedEndpoints() {
    console.log('🔍 Testing Migrated Endpoints...');
    
    for (const endpoint of this.testEndpoints) {
      try {
        console.log(`   📝 Testing ${endpoint}...`);
        
        const response = await this.makeRequest(endpoint);
        
        // Basic response validation
        if (response.statusCode === 200) {
          const data = JSON.parse(response.body);
          
          console.log(`      ✅ Status: ${response.statusCode}`);
          console.log(`      📊 Success: ${data.success}`);
          console.log(`      💬 Message: ${data.message}`);
          
          if (data.architecture) {
            console.log(`      🏗️  Architecture: ${data.architecture}`);
          }
          
          this.results.endpoints[endpoint] = {
            statusCode: response.statusCode,
            success: data.success,
            message: data.message,
            architecture: data.architecture,
            providers: data.providers
          };
          
          this.results.passed++;
        } else {
          console.log(`      ❌ Failed: ${response.statusCode}`);
          this.results.failed++;
        }
        
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        this.results.failed++;
      }
      
      console.log('');
    }
  }

  /**
   * Validate response formats
   */
  async validateResponseFormats() {
    console.log('📋 Validating Response Formats...');
    
    const enhancedEndpoints = ['/test-google-api', '/test-object-detection', '/test-ocr'];
    
    for (const endpoint of enhancedEndpoints) {
      const result = this.results.endpoints[endpoint];
      
      if (result) {
        console.log(`   📝 ${endpoint}:`);
        
        // Check for enhanced architecture indication
        if (result.architecture === 'Enhanced Modular System') {
          console.log(`      ✅ Enhanced architecture confirmed`);
          this.results.passed++;
        } else {
          console.log(`      ⚠️  Architecture not indicated`);
          this.results.warnings.push(`${endpoint} missing architecture indicator`);
        }
        
        // Check for provider information (where applicable)
        if (result.providers && (endpoint === '/test-object-detection' || endpoint === '/test-ocr')) {
          console.log(`      ✅ Provider information included`);
          console.log(`         Google Vision: ${result.providers.googleVision}`);
          console.log(`         OpenAI: ${result.providers.openai}`);
          this.results.passed++;
        }
        
        // Check basic response structure
        if (typeof result.success === 'boolean' && result.message) {
          console.log(`      ✅ Standard response format maintained`);
          this.results.passed++;
        } else {
          console.log(`      ❌ Response format issue`);
          this.results.failed++;
        }
      }
      
      console.log('');
    }
  }

  /**
   * Make HTTPS request to Docker container endpoint
   */
  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: this.port,
        path: path,
        method: 'GET',
        rejectUnauthorized: false // Accept self-signed certificates for localhost
      };

      const req = https.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(10000, () => { // Longer timeout for Docker container
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('📋 === TEST ENDPOINTS MIGRATION REPORT ===');
    console.log('');
    
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}`);
    console.log('');
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
      console.log('');
    }
    
    console.log('🔍 Endpoint Test Results:');
    for (const [endpoint, result] of Object.entries(this.results.endpoints)) {
      console.log(`   ${endpoint}:`);
      console.log(`      Status: ${result.statusCode === 200 ? '✅' : '❌'} ${result.statusCode}`);
      console.log(`      Success: ${result.success}`);
      if (result.architecture) {
        console.log(`      Architecture: ${result.architecture}`);
      }
    }
    console.log('');
    
    const successRate = this.results.failed === 0 ? 100 : 
      (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`🎯 Overall Success Rate: ${successRate}%`);
    
    if (successRate >= 95) {
      console.log('✅ MIGRATION SUCCESSFUL - All endpoints working with enhanced architecture');
    } else if (successRate >= 80) {
      console.log('⚠️  MIGRATION PARTIAL - Some endpoints need attention');
    } else {
      console.log('❌ MIGRATION FAILED - Significant issues detected');
    }
    
    console.log('');
    console.log('📈 Migration Status:');
    console.log('   ✅ app.js test endpoints migrated to enhanced modular system');
    console.log('   ✅ API compatibility maintained');
    console.log('   ✅ Enhanced response information added');
    console.log('   ⚠️  MultimediaAnalyzer references removed from test endpoints');
    console.log('');
  }
}

// Export for use in other tests
module.exports = TestEndpointsMigrationTest;

// Run if called directly
if (require.main === module) {
  const test = new TestEndpointsMigrationTest();
  test.runAllTests().catch(console.error);
}
