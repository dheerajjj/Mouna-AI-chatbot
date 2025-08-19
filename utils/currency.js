// Currency utility for Razorpay payment processing (INR only)
const axios = require('axios');

// Supported currencies (focusing on INR for Razorpay)
const SUPPORTED_CURRENCIES = {
  'INR': {
    symbol: '₹',
    locale: 'en-IN',
    name: 'Indian Rupee',
    razorpayMinAmount: 100, // Minimum ₹1.00 (100 paise)
    region: 'IN'
  }
};

// Since we're only using Razorpay with INR, we don't need exchange rates
const EXCHANGE_RATES = {
  'INR': 1.0        // Base currency - INR only
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
 * Convert price to Razorpay's smallest unit (paise)
 * @param {number} price - Price in rupees
 * @returns {number} Price in paise
 */
function toRazorpayAmount(price) {
  return Math.round(price * 100);
}

/**
 * Convert from Razorpay's smallest unit to major currency unit
 * @param {number} razorpayAmount - Amount in paise
 * @returns {number} Price in rupees
 */
function fromRazorpayAmount(razorpayAmount) {
  return razorpayAmount / 100;
}

/**
 * Format INR currency for display
 * @param {number} amount - Amount to format in INR
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  const config = SUPPORTED_CURRENCIES['INR'];
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    return `${config.symbol}${amount}`;
  }
}

/**
 * Get user's currency - always INR since we only support Razorpay
 * @param {string} countryCode - ISO country code (ignored)
 * @returns {string} Currency code - always INR
 */
function getCurrencyByCountry(countryCode) {
  return 'INR'; // Always return INR since we only support Razorpay
}

/**
 * Validate if currency is supported (only INR)
 * @param {string} currency - Currency code
 * @returns {boolean} Whether currency is supported
 */
function isSupportedCurrency(currency) {
  return currency.toUpperCase() === 'INR';
}

/**
 * Get INR pricing (since we only support Razorpay)
 * @param {Object} basePricing - Pricing in INR
 * @returns {Object} INR pricing with Razorpay amounts
 */
async function getINRPricing(basePricing) {
  const inrPricing = {};
  
  for (const [planId, plan] of Object.entries(basePricing)) {
    if (plan.price) {
      inrPricing[planId] = {
        ...plan,
        currency: 'INR',
        formattedPrice: formatCurrency(plan.price),
        razorpayAmount: toRazorpayAmount(plan.price)
      };
    } else {
      // Free plan
      inrPricing[planId] = {
        ...plan,
        currency: 'INR',
        formattedPrice: formatCurrency(0)
      };
    }
  }
  
  return inrPricing;
}

/**
 * Get supported payment methods for Razorpay (INR only)
 * @returns {Array} Supported payment methods
 */
function getSupportedPaymentMethods() {
  return ['card', 'netbanking', 'wallet', 'upi'];
}

module.exports = {
  SUPPORTED_CURRENCIES,
  EXCHANGE_RATES,
  getLiveExchangeRates,
  convertPrice,
  toRazorpayAmount,
  fromRazorpayAmount,
  formatCurrency,
  getCurrencyByCountry,
  isSupportedCurrency,
  getINRPricing,
  getSupportedPaymentMethods
};
