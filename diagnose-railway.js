const https = require('https');

async function diagnoseRailwayApp() {
    console.log('🔍 Railway App Diagnostic Tool');
    console.log('======================================');
    console.log('');
    
    const baseUrl = 'https://mouna-ai-chatbot-production.up.railway.app';
    console.log(`🌐 Testing: ${baseUrl}`);
    console.log('');

    // Test different endpoints to understand what's working
    const testEndpoints = [
        { path: '/', name: 'Home Page', expectsHTML: true },
        { path: '/health', name: 'Health Check', expectsJSON: true },
        { path: '/api', name: 'API Base', expectsJSON: true },
        { path: '/api/health', name: 'API Health', expectsJSON: true },
        { path: '/widget-fixed.js', name: 'Widget Script', expectsJS: true },
        { path: '/login', name: 'Login Page', expectsHTML: true },
        { path: '/dashboard', name: 'Dashboard', expectsHTML: true }
    ];

    for (const endpoint of testEndpoints) {
        console.log(`📍 Testing ${endpoint.name} (${endpoint.path})`);
        
        try {
            const response = await makeRequest(baseUrl + endpoint.path);
            
            console.log(`   Status: ${response.status}`);
            console.log(`   Content-Type: ${response.headers['content-type'] || 'Not set'}`);
            
            if (response.status >= 200 && response.status < 300) {
                console.log(`   ✅ SUCCESS`);
                
                // Check content type matches expectation
                const contentType = response.headers['content-type'] || '';
                if (endpoint.expectsHTML && contentType.includes('text/html')) {
                    console.log(`   📄 HTML content confirmed`);
                } else if (endpoint.expectsJSON && contentType.includes('application/json')) {
                    console.log(`   📋 JSON content confirmed`);
                    if (typeof response.data === 'object') {
                        console.log(`   📊 Sample data:`, Object.keys(response.data).slice(0, 3));
                    }
                } else if (endpoint.expectsJS && contentType.includes('javascript')) {
                    console.log(`   📜 JavaScript content confirmed`);
                    const contentSize = response.data ? response.data.toString().length : 0;
                    console.log(`   📏 Content size: ${contentSize} chars`);
                }
            } else if (response.status === 502) {
                console.log(`   ❌ 502 - Application not responding (likely crashed or not started)`);
            } else if (response.status === 503) {
                console.log(`   ⚠️  503 - Service temporarily unavailable (likely deploying)`);
            } else if (response.status === 404) {
                console.log(`   ❌ 404 - Endpoint not found`);
            } else {
                console.log(`   ⚠️  Unexpected status`);
            }
            
            // Show response data for errors
            if (response.status >= 400 && response.data) {
                const dataStr = typeof response.data === 'string' ? 
                    response.data.substring(0, 200) : 
                    JSON.stringify(response.data).substring(0, 200);
                console.log(`   📝 Response preview: ${dataStr}...`);
            }
            
        } catch (error) {
            console.log(`   💥 Network Error: ${error.message}`);
        }
        
        console.log('');
    }

    // Analyze results
    console.log('📋 DIAGNOSTIC SUMMARY:');
    console.log('======================================');
    
    // Check if this looks like an app startup issue
    console.log('');
    console.log('🔍 Likely Issues:');
    console.log('1. ❗ App may be crashing during startup');
    console.log('2. ❗ Missing environment variables (check Railway dashboard)');
    console.log('3. ❗ Database connection issues');
    console.log('4. ❗ Port binding issues');
    console.log('');
    console.log('🛠️  Recommended Actions:');
    console.log('1. Check Railway deployment logs');
    console.log('2. Verify environment variables are set:');
    console.log('   - MONGODB_URI');
    console.log('   - JWT_SECRET'); 
    console.log('   - OPENAI_API_KEY');
    console.log('   - NODE_ENV=production');
    console.log('3. Try redeploying: railway redeploy');
    console.log('4. Check for startup errors in logs');
}

function makeRequest(requestUrl) {
    return new Promise((resolve, reject) => {
        const url = new URL(requestUrl);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Railway-Diagnostic/1.0',
                'Accept': '*/*'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Run diagnostics
diagnoseRailwayApp().catch(console.error);
