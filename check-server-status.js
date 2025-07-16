const os = require('os');
const axios = require('axios');

function formatBytes(bytes) {
    return Math.round(bytes / 1024 / 1024) + 'MB';
}

function getSystemStatus() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;
    
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();
    
    console.log('🖥️  System Status:');
    console.log(`   💾 Total Memory: ${formatBytes(totalMem)}`);
    console.log(`   🟢 Free Memory: ${formatBytes(freeMem)}`);
    console.log(`   🔴 Used Memory: ${formatBytes(usedMem)} (${memoryUsagePercent.toFixed(1)}%)`);
    console.log(`   🧠 CPU Cores: ${cpuCount}`);
    console.log(`   📈 Load Average: [${loadAvg.map(l => l.toFixed(2)).join(', ')}]`);
    
    return {
        memoryUsagePercent,
        loadAvg: loadAvg[0], // 1-minute load average
        totalMem,
        freeMem,
        usedMem
    };
}

async function checkServerHealth() {
    try {
        console.log('🔍 Checking DaySave Server Health');
        console.log('═══════════════════════════════════════');
        
        const status = getSystemStatus();
        
        console.log('\n⚡ Performance Assessment:');
        
        // Memory warnings
        if (status.memoryUsagePercent > 95) {
            console.log('🚨 CRITICAL: Memory usage extremely high (>95%)');
            console.log('   ❌ This will cause automation failures');
            console.log('   💡 Restart the server immediately');
        } else if (status.memoryUsagePercent > 85) {
            console.log('⚠️  WARNING: Memory usage high (>85%)');
            console.log('   ⚠️  May cause intermittent automation failures');
        } else {
            console.log('✅ Memory usage normal');
        }
        
        // CPU warnings  
        const cpuLoadPercent = (status.loadAvg / os.cpus().length) * 100;
        if (cpuLoadPercent > 90) {
            console.log('🚨 CRITICAL: CPU load extremely high (>90%)');
            console.log('   ❌ This will cause background tasks to fail');
        } else if (cpuLoadPercent > 70) {
            console.log('⚠️  WARNING: CPU load high (>70%)');
        } else {
            console.log('✅ CPU load normal');
        }
        
        // Test server responsiveness
        console.log('\n🌐 Testing Server Responsiveness:');
        try {
            const start = Date.now();
            const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
            const responseTime = Date.now() - start;
            console.log(`✅ Server responding in ${responseTime}ms`);
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log('❌ Server not running on http://localhost:3000');
            } else if (error.response && error.response.status === 404) {
                // /health endpoint might not exist, try root
                try {
                    const start = Date.now();
                    await axios.get('http://localhost:3000/', { timeout: 5000 });
                    const responseTime = Date.now() - start;
                    console.log(`✅ Server responding in ${responseTime}ms (via root endpoint)`);
                } catch (e) {
                    console.log('❌ Server not responding properly');
                }
            } else {
                console.log(`⚠️  Server response issue: ${error.message}`);
            }
        }
        
        console.log('\n📋 Automation Troubleshooting:');
        console.log('══════════════════════════════════');
        
        if (status.memoryUsagePercent > 95 || cpuLoadPercent > 90) {
            console.log('🎯 HIGH PRIORITY FIXES:');
            console.log('1. 🔄 Restart the server: Ctrl+C then `npm run dev`');
            console.log('2. 🧹 Clear any background processes consuming resources');
            console.log('3. 📊 Monitor memory usage after restart');
        } else {
            console.log('🎯 TROUBLESHOOTING STEPS:');
            console.log('1. 🖥️  Add a URL through the web interface');
            console.log('2. 👀 Watch the console for automation trigger messages:');
            console.log('   • 🚀 [AUTO-xxxxx] AUTOMATION TRIGGER: Starting...');
            console.log('   • ✅ [AUTO-xxxxx] Analysis started successfully...');
            console.log('3. 🕐 Wait 20-30 seconds for processing to complete');
            console.log('4. 🔄 Refresh the content page to see results');
        }
        
        console.log('\n💡 If automation is still failing:');
        console.log('• Check error logs: `tail -f logs/error.log`');
        console.log('• Check multimedia logs: `tail -f logs/multimedia.log`');
        console.log('• Verify Google Cloud credentials are working');
        console.log('• Ensure OpenAI API key is valid');
        
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

checkServerHealth(); 