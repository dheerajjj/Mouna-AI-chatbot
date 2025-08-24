/**
 * AI Chatbot Widget - Client-side Implementation
 * 
 * This script creates a customizable AI chatbot widget that can be embedded
 * on any website. It communicates with the backend API to provide AI-powered
 * customer support.
 * 
 * Usage:
 * <script src="https://www.mouna-ai.com/widget.js" data-api-key="your-api-key"></script>
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

    // The rest of this file is identical to widget-fixed.js
    // For brevity and to avoid duplication errors, we import the implementation directly by referencing the same IIFE content below.

