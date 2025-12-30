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
        apiEndpoint: window.ChatbotWidgetAPI || 'https://www.mouna-ai.com',
        apiKey: null,
        tenantId: null, // NEW: Tenant ID for configuration
        
        // Default widget settings
        primaryColor: '#0d7b8a',
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
        },
        // Contact/handoff
        contact: { email: '', phone: '' },
        whatsapp: { enabled: false, businessNumber: '' }
    };
    
    // Widget state
    let widget = null;
    let isOpen = false;
    let isTyping = false;
    let sessionId = null;
    let sessionRated = false;

    // Booking quick-reply UX state and helpers
    const bookingFlow = {
        active: false,
        awaitingName: false,
        awaitingEmail: false,
        chosenSlot: null,
        resourceId: 'default',
        tempName: null
    };
    function detectBookingIntent(text) {
        if (!text) return false;
        if (!currentConfig.enabledFeatures?.bookings) return false;
        const q = text.toLowerCase();
        return ['book', 'booking', 'reserve', 'reservation', 'appointment', 'schedule'].some(k => q.includes(k));
    }
    function formatSlotLabel(iso) {
        const d = new Date(iso);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const isTomorrow = d.toDateString() === tomorrow.toDateString();
        const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        if (sameDay) return `Today ${time}`;
        if (isTomorrow) return `Tomorrow ${time}`;
        return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    async function fetchTopSlots(limit = 5, resourceId = 'default') {
        const out = [];
        if (!currentConfig.tenantId) return out;
        let day = new Date();
        for (let i = 0; i < 3 && out.length < limit; i++) {
            const y = day.getFullYear();
            const m = String(day.getMonth() + 1).padStart(2, '0');
            const dd = String(day.getDate()).padStart(2, '0');
            const url = `${currentConfig.apiEndpoint}/api/bookings/${encodeURIComponent(currentConfig.tenantId)}/availability?date=${y}-${m}-${dd}&resourceId=${encodeURIComponent(resourceId)}`;
            try {
                const resp = await fetch(url);
                if (resp.ok) {
                    const data = await resp.json();
                    const now = new Date();
                    (data.slots || []).forEach(s => {
                        const start = new Date(s.start);
                        if (s.available && start > now && out.length < limit) out.push(s);
                    });
                }
            } catch (e) {}
            day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
        }
        return out.slice(0, limit);
    }
    function addOptionsMessage(title, options) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = createElement('div', 'chatbot-message chatbot-message-bot');
        const contentDiv = createElement('div', 'chatbot-message-content');
        const textDiv = createElement('div', 'chatbot-message-text');
        const heading = document.createElement('div');
        heading.style.marginBottom = '8px';
        heading.textContent = title;
        textDiv.appendChild(heading);
        const wrap = document.createElement('div');
        wrap.style.display = 'flex';
        wrap.style.flexWrap = 'wrap';
        wrap.style.gap = '8px';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chatbot-option-button';
            btn.textContent = opt.label;
            btn.setAttribute('data-action', opt.action || 'select-slot');
            if (opt.start) btn.setAttribute('data-start', opt.start);
            btn.style.padding = '8px 12px';
            btn.style.border = '1px solid #ddd';
            btn.style.borderRadius = '16px';
            btn.style.background = '#fff';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '12px';
            wrap.appendChild(btn);
        });
        textDiv.appendChild(wrap);
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(createElement('div', 'chatbot-message-time', formatTime(new Date())));
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    async function startBookingFlow() {
        bookingFlow.active = true;
        const slots = await fetchTopSlots(5, bookingFlow.resourceId);
        if (!slots.length) { addMessage('Sorry, I could not find available times right now. Please try another day or time.', false); bookingFlow.active = false; return; }
        const options = slots.map(s => ({ label: formatSlotLabel(s.start), start: s.start, action: 'select-slot' }));
        addOptionsMessage('Here are the next available times:', options);
    }
    async function postBooking(startISO, name, email) {
        try {
            const body = { tenantId: currentConfig.tenantId, resourceId: bookingFlow.resourceId, start: startISO, user: { name, email }, source: 'chat' };
            const resp = await fetch(`${currentConfig.apiEndpoint}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await resp.json();
            if (!resp.ok || !data.success) throw new Error(data.error || 'Booking failed');
            const b = data.booking; const label = formatSlotLabel(b.start);
            if (b.status === 'pending') addMessage(`Your booking request for ${label} has been received and is pending approval. We'll email you a confirmation.`, false);
            else addMessage(`Booked for ${label}. A confirmation email (with calendar invite) has been sent to ${email}.`, false);
            bookingFlow.active = false; bookingFlow.awaitingName = false; bookingFlow.awaitingEmail = false; bookingFlow.chosenSlot = null;
        } catch (e) { addMessage(`Could not complete booking: ${e.message}`, false); }
    }

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
function updateWidgetLanguage(lang) {
        currentLanguage = lang;
        const title = widget.querySelector('.chatbot-widget-title');
        const subtitle = widget.querySelector('.chatbot-widget-subtitle');
        const inputField = widget.querySelector('#chatbot-input-field');
        const typingText = widget.querySelector('.chatbot-typing-text');
        const closeBtn = widget.querySelector('.chatbot-widget-close');
        const trigger = widget.querySelector('.chatbot-widget-trigger');
        if (title) title.textContent = (currentConfig && currentConfig.title) ? currentConfig.title : getTranslation('title', lang);
        if (subtitle) subtitle.textContent = (currentConfig && currentConfig.subtitle) ? currentConfig.subtitle : getTranslation('subtitle', lang);
        if (inputField) {
            inputField.placeholder = getTranslation('placeholder', lang);
            inputField.setAttribute('lang', lang);
            inputField.setAttribute('inputmode', 'text');
            inputField.setAttribute('autocomplete', 'off');
        }
        if (typingText) typingText.textContent = getTranslation('typing', lang);
        if (closeBtn) closeBtn.title = getTranslation('close', lang);
        if (trigger) trigger.title = getTranslation('open', lang);
        const welcome = widget.querySelector('.chatbot-message-bot .chatbot-message-text');
        if (welcome) welcome.textContent = (currentConfig && currentConfig.welcomeMessage) ? currentConfig.welcomeMessage : getTranslation('welcomeMessage', lang);
        const langBtn = widget.querySelector('#chatbot-language-toggle .chatbot-current-lang');
        if (langBtn) langBtn.textContent = SUPPORTED_LANGUAGES[lang]?.flag || '🌐';
    }
    async function transliterateText(text, language) {
        if (!text || !language || language === 'en') return text;
        try {
            const response = await fetch(`${currentConfig.apiEndpoint}/api/transliterate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, toLanguage: language })
            });
            if (response.ok) {
                const data = await response.json();
                return data.convertedText || data.transliteratedText || text;
            }
        } catch (error) {
            // Fallback to original text on any error
        }
        return text;
    }
    function maybeRenderRatingUI() {
        try {
            if (sessionRated) return;
            const messagesContainer = document.getElementById('chatbot-messages');
            if (!messagesContainer) return;
            // Remove existing rating block if any
            const existing = messagesContainer.querySelector('#chatbot-rating');
            if (existing) existing.remove();
            // Find last bot message
            const bots = messagesContainer.querySelectorAll('.chatbot-message-bot .chatbot-message-content');
            if (!bots || !bots.length) return;
            const lastBot = bots[bots.length - 1];
            const block = document.createElement('div');
            block.className = 'chatbot-rating';
            block.id = 'chatbot-rating';
            block.innerHTML = `
                <span class="chatbot-rating-label">Was this helpful?</span>
                <div class="chatbot-rating-buttons">
                  <button type="button" class="rating-btn up" data-score="5" title="Yes">👍</button>
                  <button type="button" class="rating-btn down" data-score="1" title="No">👎</button>
                </div>`;
            lastBot.appendChild(block);
            const onClick = async (e) => {
                const btn = e.target.closest('button.rating-btn');
                if (!btn) return;
                const score = parseInt(btn.getAttribute('data-score'), 10);
                await submitSessionRating(score);
            };
            block.addEventListener('click', onClick);
        } catch (_) {}
    }

    async function submitSessionRating(score, feedback = '') {
        try {
            if (!sessionId || !currentConfig.apiEndpoint) return;
            const resp = await fetch(`${currentConfig.apiEndpoint}/api/sessions/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': currentConfig.apiKey || ''
                },
                body: JSON.stringify({ sessionId, score, feedback })
            });
            if (resp.ok) {
                sessionRated = true;
                const block = document.getElementById('chatbot-rating');
                if (block) {
                    block.innerHTML = '<span class="chatbot-rating-thanks">Thanks for your feedback!</span>';
                }
            }
        } catch (_) {}
    }

    function buildLanguageMenu() {
        let menu = widget.querySelector('#chatbot-lang-menu');
        if (menu) { menu.remove(); menu = null; }
        menu = document.createElement('div');
        menu.id = 'chatbot-lang-menu';
        menu.style.position = 'absolute';
        menu.style.top = '56px';
        menu.style.right = '16px';
        menu.style.background = '#fff';
        menu.style.border = '1px solid #eee';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
        menu.style.zIndex = '2147483648';
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.padding = '8px';
        Object.keys(SUPPORTED_LANGUAGES).forEach(code => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.style.padding = '8px 10px';
            btn.style.margin = '2px 0';
            btn.style.border = '1px solid #f0f0f0';
            btn.style.borderRadius = '6px';
            btn.style.background = code === currentLanguage ? '#eef2ff' : '#fff';
            btn.style.cursor = 'pointer';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '8px';
            btn.textContent = `${SUPPORTED_LANGUAGES[code].flag} ${SUPPORTED_LANGUAGES[code].nativeName}`;
            btn.addEventListener('click', () => { updateWidgetLanguage(code); menu.remove(); });
            list.appendChild(btn);
        });
        menu.appendChild(list);
        const header = widget.querySelector('.chatbot-widget-header');
        if (header && header.parentElement) {
            header.parentElement.appendChild(menu);
        }
    }
    async function sendMessage(message) {
        const response = await fetch(`${currentConfig.apiEndpoint}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': currentConfig.apiKey || '' },
            body: JSON.stringify({ message, sessionId, language: currentLanguage, tenantId: currentConfig.tenantId, userAgent: navigator.userAgent, referrer: document.referrer, pageUrl: (typeof location !== 'undefined' ? location.href : '') , pageTitle: (typeof document !== 'undefined' ? document.title : '') })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
    }
    async function loadConfiguration() {
        try {
            let url = currentConfig.apiKey ? `${currentConfig.apiEndpoint}/config/${encodeURIComponent(currentConfig.apiKey)}` : `${currentConfig.apiEndpoint}/config`;
            try { const page = encodeURIComponent(window.location && window.location.href ? window.location.href : ''); if (page) url += (url.includes('?') ? '&' : '?') + `page=${page}`; } catch (_) {}
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
                    if (config.size) currentConfig.size = config.size;
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
    // Load tenant configuration and merge enabled features for gating (bookings, etc.)
    async function loadTenantConfiguration(tenantId) {
        try {
            // Try standard tenant config first; fallback to demo route if available
            let resp = await fetch(`${currentConfig.apiEndpoint}/api/tenant/config/${encodeURIComponent(tenantId)}`);
            if (!resp.ok) {
                try {
                    resp = await fetch(`${currentConfig.apiEndpoint}/api/demo-tenant/config/${encodeURIComponent(tenantId)}`);
                } catch (_) {}
            }
            if (!resp.ok) return;
            const data = await resp.json();
            const tenantConfig = data.config || {};
            if (tenantConfig.enabledFeatures) {
                Object.assign(currentConfig.enabledFeatures, tenantConfig.enabledFeatures);
            }
            // Contact/handoff details from tenant
            if (tenantConfig.contact) {
                currentConfig.contact = tenantConfig.contact;
            }
            if (tenantConfig.whatsapp) {
                currentConfig.whatsapp = tenantConfig.whatsapp;
            }
            // White-labeling: hide branding for Starter/Pro/Enterprise
            if (data.ownerSubscription && ['starter','professional','enterprise'].includes(data.ownerSubscription.plan)) {
                currentConfig.showBranding = false;
                // If already rendered, remove the branding block from DOM
                try { const brand = widget && widget.querySelector ? widget.querySelector('.chatbot-widget-branding') : null; if (brand) brand.remove(); } catch (_) {}
            }
            // Respect explicitly-set primary color from script tag; otherwise allow tenant color
            if (!currentConfig.primaryColorLocked && tenantConfig.primaryColor) updateWidgetColors(tenantConfig.primaryColor);
            // Update handoff button visibility if present
            try { const btn = widget.querySelector('#chatbot-handoff-toggle'); if (btn) { const has = (currentConfig?.whatsapp?.businessNumber || currentConfig?.contact?.phone || currentConfig?.contact?.email); btn.style.display = has ? 'inline-flex' : 'none'; } } catch (_) {}
        } catch (e) {
            // Ignore errors, use defaults
        }
    }
    function updateWidgetColors(primaryColor) {
        if (!primaryColor || !widget) return;
        const style = document.createElement('style');
        style.innerHTML = `.ai-chatbot-widget{--primary-color:${primaryColor};--primary-color-hover:${primaryColor}dd;} .chatbot-widget-trigger{background:linear-gradient(135deg,${primaryColor},${primaryColor}aa)!important;} .chatbot-widget-header{background:linear-gradient(135deg,${primaryColor},${primaryColor}aa)!important;} .chatbot-message-user .chatbot-message-text{background:${primaryColor}!important;}`;
        document.head.appendChild(style);
    }
function createWidgetHTML() {
        const currentTranslations = TRANSLATIONS[currentLanguage] || TRANSLATIONS['en'];
        const titleText = (currentConfig && currentConfig.title) ? currentConfig.title : currentTranslations.title;
        const subtitleText = (currentConfig && currentConfig.subtitle) ? currentConfig.subtitle : currentTranslations.subtitle;
        const welcomeText = (currentConfig && currentConfig.welcomeMessage) ? currentConfig.welcomeMessage : currentTranslations.welcomeMessage;
        return `
            <div class="chatbot-widget-overlay" style="display: none;">
                <div class="chatbot-widget-container">
                    <div class="chatbot-widget-header">
                        <div class="chatbot-widget-info">
                            <h3 class="chatbot-widget-title">${titleText}</h3>
                            <p class="chatbot-widget-subtitle">${subtitleText}</p>
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
                                <div class="chatbot-message-text">${welcomeText}</div>
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
        const baseFont = currentConfig.fontFamily || "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
        return `<style>.chatbot-widget-overlay{position:fixed;bottom:90px;right:20px;width:380px;max-width:calc(100vw - 40px);height:500px;max-height:calc(100vh - 120px);z-index:2147483647;font-family:${baseFont};font-size:14px;line-height:1.4}.chatbot-widget-container{width:100%;height:100%;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;position:relative}.chatbot-widget-header{background:${currentConfig.primaryColor};color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}.chatbot-widget-controls{display:flex;gap:8px;align-items:center}.chatbot-language-toggle{background:rgba(255,255,255,.1);border:none;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;transition:background-color .2s}.chatbot-language-toggle:hover{background:rgba(255,255,255,.2)}.chatbot-widget-close{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;padding:4px;border-radius:4px;transition:background-color .2s}.chatbot-widget-close:hover{background:rgba(255,255,255,.1)}.chatbot-widget-messages{flex:1;padding:20px;overflow-y:auto;background:#fafafa}.chatbot-message{margin-bottom:16px;display:flex;animation:fadeIn .3s ease-in}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.chatbot-message-bot{justify-content:flex-start}.chatbot-message-user{justify-content:flex-end}.chatbot-message-content{max-width:80%;min-width:100px}.chatbot-message-text{padding:12px 16px;border-radius:18px;word-wrap:break-word;white-space:pre-wrap}.chatbot-message-bot .chatbot-message-text{background:#fff;color:#333;border-bottom-left-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,.1)}.chatbot-message-user .chatbot-message-text{background:${currentConfig.primaryColor};color:#fff;border-bottom-right-radius:6px}.chatbot-message-time{font-size:11px;color:#999;margin-top:4px;padding:0 16px}.chatbot-widget-typing{padding:12px 20px;background:#fff;border-top:1px solid #eee;display:flex;align-items:center;gap:8px}.chatbot-typing-indicator{display:flex;gap:3px}.chatbot-typing-indicator span{width:8px;height:8px;border-radius:50%;background:#ccc;animation:typing 1.4s infinite ease-in-out}.chatbot-typing-indicator span:nth-child(1){animation-delay:-.32s}.chatbot-typing-indicator span:nth-child(2){animation-delay:-.16s}@keyframes typing{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1);opacity:1}}.chatbot-typing-text{font-size:12px;color:#666}.chatbot-widget-input{display:flex;padding:16px 20px;background:#fff;border-top:1px solid #eee;gap:12px}#chatbot-input-field{flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 16px;font-size:14px;outline:none;transition:border-color .2s}#chatbot-input-field:focus{border-color:${currentConfig.primaryColor}}#chatbot-send-button{background:${currentConfig.primaryColor};border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;transition:background-color .2s}#chatbot-send-button:hover{background:color-mix(in srgb, ${currentConfig.primaryColor} 90%, black)}#chatbot-send-button:disabled{background:#ccc;cursor:not-allowed}.chatbot-widget-branding{padding:8px 20px;background:#f8f8f8;text-align:center;border-top:1px solid #eee}.chatbot-widget-branding small{color:#999;font-size:11px}.chatbot-widget-trigger{position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:${currentConfig.primaryColor};border:none;border-radius:50%;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:2147483647;display:flex;align-items:center;justify-content:center;color:#fff;transition:all .3s ease}.chatbot-widget-trigger:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.25)}.chatbot-widget-notification{position:absolute;top:-5px;right:-5px;background:#ff4757;color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;display:flex;align-items:center;justify-content:center;font-weight:700;animation:pulse 2s infinite}@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}.chatbot-rating{display:flex;align-items:center;gap:8px;margin-top:8px;padding:0 8px}.chatbot-rating-label{font-size:12px;color:#6b7280}.chatbot-rating-buttons{display:flex;gap:6px}.rating-btn{border:1px solid #e5e7eb;background:#fff;color:#111827;border-radius:14px;padding:4px 8px;cursor:pointer;font-size:12px}.rating-btn:hover{background:#f9fafb}.chatbot-rating-thanks{font-size:12px;color:#16a34a}@media (max-width: 480px){.chatbot-widget-overlay{bottom:90px;left:10px;right:10px;width:auto;height:70vh;max-height:500px}.chatbot-widget-trigger{bottom:15px;right:15px;width:55px;height:55px}}</style>`;
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
        // Convert to selected language script for display and API
        let displayText = message;
        try { displayText = await transliterateText(message, currentLanguage); } catch (_) {}
        addMessage(displayText, true);
        const inputField = document.getElementById('chatbot-input-field');
        const sendButton = document.getElementById('chatbot-send-button');
        if (inputField) inputField.value = '';
        if (sendButton) sendButton.disabled = true;

        // Booking flow inputs
        if (bookingFlow.awaitingName) {
            bookingFlow.tempName = message.trim();
            bookingFlow.awaitingName = false;
            bookingFlow.awaitingEmail = true;
            addMessage('Thanks! Please share your email so we can send the confirmation.', false);
            return;
        }
        if (bookingFlow.awaitingEmail) {
            const email = message.trim();
            const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!rx.test(email)) { addMessage('That email looks invalid. Please enter a valid email address.', false); return; }
            try { localStorage.setItem('mouna_booking_name', bookingFlow.tempName || ''); localStorage.setItem('mouna_booking_email', email); } catch (_) {}
            addMessage('Great, booking now...', false);
            await postBooking(bookingFlow.chosenSlot, bookingFlow.tempName || 'Guest', email);
            return;
        }
        // Detect booking intent (English keywords only for now)
        if (detectBookingIntent(message)) {
            addMessage('I can help you schedule an appointment.', false);
            await startBookingFlow();
            return;
        }

        showTyping();
        try {
            const response = await sendMessage(displayText);
            await new Promise(r => setTimeout(r, currentConfig.typingDelay));
            hideTyping();
            addMessage(response.response, false);
            // Prompt satisfaction rating after a bot response
            maybeRenderRatingUI();
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
        const langBtn = widget.querySelector('#chatbot-language-toggle'); if (langBtn) langBtn.addEventListener('click', (e) => { e.stopPropagation(); buildLanguageMenu(); });
        document.addEventListener('click', () => { const menu = widget.querySelector('#chatbot-lang-menu'); if (menu) menu.remove(); });
        const inputField = widget.querySelector('#chatbot-input-field');
        // Option button clicks (quick replies)
        const messagesContainer = widget.querySelector('#chatbot-messages');
        if (messagesContainer) {
            messagesContainer.addEventListener('click', async (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                if (action === 'select-slot') {
                    const start = btn.getAttribute('data-start');
                    bookingFlow.chosenSlot = start;
                    let name = null, email = null;
                    try { name = localStorage.getItem('mouna_booking_name'); email = localStorage.getItem('mouna_booking_email'); } catch (_) {}
                    if (name && email) { addMessage(`Booking ${formatSlotLabel(start)} for ${name} (${email})...`, false); await postBooking(start, name, email); }
                    else { bookingFlow.awaitingName = true; addMessage('Great choice! What name should we put on the booking?', false); }
                }
            });
        }
        if (inputField) {
            inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (inputField.value.trim()) handleUserMessage(inputField.value); } });
            inputField.addEventListener('input', (e) => { const hasText = e.target.value.trim().length > 0; if (sendBtn) { sendBtn.disabled = !hasText; sendBtn.style.opacity = hasText ? '1' : '0.5'; } });
            if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }
        }
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeWidget(); });
    }
    function getTriggerDiameter() {
        try {
            const map = { small: 50, medium: 60, large: 70 };
            const size = (currentConfig.size || 'medium').toLowerCase();
            return map[size] || 60;
        } catch (_) { return 60; }
    }
    function applyTriggerSize() {
        try {
            const trigger = widget && widget.querySelector ? widget.querySelector('#aiChatToggle') : null;
            if (!trigger) return;
            const d = getTriggerDiameter();
            trigger.style.width = `${d}px`;
            trigger.style.height = `${d}px`;
        } catch (_) {}
    }
    function renderTriggerIcon() {
        try {
            const trigger = widget && widget.querySelector ? widget.querySelector('#aiChatToggle') : null;
            if (!trigger) return;
            const notif = trigger.querySelector('#chatbot-notification');
            const d = getTriggerDiameter();
            const iconPx = Math.max(18, Math.round(d * 0.45));
            if (currentConfig.customLogo) {
                const notifHtml = notif ? notif.outerHTML : '<span class="chatbot-widget-notification" id="chatbot-notification" style="display: none;"></span>';
                trigger.innerHTML = `<img src="${currentConfig.customLogo}" alt="Chat" style=\"width:${iconPx}px;height:${iconPx}px;object-fit:contain;\">` + notifHtml;
            }
        } catch (e) {}
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
            const attributes = ['primary-color','position','title','welcome-message','subtitle','auto-open','auto-open-delay','size'];
            attributes.forEach(attr => { const value = scriptTag.getAttribute(`data-${attr}`); if (value) { const configKey = attr.replace(/-([a-z])/g, (g) => g[1].toUpperCase()); currentConfig[configKey] = value; } });
            // Support legacy alias data-color (do NOT lock color when using alias)
            const colorAlias = scriptTag.getAttribute('data-color');
            if (colorAlias && !scriptTag.getAttribute('data-primary-color')) { currentConfig.primaryColor = colorAlias; }
            // Additional font customization
            const fontFamily = scriptTag.getAttribute('data-font-family'); if (fontFamily) currentConfig.fontFamily = fontFamily;
            // Lock brand color only if explicitly provided via data-primary-color
            if (scriptTag.getAttribute('data-primary-color')) currentConfig.primaryColorLocked = true;
            const logoAttr = scriptTag.getAttribute('data-logo') || scriptTag.getAttribute('data-logo-url'); if (logoAttr) currentConfig.customLogo = logoAttr;
            const autoOpenMode = scriptTag.getAttribute('data-auto-open');
            const autoOpenDelayAttr = scriptTag.getAttribute('data-auto-open-delay');
            const autoOpenFreq = scriptTag.getAttribute('data-auto-open-frequency');
            if (autoOpenMode) currentConfig.autoOpen = autoOpenMode;
            if (autoOpenDelayAttr) { const sec = parseInt(autoOpenDelayAttr, 10); if (!Number.isNaN(sec)) currentConfig.autoOpenDelay = sec; }
            if (autoOpenFreq) currentConfig.autoOpenFrequency = autoOpenFreq;
        }
        // Resolve initial language (attribute or browser)
        try {
            let initialLang = null;
            if (scriptTag) {
                const langAttr = scriptTag.getAttribute('data-language') || scriptTag.getAttribute('data-lang');
                if (langAttr) {
                    const code = langAttr.toLowerCase();
                    const base = code.split('-')[0];
                    if (SUPPORTED_LANGUAGES[code]) initialLang = code;
                    else if (SUPPORTED_LANGUAGES[base]) initialLang = base;
                }
            }
            if (!initialLang) {
                const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
                const base = nav.split('-')[0];
                if (SUPPORTED_LANGUAGES[nav]) initialLang = nav;
                else if (SUPPORTED_LANGUAGES[base]) initialLang = base;
                else initialLang = 'en';
            }
            currentLanguage = initialLang;
        } catch (e) {}
        if (!currentConfig.apiKey) {
            try { const response = await fetch(`${currentConfig.apiEndpoint}/test-api-key`); if (response.ok) { const data = await response.json(); currentConfig.apiKey = data.apiKey; } } catch (e) {}
        }
        widget = createElement('div', 'ai-chatbot-widget');
        widget.innerHTML = createWidgetHTML();
        const styleElement = createElement('div'); styleElement.innerHTML = createWidgetStyles(); document.head.appendChild(styleElement.firstElementChild);
        document.body.appendChild(widget);
        // Apply initial size based on script attribute (if provided)
        applyTriggerSize();
        updateWidgetLanguage(currentLanguage);
        renderTriggerIcon();
        bindEvents();
        await loadConfiguration();
        // Apply server-provided size (if available) and re-render icon
        applyTriggerSize();
        renderTriggerIcon();
        if (currentConfig.tenantId) { await loadTenantConfiguration(currentConfig.tenantId); }
        setupAutoOpenRules();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeWidget); else initializeWidget();
    window.AIChatbotWidget = { open: openWidget, close: closeWidget, isOpen: () => isOpen, sendMessage: (message) => { if (isOpen) { handleUserMessage(message); } else { console.warn('Widget is not open. Call AIChatbotWidget.open() first.'); } }, getConfig: () => currentConfig, updateConfig: (newConfig) => { Object.assign(currentConfig, newConfig); } };
})();

