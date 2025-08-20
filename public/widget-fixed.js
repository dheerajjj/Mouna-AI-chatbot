/**
 * AI Chatbot Widget - Client-side Implementation
 * 
 * This script creates a customizable AI chatbot widget that can be embedded
 * on any website. It communicates with the backend API to provide AI-powered
 * customer support.
 * 
 * Usage:
 * <script src="https://your-domain.com/widget.js" data-api-key="your-api-key"></script>
 */

(function() {
    'use strict';
    
    // Multi-language translations
    const TRANSLATIONS = {
        en: {
            title: 'AI Assistant',
            subtitle: 'Online • Usually replies instantly',
            welcomeMessage: '👋 Hi there! I\'m your AI assistant. How can I help you today?',
            placeholder: 'Type your message...',
            typing: 'AI is typing...',
            send: 'Send',
            close: 'Close chat',
            open: 'Open chat',
            poweredBy: 'Powered by AI Chatbot Widget',
            selectLanguage: 'Select Language',
            errors: {
                networkError: 'Network error. Please check your connection and try again.',
                rateLimited: 'Too many requests. Please wait a moment before sending another message.',
                generalError: 'Something went wrong. Please try again.',
                messageEmpty: 'Please enter a message before sending.'
            }
        },
        hi: {
            title: 'AI सहायक',
            subtitle: 'ऑनलाइन • आमतौर पर तुरंत जवाब देता है',
            welcomeMessage: '👋 नमस्ते! मैं आपका AI सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?',
            placeholder: 'अपना संदेश टाइप करें...',
            typing: 'AI टाइप कर रहा है...',
            send: 'भेजें',
            close: 'चैट बंद करें',
            open: 'चैट खोलें',
            poweredBy: 'AI चैटबॉट विजेट द्वारा संचालित',
            selectLanguage: 'भाषा चुनें',
            errors: {
                networkError: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें और फिर से कोशिश करें।',
                rateLimited: 'बहुत सारे अनुरोध। कृपया दूसरा संदेश भेजने से पहले थोड़ा इंतजार करें।',
                generalError: 'कुछ गलत हुआ। कृपया फिर से कोशिश करें।',
                messageEmpty: 'कृपया भेजने से पहले एक संदेश दर्ज करें।'
            }
        },
        te: {
            title: 'AI సహాయకుడు',
            subtitle: 'ఆన్‌లైన్ • సాధారణంగా వెంటనే సమాధానం ఇస్తుంది',
            welcomeMessage: '👋 హలో! నేను మీ AI సహాయకుడిని. నేను ఈరోజు మీకు ఎలా సహాయం చేయగలను?',
            placeholder: 'మీ సందేశాన్ని టైప్ చేయండి...',
            typing: 'AI టైప్ చేస్తోంది...',
            send: 'పంపండి',
            close: 'చాట్ మూసివేయండి',
            open: 'చాట్ తెరవండి',
            poweredBy: 'AI చాట్‌బాట్ విజెట్ ద్వారా శక్తివంతం',
            selectLanguage: 'భాష ఎంచుకోండి',
            errors: {
                networkError: 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
                rateLimited: 'చాలా అభ్యర్థనలు. దయచేసి మరొక సందేశం పంపే ముందు కాస్త వేచి ఉండండి.',
                generalError: 'ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
                messageEmpty: 'దయచేసి పంపే ముందు ఒక సందేశాన్ని నమోదు చేయండి.'
            }
        },
        ta: {
            title: 'AI உதவியாளர்',
            subtitle: 'ஆன்லைன் • பொதுவாக உடனடியாக பதிலளிக்கும்',
            welcomeMessage: '👋 வணக்கம்! நான் உங்கள் AI உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
            placeholder: 'உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்...',
            typing: 'AI தட்டச்சு செய்து கொண்டிருக்கிறது...',
            send: 'அனுப்பு',
            close: 'அரட்டையை மூடு',
            open: 'அரட்டையை திற',
            poweredBy: 'AI சாட்பாட் விட்ஜெட்டால் இயக்கப்படுகிறது',
            selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
            errors: {
                networkError: 'நெட்வொர்க் பிழை. தயவுசெய்து உங்கள் இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
                rateLimited: 'அதிக கோரிக்கைகள். தயவுசெய்து மற்றொரு செய்தி அனுப்பும் முன் சிறிது காத்திருங்கள்.',
                generalError: 'ஏதோ தவறு நடந்தது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
                messageEmpty: 'தயவுசெய்து அனுப்பும் முன் ஒரு செய்தியை உள்ளிடவும்.'
            }
        },
        mr: {
            title: 'AI सहाय्यक',
            subtitle: 'ऑनलाइन • सहसा लगेचच उत्तर देतो',
            welcomeMessage: '👋 नमस्कार! मी तुमचा AI सहाय्यक आहे. आज मी तुम्हाला कशी मदत करू शकतो?',
            placeholder: 'तुमचा संदेश टाइप करा...',
            typing: 'AI टाइप करत आहे...',
            send: 'पाठवा',
            close: 'चॅट बंद करा',
            open: 'चॅट उघडा',
            poweredBy: 'AI चॅटबॉट विजेटद्वारे चालवले जाते',
            selectLanguage: 'भाषा निवडा',
            errors: {
                networkError: 'नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
                rateLimited: 'बरेच विनंत्या. कृपया दुसरा संदेश पाठवण्यापूर्वी थोडी वाट पहा.',
                generalError: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
                messageEmpty: 'कृपया पाठवण्यापूर्वी संदेश टाका.'
            }
        },
        kn: {
            title: 'AI ಸಹಾಯಕ',
            subtitle: 'ಆನ್‌ಲೈನ್ • ಸಾಮಾನ್ಯವಾಗಿ ತಕ್ಷಣ ಉತ್ತರಿಸುತ್ತದೆ',
            welcomeMessage: '👋 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
            placeholder: 'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...',
            typing: 'AI ಟೈಪ್ ಮಾಡುತ್ತಿದೆ...',
            send: 'ಕಳುಹಿಸಿ',
            close: 'ಚಾಟ್ ಅನ್ನು ಮುಚ್ಚಿ',
            open: 'ಚಾಟ್ ಅನ್ನು ತೆರೆಯಿರಿ',
            poweredBy: 'AI ಚಾಟ್‌ಬಾಟ್ ವಿಜೆಟ್‌ನಿಂದ ಚಾಲಿತ',
            selectLanguage: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
            errors: {
                networkError: 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
                rateLimited: 'ಹಲವಾರು ವಿನಂತಿಗಳು. ಮತ್ತೊಂದು ಸಂದೇಶ ಕಳುಹಿಸುವ ಮೊದಲು ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಕಾಯಿರಿ.',
                generalError: 'ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
                messageEmpty: 'ದಯವಿಟ್ಟು ಕಳುಹಿಸುವ ಮೊದಲು ಸಂದೇಶವನ್ನು ನಮೂದಿಸಿ.'
            }
        }
    };

    const SUPPORTED_LANGUAGES = {
        en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
        hi: { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
        te: { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
        ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
        mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
        kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' }
    };

    // Configuration
    const WIDGET_CONFIG = {
        // API endpoint (will be set from script tag or defaults)
        apiEndpoint: window.ChatbotWidgetAPI || 'https://mouna-ai-chatbot-production.up.railway.app',
        apiKey: null,
        tenantId: null, // NEW: Tenant ID for configuration
        
        // Default widget settings
        primaryColor: '#667eea',
        position: 'bottom-right',
        language: 'en', // Default language
        
        // Widget behavior
        autoOpen: false,
        showBranding: true,
        maxMessages: 50,
        typingDelay: 1000,
        
        // Animations
        animationDuration: 300,
        
        // Tenant-specific features (will be loaded from server)
        enabledFeatures: {
            bookings: false,
            orders: false,
            slots: false,
            payments: false,
            analytics: false
        }
    };
    
    // Widget state
    let widget = null;
    let isOpen = false;
    let isTyping = false;
    let sessionId = null;

    // Simple language notification
    function showLanguageNotification(selectedLang) {
        const langInfo = SUPPORTED_LANGUAGES[selectedLang];
        if (langInfo) {
            console.log(`🌐 Language switched to ${langInfo.nativeName} (${langInfo.name})`);
            // You can type in the selected language using your system's keyboard/IME
        }
    }
    let messageHistory = [];
    let currentConfig = { ...WIDGET_CONFIG };
    let currentLanguage = 'en';
    
    function detectLanguage(text) {
        if (!text || typeof text !== 'string') return 'en';
        
        const patterns = {
            hi: ['नमस्ते', 'हैं', 'है', 'मैं', 'आप', 'करना', 'होना', 'जाना', 'कैसे', 'क्या'],
            te: ['నమస్కారం', 'ఎలా', 'ఉన్నాను', 'నేను', 'మీరు', 'చేస్తాను', 'ఉంది', 'ఏమిటి', 'ఎక్కడ'],
            ta: ['வணக்கம்', 'எப்படி', 'இருக்கிறேன்', 'நான்', 'நீங்கள்', 'செய்கிறேன்', 'இருக்கிறது', 'என்ன', 'எங்கே'],
            mr: ['नमस्कार', 'कसा', 'आहे', 'मी', 'तुम्ही', 'करतो', 'आहेत', 'काय', 'कुठे'],
            kn: ['ನಮಸ್ಕಾರ', 'ಹೇಗೆ', 'ಇದ್ದೇನೆ', 'ನಾನು', 'ನೀವು', 'ಮಾಡುತ್ತೇನೆ', 'ಇದೆ', 'ಏನು', 'ಎಲ್ಲಿ']
        };
        
        const textLower = text.toLowerCase();
        let bestMatch = { language: 'en', score: 0 };
        
        for (const [lang, words] of Object.entries(patterns)) {
            let score = 0;
            for (const word of words) {
                if (textLower.includes(word.toLowerCase())) {
                    score++;
                }
            }
            
            if (score > bestMatch.score) {
                bestMatch = { language: lang, score };
            }
        }
        
        return bestMatch.language;
    }
    
    function getTranslation(key, lang = currentLanguage) {
        const translations = TRANSLATIONS[lang] || TRANSLATIONS['en'];
        const keys = key.split('.');
        let value = translations;
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || TRANSLATIONS['en'][key] || key;
    }
    
    function updateWidgetLanguage(lang) {
        currentLanguage = lang;
        
        // Update widget text elements
        const title = widget.querySelector('.chatbot-widget-title');
        const subtitle = widget.querySelector('.chatbot-widget-subtitle');
        const inputField = widget.querySelector('#chatbot-input-field');
        const typingText = widget.querySelector('.chatbot-typing-text');
        const closeBtn = widget.querySelector('.chatbot-widget-close');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        
        if (title) title.textContent = getTranslation('title');
        if (subtitle) subtitle.textContent = getTranslation('subtitle');
        if (inputField) inputField.placeholder = getTranslation('placeholder');
        if (typingText) typingText.textContent = getTranslation('typing');
        if (closeBtn) closeBtn.title = getTranslation('close');
        if (trigger) trigger.title = getTranslation('open');
        
        // Update welcome message
        const welcomeMessage = widget.querySelector('.chatbot-message-bot .chatbot-message-text');
        if (welcomeMessage) {
            welcomeMessage.textContent = getTranslation('welcomeMessage');
        }
    }
    
    async function transliterateText(text, language) {
        if (language !== 'te' || !text) {
            return text; // Only transliterate for Telugu
        }
        
        try {
            // Use server-side transliteration endpoint
            const response = await fetch(`${currentConfig.apiEndpoint}/api/transliterate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    fromScript: 'latin',
                    toScript: 'telugu'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.transliteratedText || text;
            }
        } catch (error) {
            console.warn('Transliteration failed:', error);
        }
        
        return text;
    }
    function generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    function createElement(tag, className, innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }
    
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }
    
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // API functions
    async function sendMessage(message) {
        try {
            const response = await fetch(`${currentConfig.apiEndpoint}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': currentConfig.apiKey || ''
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: sessionId,
                    language: currentLanguage,
                    tenantId: currentConfig.tenantId, // Include tenant ID for context
                    userAgent: navigator.userAgent,
                    referrer: document.referrer
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Chatbot API Error:', error);
            throw error;
        }
    }
    
    async function loadConfiguration() {
        try {
            const response = await fetch(`${currentConfig.apiEndpoint}/config`);
            if (response.ok) {
                const config = await response.json();
                // Merge server config with local config
                Object.assign(currentConfig, config.branding || {});
            }
        } catch (error) {
            console.warn('Could not load widget configuration:', error);
        }
    }
    
    // NEW: Load tenant-specific configuration
    async function loadTenantConfiguration(tenantId) {
        if (!tenantId) {
            console.log('No tenant ID provided, using default configuration');
            return;
        }
        
        try {
            console.log(`Loading tenant configuration for: ${tenantId}`);
            
            // Check if it's a demo tenant first
            let response;
            if (tenantId.startsWith('demo_')) {
                response = await fetch(`${currentConfig.apiEndpoint}/api/demo-tenant/config/${tenantId}`);
            } else {
                response = await fetch(`${currentConfig.apiEndpoint}/api/tenant/config/${tenantId}`);
            }
            
            if (response.ok) {
                const data = await response.json();
                const tenantConfig = data.config;
                
                console.log('✅ Tenant configuration loaded:', tenantConfig);
                
                // Apply tenant configuration
                if (tenantConfig.primaryColor) {
                    currentConfig.primaryColor = tenantConfig.primaryColor;
                }
                
                if (tenantConfig.welcomeMessage) {
                    currentConfig.welcomeMessage = tenantConfig.welcomeMessage;
                    // Update translations with tenant welcome message
                    Object.keys(TRANSLATIONS).forEach(lang => {
                        TRANSLATIONS[lang].welcomeMessage = tenantConfig.welcomeMessage;
                    });
                }
                
                // Apply enabled features
                if (tenantConfig.enabledFeatures) {
                    Object.assign(currentConfig.enabledFeatures, tenantConfig.enabledFeatures);
                    console.log('✅ Enabled features:', currentConfig.enabledFeatures);
                    
                    // Add feature-specific system prompts to AI conversations
                    if (tenantConfig.enabledFeatures.bookings) {
                        console.log('📅 Bookings feature enabled');
                    }
                    if (tenantConfig.enabledFeatures.orders) {
                        console.log('🛒 Orders feature enabled');
                    }
                    if (tenantConfig.enabledFeatures.slots) {
                        console.log('⏰ Slots feature enabled');
                    }
                }
                
                // Apply auto responses if configured
                if (tenantConfig.autoResponses && tenantConfig.autoResponses.length > 0) {
                    currentConfig.autoResponses = tenantConfig.autoResponses;
                    console.log('✅ Auto responses configured:', currentConfig.autoResponses.length);
                    
                    // Store auto responses for quick matching
                    currentConfig.autoResponsesMap = new Map();
                    tenantConfig.autoResponses.forEach(response => {
                        response.keywords.forEach(keyword => {
                            currentConfig.autoResponsesMap.set(keyword.toLowerCase(), response.response);
                        });
                    });
                }
                
                // WHITE-LABELING: Handle branding settings based on subscription plan
                if (data.ownerSubscription) {
                    const subscription = data.ownerSubscription;
                    
                    // Hide branding for Professional+ plans with white-labeling
                    if (subscription.plan === 'professional' || subscription.plan === 'enterprise') {
                        currentConfig.showBranding = false;
                        console.log('🏷️ White-labeling enabled - branding hidden for', subscription.plan, 'plan');
                    } else {
                        currentConfig.showBranding = true;
                    }
                    
                    // Full white-labeling for Enterprise plan
                    if (subscription.plan === 'enterprise' && tenantConfig.customBranding) {
                        const branding = tenantConfig.customBranding;
                        
                        if (branding.customLogo) {
                            currentConfig.customLogo = branding.customLogo;
                        }
                        
                        if (branding.companyName) {
                            currentConfig.companyName = branding.companyName;
                        }
                        
                        console.log('🎨 Full white-labeling applied for Enterprise plan');
                    }
                } else {
                    // Default to showing branding if no subscription info
                    currentConfig.showBranding = true;
                }
                
                // Update widget colors dynamically
                updateWidgetColors(currentConfig.primaryColor);
                
                return tenantConfig;
            } else if (response.status === 404) {
                console.warn(`⚠️ Tenant configuration not found for ID: ${tenantId}`);
                // Use fallback config returned by server
                const data = await response.json();
                if (data.fallbackConfig) {
                    console.log('Using fallback configuration:', data.fallbackConfig);
                    Object.assign(currentConfig.enabledFeatures, data.fallbackConfig.enabledFeatures);
                }
            } else {
                console.error(`❌ Failed to load tenant configuration: HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error loading tenant configuration:', error);
        }
    }
    
    // NEW: Load personal tenant for backward compatibility
    async function loadPersonalTenantConfiguration() {
        try {
            console.log('Attempting to load user personal tenant...');
            
            // For backward compatibility, we'll try to identify the user via their API key
            // and load their personal tenant configuration
            if (!currentConfig.apiKey) {
                console.log('No API key provided, using default configuration');
                return;
            }
            
            const response = await fetch(`${currentConfig.apiEndpoint}/api/tenant/personal-tenant`, {
                method: 'GET',
                headers: {
                    'X-API-Key': currentConfig.apiKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const personalTenant = data.personalTenant;
                
                console.log('✅ Personal tenant loaded:', personalTenant.tenantId);
                
                // Set the tenant ID from personal tenant
                currentConfig.tenantId = personalTenant.tenantId;
                
                // Load the configuration using the personal tenant ID
                await loadTenantConfiguration(personalTenant.tenantId);
            } else if (response.status === 404) {
                console.log('ℹ️ No personal tenant found for this API key, using default configuration');
            } else {
                console.warn(`⚠️ Failed to load personal tenant: HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn('⚠️ Error loading personal tenant:', error);
            // Continue with default configuration
        }
    }
    
    // NEW: Update widget colors dynamically
    function updateWidgetColors(primaryColor) {
        if (!primaryColor || !widget) return;
        
        // Update CSS custom properties for theming
        const style = document.createElement('style');
        style.innerHTML = `
            .ai-chatbot-widget {
                --primary-color: ${primaryColor};
                --primary-color-hover: ${primaryColor}dd;
            }
            .chatbot-widget-trigger {
                background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa) !important;
            }
            .chatbot-widget-header {
                background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}aa) !important;
            }
            .chatbot-message-user .chatbot-message-text {
                background: ${primaryColor} !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Widget UI creation
    function createWidgetHTML() {
        const currentTranslations = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
        
        return `
            <div class="chatbot-widget-overlay" style="display: none;">
                <div class="chatbot-widget-container">
                    <div class="chatbot-widget-header">
                        <div class="chatbot-widget-info">
                            <h3 class="chatbot-widget-title">${currentTranslations.title}</h3>
                            <p class="chatbot-widget-subtitle">${currentTranslations.subtitle}</p>
                        </div>
                        <div class="chatbot-widget-controls">
                            <button class="chatbot-language-toggle" id="chatbot-language-toggle" title="${currentTranslations.selectLanguage}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                                </svg>
                                <span class="chatbot-current-lang">${SUPPORTED_LANGUAGES[currentLanguage]?.flag || '🌐'}</span>
                            </button>
                            <button class="chatbot-widget-close" title="${currentTranslations.close}">&times;</button>
                        </div>
                    </div>
                    
                    <div class="chatbot-language-selector" id="chatbot-language-selector" style="display: none;">
                        <div class="chatbot-language-header">
                            <span>${currentTranslations.selectLanguage}</span>
                            <button class="chatbot-language-close" id="chatbot-language-close">&times;</button>
                        </div>
                        <div class="chatbot-language-list">
                            <button class="chatbot-language-option ${currentLanguage === 'en' ? 'active' : ''}" data-language="en">
                                <span class="chatbot-lang-flag">🇺🇸</span>
                                <span class="chatbot-lang-name">English</span>
                                <span class="chatbot-lang-code">English</span>
                            </button>
                            <button class="chatbot-language-option ${currentLanguage === 'hi' ? 'active' : ''}" data-language="hi">
                                <span class="chatbot-lang-flag">🇮🇳</span>
                                <span class="chatbot-lang-name">हिंदी</span>
                                <span class="chatbot-lang-code">Hindi</span>
                            </button>
                            <button class="chatbot-language-option ${currentLanguage === 'te' ? 'active' : ''}" data-language="te">
                                <span class="chatbot-lang-flag">🇮🇳</span>
                                <span class="chatbot-lang-name">తెలుగు</span>
                                <span class="chatbot-lang-code">Telugu</span>
                            </button>
                            <button class="chatbot-language-option ${currentLanguage === 'ta' ? 'active' : ''}" data-language="ta">
                                <span class="chatbot-lang-flag">🇮🇳</span>
                                <span class="chatbot-lang-name">தமிழ்</span>
                                <span class="chatbot-lang-code">Tamil</span>
                            </button>
                            <button class="chatbot-language-option ${currentLanguage === 'mr' ? 'active' : ''}" data-language="mr">
                                <span class="chatbot-lang-flag">🇮🇳</span>
                                <span class="chatbot-lang-name">मराठी</span>
                                <span class="chatbot-lang-code">Marathi</span>
                            </button>
                            <button class="chatbot-language-option ${currentLanguage === 'kn' ? 'active' : ''}" data-language="kn">
                                <span class="chatbot-lang-flag">🇮🇳</span>
                                <span class="chatbot-lang-name">ಕನ್ನಡ</span>
                                <span class="chatbot-lang-code">Kannada</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="chatbot-widget-messages" id="chatbot-messages">
                        <div class="chatbot-message chatbot-message-bot">
                            <div class="chatbot-message-content">
                                <div class="chatbot-message-text">${currentTranslations.welcomeMessage}</div>
                                <div class="chatbot-message-time">${formatTime(new Date())}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chatbot-widget-typing" id="chatbot-typing" style="display: none;">
                        <div class="chatbot-typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <span class="chatbot-typing-text">${currentTranslations.typing}</span>
                    </div>
                    
                    <div class="chatbot-widget-input">
                        <input 
                            type="text" 
                            id="chatbot-input-field" 
                            placeholder="${currentTranslations.placeholder}"
                            maxlength="1000"
                            autocomplete="off"
                            lang="${currentLanguage}"
                        >
                        <button id="chatbot-send-button" title="${currentTranslations.send}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                    
                    ${currentConfig.showBranding ? `
                        <div class="chatbot-widget-branding">
                            <small>${currentTranslations.poweredBy}</small>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <button class="chatbot-widget-trigger" id="aiChatToggle" title="${currentTranslations.open}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                <span class="chatbot-widget-notification" id="chatbot-notification" style="display: none;"></span>
            </button>
        `;
    }
    
    function createWidgetStyles() {
        return `
            <style>
                /* Chatbot Widget Styles */
                .chatbot-widget-overlay {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 380px;
                    max-width: calc(100vw - 40px);
                    height: 500px;
                    max-height: calc(100vh - 120px);
                    z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                .chatbot-widget-container {
                    width: 100%;
                    height: 100%;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }
                
                .chatbot-widget-header {
                    background: ${currentConfig.primaryColor};
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .chatbot-widget-controls {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                
                .chatbot-language-toggle {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    padding: 6px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }
                
                .chatbot-language-toggle:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .chatbot-current-lang {
                    font-size: 16px;
                }
                
                .chatbot-language-selector {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: white;
                    z-index: 1001;
                    display: flex;
                    flex-direction: column;
                    border-radius: 12px;
                    overflow: hidden;
                }
                
                .chatbot-language-header {
                    background: ${currentConfig.primaryColor};
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                }
                
                .chatbot-language-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                
                .chatbot-language-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .chatbot-language-list {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: white;
                    min-height: 200px;
                }
                
                .chatbot-language-option {
                    width: 100%;
                    background: white;
                    border: 1px solid #eee;
                    padding: 12px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                    text-align: left;
                    font-family: inherit;
                    font-size: 14px;
                    color: #333;
                }
                
                .chatbot-language-option:hover {
                    background: #f5f5f5;
                    border-color: ${currentConfig.primaryColor};
                }
                
                .chatbot-language-option.active {
                    background: ${currentConfig.primaryColor};
                    color: white;
                    border-color: ${currentConfig.primaryColor};
                }
                
                .chatbot-lang-flag {
                    font-size: 20px;
                    flex-shrink: 0;
                }
                
                .chatbot-lang-name {
                    font-weight: 600;
                    flex: 1;
                }
                
                .chatbot-lang-code {
                    font-size: 12px;
                    opacity: 0.7;
                }
                
                .chatbot-widget-info {
                    flex: 1;
                }
                
                .chatbot-widget-title {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .chatbot-widget-subtitle {
                    margin: 0;
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .chatbot-widget-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                
                .chatbot-widget-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                
                .chatbot-widget-messages {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #fafafa;
                }
                
                .chatbot-message {
                    margin-bottom: 16px;
                    display: flex;
                    animation: fadeIn 0.3s ease-in;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .chatbot-message-bot {
                    justify-content: flex-start;
                }
                
                .chatbot-message-user {
                    justify-content: flex-end;
                }
                
                .chatbot-message-content {
                    max-width: 80%;
                    min-width: 100px;
                }
                
                .chatbot-message-text {
                    padding: 12px 16px;
                    border-radius: 18px;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                }
                
                .chatbot-message-bot .chatbot-message-text {
                    background: white;
                    color: #333;
                    border-bottom-left-radius: 6px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }
                
                .chatbot-message-user .chatbot-message-text {
                    background: ${currentConfig.primaryColor};
                    color: white;
                    border-bottom-right-radius: 6px;
                }
                
                .chatbot-message-time {
                    font-size: 11px;
                    color: #999;
                    margin-top: 4px;
                    padding: 0 16px;
                }
                
                .chatbot-widget-typing {
                    padding: 12px 20px;
                    background: white;
                    border-top: 1px solid #eee;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .chatbot-typing-indicator {
                    display: flex;
                    gap: 3px;
                }
                
                .chatbot-typing-indicator span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ccc;
                    animation: typing 1.4s infinite ease-in-out;
                }
                
                .chatbot-typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .chatbot-typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1); opacity: 1; }
                }
                
                .chatbot-typing-text {
                    font-size: 12px;
                    color: #666;
                }
                
                .chatbot-widget-input {
                    display: flex;
                    padding: 16px 20px;
                    background: white;
                    border-top: 1px solid #eee;
                    gap: 12px;
                }
                
                #chatbot-input-field {
                    flex: 1;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    padding: 10px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                #chatbot-input-field:focus {
                    border-color: ${currentConfig.primaryColor};
                }
                
                #chatbot-send-button {
                    background: ${currentConfig.primaryColor};
                    border: none;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                }
                
                #chatbot-send-button:hover {
                    background: color-mix(in srgb, ${currentConfig.primaryColor} 90%, black);
                }
                
                #chatbot-send-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                
                .chatbot-widget-branding {
                    padding: 8px 20px;
                    background: #f8f8f8;
                    text-align: center;
                    border-top: 1px solid #eee;
                }
                
                .chatbot-widget-branding small {
                    color: #999;
                    font-size: 11px;
                }
                
                .chatbot-widget-trigger {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    background: ${currentConfig.primaryColor};
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    transition: all 0.3s ease;
                }
                
                .chatbot-widget-trigger:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
                }
                
                .chatbot-widget-notification {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ff4757;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                /* Mobile responsive */
                @media (max-width: 480px) {
                    .chatbot-widget-overlay {
                        bottom: 90px;
                        left: 10px;
                        right: 10px;
                        width: auto;
                        height: 70vh;
                        max-height: 500px;
                    }
                    
                    .chatbot-widget-trigger {
                        bottom: 15px;
                        right: 15px;
                        width: 55px;
                        height: 55px;
                    }
                }
            </style>
        `;
    }
    
    // Widget functionality
    function addMessage(text, isUser = false, showTime = true) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = createElement('div', `chatbot-message ${isUser ? 'chatbot-message-user' : 'chatbot-message-bot'}`);
        
        const contentDiv = createElement('div', 'chatbot-message-content');
        const textDiv = createElement('div', 'chatbot-message-text', sanitizeHTML(text));
        
        contentDiv.appendChild(textDiv);
        
        if (showTime) {
            const timeDiv = createElement('div', 'chatbot-message-time', formatTime(new Date()));
            contentDiv.appendChild(timeDiv);
        }
        
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store message in history
        messageHistory.push({
            text: text,
            isUser: isUser,
            timestamp: new Date()
        });
        
        // Limit message history
        if (messageHistory.length > currentConfig.maxMessages) {
            messageHistory = messageHistory.slice(-currentConfig.maxMessages);
        }
    }
    
    function showTyping() {
        const typingDiv = document.getElementById('chatbot-typing');
        if (typingDiv) {
            typingDiv.style.display = 'flex';
            isTyping = true;
        }
    }
    
    function hideTyping() {
        const typingDiv = document.getElementById('chatbot-typing');
        if (typingDiv) {
            typingDiv.style.display = 'none';
            isTyping = false;
        }
    }
    
    async function handleUserMessage(message) {
        if (!message.trim()) return;
        
        // Add user message (transliterate if needed)
        const transliteratedMessage = await transliterateText(message, currentLanguage);
        addMessage(transliteratedMessage, true);
        
        // Clear input
        const inputField = document.getElementById('chatbot-input-field');
        const sendButton = document.getElementById('chatbot-send-button');
        
        if (inputField) inputField.value = '';
        if (sendButton) sendButton.disabled = true;
        
        // Show typing indicator
        showTyping();
        
        // Check for auto responses first (tenant demo features)
        let autoResponse = null;
        if (currentConfig.autoResponsesMap) {
            const messageLower = message.toLowerCase();
            for (let [keyword, response] of currentConfig.autoResponsesMap) {
                if (messageLower.includes(keyword)) {
                    autoResponse = response;
                    console.log(`🤖 Auto response matched for keyword: "${keyword}"`);
                    break;
                }
            }
        }
        
        try {
            let response;
            
            if (autoResponse) {
                // Use auto response for demo tenant features
                console.log('Using demo tenant auto response');
                
                // Simulate API delay for realistic experience
                await new Promise(resolve => setTimeout(resolve, currentConfig.typingDelay));
                
                response = { response: autoResponse };
            } else {
                // Make API call for regular AI responses
                console.log('Sending message with language:', currentLanguage);
                response = await sendMessage(message);
                
                // Simulate typing delay
                await new Promise(resolve => setTimeout(resolve, currentConfig.typingDelay));
            }
            
            hideTyping();
            
            // Add bot response
            addMessage(response.response, false);
            
        } catch (error) {
            hideTyping();
            console.error('Widget API Error:', error);
            
            let errorMessage;
            
            if (error.message.includes('429') || error.message.includes('Too many')) {
                errorMessage = getTranslation('errors.rateLimited');
            } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('Invalid API key')) {
                errorMessage = 'Authentication error. Please contact support.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('network')) {
                errorMessage = getTranslation('errors.networkError');
            } else {
                errorMessage = getTranslation('errors.generalError');
            }
            
            addMessage(errorMessage, false);
        } finally {
            if (sendButton) sendButton.disabled = false;
        }
    }
    
    function openWidget() {
        const overlay = widget.querySelector('.chatbot-widget-overlay');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        
        if (overlay && trigger) {
            overlay.style.display = 'block';
            trigger.style.display = 'none';
            isOpen = true;
            
            // Focus input field
            setTimeout(() => {
                const inputField = document.getElementById('chatbot-input-field');
                if (inputField) inputField.focus();
            }, 100);
        }
    }
    
    function closeWidget() {
        const overlay = widget.querySelector('.chatbot-widget-overlay');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        
        if (overlay && trigger) {
            overlay.style.display = 'none';
            trigger.style.display = 'flex';
            isOpen = false;
        }
    }
    
    function bindEvents() {
        // Trigger button
        const trigger = widget.querySelector('#aiChatToggle');
        if (trigger) {
            trigger.addEventListener('click', openWidget);
        }
        
        // Close button
        const closeBtn = widget.querySelector('.chatbot-widget-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeWidget);
        }
        
        // Language toggle button
        const langToggle = widget.querySelector('#chatbot-language-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                const langSelector = widget.querySelector('#chatbot-language-selector');
                if (langSelector) {
                    langSelector.style.display = 'flex';
                }
            });
        }
        
        // Language selector close button
        const langClose = widget.querySelector('#chatbot-language-close');
        if (langClose) {
            langClose.addEventListener('click', () => {
                const langSelector = widget.querySelector('#chatbot-language-selector');
                if (langSelector) {
                    langSelector.style.display = 'none';
                }
            });
        }
        
        // Language option buttons
        const langOptions = widget.querySelectorAll('.chatbot-language-option');
        langOptions.forEach(option => {
            option.addEventListener('click', () => {
                const selectedLang = option.getAttribute('data-language');
                if (selectedLang && selectedLang !== currentLanguage) {
                    // Update current language
                    currentLanguage = selectedLang;
                    
                    // Update UI language
                    updateWidgetLanguage(selectedLang);
                    showLanguageNotification(selectedLang);
                    
                    // Update active state
                    langOptions.forEach(opt => opt.classList.remove('active'));
                    option.classList.add('active');
                    
                    // Update language flag
                    const currentLangSpan = widget.querySelector('.chatbot-current-lang');
                    if (currentLangSpan) {
                        currentLangSpan.textContent = SUPPORTED_LANGUAGES[selectedLang]?.flag || '🌐';
                    }
                    
                    // Update input field language attribute
                    const inputField = widget.querySelector('#chatbot-input-field');
                    if (inputField) {
                        inputField.setAttribute('lang', selectedLang);
                    }
                    
                    // Hide language selector
                    const langSelector = widget.querySelector('#chatbot-language-selector');
                    if (langSelector) {
                        langSelector.style.display = 'none';
                    }
                    
                    console.log('Language changed to:', selectedLang);
                }
            });
        });
        
        // Send button - Fix: Use widget.querySelector to ensure we get the correct element
        const sendBtn = widget.querySelector('#chatbot-send-button');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const inputField = widget.querySelector('#chatbot-input-field');
                if (inputField && inputField.value.trim()) {
                    handleUserMessage(inputField.value);
                }
            });
        } 
        
        // Input field - Fix: Better event handling and debugging
        const inputField = widget.querySelector('#chatbot-input-field');
        if (inputField) {
            
            // Enter key handler
            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputField.value.trim()) {
                        handleUserMessage(inputField.value);
                    }
                }
            });
            
            // Input validation
            inputField.addEventListener('input', (e) => {
                const sendBtn = widget.querySelector('#chatbot-send-button');
                if (sendBtn) {
                    const hasText = e.target.value.trim().length > 0;
                    sendBtn.disabled = !hasText;
                    sendBtn.style.opacity = hasText ? '1' : '0.5';
                }
            });
            
            // Initially disable send button if input is empty
            const sendBtn = widget.querySelector('#chatbot-send-button');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.style.opacity = '0.5';
            }
        } 
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeWidget();
            }
        });
    }
    
    // Initialize widget
    async function initializeWidget() {
        // Generate session ID
        sessionId = generateSessionId();
        
        // Get configuration from script tag
        const scriptTag = document.querySelector('script[src*="widget"]') || document.querySelector('script[data-api-key]');
        if (scriptTag) {
            // Handle API key
            const apiKey = scriptTag.getAttribute('data-api-key');
            if (apiKey) {
                currentConfig.apiKey = apiKey;
            }
            
            // Handle API URL
            const apiUrl = scriptTag.getAttribute('data-api-url');
            if (apiUrl) {
                currentConfig.apiEndpoint = apiUrl;
            }
            
            // NEW: Handle tenant ID
            const tenantId = scriptTag.getAttribute('data-tenant-id');
            if (tenantId) {
                currentConfig.tenantId = tenantId;
                console.log('🏢 Tenant ID found:', tenantId);
            }
            
            // Check for other configuration attributes
            const attributes = ['primary-color', 'position', 'title', 'welcome-message', 'subtitle'];
            attributes.forEach(attr => {
                const value = scriptTag.getAttribute(`data-${attr}`);
                if (value) {
                    const configKey = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                    currentConfig[configKey] = value;
                }
            });
        }
        
        // If no API key is provided, try to fetch test API key for demo
        if (!currentConfig.apiKey) {
            console.log('No API key provided, attempting to fetch test key for demo...');
            try {
                const response = await fetch(`${currentConfig.apiEndpoint}/test-api-key`);
                if (response.ok) {
                    const data = await response.json();
                    currentConfig.apiKey = data.apiKey;
                    console.log('✅ Test API key loaded for demo purposes');
                } else {
                    console.warn('⚠️ Could not fetch test API key. Widget may not function properly.');
                }
            } catch (error) {
                console.warn('⚠️ Failed to fetch test API key:', error);
            }
        }
        
        // Create widget container
        widget = createElement('div', 'ai-chatbot-widget');
        widget.innerHTML = createWidgetHTML();
        
        // Add styles
        const styleElement = createElement('div');
        styleElement.innerHTML = createWidgetStyles();
        document.head.appendChild(styleElement.firstElementChild);
        
        // Add widget to page
        document.body.appendChild(widget);
        
        // Bind events
        bindEvents();
        
        // Load configuration from server
        await loadConfiguration();
        
        // NEW: Load tenant-specific configuration
        if (currentConfig.tenantId) {
            // Use provided tenant ID
            await loadTenantConfiguration(currentConfig.tenantId);
        } else {
            // BACKWARD COMPATIBILITY: Try to load personal tenant for existing integrations
            console.log('🔄 No tenant ID provided, attempting to load personal tenant for backward compatibility');
            await loadPersonalTenantConfiguration();
        }
        
        // Auto-open if configured
        if (currentConfig.autoOpen) {
            setTimeout(openWidget, 1000);
        }
        
        console.log('AI Chatbot Widget initialized successfully');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWidget);
    } else {
        initializeWidget();
    }
    
    // Public API
    window.AIChatbotWidget = {
        open: openWidget,
        close: closeWidget,
        isOpen: () => isOpen,
        sendMessage: (message) => {
            if (isOpen) {
                handleUserMessage(message);
            } else {
                console.warn('Widget is not open. Call AIChatbotWidget.open() first.');
            }
        },
        getConfig: () => currentConfig,
        updateConfig: (newConfig) => {
            Object.assign(currentConfig, newConfig);
            // TODO: Re-render widget with new config
        }
    };
    
})();
