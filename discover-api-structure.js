const https = require('https');
const url = require('url');

const RAILWAY_APP_URL = 'https://mouna-ai-chatbot-production.up.railway.app';

function makeRequest(requestUrl, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(requestUrl);
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'API-Discovery/1.0',
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
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data,
                        raw: true
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

async function discoverAPIStructure() {
    console.log('🔍 Discovering API Structure on Railway...');
    console.log(`🌐 Base URL: ${RAILWAY_APP_URL}`);
    console.log('');

    // Test different possible API paths
    const possiblePaths = [
        '/',
        '/api',
        '/api/',
        '/api/health',
        '/health',
        '/api/auth/login',
        '/auth/login',
        '/login',
        '/api/tenant',
        '/tenant',
        '/api/tenant/personal-tenant',
        '/tenant/personal-tenant',
        '/api/pricing',
        '/pricing',
        '/widget.js',
        '/widget-fixed.js',
        '/public/widget-fixed.js',
        '/dashboard',
        '/admin'
    ];

    console.log('🔍 Testing common API paths...');
    const results = {};

    for (const path of possiblePaths) {
        try {
            const response = await makeRequest(`${RAILWAY_APP_URL}${path}`);
            const isSuccessful = response.status >= 200 && response.status < 400;
            const hasContent = response.data && response.data.length > 0;
            
            results[path] = {
                status: response.status,
                accessible: isSuccessful,
                hasContent: hasContent,
                contentType: response.headers['content-type'] || 'unknown',
                contentLength: response.data ? response.data.length : 0
            };

            if (isSuccessful) {
                console.log(`✅ ${path} - Status: ${response.status} (${response.headers['content-type'] || 'unknown'})`);
                
                // Check for API indicators in successful responses
                if (response.data && typeof response.data === 'string') {
                    if (response.data.includes('personal-tenant')) {
                        console.log(`   🎯 Contains 'personal-tenant' reference`);
                    }
                    if (response.data.includes('tenant')) {
                        console.log(`   🏢 Contains 'tenant' references`);
                    }
                    if (response.data.includes('api')) {
                        console.log(`   📡 Contains 'api' references`);
                    }
                }
            } else {
                console.log(`❌ ${path} - Status: ${response.status}`);
            }
        } catch (error) {
            results[path] = {
                status: 'ERROR',
                accessible: false,
                error: error.message
            };
            console.log(`❌ ${path} - ERROR: ${error.message}`);
        }
    }

    console.log('');
    console.log('📊 DISCOVERY SUMMARY:');
    
    const accessible = Object.entries(results).filter(([_, result]) => result.accessible);
    const failed = Object.entries(results).filter(([_, result]) => !result.accessible);

    console.log(`✅ Accessible paths: ${accessible.length}`);
    accessible.forEach(([path, result]) => {
        console.log(`   ${path} (${result.status}) - ${result.contentType}`);
    });

    console.log(`❌ Failed paths: ${failed.length}`);
    failed.forEach(([path, result]) => {
        console.log(`   ${path} (${result.status || result.error})`);
    });

    // Check widget specifically
    console.log('');
    console.log('🤖 WIDGET ANALYSIS:');
    
    try {
        const widgetResponse = await makeRequest(`${RAILWAY_APP_URL}/widget-fixed.js`);
        if (widgetResponse.status === 200) {
            const widgetContent = widgetResponse.data;
            console.log('✅ Widget is accessible');
            
            // Check for our new features
            const features = {
                'Personal Tenant Fallback': widgetContent.includes('personal-tenant'),
                'Multi-language Support': widgetContent.includes('translations') || widgetContent.includes('language'),
                'Tenant Config': widgetContent.includes('tenantConfig'),
                'API Key Support': widgetContent.includes('apiKey') || widgetContent.includes('X-API-Key'),
                'Backward Compatibility': widgetContent.includes('tenantId') && widgetContent.includes('fallback')
            };

            Object.entries(features).forEach(([feature, present]) => {
                console.log(`   ${present ? '✅' : '❌'} ${feature}`);
            });

            // Look for API endpoint references in widget
            console.log('');
            console.log('📡 API ENDPOINTS REFERENCED IN WIDGET:');
            const apiMatches = widgetContent.match(/['"`]\/[^'"`]*api[^'"`]*['"`]/g) || [];
            const uniqueEndpoints = [...new Set(apiMatches)].map(match => match.replace(/['"`]/g, ''));
            
            if (uniqueEndpoints.length > 0) {
                uniqueEndpoints.forEach(endpoint => {
                    console.log(`   📍 ${endpoint}`);
                });
            } else {
                console.log('   ⚠️  No API endpoints found in widget');
            }
        }
    } catch (error) {
        console.log('❌ Failed to analyze widget:', error.message);
    }

    console.log('');
    console.log('🚀 DEPLOYMENT STATUS:');
    if (accessible.length > 0) {
        console.log('✅ App is deployed and running');
        console.log('✅ Widget script is accessible');
        
        if (accessible.some(([path]) => path.includes('api'))) {
            console.log('✅ Some API endpoints are working');
        } else {
            console.log('⚠️  API endpoints might not be deployed or have different paths');
        }
    }

    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('1. Check if your latest code changes are deployed to Railway');
    console.log('2. Verify API route configuration in your Railway deployment');
    console.log('3. Check Railway deployment logs for any errors');
    console.log('4. Consider redeploying from your latest commit');
}

// Run the discovery
discoverAPIStructure().catch(console.error);
