/**
 * BusinessTypeDetector - AI-Powered Business Type Detection
 * 
 * Automatically detects business type from website content using multiple signals:
 * - Content analysis (keywords, services, products)
 * - Structured data (JSON-LD, schema.org)
 * - Visual indicators (pricing, menus, booking forms)
 * - Navigation patterns and page structure
 */

const OpenAI = require('openai');

class BusinessTypeDetector {
    constructor() {
        this.businessTypes = {
            restaurant: {
                keywords: [
                    'menu', 'restaurant', 'food', 'dining', 'cuisine', 'chef', 'dishes', 'meal', 
                    'delivery', 'takeout', 'reservation', 'table', 'bar', 'drinks', 'wine', 
                    'breakfast', 'lunch', 'dinner', 'appetizer', 'entree', 'dessert', 'cafe'
                ],
                indicators: [
                    'menu items', 'food prices', 'opening hours', 'location', 'reservations',
                    'dietary restrictions', 'ingredients', 'recipes'
                ],
                structuredDataTypes: ['Restaurant', 'FoodEstablishment', 'LocalBusiness'],
                navigationPatterns: ['/menu', '/reservations', '/order', '/delivery', '/hours']
            },

            clinic: {
                keywords: [
                    'doctor', 'clinic', 'medical', 'health', 'appointment', 'patient', 'treatment', 
                    'therapy', 'consultation', 'diagnosis', 'medicine', 'healthcare', 'physician',
                    'specialist', 'surgery', 'hospital', 'wellness', 'care', 'dental', 'vision'
                ],
                indicators: [
                    'appointment booking', 'doctor profiles', 'services', 'insurance', 
                    'patient portal', 'office hours', 'emergency contact'
                ],
                structuredDataTypes: ['MedicalOrganization', 'Hospital', 'Physician'],
                navigationPatterns: ['/appointments', '/doctors', '/services', '/patient-portal', '/contact']
            },

            ecommerce: {
                keywords: [
                    'shop', 'store', 'buy', 'purchase', 'product', 'cart', 'checkout', 'order',
                    'shipping', 'return', 'refund', 'payment', 'price', 'sale', 'discount',
                    'inventory', 'catalog', 'category', 'brand', 'reviews', 'rating'
                ],
                indicators: [
                    'product catalog', 'shopping cart', 'pricing', 'shipping info', 
                    'return policy', 'customer reviews', 'payment methods'
                ],
                structuredDataTypes: ['OnlineStore', 'Product', 'Offer'],
                navigationPatterns: ['/shop', '/products', '/cart', '/checkout', '/account', '/orders']
            },

            service: {
                keywords: [
                    'service', 'consultation', 'professional', 'expertise', 'solution', 'support',
                    'agency', 'company', 'business', 'client', 'project', 'team', 'experience',
                    'consulting', 'management', 'strategy', 'development', 'design', 'marketing'
                ],
                indicators: [
                    'service descriptions', 'client testimonials', 'portfolio', 'case studies',
                    'team profiles', 'contact forms', 'quote requests'
                ],
                structuredDataTypes: ['ProfessionalService', 'Organization', 'LocalBusiness'],
                navigationPatterns: ['/services', '/portfolio', '/about', '/team', '/contact', '/quote']
            },

            fitness: {
                keywords: [
                    'gym', 'fitness', 'workout', 'training', 'exercise', 'health', 'wellness',
                    'personal trainer', 'class', 'membership', 'equipment', 'nutrition',
                    'yoga', 'pilates', 'cardio', 'strength', 'coach', 'athletic'
                ],
                indicators: [
                    'class schedules', 'membership plans', 'trainer profiles', 'equipment list',
                    'fitness programs', 'nutrition advice'
                ],
                structuredDataTypes: ['ExerciseGym', 'SportsActivityLocation'],
                navigationPatterns: ['/classes', '/membership', '/trainers', '/schedule', '/programs']
            },

            education: {
                keywords: [
                    'school', 'education', 'course', 'class', 'student', 'teacher', 'learning',
                    'curriculum', 'degree', 'certification', 'training', 'academy', 'college',
                    'university', 'tuition', 'enrollment', 'academic', 'study', 'program'
                ],
                indicators: [
                    'course catalog', 'enrollment forms', 'faculty profiles', 'academic calendar',
                    'tuition fees', 'student resources'
                ],
                structuredDataTypes: ['EducationalOrganization', 'Course'],
                navigationPatterns: ['/courses', '/admissions', '/faculty', '/students', '/programs']
            }
        };

        // Initialize OpenAI for advanced content analysis
        this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        }) : null;
    }

    /**
     * Analyze website and detect business type
     * @param {Object} crawlResults - Results from website crawler
     * @returns {Object} Business type analysis with confidence scores
     */
    async analyzeWebsite(crawlResults) {
        console.log('🔍 Analyzing business type from crawled data...');

        try {
            const analysis = {
                detectedType: null,
                confidence: 0,
                scores: {},
                extractedInfo: {},
                reasoning: [],
                alternativeTypes: []
            };

            // Step 1: Rule-based analysis
            const ruleBasedScores = await this.performRuleBasedAnalysis(crawlResults);
            analysis.scores = ruleBasedScores;

            // Step 2: AI-enhanced analysis if available
            if (this.openai) {
                const aiAnalysis = await this.performAIAnalysis(crawlResults);
                this.combineAnalysisResults(analysis, aiAnalysis, ruleBasedScores);
            } else {
                // Use rule-based results only
                const topType = Object.entries(ruleBasedScores)
                    .sort((a, b) => b[1] - a[1])[0];
                
                if (topType && topType[1] > 0.3) {
                    analysis.detectedType = topType[0];
                    analysis.confidence = Math.min(topType[1], 0.85); // Cap at 85% without AI
                }
            }

            // Step 3: Extract business-specific information
            analysis.extractedInfo = await this.extractBusinessInfo(crawlResults, analysis.detectedType);

            // Step 4: Generate reasoning
            analysis.reasoning = this.generateReasoning(analysis, crawlResults);

            // Step 5: Identify alternative types
            analysis.alternativeTypes = this.getAlternativeTypes(analysis.scores, analysis.detectedType);

            console.log(`✅ Business type analysis complete: ${analysis.detectedType} (${Math.round(analysis.confidence * 100)}%)`);
            return analysis;

        } catch (error) {
            console.error('❌ Business type analysis failed:', error);
            return {
                detectedType: 'service', // Default fallback
                confidence: 0.5,
                scores: {},
                extractedInfo: {},
                reasoning: ['Analysis failed, using default service type'],
                error: error.message
            };
        }
    }

    /**
     * Perform rule-based business type analysis
     * @param {Object} crawlResults - Crawl results
     * @returns {Object} Confidence scores for each business type
     */
    async performRuleBasedAnalysis(crawlResults) {
        const scores = {};
        
        // Initialize scores
        Object.keys(this.businessTypes).forEach(type => {
            scores[type] = 0;
        });

        // Combine all text content for analysis
        const allText = this.extractAllText(crawlResults).toLowerCase();
        const wordCount = allText.split(/\s+/).length;

        // 1. Keyword analysis
        Object.entries(this.businessTypes).forEach(([type, config]) => {
            let keywordMatches = 0;
            config.keywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = (allText.match(regex) || []).length;
                keywordMatches += matches;
            });
            
            // Normalize by content length and keyword list size
            const keywordScore = Math.min(keywordMatches / (wordCount / 1000) / config.keywords.length, 1);
            scores[type] += keywordScore * 0.4; // 40% weight for keywords
        });

        // 2. Structured data analysis
        Object.values(crawlResults.structuredData || {}).forEach(dataArray => {
            dataArray.forEach(data => {
                const dataType = data['@type'];
                Object.entries(this.businessTypes).forEach(([type, config]) => {
                    if (config.structuredDataTypes.includes(dataType)) {
                        scores[type] += 0.3; // 30% weight for structured data
                    }
                });
            });
        });

        // 3. Navigation pattern analysis
        const navigation = this.extractNavigationPatterns(crawlResults);
        Object.entries(this.businessTypes).forEach(([type, config]) => {
            let navMatches = 0;
            config.navigationPatterns.forEach(pattern => {
                if (navigation.some(nav => nav.href && nav.href.includes(pattern))) {
                    navMatches++;
                }
            });
            
            const navScore = navMatches / config.navigationPatterns.length;
            scores[type] += navScore * 0.2; // 20% weight for navigation
        });

        // 4. Business-specific indicators
        Object.entries(this.businessTypes).forEach(([type, config]) => {
            let indicatorScore = 0;
            config.indicators.forEach(indicator => {
                if (allText.includes(indicator.toLowerCase())) {
                    indicatorScore += 0.1;
                }
            });
            scores[type] += Math.min(indicatorScore, 0.1); // 10% weight for indicators
        });

        // Normalize scores
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore > 0) {
            Object.keys(scores).forEach(type => {
                scores[type] = scores[type] / maxScore;
            });
        }

        return scores;
    }

    /**
     * Perform AI-enhanced business type analysis
     * @param {Object} crawlResults - Crawl results
     * @returns {Object} AI analysis results
     */
    async performAIAnalysis(crawlResults) {
        try {
            // Prepare content summary for AI analysis
            const contentSummary = this.prepareContentSummary(crawlResults);
            
            const prompt = `
Analyze the following website content and determine the business type. 

Content Summary:
${contentSummary}

Business Types to consider:
- restaurant: Food service, dining, menu-based businesses
- clinic: Medical, healthcare, appointment-based services
- ecommerce: Online retail, product sales, shopping
- service: Professional services, consulting, agencies
- fitness: Gyms, personal training, wellness centers
- education: Schools, courses, training programs

Respond with JSON in this exact format:
{
  "primaryType": "most_likely_business_type",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "secondaryType": "alternative_type_or_null",
  "businessInfo": {
    "name": "extracted_business_name",
    "services": ["main", "services", "offered"],
    "keyFeatures": ["notable", "features", "found"]
  }
}`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 500
            });

            const result = JSON.parse(response.choices[0].message.content);
            return result;

        } catch (error) {
            console.warn('AI analysis failed:', error.message);
            return null;
        }
    }

    /**
     * Combine AI and rule-based analysis results
     * @param {Object} analysis - Main analysis object
     * @param {Object} aiAnalysis - AI analysis results
     * @param {Object} ruleScores - Rule-based scores
     */
    combineAnalysisResults(analysis, aiAnalysis, ruleScores) {
        if (!aiAnalysis) {
            // Use rule-based only
            const topRule = Object.entries(ruleScores)
                .sort((a, b) => b[1] - a[1])[0];
            
            if (topRule && topRule[1] > 0.3) {
                analysis.detectedType = topRule[0];
                analysis.confidence = Math.min(topRule[1], 0.85);
            }
            return;
        }

        // Combine AI and rule-based results
        const aiType = aiAnalysis.primaryType;
        const aiConfidence = aiAnalysis.confidence || 0.5;
        const ruleConfidence = ruleScores[aiType] || 0;

        // Weight: 60% AI, 40% rules
        const combinedConfidence = (aiConfidence * 0.6) + (ruleConfidence * 0.4);

        // If AI and rules agree, increase confidence
        const topRuleType = Object.entries(ruleScores)
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (aiType === topRuleType) {
            analysis.confidence = Math.min(combinedConfidence * 1.2, 0.95);
        } else {
            analysis.confidence = combinedConfidence;
        }

        analysis.detectedType = aiType;
        
        // Add AI reasoning
        if (aiAnalysis.reasoning) {
            analysis.reasoning.push(`AI Analysis: ${aiAnalysis.reasoning}`);
        }

        // Merge business info
        if (aiAnalysis.businessInfo) {
            Object.assign(analysis.extractedInfo, aiAnalysis.businessInfo);
        }
    }

    /**
     * Extract business-specific information based on detected type
     * @param {Object} crawlResults - Crawl results
     * @param {string} businessType - Detected business type
     * @returns {Object} Extracted business information
     */
    async extractBusinessInfo(crawlResults, businessType) {
        const info = {
            name: null,
            description: null,
            services: [],
            products: [],
            contact: {},
            hours: [],
            location: null,
            specialFeatures: []
        };

        // Extract basic info from structured data
        Object.values(crawlResults.structuredData || {}).forEach(dataArray => {
            dataArray.forEach(data => {
                if (data.name && !info.name) info.name = data.name;
                if (data.description && !info.description) info.description = data.description;
                if (data.address) info.location = data.address;
                if (data.telephone) info.contact.phone = data.telephone;
                if (data.email) info.contact.email = data.email;
            });
        });

        // Extract from business info
        const businessInfo = crawlResults.businessInfo || {};
        info.name = info.name || businessInfo.name;
        info.contact.phone = info.contact.phone || businessInfo.telephone;
        info.contact.email = info.contact.email || businessInfo.email;
        info.location = info.location || businessInfo.address;

        // Extract type-specific information
        switch (businessType) {
            case 'restaurant':
                info.services = this.extractRestaurantInfo(crawlResults);
                break;
            case 'clinic':
                info.services = this.extractClinicInfo(crawlResults);
                break;
            case 'ecommerce':
                info.products = this.extractEcommerceInfo(crawlResults);
                break;
            case 'service':
                info.services = this.extractServiceInfo(crawlResults);
                break;
            case 'fitness':
                info.services = this.extractFitnessInfo(crawlResults);
                break;
            case 'education':
                info.services = this.extractEducationInfo(crawlResults);
                break;
        }

        return info;
    }

    // Helper methods

    extractAllText(crawlResults) {
        const textParts = [];
        
        crawlResults.pages?.forEach(page => {
            textParts.push(page.title || '');
            textParts.push(page.description || '');
            textParts.push(page.content?.body || '');
            
            // Add headings
            Object.values(page.headings || {}).forEach(headings => {
                textParts.push(headings.join(' '));
            });
            
            // Add navigation text
            page.navigation?.forEach(nav => {
                textParts.push(nav.text || '');
            });
            
            textParts.push(page.footer || '');
        });
        
        return textParts.join(' ');
    }

    extractNavigationPatterns(crawlResults) {
        const navigation = [];
        
        crawlResults.pages?.forEach(page => {
            if (page.navigation) {
                navigation.push(...page.navigation);
            }
        });
        
        return navigation;
    }

    prepareContentSummary(crawlResults) {
        const summary = {
            pages: crawlResults.pages?.length || 0,
            titles: [],
            descriptions: [],
            navigation: [],
            businessElements: {
                prices: [],
                services: [],
                products: []
            }
        };

        crawlResults.pages?.slice(0, 5).forEach(page => { // Limit to first 5 pages
            if (page.title) summary.titles.push(page.title);
            if (page.description) summary.descriptions.push(page.description);
            
            page.navigation?.slice(0, 10).forEach(nav => {
                if (nav.text) summary.navigation.push(nav.text);
            });

            if (page.businessElements) {
                summary.businessElements.prices.push(...(page.businessElements.prices || []).slice(0, 5));
                summary.businessElements.services.push(...(page.businessElements.services || []).slice(0, 5));
                summary.businessElements.products.push(...(page.businessElements.menuItems || []).slice(0, 5));
            }
        });

        return `
Pages: ${summary.pages}
Titles: ${summary.titles.join(', ')}
Descriptions: ${summary.descriptions.join('. ')}
Navigation: ${summary.navigation.join(', ')}
Prices Found: ${summary.businessElements.prices.length > 0 ? 'Yes' : 'No'}
Services: ${summary.businessElements.services.join(', ')}
Products/Menu: ${summary.businessElements.products.join(', ')}
        `.trim();
    }

    generateReasoning(analysis, crawlResults) {
        const reasoning = [];
        
        if (analysis.detectedType) {
            const config = this.businessTypes[analysis.detectedType];
            reasoning.push(`Detected as ${analysis.detectedType} based on keyword patterns and content analysis`);
            
            // Add specific indicators found
            const topKeywords = config.keywords.slice(0, 5);
            const allText = this.extractAllText(crawlResults).toLowerCase();
            const foundKeywords = topKeywords.filter(keyword => 
                allText.includes(keyword.toLowerCase())
            );
            
            if (foundKeywords.length > 0) {
                reasoning.push(`Key indicators found: ${foundKeywords.join(', ')}`);
            }
        }
        
        return reasoning;
    }

    getAlternativeTypes(scores, primaryType) {
        return Object.entries(scores)
            .filter(([type, score]) => type !== primaryType && score > 0.2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([type, score]) => ({
                type,
                confidence: score,
                reason: `Secondary match based on content analysis`
            }));
    }

    // Type-specific extraction methods
    extractRestaurantInfo(crawlResults) {
        const services = ['Dining', 'Takeout'];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('delivery')) services.push('Delivery');
        if (allText.includes('catering')) services.push('Catering');
        if (allText.includes('reservation')) services.push('Reservations');
        
        return services;
    }

    extractClinicInfo(crawlResults) {
        const services = ['Consultations'];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('appointment')) services.push('Appointment Booking');
        if (allText.includes('emergency')) services.push('Emergency Care');
        if (allText.includes('specialist')) services.push('Specialist Care');
        
        return services;
    }

    extractEcommerceInfo(crawlResults) {
        const products = [];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('shipping')) products.push('Online Shopping');
        if (allText.includes('return')) products.push('Returns & Exchanges');
        if (allText.includes('review')) products.push('Product Reviews');
        
        return products;
    }

    extractServiceInfo(crawlResults) {
        const services = ['Consultation'];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('project')) services.push('Project Management');
        if (allText.includes('strategy')) services.push('Strategic Planning');
        if (allText.includes('support')) services.push('Support Services');
        
        return services;
    }

    extractFitnessInfo(crawlResults) {
        const services = ['Fitness Training'];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('class')) services.push('Group Classes');
        if (allText.includes('personal')) services.push('Personal Training');
        if (allText.includes('nutrition')) services.push('Nutrition Coaching');
        
        return services;
    }

    extractEducationInfo(crawlResults) {
        const services = ['Education'];
        const allText = this.extractAllText(crawlResults).toLowerCase();
        
        if (allText.includes('course')) services.push('Courses');
        if (allText.includes('certification')) services.push('Certifications');
        if (allText.includes('enrollment')) services.push('Enrollment Services');
        
        return services;
    }
}

module.exports = BusinessTypeDetector;
