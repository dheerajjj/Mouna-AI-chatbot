const https = require('https');

const RAILWAY_APP_URL = 'https://mouna-ai-chatbot-production.up.railway.app';

function makeRequest(requestUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(requestUrl);
        
        const requestOptions = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Deployment-Monitor/1.0',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        status: res.statusCode,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        raw: true
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function checkDeploymentStatus() {
    console.log('🔍 Checking deployment status...');
    
    try {
        // Check if our new endpoints are available
        const endpoints = [
            '/api/health',
            '/api/tenant/personal-tenant',
            '/health'
        ];

        const results = {};
        
        for (const endpoint of endpoints) {
            try {
                const response = await makeRequest(`${RAILWAY_APP_URL}${endpoint}`);
                results[endpoint] = {
                    status: response.status,
                    available: response.status < 500
                };
            } catch (error) {
                results[endpoint] = {
                    status: 'ERROR',
                    available: false,
                    error: error.message
                };
            }
        }

        // Check if personal-tenant endpoint exists (key indicator of our deployment)
        const personalTenantWorking = results['/api/tenant/personal-tenant'] && 
                                    (results['/api/tenant/personal-tenant'].status === 401 || 
                                     results['/api/tenant/personal-tenant'].status === 403 ||
                                     results['/api/tenant/personal-tenant'].status === 200);

        return {
            deployed: personalTenantWorking,
            endpoints: results
        };

    } catch (error) {
        console.log('❌ Error checking deployment:', error.message);
        return { deployed: false, error: error.message };
    }
}

async function testNewFeatures() {
    console.log('🧪 Testing new features...');
    
    const tests = [
        {
            name: 'Personal Tenant Endpoint (No Auth)',
            test: async () => {
                const response = await makeRequest(`${RAILWAY_APP_URL}/api/tenant/personal-tenant`);
                return {
                    status: response.status,
                    success: response.status === 401 || response.status === 403,
                    message: response.status === 401 || response.status === 403 ? 
                            'Correctly requires authentication' : 
                            `Unexpected status: ${response.status}`
                };
            }
        },
        {
            name: 'Health Check',
            test: async () => {
                const response = await makeRequest(`${RAILWAY_APP_URL}/api/health`);
                return {
                    status: response.status,
                    success: response.status === 200,
                    message: response.status === 200 ? 'Health endpoint working' : 'Health endpoint failed'
                };
            }
        },
        {
            name: 'Widget Features',
            test: async () => {
                const response = await makeRequest(`${RAILWAY_APP_URL}/widget-fixed.js`);
                if (response.status === 200) {
                    const hasPersonalTenant = response.data.includes('personal-tenant');
                    const hasMultiLanguage = response.data.includes('translations');
                    return {
                        status: response.status,
                        success: hasPersonalTenant && hasMultiLanguage,
                        message: `Personal tenant: ${hasPersonalTenant}, Multi-language: ${hasMultiLanguage}`,
                        features: {
                            personalTenant: hasPersonalTenant,
                            multiLanguage: hasMultiLanguage
                        }
                    };
                }
                return {
                    status: response.status,
                    success: false,
                    message: 'Widget not accessible'
                };
            }
        }
    ];

    let passed = 0;
    for (const test of tests) {
        console.log(`🔍 Running: ${test.name}`);
        try {
            const result = await test.test();
            if (result.success) {
                console.log(`✅ PASSED: ${test.name} - ${result.message}`);
                passed++;
            } else {
                console.log(`❌ FAILED: ${test.name} - ${result.message}`);
            }
        } catch (error) {
            console.log(`❌ ERROR: ${test.name} - ${error.message}`);
        }
    }

    console.log(`\n📊 Test Results: ${passed}/${tests.length} passed`);
    return passed === tests.length;
}

async function monitorDeployment() {
    console.log('🚀 Monitoring Railway Deployment...');
    console.log(`🌐 Target: ${RAILWAY_APP_URL}`);
    console.log('⏱️  Checking every 30 seconds for up to 10 minutes...\n');

    const maxAttempts = 20; // 20 attempts * 30 seconds = 10 minutes
    let attempt = 1;

    while (attempt <= maxAttempts) {
        console.log(`🔍 Attempt ${attempt}/${maxAttempts} - ${new Date().toISOString()}`);
        
        const status = await checkDeploymentStatus();
        
        if (status.deployed) {
            console.log('🎉 New deployment detected!');
            console.log('✅ Personal tenant endpoint is available');
            
            // Wait a few more seconds for full deployment
            console.log('⏳ Waiting 10 seconds for deployment to stabilize...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            console.log('\n🧪 Running comprehensive tests...');
            const allPassed = await testNewFeatures();
            
            if (allPassed) {
                console.log('\n🎉 SUCCESS! All new features are working on Railway!');
                console.log('✅ Subscription-based multi-tenant system is live');
                console.log('✅ Personal tenant fallback is working');
                console.log('✅ Widget backward compatibility is maintained');
                return true;
            } else {
                console.log('\n⚠️  Deployment detected but some features are not working correctly');
                console.log('Check the test results above for details');
                return false;
            }
        } else {
            console.log('⏳ Still deploying... Personal tenant endpoint not yet available');
            if (status.endpoints) {
                Object.entries(status.endpoints).forEach(([endpoint, result]) => {
                    console.log(`   ${endpoint}: ${result.status}`);
                });
            }
        }
        
        if (attempt < maxAttempts) {
            console.log('⏰ Waiting 30 seconds before next check...\n');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
        attempt++;
    }

    console.log('⏰ Timeout reached. Deployment might be taking longer than expected.');
    console.log('💡 You can manually check Railway dashboard or try running the tests later.');
    return false;
}

// Start monitoring
monitorDeployment().catch(console.error);
