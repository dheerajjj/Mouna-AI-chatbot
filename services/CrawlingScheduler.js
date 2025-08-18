/**
 * CrawlingScheduler - Periodic Re-crawling System
 * 
 * Manages scheduled jobs for automatic content refresh:
 * - Weekly re-crawls for all tenants with auto-training
 * - Change detection and incremental updates
 * - Configurable crawl intervals per tenant
 * - Queue management for concurrent crawl jobs
 * - Error handling and retry logic
 */

const cron = require('node-cron');
const { EventEmitter } = require('events');
const AutoTrainingService = require('./AutoTrainingService');
const DatabaseService = require('./DatabaseService');

class CrawlingScheduler extends EventEmitter {
    constructor() {
        super();
        this.autoTrainingService = new AutoTrainingService();
        this.db = new DatabaseService();
        
        // Job queues
        this.activeJobs = new Map();
        this.jobQueue = [];
        this.maxConcurrentJobs = 3;
        
        // Default intervals (in days)
        this.crawlIntervals = {
            restaurant: 3,      // Restaurants change menus frequently
            clinic: 7,          // Medical info changes less often
            ecommerce: 2,       // Product catalogs change often
            service: 14,        // Service companies change less frequently
            fitness: 5,         // Classes and schedules change regularly
            education: 10,      // Academic content changes seasonally
            default: 7          // Weekly default
        };
        
        // Scheduling configuration
        this.scheduleConfig = {
            enabled: process.env.AUTO_CRAWL_ENABLED !== 'false',
            timezone: process.env.TZ || 'America/New_York',
            maxRetries: 3,
            retryDelay: 60 * 60 * 1000, // 1 hour
            jobTimeout: 15 * 60 * 1000, // 15 minutes
        };
        
        this.isRunning = false;
        this.scheduledTasks = new Map();
        
        console.log('🕒 CrawlingScheduler initialized', {
            enabled: this.scheduleConfig.enabled,
            maxConcurrent: this.maxConcurrentJobs,
            intervals: this.crawlIntervals
        });
    }

    /**
     * Start the crawling scheduler
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️ CrawlingScheduler is already running');
            return;
        }

        if (!this.scheduleConfig.enabled) {
            console.log('⚠️ Auto-crawling is disabled via configuration');
            return;
        }

        console.log('🚀 Starting CrawlingScheduler...');
        this.isRunning = true;

        try {
            // Schedule main crawling job - runs every 6 hours
            const mainCrawlTask = cron.schedule('0 */6 * * *', async () => {
                console.log('⏰ Running scheduled crawl check...');
                await this.runScheduledCrawls();
            }, {
                scheduled: false,
                timezone: this.scheduleConfig.timezone
            });

            // Schedule cleanup job - runs daily at 2 AM
            const cleanupTask = cron.schedule('0 2 * * *', async () => {
                console.log('🧹 Running daily cleanup...');
                await this.performCleanup();
            }, {
                scheduled: false,
                timezone: this.scheduleConfig.timezone
            });

            // Schedule metrics job - runs every hour
            const metricsTask = cron.schedule('0 * * * *', async () => {
                await this.updateMetrics();
            }, {
                scheduled: false,
                timezone: this.scheduleConfig.timezone
            });

            // Store scheduled tasks
            this.scheduledTasks.set('mainCrawl', mainCrawlTask);
            this.scheduledTasks.set('cleanup', cleanupTask);
            this.scheduledTasks.set('metrics', metricsTask);

            // Start all scheduled tasks
            mainCrawlTask.start();
            cleanupTask.start();
            metricsTask.start();

            // Start job processor
            this.startJobProcessor();

            // Run initial check
            setTimeout(() => {
                this.runScheduledCrawls().catch(error => {
                    console.error('Initial crawl check failed:', error);
                });
            }, 5000); // 5 second delay

            console.log('✅ CrawlingScheduler started successfully');
            this.emit('scheduler:started');

        } catch (error) {
            console.error('❌ Failed to start CrawlingScheduler:', error);
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Stop the crawling scheduler
     */
    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ CrawlingScheduler is not running');
            return;
        }

        console.log('🛑 Stopping CrawlingScheduler...');
        this.isRunning = false;

        // Stop all scheduled tasks
        for (const [name, task] of this.scheduledTasks) {
            try {
                task.destroy();
                console.log(`📋 Stopped scheduled task: ${name}`);
            } catch (error) {
                console.error(`Error stopping task ${name}:`, error);
            }
        }
        this.scheduledTasks.clear();

        // Cancel active jobs
        for (const [jobId, jobInfo] of this.activeJobs) {
            console.log(`🚫 Cancelling active job: ${jobId}`);
            // Note: Actual job cancellation depends on implementation
            // You might need to store job controllers or use AbortController
        }
        this.activeJobs.clear();

        // Clear job queue
        this.jobQueue = [];

        console.log('✅ CrawlingScheduler stopped');
        this.emit('scheduler:stopped');
    }

    /**
     * Run scheduled crawls for eligible tenants
     */
    async runScheduledCrawls() {
        try {
            console.log('🔍 Checking for tenants eligible for re-crawling...');

            // Get all tenants with auto-training enabled
            const eligibleTenants = await this.getEligibleTenants();
            
            if (eligibleTenants.length === 0) {
                console.log('ℹ️ No tenants eligible for re-crawling at this time');
                return;
            }

            console.log(`📋 Found ${eligibleTenants.length} tenants eligible for re-crawling`);

            // Queue crawl jobs
            for (const tenant of eligibleTenants) {
                await this.queueCrawlJob(tenant);
            }

            this.emit('scheduler:crawls_queued', { count: eligibleTenants.length });

        } catch (error) {
            console.error('❌ Error running scheduled crawls:', error);
            this.emit('scheduler:error', { error, operation: 'scheduled_crawls' });
        }
    }

    /**
     * Get tenants eligible for re-crawling
     * @returns {Array} List of eligible tenants
     */
    async getEligibleTenants() {
        try {
            const now = new Date();
            const eligibleTenants = [];

            // Get all tenants with auto-training data
            const tenants = await this.db.collection('tenant_training_data')
                .find({ autoGenerated: true })
                .toArray();

            for (const tenant of tenants) {
                const daysSinceLastCrawl = this.getDaysSinceLastCrawl(tenant.trainedAt || tenant.createdAt);
                const businessType = tenant.businessAnalysis?.detectedType || 'default';
                const crawlInterval = this.crawlIntervals[businessType] || this.crawlIntervals.default;

                // Check if tenant is due for re-crawl
                if (daysSinceLastCrawl >= crawlInterval) {
                    // Additional checks
                    const isActiveJob = this.activeJobs.has(tenant.tenantId);
                    const isInQueue = this.jobQueue.some(job => job.tenantId === tenant.tenantId);

                    if (!isActiveJob && !isInQueue) {
                        eligibleTenants.push({
                            tenantId: tenant.tenantId,
                            websiteUrl: tenant.websiteUrl,
                            businessType: businessType,
                            lastCrawled: tenant.trainedAt || tenant.createdAt,
                            daysSince: daysSinceLastCrawl,
                            priority: this.calculateJobPriority(tenant, daysSinceLastCrawl, crawlInterval)
                        });
                    }
                }
            }

            // Sort by priority (higher priority first)
            eligibleTenants.sort((a, b) => b.priority - a.priority);

            return eligibleTenants;

        } catch (error) {
            console.error('Error getting eligible tenants:', error);
            return [];
        }
    }

    /**
     * Queue a crawl job for a tenant
     * @param {Object} tenant - Tenant information
     */
    async queueCrawlJob(tenant) {
        const jobId = `crawl_${tenant.tenantId}_${Date.now()}`;
        
        const job = {
            id: jobId,
            tenantId: tenant.tenantId,
            websiteUrl: tenant.websiteUrl,
            businessType: tenant.businessType,
            priority: tenant.priority,
            queuedAt: new Date(),
            retries: 0,
            maxRetries: this.scheduleConfig.maxRetries
        };

        this.jobQueue.push(job);
        console.log(`📋 Queued crawl job for tenant: ${tenant.tenantId} (Priority: ${tenant.priority})`);

        this.emit('job:queued', job);
    }

    /**
     * Start the job processor
     */
    startJobProcessor() {
        const processJobs = async () => {
            if (!this.isRunning) return;

            // Process jobs if we have capacity
            while (this.activeJobs.size < this.maxConcurrentJobs && this.jobQueue.length > 0) {
                // Sort queue by priority
                this.jobQueue.sort((a, b) => b.priority - a.priority);
                
                const job = this.jobQueue.shift();
                await this.executeJob(job);
            }

            // Schedule next check
            setTimeout(processJobs, 10000); // Check every 10 seconds
        };

        processJobs();
    }

    /**
     * Execute a crawl job
     * @param {Object} job - Job to execute
     */
    async executeJob(job) {
        const { id: jobId, tenantId, websiteUrl } = job;
        
        console.log(`🚀 Starting crawl job: ${jobId} for tenant: ${tenantId}`);
        
        // Mark job as active
        this.activeJobs.set(jobId, {
            ...job,
            startedAt: new Date(),
            status: 'running'
        });

        this.emit('job:started', job);

        try {
            // Set job timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Job timeout')), this.scheduleConfig.jobTimeout);
            });

            // Execute the crawl
            const crawlPromise = this.autoTrainingService.refreshTenantData(tenantId, {
                maxPages: 10, // Smaller page limit for scheduled crawls
                forceUpdate: false
            });

            const result = await Promise.race([crawlPromise, timeoutPromise]);

            // Job completed successfully
            console.log(`✅ Crawl job completed: ${jobId}`, {
                updated: result.updated,
                changes: result.changes || 'none'
            });

            this.emit('job:completed', { job, result });

            // Update job metrics
            await this.updateJobMetrics(job, 'completed', result);

        } catch (error) {
            console.error(`❌ Crawl job failed: ${jobId}`, error);

            // Handle retry logic
            if (job.retries < job.maxRetries) {
                job.retries++;
                
                // Re-queue job with delay
                setTimeout(() => {
                    if (this.isRunning) {
                        console.log(`🔄 Retrying job: ${jobId} (Attempt ${job.retries}/${job.maxRetries})`);
                        this.jobQueue.push(job);
                    }
                }, this.scheduleConfig.retryDelay);

                this.emit('job:retry', { job, error });
            } else {
                console.error(`💀 Job failed permanently: ${jobId} after ${job.maxRetries} attempts`);
                this.emit('job:failed', { job, error });
                
                // Update job metrics
                await this.updateJobMetrics(job, 'failed', { error: error.message });
            }
        } finally {
            // Remove from active jobs
            this.activeJobs.delete(jobId);
        }
    }

    /**
     * Calculate job priority
     * @param {Object} tenant - Tenant data
     * @param {number} daysSince - Days since last crawl
     * @param {number} interval - Crawl interval
     * @returns {number} Priority score
     */
    calculateJobPriority(tenant, daysSince, interval) {
        let priority = 0;

        // Base priority by business type (more active businesses = higher priority)
        const businessTypePriority = {
            ecommerce: 100,
            restaurant: 90,
            fitness: 80,
            clinic: 70,
            service: 60,
            education: 50,
            default: 40
        };

        priority += businessTypePriority[tenant.businessType] || businessTypePriority.default;

        // Overdue factor (higher for more overdue)
        const overdueFactor = Math.max(0, daysSince - interval) * 10;
        priority += overdueFactor;

        // Random factor to prevent all jobs running at same time
        priority += Math.random() * 10;

        return Math.round(priority);
    }

    /**
     * Perform daily cleanup tasks
     */
    async performCleanup() {
        try {
            console.log('🧹 Running daily cleanup tasks...');

            // Clean old job metrics
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            await this.db.collection('crawl_job_metrics').deleteMany({
                createdAt: { $lt: thirtyDaysAgo }
            });

            // Clean old training sessions
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            await this.db.collection('training_sessions').deleteMany({
                createdAt: { $lt: sevenDaysAgo },
                status: { $in: ['completed', 'failed'] }
            });

            // Clean orphaned data
            await this.cleanOrphanedData();

            console.log('✅ Daily cleanup completed');
            this.emit('scheduler:cleanup_completed');

        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            this.emit('scheduler:error', { error, operation: 'cleanup' });
        }
    }

    /**
     * Clean orphaned training data
     */
    async cleanOrphanedData() {
        try {
            // Get all tenant IDs from main tenants collection
            const activeTenants = await this.db.collection('tenants').find({}, { projection: { tenantId: 1 } }).toArray();
            const activeTenantIds = new Set(activeTenants.map(t => t.tenantId));

            // Find orphaned training data
            const trainingData = await this.db.collection('tenant_training_data').find({}).toArray();
            
            const orphanedIds = trainingData
                .filter(data => !activeTenantIds.has(data.tenantId))
                .map(data => data.tenantId);

            if (orphanedIds.length > 0) {
                console.log(`🗑️ Cleaning ${orphanedIds.length} orphaned training records`);
                
                await this.db.collection('tenant_training_data').deleteMany({
                    tenantId: { $in: orphanedIds }
                });
                
                await this.db.collection('training_sessions').deleteMany({
                    tenantId: { $in: orphanedIds }
                });
            }

        } catch (error) {
            console.error('Error cleaning orphaned data:', error);
        }
    }

    /**
     * Update scheduler metrics
     */
    async updateMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                active_jobs: this.activeJobs.size,
                queued_jobs: this.jobQueue.length,
                scheduler_running: this.isRunning,
                
                // Job queue stats
                queue_stats: {
                    total: this.jobQueue.length,
                    by_business_type: this.getQueueStatsByBusinessType(),
                    avg_queue_time: this.calculateAverageQueueTime()
                },

                // System stats
                system: {
                    max_concurrent_jobs: this.maxConcurrentJobs,
                    crawl_intervals: this.crawlIntervals,
                    uptime: process.uptime()
                }
            };

            // Store metrics (you might want to keep only recent metrics)
            await this.db.collection('scheduler_metrics').insertOne(metrics);

            // Clean old metrics (keep last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            await this.db.collection('scheduler_metrics').deleteMany({
                timestamp: { $lt: weekAgo }
            });

            this.emit('metrics:updated', metrics);

        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    /**
     * Update job execution metrics
     * @param {Object} job - Job information
     * @param {string} status - Job status (completed/failed)
     * @param {Object} result - Job result
     */
    async updateJobMetrics(job, status, result) {
        try {
            const metrics = {
                jobId: job.id,
                tenantId: job.tenantId,
                status: status,
                businessType: job.businessType,
                queuedAt: job.queuedAt,
                startedAt: this.activeJobs.get(job.id)?.startedAt,
                completedAt: new Date(),
                retries: job.retries,
                result: result,
                createdAt: new Date()
            };

            await this.db.collection('crawl_job_metrics').insertOne(metrics);

        } catch (error) {
            console.error('Error updating job metrics:', error);
        }
    }

    // Helper methods

    getDaysSinceLastCrawl(lastCrawlDate) {
        if (!lastCrawlDate) return Infinity;
        const now = new Date();
        const diffTime = Math.abs(now - new Date(lastCrawlDate));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getQueueStatsByBusinessType() {
        const stats = {};
        for (const job of this.jobQueue) {
            stats[job.businessType] = (stats[job.businessType] || 0) + 1;
        }
        return stats;
    }

    calculateAverageQueueTime() {
        if (this.jobQueue.length === 0) return 0;
        
        const now = new Date();
        const totalQueueTime = this.jobQueue.reduce((sum, job) => {
            return sum + (now - job.queuedAt);
        }, 0);
        
        return Math.round(totalQueueTime / this.jobQueue.length / 1000 / 60); // minutes
    }

    /**
     * Get current scheduler status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            running: this.isRunning,
            active_jobs: this.activeJobs.size,
            queued_jobs: this.jobQueue.length,
            max_concurrent: this.maxConcurrentJobs,
            enabled: this.scheduleConfig.enabled,
            uptime: this.isRunning ? Date.now() - this.startTime : 0,
            crawl_intervals: this.crawlIntervals,
            
            current_jobs: Array.from(this.activeJobs.values()).map(job => ({
                id: job.id,
                tenantId: job.tenantId,
                status: job.status,
                startedAt: job.startedAt
            })),
            
            queue_preview: this.jobQueue.slice(0, 5).map(job => ({
                id: job.id,
                tenantId: job.tenantId,
                priority: job.priority,
                queuedAt: job.queuedAt
            }))
        };
    }

    /**
     * Manually trigger crawl for a specific tenant
     * @param {string} tenantId - Tenant ID
     * @param {Object} options - Crawl options
     * @returns {string} Job ID
     */
    async triggerManualCrawl(tenantId, options = {}) {
        try {
            // Get tenant info
            const tenantData = await this.db.collection('tenant_training_data').findOne({ tenantId });
            if (!tenantData) {
                throw new Error('Tenant not found');
            }

            // Create high-priority job
            const jobId = `manual_${tenantId}_${Date.now()}`;
            const job = {
                id: jobId,
                tenantId: tenantId,
                websiteUrl: tenantData.websiteUrl,
                businessType: tenantData.businessAnalysis?.detectedType || 'default',
                priority: 1000, // High priority for manual jobs
                queuedAt: new Date(),
                retries: 0,
                maxRetries: this.scheduleConfig.maxRetries,
                manual: true,
                options: options
            };

            // Add to front of queue
            this.jobQueue.unshift(job);

            console.log(`📋 Manual crawl job queued for tenant: ${tenantId}`);
            this.emit('job:manual_queued', job);

            return jobId;

        } catch (error) {
            console.error('Error triggering manual crawl:', error);
            throw error;
        }
    }
}

module.exports = CrawlingScheduler;
