/**
 * WebsiteCrawler - Intelligent Website Crawling and Data Extraction
 * 
 * Crawls websites, parses content, extracts structured data (JSON-LD, meta tags),
 * and builds a comprehensive knowledge base from web content.
 */

let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (error) {
    console.warn('⚠️ Puppeteer not available:', error.message);
    puppeteer = null;
}

const cheerio = require('cheerio');
const axios = require('axios');
const { URL } = require('url');

let robotsParser;
try {
    robotsParser = require('robots-parser');
} catch (error) {
    console.warn('⚠️ robots-parser not available:', error.message);
    robotsParser = null;
}

class WebsiteCrawler {
    constructor() {
        this.browser = null;
        this.visited = new Set();
        this.extracted = [];
    }

    /**
     * Crawl a website and extract all relevant data
     * @param {string} websiteUrl - Base website URL to crawl
     * @param {Object} options - Crawling options
     * @returns {Object} Crawl results with extracted data
     */
    async crawlWebsite(websiteUrl, options = {}) {
        console.log(`🕷️ Starting website crawl: ${websiteUrl}`);
        
        // Check if Puppeteer is available
        if (!puppeteer) {
            throw new Error('Puppeteer is not available. Cannot perform website crawling.');
        }
        
        const baseUrl = this.normalizeUrl(websiteUrl);
        const crawlOptions = {
            maxPages: options.maxPages || 20,
            timeout: options.timeout || 30000,
            includeImages: options.includeImages || false,
            followSitemap: options.followSitemap !== false,
            respectRobots: options.respectRobots !== false,
            ...options
        };

        try {
            // Initialize browser for JavaScript-heavy sites
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ],
                timeout: crawlOptions.timeout
            });

            const results = {
                baseUrl,
                crawledAt: new Date(),
                pages: [],
                structuredData: {},
                businessInfo: {},
                siteMetadata: {},
                errors: []
            };

            // Step 1: Check robots.txt
            const robotsRules = await this.checkRobotsTxt(baseUrl);
            
            // Step 2: Find URLs to crawl
            const urlsToCrawl = await this.discoverUrls(baseUrl, crawlOptions, robotsRules);
            console.log(`📋 Found ${urlsToCrawl.length} URLs to crawl`);

            // Step 3: Crawl each URL
            let crawledCount = 0;
            for (const url of urlsToCrawl) {
                if (crawledCount >= crawlOptions.maxPages) break;

                try {
                    const pageData = await this.crawlPage(url, crawlOptions);
                    if (pageData) {
                        results.pages.push(pageData);
                        crawledCount++;
                        
                        // Extract business-relevant data
                        this.extractBusinessData(pageData, results.businessInfo);
                        this.extractStructuredData(pageData, results.structuredData);
                    }
                } catch (error) {
                    console.warn(`⚠️ Failed to crawl ${url}:`, error.message);
                    results.errors.push({
                        url,
                        error: error.message,
                        timestamp: new Date()
                    });
                }

                // Rate limiting
                await this.delay(500);
            }

            // Step 4: Extract site-wide metadata
            results.siteMetadata = await this.extractSiteMetadata(results);

            console.log(`✅ Crawl completed: ${results.pages.length} pages processed`);
            return results;

        } catch (error) {
            console.error(`❌ Crawl failed:`, error);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        }
    }

    /**
     * Crawl a single page and extract all data
     * @param {string} url - Page URL
     * @param {Object} options - Crawling options
     * @returns {Object} Page data
     */
    async crawlPage(url, options = {}) {
        const page = await this.browser.newPage();
        
        try {
            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (compatible; AIchatbot-crawler/1.0)');
            
            // Navigate to page
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: options.timeout || 30000
            });

            // Extract page content
            const pageData = await page.evaluate(() => {
                const extractTextContent = (element) => {
                    return element ? element.textContent.trim().replace(/\s+/g, ' ') : '';
                };

                return {
                    title: document.title || '',
                    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
                    
                    // Headings
                    headings: {
                        h1: Array.from(document.querySelectorAll('h1')).map(h => extractTextContent(h)),
                        h2: Array.from(document.querySelectorAll('h2')).map(h => extractTextContent(h)),
                        h3: Array.from(document.querySelectorAll('h3')).map(h => extractTextContent(h))
                    },

                    // Main content areas
                    content: {
                        main: extractTextContent(document.querySelector('main')),
                        article: extractTextContent(document.querySelector('article')),
                        body: extractTextContent(document.body)
                    },

                    // Navigation and footer
                    navigation: Array.from(document.querySelectorAll('nav a, header a')).map(a => ({
                        text: extractTextContent(a),
                        href: a.getAttribute('href')
                    })),

                    footer: extractTextContent(document.querySelector('footer')),

                    // Contact information
                    contactInfo: this.extractContactInfo(),

                    // Structured data
                    jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                        .map(script => {
                            try {
                                return JSON.parse(script.textContent);
                            } catch (e) {
                                return null;
                            }
                        }).filter(Boolean),

                    // OpenGraph data
                    openGraph: {
                        title: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
                        description: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
                        type: document.querySelector('meta[property="og:type"]')?.getAttribute('content'),
                        image: document.querySelector('meta[property="og:image"]')?.getAttribute('content')
                    },

                    // Business-specific elements
                    businessElements: {
                        prices: Array.from(document.querySelectorAll('[class*="price"], [class*="cost"]'))
                            .map(el => extractTextContent(el)),
                        menuItems: Array.from(document.querySelectorAll('[class*="menu"], [class*="item"]'))
                            .map(el => extractTextContent(el)),
                        services: Array.from(document.querySelectorAll('[class*="service"], [class*="offer"]'))
                            .map(el => extractTextContent(el)),
                        hours: Array.from(document.querySelectorAll('[class*="hour"], [class*="time"]'))
                            .map(el => extractTextContent(el))
                    }
                };
            });

            // Add URL and processing info
            pageData.url = url;
            pageData.crawledAt = new Date();
            pageData.wordCount = this.countWords(pageData.content.body);
            
            // Extract images if requested
            if (options.includeImages) {
                pageData.images = await this.extractImages(page);
            }

            return pageData;

        } catch (error) {
            console.error(`Error crawling page ${url}:`, error);
            return null;
        } finally {
            await page.close();
        }
    }

    /**
     * Discover URLs to crawl from sitemap and navigation
     * @param {string} baseUrl - Base website URL
     * @param {Object} options - Discovery options
     * @param {Object} robotsRules - Robots.txt rules
     * @returns {Array} List of URLs to crawl
     */
    async discoverUrls(baseUrl, options, robotsRules) {
        const urls = new Set([baseUrl]);
        
        // 1. Try to find sitemap.xml
        if (options.followSitemap) {
            try {
                const sitemapUrls = await this.parseSitemap(baseUrl);
                sitemapUrls.forEach(url => urls.add(url));
            } catch (error) {
                console.warn('Could not parse sitemap:', error.message);
            }
        }

        // 2. Crawl homepage to find navigation links
        try {
            const homepageLinks = await this.extractNavigationLinks(baseUrl);
            homepageLinks.forEach(url => {
                if (this.isSameDomain(url, baseUrl) && this.isAllowedByRobots(url, robotsRules)) {
                    urls.add(url);
                }
            });
        } catch (error) {
            console.warn('Could not extract navigation links:', error.message);
        }

        // 3. Add common pages
        const commonPages = [
            '/about', '/about-us', '/services', '/products', '/menu', '/contact',
            '/hours', '/location', '/team', '/pricing', '/faq', '/blog'
        ];
        
        commonPages.forEach(path => {
            const fullUrl = new URL(path, baseUrl).href;
            if (this.isAllowedByRobots(fullUrl, robotsRules)) {
                urls.add(fullUrl);
            }
        });

        return Array.from(urls).slice(0, options.maxPages * 2); // Get more URLs than needed for filtering
    }

    /**
     * Parse sitemap.xml to find URLs
     * @param {string} baseUrl - Base website URL
     * @returns {Array} URLs from sitemap
     */
    async parseSitemap(baseUrl) {
        const sitemapUrls = [
            new URL('/sitemap.xml', baseUrl).href,
            new URL('/sitemap_index.xml', baseUrl).href
        ];

        const urls = [];

        for (const sitemapUrl of sitemapUrls) {
            try {
                const response = await axios.get(sitemapUrl, { timeout: 10000 });
                const $ = cheerio.load(response.data, { xmlMode: true });
                
                $('url loc').each((i, elem) => {
                    const url = $(elem).text().trim();
                    if (url) urls.push(url);
                });

                break; // If we successfully parsed one, don't try others
            } catch (error) {
                continue;
            }
        }

        return urls;
    }

    /**
     * Extract navigation links from homepage
     * @param {string} baseUrl - Base URL
     * @returns {Array} Navigation links
     */
    async extractNavigationLinks(baseUrl) {
        try {
            const response = await axios.get(baseUrl, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            
            const links = [];
            $('nav a, header a, .nav a, .menu a').each((i, elem) => {
                const href = $(elem).attr('href');
                if (href) {
                    try {
                        const fullUrl = new URL(href, baseUrl).href;
                        links.push(fullUrl);
                    } catch (e) {
                        // Invalid URL, skip
                    }
                }
            });

            return links;
        } catch (error) {
            return [];
        }
    }

    /**
     * Check robots.txt for crawling permissions
     * @param {string} baseUrl - Base website URL
     * @returns {Object} Robots rules
     */
    async checkRobotsTxt(baseUrl) {
        try {
            if (!robotsParser) {
                console.warn('⚠️ robots-parser not available, skipping robots.txt check');
                return null;
            }
            
            const robotsUrl = new URL('/robots.txt', baseUrl).href;
            const response = await axios.get(robotsUrl, { timeout: 5000 });
            return robotsParser(robotsUrl, response.data);
        } catch (error) {
            // If no robots.txt, assume everything is allowed
            return null;
        }
    }

    /**
     * Extract business-specific data from page
     * @param {Object} pageData - Page data
     * @param {Object} businessInfo - Business info accumulator
     */
    extractBusinessData(pageData, businessInfo) {
        // Extract contact information
        if (pageData.contactInfo) {
            Object.assign(businessInfo, pageData.contactInfo);
        }

        // Extract from JSON-LD structured data
        pageData.jsonLd.forEach(data => {
            if (data['@type'] === 'Organization' || data['@type'] === 'LocalBusiness') {
                businessInfo.name = businessInfo.name || data.name;
                businessInfo.description = businessInfo.description || data.description;
                businessInfo.address = businessInfo.address || data.address;
                businessInfo.telephone = businessInfo.telephone || data.telephone;
                businessInfo.url = businessInfo.url || data.url;
            }
        });

        // Aggregate business elements
        if (!businessInfo.services) businessInfo.services = [];
        if (!businessInfo.menu) businessInfo.menu = [];
        if (!businessInfo.hours) businessInfo.hours = [];

        businessInfo.services.push(...pageData.businessElements.services);
        businessInfo.menu.push(...pageData.businessElements.menuItems);
        businessInfo.hours.push(...pageData.businessElements.hours);
    }

    /**
     * Extract structured data from page
     * @param {Object} pageData - Page data  
     * @param {Object} structuredData - Structured data accumulator
     */
    extractStructuredData(pageData, structuredData) {
        pageData.jsonLd.forEach(data => {
            const type = data['@type'];
            if (!structuredData[type]) {
                structuredData[type] = [];
            }
            structuredData[type].push(data);
        });
    }

    /**
     * Extract site-wide metadata
     * @param {Object} results - Crawl results
     * @returns {Object} Site metadata
     */
    async extractSiteMetadata(results) {
        const metadata = {
            totalPages: results.pages.length,
            totalWords: results.pages.reduce((sum, page) => sum + (page.wordCount || 0), 0),
            commonKeywords: this.extractCommonKeywords(results.pages),
            businessType: null, // Will be set by BusinessTypeDetector
            mainNavigation: this.extractMainNavigation(results.pages),
            contactInfo: this.consolidateContactInfo(results.businessInfo)
        };

        return metadata;
    }

    // Helper methods

    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}`;
        } catch (e) {
            return url;
        }
    }

    isSameDomain(url, baseUrl) {
        try {
            const urlObj = new URL(url);
            const baseUrlObj = new URL(baseUrl);
            return urlObj.hostname === baseUrlObj.hostname;
        } catch (e) {
            return false;
        }
    }

    isAllowedByRobots(url, robotsRules) {
        if (!robotsRules) return true;
        return robotsRules.isAllowed(url, 'AIchatbot-crawler');
    }

    countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).length;
    }

    extractCommonKeywords(pages) {
        const wordCounts = {};
        
        pages.forEach(page => {
            const text = `${page.title} ${page.description} ${page.content.body}`.toLowerCase();
            const words = text.match(/\b\w{3,}\b/g) || [];
            
            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));
    }

    extractMainNavigation(pages) {
        const navItems = new Map();
        
        pages.forEach(page => {
            page.navigation.forEach(nav => {
                if (nav.text && nav.href) {
                    const key = `${nav.text}:${nav.href}`;
                    navItems.set(key, (navItems.get(key) || 0) + 1);
                }
            });
        });

        return Array.from(navItems.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key, count]) => {
                const [text, href] = key.split(':');
                return { text, href, frequency: count };
            });
    }

    consolidateContactInfo(businessInfo) {
        return {
            name: businessInfo.name,
            address: businessInfo.address,
            phone: businessInfo.telephone,
            website: businessInfo.url,
            email: businessInfo.email
        };
    }

    async extractImages(page) {
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                alt: img.alt,
                title: img.title
            }));
        });
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add contact info extraction function to page context
WebsiteCrawler.prototype.extractContactInfo = function() {
    const contactInfo = {};
    
    // Extract phone numbers
    const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
    const phones = document.body.textContent.match(phoneRegex);
    if (phones && phones.length > 0) {
        contactInfo.telephone = phones[0];
    }
    
    // Extract email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = document.body.textContent.match(emailRegex);
    if (emails && emails.length > 0) {
        contactInfo.email = emails[0];
    }
    
    // Extract addresses (basic pattern)
    const addressElements = document.querySelectorAll('[class*="address"], [class*="location"]');
    if (addressElements.length > 0) {
        contactInfo.address = Array.from(addressElements).map(el => el.textContent.trim())[0];
    }
    
    return contactInfo;
};

module.exports = WebsiteCrawler;
