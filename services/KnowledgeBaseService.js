/**
 * Knowledge Base Service
 * 
 * Manages website-specific knowledge and context for AI chatbot responses.
 * Extracts content from websites, maintains knowledge bases, and provides
 * contextual information for better AI responses.
 */

const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class KnowledgeBaseService {
    constructor() {
        this.knowledgeBases = new Map(); // Domain -> knowledge base
        this.contentCache = new Map(); // URL -> cached content
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        
        // Initialize with Mouna knowledge
        this.initializeMounaKnowledge();
    }

    /**
     * Determine whether a domain's knowledge is missing or stale
     * @param {string} domain
     * @param {number} maxAgeMs
     */
    isKnowledgeStale(domain, maxAgeMs = this.cacheExpiry) {
        try {
            const kb = this.getKnowledgeBase(domain);
            if (!kb) return true;
            const ts = new Date(kb.last_updated || kb.extracted_at || 0).getTime();
            if (!ts) return true;
            return (Date.now() - ts) > maxAgeMs;
        } catch (_) {
            return true;
        }
    }

    /**
     * Quick preview extraction for a single URL with a tight timeout to avoid blocking UX
     * Returns a minimal pageData object or null.
     */
    async extractQuickPreview(url, timeoutMs = 4000) {
        try {
            const response = await axios.get(url, {
                timeout: timeoutMs,
                headers: { 'User-Agent': 'Mouna-AI-Chatbot-QuickPreview/1.0' }
            });
            const $ = cheerio.load(response.data);
            const pageData = {
                url,
                title: $('title').first().text().trim(),
                meta_description: $('meta[name="description"]').attr('content') || '',
                headings: {
                    h1: $('h1').map((i, el) => $(el).text().trim()).get().slice(0, 5),
                    h2: $('h2').map((i, el) => $(el).text().trim()).get().slice(0, 8)
                },
                // keep it lightweight – just a few longer paragraphs
                paragraphs: $('p').map((i, el) => $(el).text().trim()).get()
                    .filter(t => t && t.length > 40).slice(0, 12),
                navigation: $('nav a, .nav a, .menu a').map((i, el) => ({
                    text: $(el).text().trim(),
                    href: $(el).attr('href')
                })).get().slice(0, 20),
                contact_info: this.extractContactInfo($),
                features: $('ul li, .features li, .services li').map((i, el) => $(el).text().trim()).get()
                    .filter(t => t && t.length > 10).slice(0, 20),
                pricing: this.extractPricingInfo($),
                extracted_at: new Date().toISOString()
            };
            return pageData;
        } catch (e) {
            console.warn('Quick preview failed for', url, e.message);
            return null;
        }
    }

    /**
     * Ensure we have at least minimal knowledge for a domain.
     * Optionally warm up using the specific source URL where the widget is embedded.
     * If knowledge is missing/stale, this will:
     *  - Synchronously build a minimal knowledge base using extractQuickPreview (fast)
     *  - Asynchronously kick off a full extractWebsiteKnowledge(domain)
     * Returns true if a warmup occurred (knowledge was created/updated), false otherwise.
     */
    async ensureKnowledgeForDomain(domain, options = {}) {
        const {
            sourceUrl = null,
            preferHttps = true,
            quickTimeoutMs = 4000,
            refreshMaxAgeMs = this.cacheExpiry
        } = options;

        // Derive composite key for subpath-based sites (e.g., github.io/user/project)
        let hostKey = domain;
        let pathKey = null;
        try {
            if (sourceUrl) {
                const u = new URL(sourceUrl);
                hostKey = u.host || domain;
                const seg = (u.pathname || '').split('/').filter(Boolean)[0];
                if (seg) pathKey = `${hostKey}/${seg}`;
            }
        } catch (_) {}

        const keyToCheck = pathKey || hostKey;
        const needWarmup = this.isKnowledgeStale(keyToCheck, refreshMaxAgeMs);
        if (!needWarmup) return false;

        // 1) Build a minimal knowledge base synchronously
        const baseUrl = sourceUrl || `${preferHttps ? 'https' : 'http'}://${hostKey}`;
        let preview = null;
        try {
            preview = await this.extractQuickPreview(baseUrl, quickTimeoutMs);
        } catch (_) {}

        if (preview) {
            const previewPath = new URL(preview.url).pathname || '/';
            const pagesObj = { [previewPath]: preview };
            const knowledge = {
                domain: hostKey,
                path_base: pathKey ? ('/' + pathKey.split('/').slice(1).join('/').split('/')[0]) : null,
                extracted_at: new Date().toISOString(),
                last_updated: new Date(),
                pages: pagesObj,
                meta_info: {},
                content_summary: this.generateContentSummary(pagesObj)
            };
            // Store under host and under pathKey (if any)
            this.knowledgeBases.set(hostKey, knowledge);
            if (pathKey) this.knowledgeBases.set(pathKey, knowledge);
            console.log(`⚡ Quick knowledge warmup stored for ${pathKey || hostKey}`);
        }

        // 2) Full extraction in the background (non-blocking)
        // Include the specific sourceUrl (path) when available so subpath sites are captured (e.g., GitHub Pages projects)
        const startUrls = [];
        try { if (sourceUrl) startUrls.push(sourceUrl); } catch (_) {}
        startUrls.push(`https://${hostKey}`, `http://${hostKey}`);
        this.extractWebsiteKnowledge(pathKey || hostKey, startUrls).catch(err => {
            console.warn(`Background extraction failed for ${pathKey || hostKey}:`, err.message);
        });

        return true;
    }

    /**
     * Initialize knowledge base for Mouna AI Chatbot Widget
     */
    initializeMounaKnowledge() {
        // Determine public domain/url for links used in knowledge content (avoid localhost leaks)
        const publicDomain = (process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_APP_DOMAIN || 'mouna-ai-chatbot-production.up.railway.app').replace(/\/$/, '');
        const publicUrl = publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`;

        const mounaKnowledge = {
            company: {
                name: "Mouna",
                tagline: "Voice of Thoughtful Silence",
                description: "AI Chatbot Widget platform that transforms websites with intelligent AI conversations",
                mission: "To help businesses engage customers 24/7 with smart, natural AI conversations without any coding required"
            },
            
            product: {
                name: "Mouna AI Chatbot Widget",
                type: "AI-powered chatbot widget for websites",
                setup_time: "Under 2 minutes",
                coding_required: false,
                availability: "24/7",
                
                key_features: [
                    "Smart AI conversations that understand customer context",
                    "Multi-language support (English, Hindi, Telugu, Tamil, Marathi, Kannada)",
                    "Easy integration with one line of code",
                    "Customizable appearance and behavior",
                    "Real-time analytics and insights",
                    "No technical skills required",
                    "Cancel anytime flexibility"
                ],
                
                benefits: [
                    "Convert website visitors into customers",
                    "Provide instant customer support",
                    "Reduce response time to seconds",
                    "Handle multiple conversations simultaneously",
                    "Available in multiple Indian languages",
                    "Seamless human handoff when needed"
                ]
            },
            
            pricing: {
                plans: [
                    {
                        name: "Free Tier",
                        price: "₹0/month",
                        description: "For trial/demo purposes",
                        features: [
                            "100 messages/month",
                            "Basic UI customization",
                            "Powered by watermark",
                            "No analytics/dashboard"
                        ],
                        limitations: ["Watermark included", "No analytics"]
                    },
                    {
                        name: "Basic Plan",
                        price: "₹499/month",
                        description: "For small businesses",
                        popular: true,
                        features: [
                            "1,000 messages/month",
                            "Basic dashboard (chat history, visitor logs)",
                            "API key integration",
                            "Email alerts for inquiries",
                            "Standard customization"
                        ]
                    },
                    {
                        name: "Pro Plan",
                        price: "₹1,499/month",
                        description: "For growing businesses",
                        features: [
                            "5,000 messages/month",
                            "Custom branding (remove watermark)",
                            "Dashboard + analytics",
                            "WhatsApp/email integration",
                            "Priority support",
                            "Advanced customization"
                        ]
                    },
                    {
                        name: "Enterprise Plan",
                        price: "₹4,999/month",
                        description: "For large organizations",
                        features: [
                            "Unlimited messages",
                            "Full white-labeling",
                            "Custom API & backend logic",
                            "Team access with roles",
                            "Dedicated success manager",
                            "Custom deployment options"
                        ]
                    }
                ]
            },
            
            integration: {
                steps: [
                    "Sign up for free account",
                    "Customize your chatbot appearance",
                    "Copy the generated widget code",
                    "Paste one line of code in your website",
                    "Your AI assistant goes live immediately"
                ],
                supported_platforms: [
                    "WordPress", "Shopify", "Wix", "Squarespace", 
                    "Custom HTML websites", "React apps", "Vue.js apps", "Angular apps"
                ]
            },
            
            support: {
                availability: "24/7 priority support for Pro and Enterprise plans",
                channels: ["Email", "Chat", "WhatsApp integration"],
                response_time: "Usually replies instantly",
                documentation: "Comprehensive setup guides and API documentation available"
            },
            
            technical: {
                languages_supported: [
                    "English", "Hindi (हिंदी)", "Telugu (తెలుగు)", 
                    "Tamil (தமிழ்)", "Marathi (मराठी)", "Kannada (ಕನ್ನಡ)"
                ],
                features: [
                    "Real-time language detection",
                    "Automatic transliteration for Telugu",
                    "Context-aware responses",
                    "Smart typing indicators",
                    "Mobile responsive design",
                    "GDPR compliant",
                    "SSL encrypted"
                ]
            },
            
            use_cases: [
                "Customer support automation",
                "Lead generation and qualification",
                "Product inquiries and recommendations",
                "Booking appointments and consultations",
                "Technical support and troubleshooting",
                "Order status and shipping information",
                "FAQ automation",
                "Multi-language customer service"
            ],
            
            contact: {
                website: publicUrl,
                email: "support@mounaai.com",
                demo: "Click 'See Live Demo' button to try it now",
                signup: "Click 'Start Free Trial' to get started"
            }
        };

        // Set Mouna knowledge for localhost and common domains
        this.knowledgeBases.set('localhost:3000', mounaKnowledge);
        this.knowledgeBases.set('localhost', mounaKnowledge);
        this.knowledgeBases.set('127.0.0.1:3000', mounaKnowledge);
        this.knowledgeBases.set('mounaai.com', mounaKnowledge);
        // Production Railway domain (dynamic) so the model references the correct public URL
        const domainKey = publicDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        this.knowledgeBases.set(domainKey, mounaKnowledge);
    }

    /**
     * Extract knowledge from a website
     */
    async extractWebsiteKnowledge(domainKey, urls = []) {
        try {
            console.log(`📖 Extracting knowledge for key: ${domainKey}`);
            
            if (urls.length === 0) {
                urls = [`http://${domainKey}`, `https://${domainKey}`];
            }

            // Infer host and base path from first URL if possible
            let host = domainKey;
            let basePath = null;
            try {
                const u0 = new URL(urls[0]);
                host = u0.host || domainKey;
                const seg = (u0.pathname || '').split('/').filter(Boolean)[0];
                if (seg) basePath = '/' + seg;
            } catch (_) {}

            const knowledge = {
                domain: host,
                path_base: basePath,
                extracted_at: new Date().toISOString(),
                pages: {},
                meta_info: {},
                content_summary: {},
                last_updated: new Date()
            };

            // Extract from each URL
            for (const url of urls) {
                try {
                    const pageData = await this.extractPageContent(url);
                    if (pageData) {
                        const urlKey = new URL(url).pathname || 'home';
                        knowledge.pages[urlKey] = pageData;
                    }
                } catch (error) {
                    console.warn(`Could not extract from ${url}:`, error.message);
                }
            }

            // Generate content summary
            knowledge.content_summary = this.generateContentSummary(knowledge.pages);

            // Cache the knowledge under both host key and path key (if applicable)
            const hostKey = host;
            const pathKey = basePath ? `${host}${basePath}` : null;
            this.knowledgeBases.set(hostKey, knowledge);
            if (pathKey) this.knowledgeBases.set(pathKey, knowledge);
            
            console.log(`✅ Knowledge extracted for ${pathKey || hostKey}: ${Object.keys(knowledge.pages).length} pages`);
            return knowledge;

        } catch (error) {
            console.error(`Error extracting knowledge for ${domainKey}:`, error);
            throw error;
        }
    }

    /**
     * Extract content from a specific page
     */
    async extractPageContent(url) {
        try {
            // Check cache first
            const cached = this.contentCache.get(url);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mouna-AI-Chatbot-Knowledge-Extractor/1.0'
                }
            });

            const $ = cheerio.load(response.data);

            // Extract key information
            const pageData = {
                url: url,
                title: $('title').text().trim(),
                meta_description: $('meta[name="description"]').attr('content') || '',
                meta_keywords: $('meta[name="keywords"]').attr('content') || '',
                
                // Main content extraction
                headings: {
                    h1: $('h1').map((i, el) => $(el).text().trim()).get(),
                    h2: $('h2').map((i, el) => $(el).text().trim()).get(),
                    h3: $('h3').map((i, el) => $(el).text().trim()).get()
                },
                
                // Text content (cleaned)
                paragraphs: $('p').map((i, el) => $(el).text().trim()).get()
                    .filter(text => text.length > 20), // Filter out short/empty paragraphs
                
                // Navigation and menu items
                navigation: $('nav a, .nav a, .menu a').map((i, el) => ({
                    text: $(el).text().trim(),
                    href: $(el).attr('href')
                })).get(),
                
                // Contact information
                contact_info: this.extractContactInfo($),
                
                // Features/services (from lists)
                features: $('ul li, .features li, .services li').map((i, el) => 
                    $(el).text().trim()
                ).get().filter(text => text.length > 10),
                
                // Pricing information
                pricing: this.extractPricingInfo($),
                
                extracted_at: new Date().toISOString()
            };

            // Cache the result
            this.contentCache.set(url, {
                data: pageData,
                timestamp: Date.now()
            });

            return pageData;

        } catch (error) {
            console.warn(`Failed to extract content from ${url}:`, error.message);
            return null;
        }
    }

    /**
     * Extract contact information from page
     */
    extractContactInfo($) {
        const contactInfo = {};

        // Email extraction
        const emails = $('a[href^="mailto:"]').map((i, el) => 
            $(el).attr('href').replace('mailto:', '')
        ).get();
        if (emails.length > 0) contactInfo.emails = emails;

        // Phone extraction
        const phones = $('a[href^="tel:"]').map((i, el) => 
            $(el).attr('href').replace('tel:', '')
        ).get();
        if (phones.length > 0) contactInfo.phones = phones;

        // Address extraction (look for common address patterns)
        const addressTexts = $('address, .address, .contact-address').map((i, el) => 
            $(el).text().trim()
        ).get();
        if (addressTexts.length > 0) contactInfo.addresses = addressTexts;

        return contactInfo;
    }

    /**
     * Extract pricing information from page
     */
    extractPricingInfo($) {
        const pricing = [];

        // Look for pricing cards/sections
        $('.price, .pricing-card, .plan').each((i, el) => {
            const $el = $(el);
            const plan = {
                name: $el.find('.plan-name, h3, h4').first().text().trim(),
                price: $el.find('.price, .amount').first().text().trim(),
                features: $el.find('li').map((j, li) => $(li).text().trim()).get()
            };
            
            if (plan.name && plan.price) {
                pricing.push(plan);
            }
        });

        return pricing;
    }

    /**
     * Generate content summary from extracted pages
     */
    generateContentSummary(pages) {
        const summary = {
            total_pages: Object.keys(pages).length,
            main_topics: [],
            key_features: [],
            contact_methods: [],
            pricing_plans: 0
        };

        // Aggregate information from all pages
        for (const [path, pageData] of Object.entries(pages)) {
            if (pageData.headings.h1.length > 0) {
                summary.main_topics.push(...pageData.headings.h1);
            }
            
            if (pageData.features.length > 0) {
                summary.key_features.push(...pageData.features);
            }
            
            if (pageData.contact_info.emails) {
                summary.contact_methods.push(...pageData.contact_info.emails);
            }
            
            if (pageData.pricing.length > 0) {
                summary.pricing_plans += pageData.pricing.length;
            }
        }

        // Deduplicate and clean up
        summary.main_topics = [...new Set(summary.main_topics)];
        summary.key_features = [...new Set(summary.key_features)];
        summary.contact_methods = [...new Set(summary.contact_methods)];

        return summary;
    }

    /**
     * Get knowledge base for a specific domain
     */
    getKnowledgeBase(domain) {
        // Try exact match first
        if (this.knowledgeBases.has(domain)) {
            return this.knowledgeBases.get(domain);
        }

        // Try without port
        const domainWithoutPort = (domain || '').split(':')[0];
        if (this.knowledgeBases.has(domainWithoutPort)) {
            return this.knowledgeBases.get(domainWithoutPort);
        }

        // Try common variations (avoid falling back to localhost for unrelated domains)
        const variations = [
            `www.${domainWithoutPort}`,
            domainWithoutPort.replace('www.', '')
        ];

        for (const variation of variations) {
            if (this.knowledgeBases.has(variation)) {
                return this.knowledgeBases.get(variation);
            }
        }

        return null;
    }

    /**
     * Get knowledge base for a full URL (prefers host+basePath key)
     */
    getKnowledgeForUrl(url) {
        try {
            const u = new URL(url);
            const host = u.host;
            const seg = (u.pathname || '').split('/').filter(Boolean)[0];
            const pathKey = seg ? `${host}/${seg}` : null;
            if (pathKey && this.knowledgeBases.has(pathKey)) return this.knowledgeBases.get(pathKey);
            if (this.knowledgeBases.has(host)) return this.knowledgeBases.get(host);
            // Fallbacks
            return this.getKnowledgeBase(host);
        } catch (_) {
            return null;
        }
    }

    /**
     * Generate contextual prompt based on knowledge base
     */
    generateContextualPrompt(domain, language = 'en') {
        const knowledge = this.getKnowledgeBase(domain);
        
        if (!knowledge) {
            return null;
        }

        // Generate prompt based on knowledge structure
        if (knowledge.company) {
            // Mouna-style knowledge base
            return this.generateMounaPrompt(knowledge, language);
        } else {
            // General website knowledge base
            return this.generateGeneralPrompt(knowledge, language);
        }
    }

    /**
     * Convenience: generate prompt from a full page URL
     */
    generateContextualPromptForUrl(pageUrl, language = 'en') {
        const knowledge = this.getKnowledgeForUrl(pageUrl);
        if (!knowledge) return null;
        if (knowledge.company) return this.generateMounaPrompt(knowledge, language);
        return this.generateGeneralPrompt(knowledge, language);
    }

    /**
     * Generate Mouna-specific contextual prompt
     */
    generateMounaPrompt(knowledge, language) {
        const company = knowledge.company;
        const product = knowledge.product;
        const pricing = knowledge.pricing;

        let prompt = `You are ${company.name}, an AI assistant for ${company.name} - ${company.tagline}. 

ABOUT ${company.name.toUpperCase()}:
${company.description}
Mission: ${company.mission}

PRODUCT INFORMATION:
- Product: ${product.name}
- Setup Time: ${product.setup_time}
- Coding Required: ${product.coding_required ? 'Yes' : 'No coding required'}
- Availability: ${product.availability}

KEY FEATURES:
${product.key_features.map(feature => `• ${feature}`).join('\n')}

PRICING PLANS:
${pricing.plans.map(plan => 
    `• ${plan.name}: ${plan.price} - ${plan.description}`
).join('\n')}

INTEGRATION STEPS:
${knowledge.integration.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

SUPPORTED LANGUAGES: ${knowledge.technical.languages_supported.join(', ')}

CONTACT & DEMO:
- Website: ${knowledge.contact.website}
- Demo: ${knowledge.contact.demo}
- Sign up: ${knowledge.contact.signup}

INSTRUCTIONS:
- Always respond in a helpful, professional, and friendly manner
- Provide specific information about Mouna's features and pricing
- Encourage users to try the free demo or start a free trial
- If asked about competitors, focus on Mouna's unique benefits
- For technical questions, mention the easy setup (under 2 minutes, no coding)
- For pricing questions, highlight the free tier and recommend the Basic plan for small businesses
- Always be enthusiastic about the multi-language support and Indian market focus
`;

        if (language !== 'en') {
            prompt += `\n- Respond primarily in ${language} but include English terms for technical concepts when appropriate`;
        }

        return prompt;
    }

    /**
     * Generate general website contextual prompt
     */
    generateGeneralPrompt(knowledge, language) {
        const summary = knowledge.content_summary;
        const domain = knowledge.domain;

        let prompt = `You are an AI assistant for ${domain}. 

WEBSITE INFORMATION:
- Domain: ${domain}
- Pages analyzed: ${summary.total_pages}
- Last updated: ${knowledge.last_updated}

MAIN TOPICS & SERVICES:
${summary.main_topics.map(topic => `• ${topic}`).join('\n')}

KEY FEATURES:
${summary.key_features.slice(0, 10).map(feature => `• ${feature}`).join('\n')}

CONTACT INFORMATION:
${summary.contact_methods.map(contact => `• ${contact}`).join('\n')}

INSTRUCTIONS:
- Answer questions specifically about this website and its content
- Provide helpful information based on the extracted website knowledge
- If you don't have specific information, acknowledge it and offer to help with general inquiries
- Always maintain a professional and helpful tone
- Encourage users to explore the website's features and services
`;

        if (language !== 'en') {
            prompt += `\n- Respond in ${language} when possible`;
        }

        return prompt;
    }

    /**
     * Update knowledge base for a domain
     */
    async updateKnowledgeBase(domain, customKnowledge = null) {
        try {
            if (customKnowledge) {
                // Direct knowledge injection
                this.knowledgeBases.set(domain, {
                    ...customKnowledge,
                    domain: domain,
                    last_updated: new Date(),
                    source: 'manual'
                });
                console.log(`✅ Custom knowledge injected for ${domain}`);
            } else {
                // Extract from website
                await this.extractWebsiteKnowledge(domain);
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to update knowledge base for ${domain}:`, error);
            return false;
        }
    }

    /**
     * Search knowledge base for relevant information
     */
    searchKnowledge(domain, query) {
        const knowledge = this.getKnowledgeBase(domain);
        if (!knowledge) return null;

        const results = [];
        const queryLower = query.toLowerCase();

        // Search in different sections based on knowledge structure
        if (knowledge.company) {
            // Mouna-style search
            if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('plan')) {
                results.push({
                    type: 'pricing',
                    data: knowledge.pricing.plans,
                    relevance: 'high'
                });
            }
            
            if (queryLower.includes('feature') || queryLower.includes('benefit')) {
                results.push({
                    type: 'features',
                    data: knowledge.product.key_features,
                    relevance: 'high'
                });
            }
            
            if (queryLower.includes('setup') || queryLower.includes('integrate') || queryLower.includes('install')) {
                results.push({
                    type: 'integration',
                    data: knowledge.integration.steps,
                    relevance: 'high'
                });
            }
        }

        return results.length > 0 ? results : null;
    }
}

module.exports = KnowledgeBaseService;
