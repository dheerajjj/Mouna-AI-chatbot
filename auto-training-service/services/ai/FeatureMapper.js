/**
 * FeatureMapper - Automatic Feature Enablement
 * 
 * Maps business types to appropriate chatbot features:
 * - Restaurant: Menu browsing, reservations, delivery tracking
 * - Clinic: Appointment booking, doctor profiles, insurance info
 * - E-commerce: Product search, order tracking, cart assistance
 * - Service: Consultation booking, quote requests, portfolio display
 * - Fitness: Class scheduling, membership info, trainer profiles
 * - Education: Course enrollment, academic info, student services
 */

class FeatureMapper {
    constructor() {
        this.featureMapping = {
            restaurant: {
                enabledFeatures: {
                    bookings: true,          // Table reservations
                    orders: false,           // Not for dining (use delivery apps)
                    slots: true,             // Time slot management
                    payments: false,         // Usually handled separately
                    analytics: true,         // Business insights
                    menu: true,              // Menu display
                    delivery: true,          // Delivery info
                    dietary: true            // Dietary restrictions
                },
                
                primaryColor: '#e74c3c',     // Restaurant red
                
                welcomeMessage: '🍽️ Welcome! I can help you with our menu, make reservations, answer questions about dietary restrictions, and provide information about delivery options.',
                
                features: {
                    menu: {
                        title: 'Menu & Ordering',
                        description: 'Browse menu items and get information about dishes',
                        keywords: ['menu', 'food', 'dish', 'price', 'ingredients', 'special'],
                        responses: [
                            'Let me help you explore our menu options.',
                            'I can provide details about any dish on our menu.',
                            'Would you like to know about our daily specials?'
                        ]
                    },
                    bookings: {
                        title: 'Table Reservations',
                        description: 'Make and manage table reservations',
                        keywords: ['reservation', 'table', 'booking', 'book', 'reserve'],
                        responses: [
                            'I can help you make a reservation. What date and time work for you?',
                            'Let me check our availability for your preferred time.',
                            'How many guests will be dining with us?'
                        ]
                    },
                    delivery: {
                        title: 'Delivery & Takeout',
                        description: 'Information about delivery areas and takeout options',
                        keywords: ['delivery', 'takeout', 'pickup', 'order', 'deliver'],
                        responses: [
                            'We offer both delivery and takeout options.',
                            'Let me check if we deliver to your area.',
                            'Our takeout orders are usually ready in 15-20 minutes.'
                        ]
                    }
                }
            },

            clinic: {
                enabledFeatures: {
                    bookings: true,          // Appointment scheduling
                    orders: false,           // Not applicable
                    slots: true,             // Doctor time slots
                    payments: false,         // Usually handled separately
                    analytics: true,         // Patient analytics
                    appointments: true,      // Appointment management
                    doctors: true,           // Doctor profiles
                    insurance: true          // Insurance information
                },
                
                primaryColor: '#3498db',     // Medical blue
                
                welcomeMessage: '🏥 Hello! I can help you schedule appointments, provide information about our doctors and services, answer questions about insurance coverage, and assist with patient inquiries.',
                
                features: {
                    appointments: {
                        title: 'Appointment Scheduling',
                        description: 'Schedule and manage medical appointments',
                        keywords: ['appointment', 'schedule', 'doctor', 'visit', 'book'],
                        responses: [
                            'I can help you schedule an appointment. Which doctor would you like to see?',
                            'What type of appointment do you need?',
                            'Let me check the available appointment slots.'
                        ]
                    },
                    doctors: {
                        title: 'Doctor Information',
                        description: 'Information about medical staff and specialties',
                        keywords: ['doctor', 'physician', 'specialist', 'staff'],
                        responses: [
                            'I can provide information about our medical staff.',
                            'What type of specialist are you looking for?',
                            'Let me tell you about our doctors and their specialties.'
                        ]
                    },
                    insurance: {
                        title: 'Insurance & Billing',
                        description: 'Insurance coverage and billing information',
                        keywords: ['insurance', 'coverage', 'billing', 'payment', 'cost'],
                        responses: [
                            'I can help with insurance and billing questions.',
                            'What insurance provider do you have?',
                            'Let me check what services are covered under your plan.'
                        ]
                    }
                }
            },

            ecommerce: {
                enabledFeatures: {
                    bookings: false,         // Not applicable
                    orders: true,            // Order management
                    slots: false,            // Not applicable
                    payments: true,          // Payment processing
                    analytics: true,         // Sales analytics
                    products: true,          // Product catalog
                    cart: true,              // Shopping cart assistance
                    shipping: true           // Shipping information
                },
                
                primaryColor: '#f39c12',     // E-commerce orange
                
                welcomeMessage: '🛒 Welcome to our store! I can help you find products, track your orders, answer questions about shipping and returns, and assist with your shopping experience.',
                
                features: {
                    products: {
                        title: 'Product Search & Info',
                        description: 'Find products and get detailed information',
                        keywords: ['product', 'item', 'search', 'find', 'price', 'specifications'],
                        responses: [
                            'What product are you looking for?',
                            'I can help you find the perfect item.',
                            'Let me show you our product recommendations.'
                        ]
                    },
                    orders: {
                        title: 'Order Tracking',
                        description: 'Track orders and manage purchases',
                        keywords: ['order', 'track', 'tracking', 'purchase', 'delivery'],
                        responses: [
                            'I can help you track your order. What\'s your order number?',
                            'Let me check the status of your recent purchase.',
                            'Your order is being processed and will ship soon.'
                        ]
                    },
                    shipping: {
                        title: 'Shipping & Returns',
                        description: 'Information about shipping options and return policy',
                        keywords: ['shipping', 'delivery', 'return', 'exchange', 'refund'],
                        responses: [
                            'We offer various shipping options to meet your needs.',
                            'Our return policy allows 30 days for most items.',
                            'Let me help you with shipping or return information.'
                        ]
                    }
                }
            },

            service: {
                enabledFeatures: {
                    bookings: true,          // Consultation bookings
                    orders: false,           // Service quotes instead
                    slots: true,             // Consultation slots
                    payments: false,         // Usually handled separately
                    analytics: true,         // Service analytics
                    consultation: true,      // Consultation scheduling
                    portfolio: true,         // Work portfolio
                    quotes: true             // Quote requests
                },
                
                primaryColor: '#9b59b6',     // Professional purple
                
                welcomeMessage: '💼 Hello! I can help you learn about our services, schedule consultations, request quotes, and answer questions about our expertise and approach.',
                
                features: {
                    consultation: {
                        title: 'Consultation Booking',
                        description: 'Schedule consultation meetings',
                        keywords: ['consultation', 'meeting', 'discuss', 'schedule', 'book'],
                        responses: [
                            'I can help you schedule a consultation. When would work best for you?',
                            'Let\'s set up a time to discuss your project needs.',
                            'What type of consultation are you interested in?'
                        ]
                    },
                    quotes: {
                        title: 'Quote Requests',
                        description: 'Request project quotes and estimates',
                        keywords: ['quote', 'estimate', 'price', 'cost', 'project'],
                        responses: [
                            'I can help you request a quote for your project.',
                            'Tell me about your project requirements.',
                            'Let me gather some information for your quote.'
                        ]
                    },
                    portfolio: {
                        title: 'Portfolio & Case Studies',
                        description: 'View work examples and case studies',
                        keywords: ['portfolio', 'work', 'examples', 'case study', 'projects'],
                        responses: [
                            'I can show you examples of our previous work.',
                            'Would you like to see case studies relevant to your industry?',
                            'Let me share some of our successful project examples.'
                        ]
                    }
                }
            },

            fitness: {
                enabledFeatures: {
                    bookings: true,          // Class bookings
                    orders: false,           // Not applicable
                    slots: true,             // Class time slots
                    payments: true,          // Membership payments
                    analytics: true,         // Fitness analytics
                    classes: true,           // Class scheduling
                    membership: true,        // Membership info
                    trainers: true           // Trainer profiles
                },
                
                primaryColor: '#2ecc71',     // Fitness green
                
                welcomeMessage: '💪 Welcome! I can help you find fitness classes, book sessions, learn about membership options, and connect you with our trainers.',
                
                features: {
                    classes: {
                        title: 'Class Scheduling',
                        description: 'View and book fitness classes',
                        keywords: ['class', 'schedule', 'workout', 'fitness', 'book'],
                        responses: [
                            'What type of fitness class are you interested in?',
                            'I can show you our class schedule and help you book a spot.',
                            'Let me find classes that match your fitness goals.'
                        ]
                    },
                    membership: {
                        title: 'Membership Information',
                        description: 'Membership plans and pricing',
                        keywords: ['membership', 'plan', 'price', 'join', 'sign up'],
                        responses: [
                            'I can explain our membership options and pricing.',
                            'Which membership plan interests you most?',
                            'Let me help you find the right membership for your needs.'
                        ]
                    },
                    trainers: {
                        title: 'Personal Trainers',
                        description: 'Information about personal trainers',
                        keywords: ['trainer', 'personal', 'coach', 'instructor'],
                        responses: [
                            'I can connect you with one of our certified personal trainers.',
                            'What are your fitness goals? I can recommend a trainer.',
                            'Our trainers specialize in various areas. What interests you?'
                        ]
                    }
                }
            },

            education: {
                enabledFeatures: {
                    bookings: true,          // Course enrollment
                    orders: false,           // Not applicable
                    slots: true,             // Class schedules
                    payments: true,          // Tuition payments
                    analytics: true,         // Academic analytics
                    courses: true,           // Course catalog
                    enrollment: true,        // Enrollment assistance
                    faculty: true            // Faculty information
                },
                
                primaryColor: '#e67e22',     // Education orange
                
                welcomeMessage: '📚 Welcome! I can help you explore our courses, assist with enrollment, provide information about our faculty, and answer academic questions.',
                
                features: {
                    courses: {
                        title: 'Course Information',
                        description: 'Browse and learn about available courses',
                        keywords: ['course', 'class', 'program', 'curriculum', 'study'],
                        responses: [
                            'What subject or field of study interests you?',
                            'I can help you find courses that match your goals.',
                            'Let me show you our course offerings and requirements.'
                        ]
                    },
                    enrollment: {
                        title: 'Enrollment Assistance',
                        description: 'Help with course enrollment and registration',
                        keywords: ['enroll', 'register', 'admission', 'apply'],
                        responses: [
                            'I can guide you through the enrollment process.',
                            'What courses would you like to register for?',
                            'Let me help you with the application requirements.'
                        ]
                    },
                    faculty: {
                        title: 'Faculty & Staff',
                        description: 'Information about instructors and staff',
                        keywords: ['faculty', 'teacher', 'professor', 'instructor', 'staff'],
                        responses: [
                            'I can provide information about our faculty members.',
                            'Would you like to know about instructors for a specific course?',
                            'Our faculty are experts in their respective fields.'
                        ]
                    }
                }
            }
        };

        // Default configuration for unknown business types
        this.defaultConfiguration = {
            enabledFeatures: {
                bookings: false,
                orders: false,
                slots: false,
                payments: false,
                analytics: true
            },
            primaryColor: '#667eea',
            welcomeMessage: '👋 Hello! I\'m here to help you with any questions about our business. How can I assist you today?',
            features: {}
        };
    }

    /**
     * Map business type to appropriate tenant features
     * @param {Object} businessAnalysis - Business type analysis results
     * @param {Object} knowledgeBase - Generated knowledge base
     * @returns {Object} Tenant configuration
     */
    async mapBusinessToFeatures(businessAnalysis, knowledgeBase) {
        console.log(`🗺️ Mapping features for business type: ${businessAnalysis.detectedType}`);
        
        try {
            const businessType = businessAnalysis.detectedType;
            const mapping = this.featureMapping[businessType] || this.defaultConfiguration;
            
            // Base configuration
            const tenantConfig = {
                businessType: businessType,
                confidence: businessAnalysis.confidence,
                autoConfigured: true,
                configuredAt: new Date(),
                
                // Feature enablement
                enabledFeatures: { ...mapping.enabledFeatures },
                
                // UI customization
                primaryColor: mapping.primaryColor,
                welcomeMessage: this.personalizeWelcomeMessage(mapping.welcomeMessage, knowledgeBase),
                
                // Feature-specific configurations
                features: { ...mapping.features },
                
                // Auto-generated responses and actions
                autoResponses: this.generateAutoResponses(businessType, knowledgeBase),
                
                // System prompts for AI
                systemPrompts: this.generateSystemPrompts(businessType, knowledgeBase),
                
                // Business context
                businessContext: this.extractBusinessContext(businessAnalysis, knowledgeBase)
            };
            
            // Apply knowledge-base specific enhancements
            this.enhanceWithKnowledgeBase(tenantConfig, knowledgeBase);
            
            // Apply business-specific customizations
            this.applyBusinessSpecificCustomizations(tenantConfig, businessAnalysis);
            
            console.log(`✅ Feature mapping complete: ${Object.keys(tenantConfig.enabledFeatures).filter(f => tenantConfig.enabledFeatures[f]).length} features enabled`);
            
            return tenantConfig;
            
        } catch (error) {
            console.error('❌ Feature mapping failed:', error);
            throw error;
        }
    }

    /**
     * Personalize welcome message with business-specific details
     * @param {string} baseMessage - Base welcome message
     * @param {Object} knowledgeBase - Knowledge base with business info
     * @returns {string} Personalized welcome message
     */
    personalizeWelcomeMessage(baseMessage, knowledgeBase) {
        let message = baseMessage;
        
        // Add business name if available
        const businessName = knowledgeBase.contactInfo?.businessName;
        if (businessName) {
            message = message.replace(/Welcome/, `Welcome to ${businessName}`);
            message = message.replace(/Hello/, `Hello! Welcome to ${businessName}`);
        }
        
        // Add specific services if available
        if (knowledgeBase.services && knowledgeBase.services.length > 0) {
            const mainServices = knowledgeBase.services.slice(0, 3).map(s => s.name || s).join(', ');
            message += ` We specialize in ${mainServices}.`;
        }
        
        return message;
    }

    /**
     * Generate auto-responses based on business type and knowledge
     * @param {string} businessType - Detected business type
     * @param {Object} knowledgeBase - Knowledge base
     * @returns {Array} Auto-response configurations
     */
    generateAutoResponses(businessType, knowledgeBase) {
        const responses = [];
        
        // Add contact information responses
        if (knowledgeBase.contactInfo?.phone) {
            responses.push({
                keywords: ['phone', 'call', 'contact', 'number'],
                response: `You can reach us at ${knowledgeBase.contactInfo.phone}. Is there anything specific you'd like to discuss?`
            });
        }
        
        if (knowledgeBase.contactInfo?.email) {
            responses.push({
                keywords: ['email', 'contact', 'reach'],
                response: `You can email us at ${knowledgeBase.contactInfo.email}. We typically respond within 24 hours.`
            });
        }
        
        // Add business hours responses
        if (knowledgeBase.businessHours && knowledgeBase.businessHours.length > 0) {
            responses.push({
                keywords: ['hours', 'open', 'closed', 'time'],
                response: `Our business hours are: ${knowledgeBase.businessHours.slice(0, 2).join(', ')}. How can I help you today?`
            });
        }
        
        // Add business-type specific responses
        const typeSpecificResponses = this.generateTypeSpecificResponses(businessType, knowledgeBase);
        responses.push(...typeSpecificResponses);
        
        return responses;
    }

    /**
     * Generate business-type specific auto-responses
     * @param {string} businessType - Business type
     * @param {Object} knowledgeBase - Knowledge base
     * @returns {Array} Type-specific responses
     */
    generateTypeSpecificResponses(businessType, knowledgeBase) {
        const responses = [];
        
        switch (businessType) {
            case 'restaurant':
                responses.push(
                    {
                        keywords: ['menu', 'food', 'eat'],
                        response: 'I can help you with our menu! We offer a variety of delicious options. Would you like to know about any specific dishes or dietary preferences?'
                    },
                    {
                        keywords: ['reservation', 'book', 'table'],
                        response: 'I can help you make a reservation! What date and time would work best for you, and how many guests will be joining?'
                    },
                    {
                        keywords: ['delivery', 'takeout', 'order'],
                        response: 'We offer both delivery and takeout options. Let me help you with your order or check if we deliver to your area!'
                    }
                );
                break;
                
            case 'clinic':
                responses.push(
                    {
                        keywords: ['appointment', 'schedule', 'book'],
                        response: 'I can help you schedule an appointment. What type of appointment do you need, and do you have a preferred date and time?'
                    },
                    {
                        keywords: ['doctor', 'physician'],
                        response: 'I can provide information about our medical staff. What type of specialist or service are you looking for?'
                    },
                    {
                        keywords: ['insurance', 'coverage'],
                        response: 'I can help with insurance questions. What insurance provider do you have? I can check what services are covered.'
                    }
                );
                break;
                
            case 'ecommerce':
                responses.push(
                    {
                        keywords: ['product', 'buy', 'purchase'],
                        response: 'I can help you find products! What are you looking for today? I can provide details, pricing, and availability.'
                    },
                    {
                        keywords: ['order', 'track', 'tracking'],
                        response: 'I can help you track your order! Do you have your order number? I can check the status and estimated delivery time.'
                    },
                    {
                        keywords: ['return', 'exchange', 'refund'],
                        response: 'I can help with returns and exchanges. Most items can be returned within 30 days. What item would you like to return?'
                    }
                );
                break;
                
            case 'service':
                responses.push(
                    {
                        keywords: ['consultation', 'meeting'],
                        response: 'I can help you schedule a consultation. What type of service are you interested in, and when would be a good time to meet?'
                    },
                    {
                        keywords: ['quote', 'estimate', 'price'],
                        response: 'I can help you request a quote. Tell me about your project requirements, and I\'ll gather the information needed for an estimate.'
                    }
                );
                break;
                
            case 'fitness':
                responses.push(
                    {
                        keywords: ['class', 'workout', 'schedule'],
                        response: 'I can help you find fitness classes! What type of workout are you interested in? I can show you our schedule and help you book a spot.'
                    },
                    {
                        keywords: ['membership', 'join', 'sign up'],
                        response: 'I can help you with membership information! We have several plans available. What are your fitness goals?'
                    }
                );
                break;
                
            case 'education':
                responses.push(
                    {
                        keywords: ['course', 'class', 'program'],
                        response: 'I can help you explore our courses! What subject or field of study interests you? I can provide details about our programs.'
                    },
                    {
                        keywords: ['enroll', 'register', 'admission'],
                        response: 'I can assist with enrollment! What courses are you interested in? I can guide you through the registration process.'
                    }
                );
                break;
        }
        
        return responses;
    }

    /**
     * Generate system prompts for AI conversations
     * @param {string} businessType - Business type
     * @param {Object} knowledgeBase - Knowledge base
     * @returns {Object} System prompts configuration
     */
    generateSystemPrompts(businessType, knowledgeBase) {
        const businessName = knowledgeBase.contactInfo?.businessName || 'our business';
        const basePrompt = `You are a helpful AI assistant for ${businessName}, a ${businessType} business.`;
        
        const typeSpecificPrompts = {
            restaurant: `${basePrompt} You help customers with menu inquiries, make reservations, answer questions about dietary restrictions, provide delivery information, and assist with dining-related questions. Always be friendly and food-focused in your responses.`,
            
            clinic: `${basePrompt} You assist patients with appointment scheduling, provide information about medical services, help with insurance questions, and offer general healthcare guidance. Maintain a professional, caring tone and never provide specific medical advice.`,
            
            ecommerce: `${basePrompt} You help customers find products, track orders, answer questions about shipping and returns, and assist with the shopping experience. Be helpful with product recommendations and purchasing decisions.`,
            
            service: `${basePrompt} You help potential clients understand services offered, schedule consultations, assist with quote requests, and showcase the company's expertise. Maintain a professional, consultative approach.`,
            
            fitness: `${basePrompt} You help members and potential members with class scheduling, membership information, fitness guidance, and connecting with trainers. Be motivating and health-focused in your responses.`,
            
            education: `${basePrompt} You assist students and prospective students with course information, enrollment processes, academic questions, and connecting with faculty. Maintain an educational, supportive tone.`
        };
        
        return {
            main: typeSpecificPrompts[businessType] || `${basePrompt} You provide helpful information and assistance with general business inquiries.`,
            
            context: {
                businessType: businessType,
                businessName: businessName,
                services: knowledgeBase.services?.slice(0, 5).map(s => s.name || s) || [],
                contact: knowledgeBase.contactInfo || {},
                specialInstructions: this.getSpecialInstructions(businessType)
            }
        };
    }

    /**
     * Get special instructions for business type
     * @param {string} businessType - Business type
     * @returns {Array} Special instructions
     */
    getSpecialInstructions(businessType) {
        const instructions = {
            restaurant: [
                'Always ask about dietary restrictions and allergies',
                'Mention daily specials when relevant',
                'Suggest complementary items',
                'Provide accurate timing for reservations and orders'
            ],
            clinic: [
                'Never provide specific medical advice or diagnoses',
                'Always recommend consulting with healthcare professionals',
                'Be sensitive to health concerns',
                'Protect patient privacy and confidentiality'
            ],
            ecommerce: [
                'Ask qualifying questions to recommend products',
                'Always provide accurate pricing and availability',
                'Explain return policies clearly',
                'Suggest related or complementary products'
            ],
            service: [
                'Ask about project scope and requirements',
                'Highlight relevant experience and expertise',
                'Suggest appropriate service packages',
                'Qualify leads for consultations'
            ],
            fitness: [
                'Ask about fitness goals and experience level',
                'Recommend appropriate classes and programs',
                'Emphasize safety and proper form',
                'Encourage consistent participation'
            ],
            education: [
                'Ask about career goals and interests',
                'Explain prerequisites and requirements clearly',
                'Provide academic pathway guidance',
                'Connect students with appropriate resources'
            ]
        };
        
        return instructions[businessType] || [
            'Provide accurate and helpful information',
            'Be professional and courteous',
            'Ask clarifying questions when needed'
        ];
    }

    /**
     * Extract business context for AI understanding
     * @param {Object} businessAnalysis - Business analysis
     * @param {Object} knowledgeBase - Knowledge base
     * @returns {Object} Business context
     */
    extractBusinessContext(businessAnalysis, knowledgeBase) {
        return {
            type: businessAnalysis.detectedType,
            confidence: businessAnalysis.confidence,
            name: knowledgeBase.contactInfo?.businessName,
            description: businessAnalysis.extractedInfo?.description,
            services: knowledgeBase.services?.map(s => s.name || s) || [],
            products: knowledgeBase.products?.map(p => p.name || p) || [],
            contact: knowledgeBase.contactInfo || {},
            hours: knowledgeBase.businessHours || [],
            specialties: businessAnalysis.extractedInfo?.specialties || [],
            location: knowledgeBase.contactInfo?.address
        };
    }

    /**
     * Enhance configuration with knowledge base data
     * @param {Object} tenantConfig - Tenant configuration
     * @param {Object} knowledgeBase - Knowledge base
     */
    enhanceWithKnowledgeBase(tenantConfig, knowledgeBase) {
        // Add knowledge base references
        tenantConfig.knowledgeBaseId = knowledgeBase.tenantId;
        tenantConfig.knowledgeStats = knowledgeBase.statistics;
        
        // Enhance features based on available knowledge
        if (knowledgeBase.services?.length > 0) {
            tenantConfig.features.services = {
                title: 'Our Services',
                description: `We offer ${knowledgeBase.services.length} different services`,
                items: knowledgeBase.services.slice(0, 10)
            };
        }
        
        if (knowledgeBase.products?.length > 0) {
            tenantConfig.features.products = {
                title: 'Our Products',
                description: `Browse our selection of ${knowledgeBase.products.length} products`,
                items: knowledgeBase.products.slice(0, 10)
            };
        }
        
        // Add FAQ integration
        if (knowledgeBase.faqs?.length > 0) {
            tenantConfig.features.faqs = {
                title: 'Frequently Asked Questions',
                description: `${knowledgeBase.faqs.length} commonly asked questions`,
                items: knowledgeBase.faqs.slice(0, 15)
            };
        }
    }

    /**
     * Apply business-specific customizations
     * @param {Object} tenantConfig - Tenant configuration
     * @param {Object} businessAnalysis - Business analysis
     */
    applyBusinessSpecificCustomizations(tenantConfig, businessAnalysis) {
        const businessType = businessAnalysis.detectedType;
        
        // Add confidence-based adjustments
        if (businessAnalysis.confidence < 0.7) {
            // Lower confidence - enable fewer features initially
            Object.keys(tenantConfig.enabledFeatures).forEach(feature => {
                if (tenantConfig.enabledFeatures[feature] && feature !== 'analytics') {
                    tenantConfig.enabledFeatures[feature] = false;
                }
            });
            
            tenantConfig.configurationNote = 'Configuration applied with conservative settings due to lower confidence in business type detection. Features can be manually enabled as needed.';
        }
        
        // Add alternative business type suggestions
        if (businessAnalysis.alternativeTypes?.length > 0) {
            tenantConfig.alternativeConfigurations = businessAnalysis.alternativeTypes.map(alt => ({
                businessType: alt.type,
                confidence: alt.confidence,
                features: this.featureMapping[alt.type]?.enabledFeatures || {}
            }));
        }
        
        // Add reasoning for feature choices
        tenantConfig.configurationReasoning = [
            `Detected business type: ${businessType} (${Math.round(businessAnalysis.confidence * 100)}% confidence)`,
            `Enabled ${Object.keys(tenantConfig.enabledFeatures).filter(f => tenantConfig.enabledFeatures[f]).length} relevant features`,
            `Generated ${tenantConfig.autoResponses?.length || 0} auto-responses`,
            `Applied ${businessType}-specific customizations and system prompts`
        ];
    }
}

module.exports = FeatureMapper;
