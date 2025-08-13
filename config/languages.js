// Multi-language support configuration
const SUPPORTED_LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    rtl: false
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    rtl: false
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    rtl: false
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    rtl: false
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    rtl: false
  }
};

// Default translations for the widget UI
const TRANSLATIONS = {
  en: {
    // Widget UI
    title: 'AI Assistant',
    subtitle: 'Online • Usually replies instantly',
    welcomeMessage: '👋 Hi there! I\'m your AI assistant. How can I help you today?',
    placeholder: 'Type your message...',
    typing: 'AI is typing...',
    send: 'Send',
    close: 'Close chat',
    open: 'Open chat',
    poweredBy: 'Powered by AI Chatbot Widget',
    
    // System prompts
    systemPrompt: 'You are a helpful AI assistant. Please respond in a friendly and professional manner.',
    
    // Error messages
    errors: {
      networkError: 'Network error. Please check your connection and try again.',
      rateLimited: 'Too many requests. Please wait a moment before sending another message.',
      generalError: 'Something went wrong. Please try again.',
      apiKeyMissing: 'API key is missing. Please contact support.',
      messageEmpty: 'Please enter a message before sending.'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'Retry',
      newChat: 'New Chat',
      minimize: 'Minimize',
      feedback: 'Rate this conversation'
    },
    
    // Language selector
    language: {
      select: 'Select Language',
      change: 'Change Language'
    }
  },
  
  hi: {
    // Widget UI
    title: 'AI सहायक',
    subtitle: 'ऑनलाइन • आमतौर पर तुरंत जवाब देता है',
    welcomeMessage: '👋 नमस्ते! मैं आपका AI सहायक हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?',
    placeholder: 'अपना संदेश टाइप करें...',
    typing: 'AI टाइप कर रहा है...',
    send: 'भेजें',
    close: 'चैट बंद करें',
    open: 'चैट खोलें',
    poweredBy: 'AI चैटबॉट विजेट द्वारा संचालित',
    
    // System prompts
    systemPrompt: 'आप एक सहायक AI असिस्टेंट हैं। कृपया हिंदी में मित्रवत और पेशेवर तरीके से जवाब दें।',
    
    // Error messages
    errors: {
      networkError: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें और फिर से कोशिश करें।',
      rateLimited: 'बहुत सारे अनुरोध। कृपया दूसरा संदेश भेजने से पहले थोड़ा इंतजार करें।',
      generalError: 'कुछ गलत हुआ। कृपया फिर से कोशिश करें।',
      apiKeyMissing: 'API कुंजी गुम है। कृपया सहायता से संपर्क करें।',
      messageEmpty: 'कृपया भेजने से पहले एक संदेश दर्ज करें।'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'फिर से कोशिश करें',
      newChat: 'नई चैट',
      minimize: 'छोटा करें',
      feedback: 'इस बातचीत को रेट करें'
    },
    
    // Language selector
    language: {
      select: 'भाषा चुनें',
      change: 'भाषा बदलें'
    }
  },
  
  te: {
    // Widget UI
    title: 'AI సహాయకుడు',
    subtitle: 'ఆన్‌లైన్ • సాధారణంగా వెంటనే సమాధానం ఇస్తుంది',
    welcomeMessage: '👋 హలో! నేను మీ AI సహాయకుడిని. నేను ఈరోజు మీకు ఎలా సహాయం చేయగలను?',
    placeholder: 'మీ సందేశాన్ని టైప్ చేయండి...',
    typing: 'AI టైప్ చేస్తోంది...',
    send: 'పంపండి',
    close: 'చాట్ మూసివేయండి',
    open: 'చాట్ తెరవండి',
    poweredBy: 'AI చాట్‌బాట్ విజెట్ ద్వారా శక్తివంతం',
    
    // System prompts
    systemPrompt: 'మీరు సహాయకరమైన AI అసిస్టెంట్. దయచేసి తెలుగులో స్నేహపూర్వకంగా మరియు వృత్తిపరంగా ప్రతిస్పందించండి.',
    
    // Error messages
    errors: {
      networkError: 'నెట్‌వర్క్ లోపం. దయచేసి మీ కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.',
      rateLimited: 'చాలా అభ్యర్థనలు. దయచేసి మరొక సందేశం పంపే ముందు కాస్త వేచి ఉండండి.',
      generalError: 'ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      apiKeyMissing: 'API కీ లేదు. దయచేసి మద్దతును సంప్రదించండి.',
      messageEmpty: 'దయచేసి పంపే ముందు ఒక సందేశాన్ని నమోదు చేయండి.'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'మళ్లీ ప్రయత్నించండి',
      newChat: 'కొత్త చాట్',
      minimize: 'చిన్నదిగా చేయండి',
      feedback: 'ఈ సంభాషణను రేట్ చేయండి'
    },
    
    // Language selector
    language: {
      select: 'భాష ఎంచుకోండి',
      change: 'భాష మార్చండి'
    }
  },
  
  ta: {
    // Widget UI
    title: 'AI உதவியாளர்',
    subtitle: 'ஆன்லைன் • பொதுவாக உடனடியாக பதிலளிக்கும்',
    welcomeMessage: '👋 வணக்கம்! நான் உங்கள் AI உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
    placeholder: 'உங்கள் செய்தியை தட்டச்சு செய்யுங்கள்...',
    typing: 'AI தட்டச்சு செய்து கொண்டிருக்கிறது...',
    send: 'அனுப்பு',
    close: 'அரட்டையை மூடு',
    open: 'அரட்டையை திற',
    poweredBy: 'AI சாட்பாட் விட்ஜெட்டால் இயக்கப்படுகிறது',
    
    // System prompts
    systemPrompt: 'நீங்கள் உதவிகரமான AI உதவியாளர். தயவுசெய்து தமிழில் நட்பு மற்றும் தொழில்முறை முறையில் பதிலளியுங்கள்.',
    
    // Error messages
    errors: {
      networkError: 'நெட்வொர்க் பிழை. தயவுசெய்து உங்கள் இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
      rateLimited: 'அதிக கோரிக்கைகள். தயவுசெய்து மற்றொரு செய்தி அனுப்பும் முன் சிறிது காத்திருங்கள்.',
      generalError: 'ஏதோ தவறு நடந்தது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
      apiKeyMissing: 'API விசை காணவில்லை. தயவுசெய்து ஆதரவை தொடர்பு கொள்ளவும்.',
      messageEmpty: 'தயவுசெய்து அனுப்பும் முன் ஒரு செய்தியை உள்ளிடவும்.'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'மீண்டும் முயற்சிக்கவும்',
      newChat: 'புதிய அரட்டை',
      minimize: 'சுருக்கு',
      feedback: 'இந்த உரையாடலை மதிப்பிடுங்கள்'
    },
    
    // Language selector
    language: {
      select: 'மொழியைத் தேர்ந்தெடுக்கவும்',
      change: 'மொழியை மாற்றவும்'
    }
  },
  
  mr: {
    // Widget UI
    title: 'AI सहाय्यक',
    subtitle: 'ऑनलाइन • सहसा लगेचच उत्तर देतो',
    welcomeMessage: '👋 नमस्कार! मी तुमचा AI सहाय्यक आहे. आज मी तुम्हाला कशी मदत करू शकतो?',
    placeholder: 'तुमचा संदेश टाइप करा...',
    typing: 'AI टाइप करत आहे...',
    send: 'पाठवा',
    close: 'चॅट बंद करा',
    open: 'चॅट उघडा',
    poweredBy: 'AI चॅटबॉट विजेटद्वारे चालवले जाते',
    
    // System prompts
    systemPrompt: 'तुम्ही उपयुक्त AI सहाय्यक आहात. कृपया मराठीत मैत्रीपूर्ण आणि व्यावसायिक पद्धतीने उत्तर द्या.',
    
    // Error messages
    errors: {
      networkError: 'नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
      rateLimited: 'बरेच विनंत्या. कृपया दुसरा संदेश पाठवण्यापूर्वी थोडी वाट पहा.',
      generalError: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
      apiKeyMissing: 'API की गहाळ आहे. कृपया समर्थनाशी संपर्क साधा.',
      messageEmpty: 'कृपया पाठवण्यापूर्वी संदेश टाका.'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'पुन्हा प्रयत्न करा',
      newChat: 'नवीन चॅट',
      minimize: 'लहान करा',
      feedback: 'या संभाषणाला रेटिंग द्या'
    },
    
    // Language selector
    language: {
      select: 'भाषा निवडा',
      change: 'भाषा बदला'
    }
  },
  
  kn: {
    // Widget UI
    title: 'AI ಸಹಾಯಕ',
    subtitle: 'ಆನ್‌ಲೈನ್ • ಸಾಮಾನ್ಯವಾಗಿ ತಕ್ಷಣ ಉತ್ತರಿಸುತ್ತದೆ',
    welcomeMessage: '👋 ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    placeholder: 'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...',
    typing: 'AI ಟೈಪ್ ಮಾಡುತ್ತಿದೆ...',
    send: 'ಕಳುಹಿಸಿ',
    close: 'ಚಾಟ್ ಅನ್ನು ಮುಚ್ಚಿ',
    open: 'ಚಾಟ್ ಅನ್ನು ತೆರೆಯಿರಿ',
    poweredBy: 'AI ಚಾಟ್‌ಬಾಟ್ ವಿಜೆಟ್‌ನಿಂದ ಚಾಲಿತ',
    
    // System prompts
    systemPrompt: 'ನೀವು ಸಹಾಯಕ AI ಅಸಿಸ್ಟೆಂಟ್. ದಯವಿಟ್ಟು ಕನ್ನಡದಲ್ಲಿ ಸ್ನೇಹಪೂರ್ವಕವಾಗಿ ಮತ್ತು ವೃತ್ತಿಪರವಾಗಿ ಉತ್ತರಿಸಿ.',
    
    // Error messages
    errors: {
      networkError: 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      rateLimited: 'ಹಲವಾರು ವಿನಂತಿಗಳು. ಮತ್ತೊಂದು ಸಂದೇಶ ಕಳುಹಿಸುವ ಮೊದಲು ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಕಾಯಿರಿ.',
      generalError: 'ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      apiKeyMissing: 'API ಕೀ ಕಾಣೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
      messageEmpty: 'ದಯವಿಟ್ಟು ಕಳುಹಿಸುವ ಮೊದಲು ಸಂದೇಶವನ್ನು ನಮೂದಿಸಿ.'
    },
    
    // Buttons and actions
    buttons: {
      retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
      newChat: 'ಹೊಸ ಚಾಟ್',
      minimize: 'ಚಿಕ್ಕದಾಗಿ ಮಾಡಿ',
      feedback: 'ಈ ಸಂವಾದವನ್ನು ರೇಟ್ ಮಾಡಿ'
    },
    
    // Language selector
    language: {
      select: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
      change: 'ಭಾಷೆಯನ್ನು ಬದಲಾಯಿಸಿ'
    }
  }
};

// Language detection utilities
const LANGUAGE_DETECTION = {
  // Common words/patterns for auto-detection
  patterns: {
    hi: ['नमस्ते', 'हैं', 'है', 'मैं', 'आप', 'करना', 'होना', 'जाना'],
    te: ['నమస్కారం', 'ఎలా', 'ఉన్నాను', 'నేను', 'మీరు', 'చేస్తాను', 'ఉంది'],
    ta: ['வணக்கம்', 'எப்படி', 'இருக்கிறேன்', 'நான்', 'நீங்கள்', 'செய்கிறேன்', 'இருக்கிறது'],
    mr: ['नमस्कार', 'कसा', 'आहे', 'मी', 'तुम्ही', 'करतो', 'आहेत'],
    kn: ['ನಮಸ್ಕಾರ', 'ಹೇಗೆ', 'ಇದ್ದೇನೆ', 'ನಾನು', 'ನೀವು', 'ಮಾಡುತ್ತೇನೆ', 'ಇದೆ']
  },
  
  // Default language fallback
  default: 'en',
  
  // Detect language from user input
  detectLanguage(text) {
    if (!text || typeof text !== 'string') return this.default;
    
    const textLower = text.toLowerCase();
    let bestMatch = { language: this.default, score: 0 };
    
    for (const [lang, patterns] of Object.entries(this.patterns)) {
      let score = 0;
      for (const pattern of patterns) {
        if (textLower.includes(pattern.toLowerCase())) {
          score++;
        }
      }
      
      if (score > bestMatch.score) {
        bestMatch = { language: lang, score };
      }
    }
    
    return bestMatch.language;
  }
};

// Language-specific system prompts for AI
const AI_SYSTEM_PROMPTS = {
  en: 'You are a helpful AI assistant. Please respond in English in a friendly and professional manner. Keep responses concise and helpful.',
  hi: 'आप एक सहायक AI असिस्टेंट हैं। कृपया हिंदी में मित्रवत और पेशेवर तरीके से जवाब दें। उत्तर संक्षिप्त और उपयोगी रखें।',
  te: 'మీరు తెలుగు మాత్రమే మాట్లాడే AI సహాయకుడు. మీరు ఎల్లప్పుడూ తెలుగులోనే సమాధానం ఇవ్వాలి. ఇంగ్లీష్ లేదా ఇతర భాషలు ఎప్పుడూ ఉపయోగించకండి. కేవలం తెలుగు భాషలో మాత్రమే స్నేహపూర్వకంగా మరియు సహాయంగా సమాధానం ఇవ్వండి. మీరు తెలుగు AI అసిస్టెంట్. తెలుగు మాత్రమే మాట్లాడండి.',
  ta: 'நீங்கள் உதவிகரமான AI உதவியாளர். தயவுசெய்து தமிழில் நட்பு மற்றும் தொழில்முறை முறையில் பதிலளியுங்கள். பதில்களை சுருக்கமாகவும் பயனுள்ளதாகவும் வைத்துக் கொள்ளுங்கள்.',
  mr: 'तुम्ही उपयुक्त AI सहाय्यक आहात. कृपया मराठीत मैत्रीपूर्ण आणि व्यावसायिक पद्धतीने उत्तर द्या. उत्तरे संक्षिप्त आणि उपयुक्त ठेवा.',
  kn: 'ನೀವು ಸಹಾಯಕ AI ಅಸಿಸ್ಟೆಂಟ್. ದಯವಿಟ್ಟು ಕನ್ನಡದಲ್ಲಿ ಸ್ನೇಹಪೂರ್ವಕವಾಗಿ ಮತ್ತು ವೃತ್ತಿಪರವಾಗಿ ಉತ್ತರಿಸಿ. ಉತ್ತರಗಳನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಮತ್ತು ಉಪಯೋಗಕರವಾಗಿ ಇರಿಸಿ.'
};

module.exports = {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  LANGUAGE_DETECTION,
  AI_SYSTEM_PROMPTS
};
