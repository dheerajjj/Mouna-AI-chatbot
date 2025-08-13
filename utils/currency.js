// Multi-currency utility for Stripe payment processing
const axios = require('axios');

// Supported currencies with their configurations
const SUPPORTED_CURRENCIES = {
  'INR': {
    symbol: '₹',
    locale: 'en-IN',
    name: 'Indian Rupee',
    stripeMinAmount: 50, // Minimum 50 paise (₹0.50)
    region: 'IN'
  },
  'USD': {
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar',
    stripeMinAmount: 50, // Minimum 50 cents ($0.50)
    region: 'US'
  },
  'EUR': {
    symbol: '€',
    locale: 'de-DE',
    name: 'Euro',
    stripeMinAmount: 50, // Minimum 50 cents (€0.50)
    region: 'EU'
  },
  'GBP': {
    symbol: '£',
    locale: 'en-GB',
    name: 'British Pound',
    stripeMinAmount: 30, // Minimum 30 pence (£0.30)
    region: 'GB'
  },
  'CAD': {
    symbol: 'C$',
    locale: 'en-CA',
    name: 'Canadian Dollar',
    stripeMinAmount: 50, // Minimum 50 cents (C$0.50)
    region: 'CA'
  },
  'AUD': {
    symbol: 'A$',
    locale: 'en-AU',
    name: 'Australian Dollar',
    stripeMinAmount: 50, // Minimum 50 cents (A$0.50)
    region: 'AU'
  }
};

// Static exchange rates (can be replaced with live API)
const EXCHANGE_RATES = {
  'INR': 1.0,        // Base currency
  'USD': 0.012,      // 1 INR = 0.012 USD
  'EUR': 0.011,      // 1 INR = 0.011 EUR
  'GBP': 0.0095,     // 1 INR = 0.0095 GBP
  'CAD': 0.016,      // 1 INR = 0.016 CAD
  'AUD': 0.018       // 1 INR = 0.018 AUD
};

/**
 * Get live exchange rates from an API
 * @param {string} baseCurrency - Base currency (default: INR)
 * @returns {Object} Exchange rates
 */
async function getLiveExchangeRates(baseCurrency = 'INR') {
  try {
    // Using exchangerate-api.com (free tier)
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    return response.data.rates;
  } catch (error) {
    console.warn('Failed to fetch live exchange rates, using static rates:', error.message);
    return EXCHANGE_RATES;
  }
}

/**
 * Convert price from INR to target currency
 * @param {number} inrPrice - Price in INR
 * @param {string} targetCurrency - Target currency code
 * @param {Object} rates - Exchange rates object
 * @returns {number} Converted price
 */
function convertPrice(inrPrice, targetCurrency, rates = EXCHANGE_RATES) {
  if (targetCurrency === 'INR') return inrPrice;
  
  const rate = rates[targetCurrency] || EXCHANGE_RATES[targetCurrency];
  if (!rate) {
    throw new Error(`Unsupported currency: ${targetCurrency}`);
  }
  
  return Math.round(inrPrice * rate * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert price to Stripe's smallest unit (cents/paise)
 * @param {number} price - Price in major currency unit
 * @param {string} currency - Currency code
 * @returns {number} Price in smallest unit
 */
function toStripeAmount(price, currency) {
  // Some currencies don't use decimal places (e.g., JPY, KRW)
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(price);
  }
  
  return Math.round(price * 100);
}

/**
 * Convert from Stripe's smallest unit to major currency unit
 * @param {number} stripeAmount - Amount in smallest unit
 * @param {string} currency - Currency code
 * @returns {number} Price in major unit
 */
function fromStripeAmount(stripeAmount, currency) {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return stripeAmount;
  }
  
  return stripeAmount / 100;
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency) {
  const config = SUPPORTED_CURRENCIES[currency];
  if (!config) {
    return `${amount} ${currency}`;
  }
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    return `${config.symbol}${amount}`;
  }
}

/**
 * Get user's currency based on their location/IP
 * @param {string} countryCode - ISO country code
 * @returns {string} Currency code
 */
function getCurrencyByCountry(countryCode) {
  const countryToCurrency = {
    'IN': 'INR',
    'US': 'USD',
    'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR',
    'GB': 'GBP',
    'CA': 'CAD',
    'AU': 'AUD'
  };
  
  return countryToCurrency[countryCode] || 'USD'; // Default to USD
}

/**
 * Validate if currency is supported
 * @param {string} currency - Currency code
 * @returns {boolean} Whether currency is supported
 */
function isSupportedCurrency(currency) {
  return SUPPORTED_CURRENCIES.hasOwnProperty(currency.toUpperCase());
}

/**
 * Get pricing for all supported currencies
 * @param {Object} basePricing - Pricing in INR
 * @param {Object} rates - Exchange rates
 * @returns {Object} Multi-currency pricing
 */
async function getMultiCurrencyPricing(basePricing, useLiveRates = false) {
  const rates = useLiveRates ? await getLiveExchangeRates() : EXCHANGE_RATES;
  const multiCurrencyPricing = {};
  
  for (const [currency, config] of Object.entries(SUPPORTED_CURRENCIES)) {
    multiCurrencyPricing[currency] = {};
    
    for (const [planId, plan] of Object.entries(basePricing)) {
      if (plan.price) {
        const convertedPrice = convertPrice(plan.price, currency, rates);
        
        multiCurrencyPricing[currency][planId] = {
          ...plan,
          price: convertedPrice,
          currency: currency,
          formattedPrice: formatCurrency(convertedPrice, currency),
          stripeAmount: toStripeAmount(convertedPrice, currency)
        };
      } else {
        // Free plan
        multiCurrencyPricing[currency][planId] = {
          ...plan,
          currency: currency,
          formattedPrice: formatCurrency(0, currency)
        };
      }
    }
  }
  
  return multiCurrencyPricing;
}

/**
 * Get supported payment methods by currency/country
 * @param {string} currency - Currency code
 * @returns {Array} Supported payment methods
 */
function getSupportedPaymentMethods(currency) {
  const paymentMethods = {
    'INR': ['card', 'netbanking', 'wallet', 'upi'],
    'USD': ['card', 'apple_pay', 'google_pay'],
    'EUR': ['card', 'sepa_debit', 'giropay', 'ideal'],
    'GBP': ['card', 'bacs_debit'],
    'CAD': ['card'],
    'AUD': ['card', 'au_becs_debit']
  };
  
  return paymentMethods[currency] || ['card'];
}

module.exports = {
  SUPPORTED_CURRENCIES,
  EXCHANGE_RATES,
  getLiveExchangeRates,
  convertPrice,
  toStripeAmount,
  fromStripeAmount,
  formatCurrency,
  getCurrencyByCountry,
  isSupportedCurrency,
  getMultiCurrencyPricing,
  getSupportedPaymentMethods
};
