const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const planAccessControl = require('../middleware/planAccessControl');
const { ObjectId } = require('mongodb');

// Import required libraries for different export formats
let PDFDocument, ExcelJS;
try {
    PDFDocument = require('pdfkit');
    ExcelJS = require('exceljs');
} catch (error) {
    console.warn('⚠️ Report export libraries not installed. Installing...');
    // You'll need to install these: npm install pdfkit exceljs
}

/**
 * Get report data for a specific user
 */
async function getReportData(userId, dateRange, reportType) {
    try {
        console.log('🐛 [DEBUG] getReportData called with:', {
            userId, 
            userIdType: typeof userId,
            dateRange, 
            reportType
        });
        
        const { getDb } = require('../server-mongo');
        const db = getDb();
        
        // Calculate date range
        const now = new Date();
        let startDate;
        
        switch (dateRange) {
            case '7days':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30days':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90days':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
        
        console.log('🐛 [DEBUG] Looking up user with ObjectId:', userObjectId);
        console.log('🐛 [DEBUG] ObjectId.isValid(userId):', ObjectId.isValid(userId));

        // Get user data
        const user = await db.collection('users').findOne({ _id: userObjectId });
        console.log('🐛 [DEBUG] User found from database:', user ? 'YES' : 'NO');
        if (user) {
            console.log('🐛 [DEBUG] User data structure:', JSON.stringify({
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                plan: user.plan,
                keys: Object.keys(user)
            }, null, 2));
        }
        if (!user) {
            throw new Error('User not found');
        }

        // Base report data
        const reportData = {
            user: {
                name: user.name,
                email: user.email,
                plan: user.subscription?.planName || user.plan?.current?.name || 'Free Plan',
                apiKey: user.apiKey ? user.apiKey.substring(0, 8) + '...' : 'Not available'
            },
            dateRange: {
                start: startDate,
                end: now,
                label: dateRange
            },
            reportType,
            generatedAt: now
        };

        if (reportType === 'usage' || reportType === 'summary') {
            // Get usage statistics
            const chatSessions = await db.collection('chat_sessions').find({
                userId: userObjectId,
                createdAt: { $gte: startDate, $lte: now }
            }).toArray();

            const totalSessions = chatSessions.length;
            const totalMessages = chatSessions.reduce((sum, session) => sum + (session.messages?.length || 0), 0);
            
            // Group by date for daily breakdown
            const dailyStats = {};
            chatSessions.forEach(session => {
                const date = session.createdAt.toISOString().split('T')[0];
                if (!dailyStats[date]) {
                    dailyStats[date] = { sessions: 0, messages: 0 };
                }
                dailyStats[date].sessions++;
                dailyStats[date].messages += session.messages?.length || 0;
            });

            reportData.usage = {
                totalSessions,
                totalMessages,
                averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
                dailyBreakdown: dailyStats,
                summary: {
                    mostActiveDay: Object.keys(dailyStats).reduce((max, date) => 
                        !max || dailyStats[date].sessions > dailyStats[max].sessions ? date : max, null),
                    avgSessionsPerDay: Math.round(totalSessions / Math.max(1, Math.ceil((now - startDate) / (24 * 60 * 60 * 1000))))
                }
            };
        }

        if (reportType === 'conversations' || reportType === 'detailed') {
            // Get conversation logs
            const conversations = await db.collection('chat_sessions').find({
                userId: userObjectId,
                createdAt: { $gte: startDate, $lte: now }
            }).sort({ createdAt: -1 }).limit(100).toArray();

            reportData.conversations = conversations.map(session => ({
                sessionId: session._id,
                startTime: session.createdAt,
                endTime: session.updatedAt || session.createdAt,
                messageCount: session.messages?.length || 0,
                messages: session.messages?.map(msg => ({
                    timestamp: msg.timestamp,
                    sender: msg.sender,
                    message: msg.message.substring(0, 200) + (msg.message.length > 200 ? '...' : ''),
                    type: msg.type || 'text'
                })) || []
            }));
        }

        return reportData;
    } catch (error) {
        console.error('Error getting report data:', error);
        throw error;
    }
}

/**
 * Generate PDF report
 */
function generatePDFReport(reportData) {
    if (!PDFDocument) {
        throw new Error('PDF generation not available. Please install pdfkit package.');
    }

    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Header
    doc.fontSize(20).text('Mouna AI - Chatbot Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${reportData.generatedAt.toLocaleDateString()}`, 50, 80);
    doc.text(`Report Type: ${reportData.reportType.toUpperCase()}`, 50, 95);
    doc.text(`Date Range: ${reportData.dateRange.start.toLocaleDateString()} to ${reportData.dateRange.end.toLocaleDateString()}`, 50, 110);

    // User Info
    doc.fontSize(14).text('Account Information', 50, 140);
    doc.fontSize(10)
       .text(`Name: ${reportData.user.name}`, 70, 160)
       .text(`Email: ${reportData.user.email}`, 70, 175)
       .text(`Plan: ${reportData.user.plan}`, 70, 190)
       .text(`API Key: ${reportData.user.apiKey}`, 70, 205);

    let yPosition = 240;

    // Usage Statistics
    if (reportData.usage) {
        doc.fontSize(14).text('Usage Statistics', 50, yPosition);
        yPosition += 25;
        
        doc.fontSize(10)
           .text(`Total Sessions: ${reportData.usage.totalSessions}`, 70, yPosition)
           .text(`Total Messages: ${reportData.usage.totalMessages}`, 70, yPosition + 15)
           .text(`Average Messages per Session: ${reportData.usage.averageMessagesPerSession}`, 70, yPosition + 30)
           .text(`Average Sessions per Day: ${reportData.usage.summary.avgSessionsPerDay}`, 70, yPosition + 45);
        
        yPosition += 80;
    }

    // Conversation Summary
    if (reportData.conversations) {
        doc.fontSize(14).text('Recent Conversations', 50, yPosition);
        yPosition += 25;
        
        reportData.conversations.slice(0, 10).forEach((conv, index) => {
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }
            
            doc.fontSize(10)
               .text(`${index + 1}. Session ${conv.sessionId.toString().substring(0, 8)}...`, 70, yPosition)
               .text(`   Start: ${conv.startTime.toLocaleString()}`, 90, yPosition + 12)
               .text(`   Messages: ${conv.messageCount}`, 90, yPosition + 24);
            
            yPosition += 45;
        });
    }

    doc.end();
    
    return Buffer.concat(buffers);
}

/**
 * Generate Excel report
 */
async function generateExcelReport(reportData) {
    if (!ExcelJS) {
        throw new Error('Excel generation not available. Please install exceljs package.');
    }

    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
    ];

    summarySheet.addRow({ metric: 'Report Generated', value: reportData.generatedAt.toLocaleString() });
    summarySheet.addRow({ metric: 'User Name', value: reportData.user.name });
    summarySheet.addRow({ metric: 'Email', value: reportData.user.email });
    summarySheet.addRow({ metric: 'Plan', value: reportData.user.plan });
    summarySheet.addRow({ metric: 'Date Range', value: `${reportData.dateRange.start.toLocaleDateString()} to ${reportData.dateRange.end.toLocaleDateString()}` });

    if (reportData.usage) {
        summarySheet.addRow({ metric: '', value: '' }); // Empty row
        summarySheet.addRow({ metric: 'Total Sessions', value: reportData.usage.totalSessions });
        summarySheet.addRow({ metric: 'Total Messages', value: reportData.usage.totalMessages });
        summarySheet.addRow({ metric: 'Avg Messages/Session', value: reportData.usage.averageMessagesPerSession });
        summarySheet.addRow({ metric: 'Avg Sessions/Day', value: reportData.usage.summary.avgSessionsPerDay });
    }

    // Daily breakdown sheet
    if (reportData.usage?.dailyBreakdown) {
        const dailySheet = workbook.addWorksheet('Daily Breakdown');
        dailySheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Sessions', key: 'sessions', width: 15 },
            { header: 'Messages', key: 'messages', width: 15 }
        ];

        Object.entries(reportData.usage.dailyBreakdown).forEach(([date, stats]) => {
            dailySheet.addRow({
                date: new Date(date).toLocaleDateString(),
                sessions: stats.sessions,
                messages: stats.messages
            });
        });
    }

    // Conversations sheet
    if (reportData.conversations) {
        const conversationsSheet = workbook.addWorksheet('Conversations');
        conversationsSheet.columns = [
            { header: 'Session ID', key: 'sessionId', width: 25 },
            { header: 'Start Time', key: 'startTime', width: 20 },
            { header: 'End Time', key: 'endTime', width: 20 },
            { header: 'Message Count', key: 'messageCount', width: 15 }
        ];

        reportData.conversations.forEach(conv => {
            conversationsSheet.addRow({
                sessionId: conv.sessionId.toString(),
                startTime: conv.startTime.toLocaleString(),
                endTime: conv.endTime.toLocaleString(),
                messageCount: conv.messageCount
            });
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

/**
 * Generate CSV report
 */
function generateCSVReport(reportData) {
    let csv = 'Mouna AI Chatbot Report\n';
    csv += `Generated: ${reportData.generatedAt.toLocaleString()}\n`;
    csv += `User: ${reportData.user.name} (${reportData.user.email})\n`;
    csv += `Plan: ${reportData.user.plan}\n`;
    csv += `Date Range: ${reportData.dateRange.start.toLocaleDateString()} to ${reportData.dateRange.end.toLocaleDateString()}\n\n`;

    if (reportData.usage) {
        csv += 'USAGE STATISTICS\n';
        csv += 'Metric,Value\n';
        csv += `Total Sessions,${reportData.usage.totalSessions}\n`;
        csv += `Total Messages,${reportData.usage.totalMessages}\n`;
        csv += `Average Messages per Session,${reportData.usage.averageMessagesPerSession}\n`;
        csv += `Average Sessions per Day,${reportData.usage.summary.avgSessionsPerDay}\n\n`;

        if (reportData.usage.dailyBreakdown) {
            csv += 'DAILY BREAKDOWN\n';
            csv += 'Date,Sessions,Messages\n';
            Object.entries(reportData.usage.dailyBreakdown).forEach(([date, stats]) => {
                csv += `${new Date(date).toLocaleDateString()},${stats.sessions},${stats.messages}\n`;
            });
            csv += '\n';
        }
    }

    if (reportData.conversations) {
        csv += 'RECENT CONVERSATIONS\n';
        csv += 'Session ID,Start Time,End Time,Message Count\n';
        reportData.conversations.forEach(conv => {
            csv += `${conv.sessionId},${conv.startTime.toLocaleString()},${conv.endTime.toLocaleString()},${conv.messageCount}\n`;
        });
    }

    return Buffer.from(csv, 'utf8');
}

// Routes

/**
 * Generate and download report
 * POST /api/reports/generate
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        console.log('🐛 [DEBUG] Reports route hit - /api/reports/generate');
        console.log('🐛 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
        console.log('🐛 [DEBUG] Request user object:', JSON.stringify(req.user, null, 2));
        console.log('🐛 [DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
        
        const { dateRange, reportType, format } = req.body;
        const userId = req.user._id || req.user.userId || req.user.id;
        
        console.log('🐛 [DEBUG] Extracted userId:', userId);
        console.log('🐛 [DEBUG] userId type:', typeof userId);
        console.log('🐛 [DEBUG] req.user._id:', req.user._id);
        console.log('🐛 [DEBUG] req.user.userId:', req.user.userId);
        console.log('🐛 [DEBUG] req.user.id:', req.user.id);
        
        if (!userId) {
            console.log('🐛 [DEBUG] No userId found after extraction attempts');
            return res.status(400).json({ 
                error: 'User ID could not be extracted from authentication token',
                debug: {
                    userKeys: Object.keys(req.user || {}),
                    userObject: req.user
                }
            });
        }

        // Validate inputs
        const validDateRanges = ['7days', '30days', '90days'];
        const validReportTypes = ['summary', 'usage', 'conversations', 'detailed', 'performance'];
        const validFormats = ['pdf', 'excel', 'csv', 'json'];

        if (!validDateRanges.includes(dateRange)) {
            return res.status(400).json({ error: 'Invalid date range' });
        }

        if (!validReportTypes.includes(reportType)) {
            return res.status(400).json({ error: 'Invalid report type' });
        }

        if (!validFormats.includes(format)) {
            return res.status(400).json({ error: 'Invalid format' });
        }

        // Check plan access for report features
        const { PlanManager } = require('../config/planFeatures');
        const userPlan = req.user.subscription?.planName || req.user.subscription?.plan || req.user.plan?.current?.name || 'free';
        
        console.log('🐛 [DEBUG] Plan detection:');
        console.log('🐛 [DEBUG] - req.user.subscription?.planName:', req.user.subscription?.planName);
        console.log('🐛 [DEBUG] - req.user.subscription?.plan:', req.user.subscription?.plan);
        console.log('🐛 [DEBUG] - req.user.plan?.current?.name:', req.user.plan?.current?.name);
        console.log('🐛 [DEBUG] - Final userPlan:', userPlan);
        console.log('🐛 [DEBUG] - PlanManager.hasFeature(userPlan, "exportData"):', PlanManager.hasFeature(userPlan, 'exportData'));
        
        // All reports require export data feature (available on starter and above)
        if (!PlanManager.hasFeature(userPlan, 'exportData')) {
            return res.status(403).json({ 
                error: 'Reports require a plan with export data feature',
                upgradeRequired: true,
                currentPlan: userPlan,
                suggestedUpgrade: 'starter'
            });
        }
        
        // Advanced reports need professional plan or higher
        if ((reportType === 'detailed' || reportType === 'performance') && 
            !PlanManager.hasFeature(userPlan, 'advancedAnalytics')) {
            return res.status(403).json({ 
                error: 'Advanced reports require a professional plan or higher',
                upgradeRequired: true,
                currentPlan: userPlan,
                suggestedUpgrade: 'professional'
            });
        }

        // Get report data
        const reportData = await getReportData(userId, dateRange, reportType);

        // Generate report in requested format
        let buffer;
        let contentType;
        let filename;

        switch (format) {
            case 'pdf':
                buffer = generatePDFReport(reportData);
                contentType = 'application/pdf';
                filename = `mouna-ai-${reportType}-report-${dateRange}.pdf`;
                break;
            
            case 'excel':
                buffer = await generateExcelReport(reportData);
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                filename = `mouna-ai-${reportType}-report-${dateRange}.xlsx`;
                break;
            
            case 'csv':
                buffer = generateCSVReport(reportData);
                contentType = 'text/csv';
                filename = `mouna-ai-${reportType}-report-${dateRange}.csv`;
                break;
            
            case 'json':
                buffer = Buffer.from(JSON.stringify(reportData, null, 2), 'utf8');
                contentType = 'application/json';
                filename = `mouna-ai-${reportType}-report-${dateRange}.json`;
                break;
        }

        // Set response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);

        // Send the file
        res.send(buffer);

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ 
            error: 'Failed to generate report',
            message: error.message 
        });
    }
});

/**
 * Get report preview data (without generating full report)
 * GET /api/reports/preview
 */
router.get('/preview', authenticateToken, async (req, res) => {
    try {
        const { dateRange = '30days', reportType = 'summary' } = req.query;
        const userId = req.user._id || req.user.userId || req.user.id;

        // Get basic report data for preview
        const reportData = await getReportData(userId, dateRange, reportType);
        
        // Return summary data only (not full conversations)
        const preview = {
            user: reportData.user,
            dateRange: reportData.dateRange,
            reportType: reportData.reportType,
            usage: reportData.usage || {
                totalSessions: 0,
                totalMessages: 0,
                averageMessagesPerSession: 0
            },
            conversationCount: reportData.conversations?.length || 0
        };

        res.json({ success: true, preview });

    } catch (error) {
        console.error('Error getting report preview:', error);
        res.status(500).json({ 
            error: 'Failed to get report preview',
            message: error.message 
        });
    }
});

/**
 * Quick download usage report
 * GET /api/reports/usage/download
 */
router.get('/usage/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const reportData = await getReportData(userId, '30days', 'usage');
        
        const buffer = generateCSVReport(reportData);
        const filename = `mouna-ai-usage-report-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(buffer);

    } catch (error) {
        console.error('Error downloading usage report:', error);
        res.status(500).json({ 
            error: 'Failed to download usage report',
            message: error.message 
        });
    }
});

/**
 * Quick download conversation logs
 * GET /api/reports/conversations/download
 */
router.get('/conversations/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.userId || req.user.id;
        const reportData = await getReportData(userId, '30days', 'conversations');
        
        const buffer = generateCSVReport(reportData);
        const filename = `mouna-ai-conversations-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.send(buffer);

    } catch (error) {
        console.error('Error downloading conversation logs:', error);
        res.status(500).json({ 
            error: 'Failed to download conversation logs',
            message: error.message 
        });
    }
});

// Development endpoints for testing
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SAMPLE_DATA === 'true') {
    const { createSampleReportData, clearSampleReportData } = require('../utils/sampleReportData');
    
    /**
     * Create sample data for testing reports
     * POST /api/reports/create-sample-data
     */
    router.post('/create-sample-data', authenticateToken, async (req, res) => {
        try {
            const userId = req.user._id || req.user.userId || req.user.id;
            const { DatabaseService } = require('../services/DatabaseService');
            
            const result = await createSampleReportData(DatabaseService, userId);
            
            res.json({
                success: true,
                message: 'Sample report data created successfully',
                data: result
            });
            
        } catch (error) {
            console.error('Error creating sample data:', error);
            res.status(500).json({
                error: 'Failed to create sample data',
                message: error.message
            });
        }
    });
    
    /**
     * Clear sample data
     * DELETE /api/reports/clear-sample-data
     */
    router.delete('/clear-sample-data', authenticateToken, async (req, res) => {
        try {
            const userId = req.user._id || req.user.userId || req.user.id;
            
            const result = await clearSampleReportData(userId);
            
            res.json({
                success: true,
                message: 'Sample report data cleared successfully',
                data: result
            });
            
        } catch (error) {
            console.error('Error clearing sample data:', error);
            res.status(500).json({
                error: 'Failed to clear sample data',
                message: error.message
            });
        }
    });
}

module.exports = router;
