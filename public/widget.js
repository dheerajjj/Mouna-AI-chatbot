/**
 * AI Chatbot Widget - Client-side Implementation
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

    // BEGIN: Copied implementation from widget-fixed.js
    
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
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    let messageHistory = [];
    let currentConfig = { ...WIDGET_CONFIG };
    let currentLanguage = 'en';
    function getTranslation(key, lang = currentLanguage) {
        const translations = TRANSLATIONS[lang] || TRANSLATIONS['en'];
        const keys = key.split('.');
        let value = translations;
        for (const k of keys) value = value?.[k];
        return value || TRANSLATIONS['en'][key] || key;
    }
    async function sendMessage(message) {
        const response = await fetch(`${currentConfig.apiEndpoint}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': currentConfig.apiKey || '' },
            body: JSON.stringify({ message, sessionId, language: currentLanguage, tenantId: currentConfig.tenantId, userAgent: navigator.userAgent, referrer: document.referrer })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    }
    async function loadConfiguration() {
        try {
            const url = currentConfig.apiKey ? `${currentConfig.apiEndpoint}/config/${encodeURIComponent(currentConfig.apiKey)}` : `${currentConfig.apiEndpoint}/config`;
            const response = await fetch(url);
            if (response.ok) {
                const config = await response.json();
                if (config) {
                    if (config.primaryColor) currentConfig.primaryColor = config.primaryColor;
                    if (config.title) currentConfig.title = config.title;
                    if (config.welcomeMessage) currentConfig.welcomeMessage = config.welcomeMessage;
                    if (typeof config.maxMessages === 'number') currentConfig.maxMessages = config.maxMessages;
                    if (config.position) currentConfig.position = config.position;
                    if (config.customLogoUrl) currentConfig.customLogo = config.customLogoUrl;
                    const mode = config.autoOpenMode || config.autoOpen;
                    const delay = typeof config.autoOpenDelay === 'number' ? config.autoOpenDelay : undefined;
                    const freq = config.autoOpenFrequency || 'always';
                    if (mode) currentConfig.autoOpen = mode;
                    if (typeof delay !== 'undefined') currentConfig.autoOpenDelay = delay;
                    if (freq) currentConfig.autoOpenFrequency = freq;
                }
            }
        } catch (e) {}
    }
    function updateWidgetColors(primaryColor) {
        if (!primaryColor || !widget) return;
        const style = document.createElement('style');
        style.innerHTML = `.ai-chatbot-widget{--primary-color:${primaryColor};--primary-color-hover:${primaryColor}dd;} .chatbot-widget-trigger{background:linear-gradient(135deg,${primaryColor},${primaryColor}aa)!important;} .chatbot-widget-header{background:linear-gradient(135deg,${primaryColor},${primaryColor}aa)!important;} .chatbot-message-user .chatbot-message-text{background:${primaryColor}!important;}`;
        document.head.appendChild(style);
    }
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
                                <span class="chatbot-current-lang">🌐</span>
                            </button>
                            <button class="chatbot-widget-close" title="${currentTranslations.close}">&times;</button>
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
                        <div class="chatbot-typing-indicator"><span></span><span></span><span></span></div>
                        <span class="chatbot-typing-text">${currentTranslations.typing}</span>
                    </div>
                    <div class="chatbot-widget-input">
                        <input type="text" id="chatbot-input-field" placeholder="${currentTranslations.placeholder}" maxlength="1000" autocomplete="off" lang="${currentLanguage}">
                        <button id="chatbot-send-button" title="${currentTranslations.send}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                    ${currentConfig.showBranding ? `<div class="chatbot-widget-branding"><small>${currentTranslations.poweredBy}</small></div>` : ''}
                </div>
            </div>
            <button class="chatbot-widget-trigger" id="aiChatToggle" title="${currentTranslations.open}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                <span class="chatbot-widget-notification" id="chatbot-notification" style="display:none;"></span>
            </button>`;
    }
    function createWidgetStyles() {
        return `<style>.chatbot-widget-overlay{position:fixed;bottom:90px;right:20px;width:380px;max-width:calc(100vw - 40px);height:500px;max-height:calc(100vh - 120px);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.4}.chatbot-widget-container{width:100%;height:100%;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;position:relative}.chatbot-widget-header{background:${currentConfig.primaryColor};color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.chatbot-widget-controls{display:flex;gap:8px;align-items:center}.chatbot-language-toggle{background:rgba(255,255,255,.1);border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;transition:background-color .2s}.chatbot-language-toggle:hover{background:rgba(255,255,255,.2)}.chatbot-widget-close{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:4px;border-radius:4px;transition:background-color .2s}.chatbot-widget-close:hover{background:rgba(255,255,255,.1)}.chatbot-widget-messages{flex:1;padding:20px;overflow-y:auto;background:#fafafa}.chatbot-message{margin-bottom:16px;display:flex;animation:fadeIn .3s ease-in}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.chatbot-message-bot{justify-content:flex-start}.chatbot-message-user{justify-content:flex-end}.chatbot-message-content{max-width:80%;min-width:100px}.chatbot-message-text{padding:12px 16px;border-radius:18px;word-wrap:break-word;white-space:pre-wrap}.chatbot-message-bot .chatbot-message-text{background:#fff;color:#333;border-bottom-left-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.1)}.chatbot-message-user .chatbot-message-text{background:${currentConfig.primaryColor};color:#fff;border-bottom-right-radius:6px}.chatbot-message-time{font-size:11px;color:#999;margin-top:4px;padding:0 16px}.chatbot-widget-typing{padding:12px 20px;background:#fff;border-top:1px solid #eee;display:flex;align-items:center;gap:8px}.chatbot-typing-indicator{display:flex;gap:3px}.chatbot-typing-indicator span{width:8px;height:8px;border-radius:50%;background:#ccc;animation:typing 1.4s infinite ease-in-out}.chatbot-typing-indicator span:nth-child(1){animation-delay:-.32s}.chatbot-typing-indicator span:nth-child(2){animation-delay:-.16s}@keyframes typing{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1);opacity:1}}.chatbot-typing-text{font-size:12px;color:#666}.chatbot-widget-input{display:flex;padding:16px 20px;background:#fff;border-top:1px solid #eee;gap:12px}#chatbot-input-field{flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 16px;font-size:14px;outline:none;transition:border-color .2s}#chatbot-input-field:focus{border-color:${currentConfig.primaryColor}}#chatbot-send-button{background:${currentConfig.primaryColor};border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background-color .2s}#chatbot-send-button:hover{background:color-mix(in srgb, ${currentConfig.primaryColor} 90%, black)}#chatbot-send-button:disabled{background:#ccc;cursor:not-allowed}.chatbot-widget-branding{padding:8px 20px;background:#f8f8f8;text-align:center;border-top:1px solid #eee}.chatbot-widget-branding small{color:#999;font-size:11px}.chatbot-widget-trigger{position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:${currentConfig.primaryColor};border:none;border-radius:50%;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:2147483647;display:flex;align-items:center;justify-content:center;color:#fff;transition:all .3s ease}.chatbot-widget-trigger:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.25)}.chatbot-widget-notification{position:absolute;top:-5px;right:-5px;background:#ff4757;color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;font-weight:700;animation:pulse 2s infinite}@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}@media (max-width: 480px){.chatbot-widget-overlay{bottom:90px;left:10px;right:10px;width:auto;height:70vh;max-height:500px}.chatbot-widget-trigger{bottom:15px;right:15px;width:55px;height:55px}}</style>`;
    }
    function addMessage(text, isUser = false, showTime = true) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = createElement('div', `chatbot-message ${isUser ? 'chatbot-message-user' : 'chatbot-message-bot'}`);
        const contentDiv = createElement('div', 'chatbot-message-content');
        const textDiv = createElement('div', 'chatbot-message-text', sanitizeHTML(text));
        contentDiv.appendChild(textDiv);
        if (showTime) contentDiv.appendChild(createElement('div', 'chatbot-message-time', formatTime(new Date())));
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        messageHistory.push({ text, isUser, timestamp: new Date() });
        if (messageHistory.length > currentConfig.maxMessages) messageHistory = messageHistory.slice(-currentConfig.maxMessages);
    }
    function showTyping() { const typingDiv = document.getElementById('chatbot-typing'); if (typingDiv) { typingDiv.style.display = 'flex'; isTyping = true; } }
    function hideTyping() { const typingDiv = document.getElementById('chatbot-typing'); if (typingDiv) { typingDiv.style.display = 'none'; isTyping = false; } }
    async function handleUserMessage(message) {
        if (!message.trim()) return;
        addMessage(message, true);
        const inputField = document.getElementById('chatbot-input-field');
        const sendButton = document.getElementById('chatbot-send-button');
        if (inputField) inputField.value = '';
        if (sendButton) sendButton.disabled = true;
        showTyping();
        try {
            const response = await sendMessage(message);
            await new Promise(r => setTimeout(r, currentConfig.typingDelay));
            hideTyping();
            addMessage(response.response, false);
        } catch (error) {
            hideTyping();
            let errorMessage;
            if (error.message.includes('429') || error.message.includes('Too many')) errorMessage = getTranslation('errors.rateLimited');
            else if (error.message.includes('401') || error.message.includes('403')) errorMessage = 'Authentication error. Please contact support.';
            else if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('network')) errorMessage = getTranslation('errors.networkError');
            else errorMessage = getTranslation('errors.generalError');
            addMessage(errorMessage, false);
        } finally { if (sendButton) sendButton.disabled = false; }
    }
    function openWidget() {
        const overlay = widget.querySelector('.chatbot-widget-overlay');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        if (overlay && trigger) {
            overlay.style.display = 'block';
            trigger.style.display = 'none';
            isOpen = true;
            try { localStorage.setItem('mouna_widget_seen', 'true'); } catch (e) {}
            setTimeout(() => { const inputField = document.getElementById('chatbot-input-field'); if (inputField) inputField.focus(); }, 100);
        }
    }
    function closeWidget() {
        const overlay = widget.querySelector('.chatbot-widget-overlay');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        if (overlay && trigger) { overlay.style.display = 'none'; trigger.style.display = 'flex'; isOpen = false; }
    }
    function bindEvents() {
        const trigger = widget.querySelector('#aiChatToggle'); if (trigger) trigger.addEventListener('click', openWidget);
        const closeBtn = widget.querySelector('.chatbot-widget-close'); if (closeBtn) closeBtn.addEventListener('click', closeWidget);
        const sendBtn = widget.querySelector('#chatbot-send-button'); if (sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); const inputField = widget.querySelector('#chatbot-input-field'); if (inputField && inputField.value.trim()) handleUserMessage(inputField.value); });
        const inputField = widget.querySelector('#chatbot-input-field');
        if (inputField) {
            inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (inputField.value.trim()) handleUserMessage(inputField.value); } });
            inputField.addEventListener('input', (e) => { const hasText = e.target.value.trim().length > 0; if (sendBtn) { sendBtn.disabled = !hasText; sendBtn.style.opacity = hasText ? '1' : '0.5'; } });
            if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }
        }
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeWidget(); });
    }
    function renderTriggerIcon() {
        try { const trigger = widget && widget.querySelector ? widget.querySelector('#aiChatToggle') : null; if (!trigger) return; const notif = trigger.querySelector('#chatbot-notification'); if (currentConfig.customLogo) { const notifHtml = notif ? notif.outerHTML : '<span class="chatbot-widget-notification" id="chatbot-notification" style="display: none;"></span>'; trigger.innerHTML = `<img src="${currentConfig.customLogo}" alt="Chat" style=\"width:28px;height:28px;object-fit:contain;\">` + notifHtml; } } catch (e) {}
    }
    function setupAutoOpenRules() {
        try {
            let mode = (currentConfig.autoOpen || 'never').toLowerCase();
            const delaySec = currentConfig.autoOpenDelay || 10;
            const frequency = (currentConfig.autoOpenFrequency || 'always').toLowerCase();
            let autoOpened = false;
            function respectFrequency() {
                try {
                    if (frequency === 'session') { if (sessionStorage.getItem('mouna_autoopen_done') === 'true') return false; sessionStorage.setItem('mouna_autoopen_done', 'true'); return true; }
                    if (frequency === 'daily') { const today = new Date(); const key = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`; const last = localStorage.getItem('mouna_autoopen_day'); if (last === key) return false; localStorage.setItem('mouna_autoopen_day', key); return true; }
                } catch (e) {}
                return true;
            }
            function safeOpen() { if (!autoOpened && !isOpen) { if (!respectFrequency()) return; autoOpened = true; openWidget(); } }
            if (mode === 'returning') { try { const seen = localStorage.getItem('mouna_widget_seen') === 'true'; if (seen) setTimeout(safeOpen, 1000); } catch (e) {} }
            if (mode === 'immediate') setTimeout(safeOpen, 500);
            if (mode === 'time') setTimeout(safeOpen, Math.max(1, delaySec) * 1000);
            if (mode === 'exit') { const onMouseOut = (e) => { e = e || window.event; const from = e.relatedTarget || e.toElement; if (!from && e.clientY <= 0) { safeOpen(); document.removeEventListener('mouseout', onMouseOut); } }; document.addEventListener('mouseout', onMouseOut); }
        } catch (e) {}
    }
    async function initializeWidget() {
        sessionId = generateSessionId();
        const scriptTag = document.querySelector('script[src*="widget"]') || document.querySelector('script[data-api-key]');
        if (scriptTag) {
            const apiKey = scriptTag.getAttribute('data-api-key'); if (apiKey) currentConfig.apiKey = apiKey;
            const apiUrl = scriptTag.getAttribute('data-api-url'); if (apiUrl) currentConfig.apiEndpoint = apiUrl;
            const tenantId = scriptTag.getAttribute('data-tenant-id'); if (tenantId) currentConfig.tenantId = tenantId;
            const attributes = ['primary-color','position','title','welcome-message','subtitle','auto-open','auto-open-delay'];
            attributes.forEach(attr => { const value = scriptTag.getAttribute(`data-${attr}`); if (value) { const configKey = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase()); currentConfig[configKey] = value; } });
            const logoAttr = scriptTag.getAttribute('data-logo') || scriptTag.getAttribute('data-logo-url'); if (logoAttr) currentConfig.customLogo = logoAttr;
            const autoOpenMode = scriptTag.getAttribute('data-auto-open');
            const autoOpenDelayAttr = scriptTag.getAttribute('data-auto-open-delay');
            const autoOpenFreq = scriptTag.getAttribute('data-auto-open-frequency');
            if (autoOpenMode) currentConfig.autoOpen = autoOpenMode;
            if (autoOpenDelayAttr) { const sec = parseInt(autoOpenDelayAttr, 10); if (!Number.isNaN(sec)) currentConfig.autoOpenDelay = sec; }
            if (autoOpenFreq) currentConfig.autoOpenFrequency = autoOpenFreq;
        }
        if (!currentConfig.apiKey) {
            try { const response = await fetch(`${currentConfig.apiEndpoint}/test-api-key`); if (response.ok) { const data = await response.json(); currentConfig.apiKey = data.apiKey; } } catch (e) {}
        }
        widget = createElement('div', 'ai-chatbot-widget');
        widget.innerHTML = createWidgetHTML();
        const styleElement = createElement('div'); styleElement.innerHTML = createWidgetStyles(); document.head.appendChild(styleElement.firstElementChild);
        document.body.appendChild(widget);
        renderTriggerIcon();
        bindEvents();
        await loadConfiguration();
        setupAutoOpenRules();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeWidget); else initializeWidget();
    window.AIChatbotWidget = { open: openWidget, close: closeWidget, isOpen: () => isOpen, sendMessage: (message) => { if (isOpen) { handleUserMessage(message); } else { console.warn('Widget is not open. Call AIChatbotWidget.open() first.'); } }, getConfig: () => currentConfig, updateConfig: (newConfig) => { Object.assign(currentConfig, newConfig); } };
})();

