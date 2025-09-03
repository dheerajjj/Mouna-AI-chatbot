const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireFeature } = require('../middleware/planAccessControl');
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
        
        if (!userId) {
            console.error('🚨 [ERROR] getReportData called with null or undefined userId');
            throw new Error('Missing userId in getReportData');
        }
        
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
        const userIdString = typeof userId === 'string' ? userId : (userObjectId?.toString?.() || String(userObjectId));
        
        console.log('🐛 [DEBUG] Looking up user with ObjectId:', userObjectId);
        console.log('🐛 [DEBUG] ObjectId.isValid(userId):', ObjectId.isValid(userId));
        console.log('🐛 [DEBUG] userId string form:', userIdString);

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

        // Enhanced plan detection logic
        let userPlan = 'Free Plan';
        if (user.subscription) {
            if (user.subscription.planName) userPlan = user.subscription.planName;
            else if (user.subscription.plan) userPlan = user.subscription.plan;
        }
        if (userPlan === 'Free Plan' && user.plan) {
            if (user.plan.current?.name) userPlan = user.plan.current.name;
            else if (user.plan.name) userPlan = user.plan.name;
            else if (typeof user.plan === 'string') userPlan = user.plan;
        }
        
        // Capitalize first letter for display
        if (userPlan && userPlan !== 'Free Plan') {
            userPlan = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
        }
        
        console.log('📊 [REPORT] Plan detection result:', {
            subscription: user.subscription,
            plan: user.plan,
            finalPlan: userPlan
        });
        
        // Get user's total message usage from user object (same as dashboard)
        const totalUserMessages = user.usage?.totalMessages || 0;
        const monthlyUserMessages = user.usage?.messagesThisMonth || 0;
        
        // Also get session count for consistency (support both collection names)
        let sessionCount = 0;
        try {
            const c1 = await db.collection('chat_sessions').countDocuments({ userId: userObjectId }).catch(() => 0);
            const c2 = await db.collection('chatsessions').countDocuments({ userId: userObjectId }).catch(() => 0);
            sessionCount = c1 + c2 ? Math.max(c1, c2) : 0;
        } catch (_) {}
        const totalUserSessions = new Array(sessionCount).fill(0); // only need length here
        
        console.log('📊 [REPORT] Usage from user object (matching dashboard):', {
            totalMessagesFromUserObject: totalUserMessages,
            monthlyMessagesFromUserObject: monthlyUserMessages,
            totalSessionsFromDB: totalUserSessions.length,
            dateRangeStart: startDate,
            dateRangeEnd: now
        });

        // Base report data
        const reportData = {
            user: {
                name: user.name,
                email: user.email,
                plan: userPlan,
                apiKey: user.apiKey ? user.apiKey.substring(0, 8) + '...' : 'Not available',
                totalMessagesAllTime: totalUserMessages,
                totalSessionsAllTime: totalUserSessions.length
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
            // Use data from user object to match dashboard exactly
            console.log('📊 [REPORT] Using user object data to match dashboard:', {
                userUsageObject: user.usage,
                totalMessages: totalUserMessages,
                monthlyMessages: monthlyUserMessages
            });
            
            // Get sessions for session count and daily breakdown (but use user.usage for message counts)
            // Determine sessions collection name similar to conversations path to be consistent
            let usageSessionsCollectionName = 'chat_sessions';
            try {
                const uc1 = await db.collection('chat_sessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
                const uc2 = await db.collection('chatsessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
                usageSessionsCollectionName = uc1 >= uc2 ? 'chat_sessions' : 'chatsessions';
            } catch (_) {}
            const usageSessionsCol = db.collection(usageSessionsCollectionName);
            const allSessions = await usageSessionsCol.find({
                $or: [ { userId: userObjectId }, { userId: userIdString } ]
            }).toArray();
            
            // Filter sessions for date range (for daily breakdown)
            const sessionsInRange = allSessions.filter(session => {
                if (!session.createdAt) return false;
                const sessionDate = new Date(session.createdAt);
                return sessionDate >= startDate && sessionDate <= now;
            });
            
            console.log('📊 [REPORT] Session filtering results:', {
                allSessions: allSessions.length,
                sessionsInRange: sessionsInRange.length,
                dateRange: `${startDate.toISOString()} to ${now.toISOString()}`
            });
            
            // Create daily breakdown from sessions
            const dailyStats = {};
            sessionsInRange.forEach(session => {
                let date;
                if (session.createdAt) {
                    const sessionDate = new Date(session.createdAt);
                    date = sessionDate.toISOString().split('T')[0];
                } else {
                    date = 'unknown';
                }
                
                if (!dailyStats[date]) {
                    dailyStats[date] = { sessions: 0, messages: 0 };
                }
                dailyStats[date].sessions++;
                dailyStats[date].messages += session.messages?.length || 0;
            });
            
            console.log('📊 [REPORT] Daily breakdown:', dailyStats);

            // Use user.usage data for totals to match dashboard
            reportData.usage = {
                totalSessions: allSessions.length, // Use actual session count
                totalMessages: totalUserMessages,  // Use user.usage.totalMessages (matches dashboard)
                averageMessagesPerSession: allSessions.length > 0 ? Math.round(totalUserMessages / allSessions.length) : 0,
                dailyBreakdown: dailyStats,
                summary: {
                    mostActiveDay: Object.keys(dailyStats).reduce((max, date) => 
                        !max || dailyStats[date].sessions > dailyStats[max].sessions ? date : max, null),
                    avgSessionsPerDay: Math.round(sessionsInRange.length / Math.max(1, Math.ceil((now - startDate) / (24 * 60 * 60 * 1000))))
                },
                // Add monthly data from user object for dashboard consistency
                messagesThisMonth: monthlyUserMessages
            };
            
            console.log('📊 [REPORT] Final usage data (matching dashboard):', reportData.usage);
        }

        if (reportType === 'conversations' || reportType === 'detailed') {
            // Get conversation logs with enhanced debugging
            console.log('💬 [REPORT] Fetching conversations for date range:', {
                userId: userObjectId,
                startDate: startDate.toISOString(),
                endDate: now.toISOString()
            });
            
            // Determine correct collection name for sessions (compat for 'chat_sessions' and 'chatsessions')
            let sessionsCollectionName = 'chat_sessions';
            try {
                const c1 = await db.collection('chat_sessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
                const c2 = await db.collection('chatsessions').countDocuments({ $or: [{ userId: userObjectId }, { userId: userIdString }] }).catch(() => 0);
                sessionsCollectionName = c1 >= c2 ? 'chat_sessions' : 'chatsessions';
            } catch (_) { /* keep default */ }
            const sessionsCol = db.collection(sessionsCollectionName);

            // First, get ALL conversations for this user to debug
            const allConversations = await sessionsCol.find({
                $or: [ { userId: userObjectId }, { userId: userIdString } ]
            }).sort({ createdAt: -1 }).limit(100).toArray();
            
            console.log('💬 [REPORT] All conversations debug:', {
                totalFound: allConversations.length,
                sampleData: allConversations.slice(0, 3).map(s => ({
                    _id: s._id,
                    sessionId: s.sessionId,
                    createdAt: s.createdAt,
                    startTime: s.startTime,
                    messagesCount: s.messages?.length || 0,
                    firstMessage: s.messages?.[0]?.content?.substring(0, 50) || 'No messages',
                    hasMessages: !!s.messages && s.messages.length > 0
                }))
            });
            
            let conversations = [];
            
            // Try multiple query approaches against the chosen collection
            const convQuery1 = await sessionsCol.find({
                $and: [
                    { $or: [ { userId: userObjectId }, { userId: userIdString } ] },
                    { createdAt: { $gte: startDate, $lte: now } }
                ]
            }).sort({ createdAt: -1 }).limit(200).toArray();
            
            const convQuery2 = await sessionsCol.find({
                $and: [
                    { $or: [ { userId: userObjectId }, { userId: userIdString } ] },
                    { $or: [
                        { createdAt: { $gte: startDate, $lte: now } },
                        { startTime: { $gte: startDate, $lte: now } },
                        { updatedAt: { $gte: startDate, $lte: now } }
                    ] }
                ]
            }).sort({ createdAt: -1 }).limit(200).toArray();
            
            console.log('💬 [REPORT] Conversation queries results:', {
                standardQuery: convQuery1.length,
                alternativeQuery: convQuery2.length,
                allConversationsForUser: allConversations.length,
                usingCollection: sessionsCollectionName
            });
            
            // Use the query that returns more results, or fall back to all conversations
            if (convQuery1.length > 0) {
                conversations = convQuery1;
            } else if (convQuery2.length > 0) {
                conversations = convQuery2;
            } else {
                // Use all conversations
                console.log('💬 [REPORT] Using all conversations since date filtering returned none');
                conversations = allConversations;
            }

            // Map conversations with better data handling
            const mapped = conversations.map(session => {
                // Use sessionId field or _id as fallback
                const sessionIdentifier = session.sessionId || session._id;
                
                // Use startTime field or createdAt as fallback
                const sessionStart = session.startTime || session.createdAt;
                const sessionEnd = session.endTime || session.updatedAt || sessionStart;
                
                const baseMessages = (session.messages || []).map(msg => {
                    // Handle multiple possible field names for message content
                    const fullText = msg.content || msg.message || msg.text || '';
                    const sender = msg.role || msg.type || msg.sender || 'user';
                    const ts = msg.timestamp || msg.createdAt || sessionStart;
                    return {
                        timestamp: ts,
                        sender: sender,
                        // Keep full text for downloads and analytics
                        message: fullText,
                        // Also provide a preview for any UI that wants truncation
                        preview: fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText,
                        type: msg.type || msg.role || 'text'
                    };
                });

                return {
                    sessionId: sessionIdentifier,
                    startTime: sessionStart,
                    endTime: sessionEnd,
                    messageCount: baseMessages.length,
                    messages: baseMessages
                };
            });

            // Fallback: if no embedded messages, reconstruct from message logs (older data or different storage)
            try {
                const anyMissing = mapped.some(conv => !conv.messageCount || conv.messageCount === 0);
                if (anyMissing) {
                    // Determine message log collection name
                    let logsCollectionName = 'messagelogs';
                    try {
                        const l1 = await db.collection('messagelogs').countDocuments({ userId: userObjectId }).catch(() => 0);
                        const l2 = await db.collection('message_logs').countDocuments({ userId: userObjectId }).catch(() => 0);
                        logsCollectionName = l1 >= l2 ? 'messagelogs' : 'message_logs';
                    } catch(_){}
                    const logsCol = db.collection(logsCollectionName);

                    for (const conv of mapped) {
                        if (conv.messageCount && conv.messageCount > 0) continue;
                        const sid = (conv.sessionId && conv.sessionId.toString) ? conv.sessionId.toString() : String(conv.sessionId);
                        const logs = await logsCol.find({ userId: userObjectId, sessionId: sid }).sort({ createdAt: 1, timestamp: 1 }).limit(500).toArray();
                        if (Array.isArray(logs) && logs.length) {
                            const rebuilt = [];
                            for (const lg of logs) {
                                if (lg.userMessage) {
                                    rebuilt.push({ timestamp: lg.timestamp || lg.createdAt || conv.startTime, sender: 'user', message: lg.userMessage, preview: (lg.userMessage || '').slice(0, 200), type: 'user' });
                                }
                                if (lg.aiResponse) {
                                    rebuilt.push({ timestamp: lg.timestamp || lg.createdAt || conv.startTime, sender: 'assistant', message: lg.aiResponse, preview: (lg.aiResponse || '').slice(0, 200), type: 'assistant' });
                                }
                            }
                            conv.messages = rebuilt;
                            conv.messageCount = rebuilt.length;
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ [REPORT] Message logs fallback failed:', e.message);
            }

            // Filter to conversations that finally have messages
            reportData.conversations = mapped.filter(conv => conv.messageCount > 0);

            // Final fallback: build conversations directly from message logs if still empty
            if (!reportData.conversations.length) {
                try {
                    console.log('🛟 [REPORT] No sessions with messages found; using logs-only fallback');
                    // Determine logs collection name
                    let logsCollectionName = 'messagelogs';
                    try {
                        const l1 = await db.collection('messagelogs').countDocuments({ userId: userObjectId }).catch(() => 0);
                        const l2 = await db.collection('message_logs').countDocuments({ userId: userObjectId }).catch(() => 0);
                        logsCollectionName = l1 >= l2 ? 'messagelogs' : 'message_logs';
                    } catch (_) {}
                    const logsCol = db.collection(logsCollectionName);

                    // Fetch logs within date range for this user
                    const logs = await logsCol.find({
                        userId: userObjectId,
                        $or: [
                            { timestamp: { $gte: startDate, $lte: now } },
                            { createdAt: { $gte: startDate, $lte: now } }
                        ]
                    }).sort({ sessionId: 1, timestamp: 1, createdAt: 1 }).limit(2000).toArray();

                    // Group by sessionId
                    const bySession = new Map();
                    for (const lg of logs) {
                        const sid = lg.sessionId || 'unknown';
                        if (!bySession.has(sid)) bySession.set(sid, []);
                        bySession.get(sid).push(lg);
                    }

                    const built = [];
                    for (const [sid, arr] of bySession.entries()) {
                        const msgs = [];
                        let start = null, end = null;
                        for (const lg of arr) {
                            const ts = lg.timestamp || lg.createdAt || new Date();
                            if (!start || ts < start) start = ts;
                            if (!end || ts > end) end = ts;
                            if (lg.userMessage) {
                                msgs.push({ timestamp: ts, sender: 'user', message: lg.userMessage, preview: (lg.userMessage || '').slice(0, 200), type: 'user' });
                            }
                            if (lg.aiResponse) {
                                msgs.push({ timestamp: ts, sender: 'assistant', message: lg.aiResponse, preview: (lg.aiResponse || '').slice(0, 200), type: 'assistant' });
                            }
                        }
                        built.push({ sessionId: sid, startTime: start || new Date(), endTime: end || start || new Date(), messageCount: msgs.length, messages: msgs });
                    }

                    reportData.conversations = built.filter(b => b.messageCount > 0);
                    console.log('🛟 [REPORT] Logs-only fallback built conversations:', reportData.conversations.length);
                } catch (e) {
                    console.warn('⚠️ [REPORT] Logs-only fallback failed:', e.message);
                }
            }
            
            console.log('💬 [REPORT] Final conversations:', {
                count: reportData.conversations.length,
                sampleConversation: reportData.conversations[0] || 'No conversations with messages'
            });
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

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const buffers = [];
            
            // Collect data chunks
            doc.on('data', (chunk) => buffers.push(chunk));
            
            // When document is finished, resolve with the complete buffer
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                console.log('✅ [PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
                resolve(pdfBuffer);
            });
            
            // Handle errors
            doc.on('error', (error) => {
                console.error('❌ [PDF] Error generating PDF:', error);
                reject(error);
            });

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

            // All-time usage summary
            doc.fontSize(14).text('All-Time Usage', 50, 230);
            doc.fontSize(10)
               .text(`Total Sessions: ${reportData.user.totalSessionsAllTime || 0}`, 70, 250)
               .text(`Total Messages: ${reportData.user.totalMessagesAllTime || 0}`, 70, 265);

            let yPosition = 290;

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
            if (reportData.conversations && reportData.conversations.length > 0) {
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
            } else {
                // Add message when no conversations found
                doc.fontSize(12).text('No conversation data found for the selected date range.', 50, yPosition);
            }

            // Add footer
            const footerY = doc.page.height - 50;
            doc.fontSize(8).text('Generated by Mouna AI Chatbot Platform', 50, footerY);

            // Finalize the PDF document
            doc.end();
            
        } catch (error) {
            console.error('❌ [PDF] Error setting up PDF generation:', error);
            reject(error);
        }
    });
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
            { header: 'Start Time', key: 'startTime', width: 22 },
            { header: 'End Time', key: 'endTime', width: 22 },
            { header: 'Message Count', key: 'messageCount', width: 18 }
        ];

        reportData.conversations.forEach(conv => {
            const start = conv.startTime instanceof Date ? conv.startTime : new Date(conv.startTime);
            const end = conv.endTime instanceof Date ? conv.endTime : new Date(conv.endTime);
            conversationsSheet.addRow({
                sessionId: conv.sessionId.toString(),
                startTime: start.toLocaleString(),
                endTime: end.toLocaleString(),
                messageCount: conv.messageCount
            });
        });

        // Detailed messages sheet
        const messagesSheet = workbook.addWorksheet('Conversation Messages');
        messagesSheet.columns = [
            { header: 'Session ID', key: 'sessionId', width: 25 },
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'Sender', key: 'sender', width: 14 },
            { header: 'Message', key: 'message', width: 100 }
        ];

        reportData.conversations.forEach(conv => {
            (conv.messages || []).forEach(msg => {
                const ts = msg.timestamp ? (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)) : null;
                messagesSheet.addRow({
                    sessionId: conv.sessionId.toString(),
                    timestamp: ts ? ts.toLocaleString() : '',
                    sender: msg.sender,
                    message: msg.message
                });
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
    // Helper to escape CSV values safely (handles commas, quotes, and newlines)
    const esc = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (/[",\n]/.test(str)) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    let csv = 'Mouna AI Chatbot Report\n';
    csv += `Generated,${esc(reportData.generatedAt.toLocaleString())}\n`;
    csv += `User,${esc(`${reportData.user.name} (${reportData.user.email})`)}\n`;
    csv += `Plan,${esc(reportData.user.plan)}\n`;
    csv += `Date Range,${esc(`${reportData.dateRange.start.toLocaleDateString()} to ${reportData.dateRange.end.toLocaleDateString()}`)}\n\n`;

    if (reportData.usage) {
        csv += 'USAGE STATISTICS\n';
        csv += 'Metric,Value\n';
        csv += `${esc('Total Sessions')},${esc(reportData.usage.totalSessions)}\n`;
        csv += `${esc('Total Messages')},${esc(reportData.usage.totalMessages)}\n`;
        csv += `${esc('Average Messages per Session')},${esc(reportData.usage.averageMessagesPerSession)}\n`;
        csv += `${esc('Average Sessions per Day')},${esc(reportData.usage.summary.avgSessionsPerDay)}\n\n`;

        if (reportData.usage.dailyBreakdown) {
            csv += 'DAILY BREAKDOWN\n';
            csv += 'Date,Sessions,Messages\n';
            Object.entries(reportData.usage.dailyBreakdown).forEach(([date, stats]) => {
                csv += `${esc(new Date(date).toLocaleDateString())},${esc(stats.sessions)},${esc(stats.messages)}\n`;
            });
            csv += '\n';
        }
    }

    if (reportData.conversations) {
        // Summary section
        csv += 'CONVERSATIONS SUMMARY\n';
        csv += 'Session ID,Start Time,End Time,Message Count\n';
        reportData.conversations.forEach(conv => {
            const start = conv.startTime instanceof Date ? conv.startTime : new Date(conv.startTime);
            const end = conv.endTime instanceof Date ? conv.endTime : new Date(conv.endTime);
            csv += `${esc(conv.sessionId)},${esc(start.toLocaleString())},${esc(end.toLocaleString())},${esc(conv.messageCount)}\n`;
        });
        csv += '\n';

        // Detailed messages section
        csv += 'DETAILED MESSAGES\n';
        csv += 'Session ID,Timestamp,Sender,Message\n';
        reportData.conversations.forEach(conv => {
            (conv.messages || []).forEach(msg => {
                const ts = msg.timestamp ? (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)) : null;
                const tsStr = ts ? ts.toLocaleString() : '';
                csv += `${esc(conv.sessionId)},${esc(tsStr)},${esc(msg.sender)},${esc(msg.message)}\n`;
            });
        });
    }

    return Buffer.from(csv, 'utf8');
}

// Routes

/**
 * Generate and download report
 * POST /api/reports/generate
 */
router.post('/generate', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
    try {
        console.log('🐛 [DEBUG] Reports route hit - /api/reports/generate');
        console.log('🐛 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
        console.log('🐛 [DEBUG] Request user object:', JSON.stringify(req.user, null, 2));
        console.log('🐛 [DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
        
        // Check if req.user exists before trying to access properties
        if (!req.user) {
            console.error('🚨 [ERROR] Authentication passed but req.user is missing');
            return res.status(401).json({
                error: 'Authentication failed - user information missing',
                message: 'Please log in again and try once more'
            });
        }
        
        const { dateRange, reportType, format } = req.body;
        let userId;
        
        // Enhanced user ID extraction with stringification for MongoDB ObjectId handling
        if (req.user._id) {
            userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
        } else if (req.user.userId) {
            userId = req.user.userId;
        } else if (req.user.id) {
            userId = req.user.id;
        }
        
        console.log('🐛 [DEBUG] Enhanced userId extraction:', userId);
        console.log('🐛 [DEBUG] userId type:', typeof userId);
        console.log('🐛 [DEBUG] req.user._id:', req.user._id, typeof req.user._id);
        console.log('🐛 [DEBUG] req.user.userId:', req.user.userId);
        console.log('🐛 [DEBUG] req.user.id:', req.user.id);
        
        if (!userId) {
            console.error('🚨 [ERROR] No userId found after extraction attempts');
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
        
        // Enhanced plan detection with fallbacks
        let userPlan = 'free';
        try {
            // More comprehensive plan detection logic with clear precedence
            if (req.user.subscription?.planName) userPlan = req.user.subscription.planName.toLowerCase();
            else if (req.user.subscription?.plan) userPlan = req.user.subscription.plan.toLowerCase();
            else if (req.user.plan?.current?.name) userPlan = req.user.plan.current.name.toLowerCase();
            else if (req.user.plan?.name) userPlan = req.user.plan.name.toLowerCase();
            else if (req.user.plan) {
                // If req.user.plan is a string, use it directly
                if (typeof req.user.plan === 'string') userPlan = req.user.plan.toLowerCase();
            }
            
            // Normalize common plan names
            if (userPlan.includes('starter')) userPlan = 'starter';
            if (userPlan.includes('professional') || userPlan.includes('pro')) userPlan = 'professional';
            if (userPlan.includes('enterprise')) userPlan = 'enterprise';
        } catch (e) {
            console.error('🚨 [ERROR] Error determining user plan:', e.message);
            // Fall back to free plan on error
        }
        
        console.log('🐛 [DEBUG] Enhanced plan detection:');
        console.log('🐛 [DEBUG] - req.user.subscription:', req.user.subscription);
        console.log('🐛 [DEBUG] - req.user.plan:', req.user.plan);
        console.log('🐛 [DEBUG] - Final userPlan after normalization:', userPlan);
        console.log('🐛 [DEBUG] - Available in PlanManager:', Object.keys(PlanManager.getAllPlans()).includes(userPlan));
        console.log('🐛 [DEBUG] - exportData feature available:', PlanManager.hasFeature(userPlan, 'exportData'));
        console.log('🐛 [DEBUG] - advancedAnalytics feature available:', PlanManager.hasFeature(userPlan, 'advancedAnalytics'));
        
        // Handle free users - check if basic reports should be allowed
        // Free users cannot access any reports
        if (userPlan === 'free') {
            return res.status(403).json({ 
                error: 'Reports require a paid plan with export data feature',
                upgradeRequired: true,
                currentPlan: userPlan,
                suggestedUpgrade: 'starter'
            });
        }
        
        // For Starter plan users - limit to basic reports only
        if (userPlan === 'starter' && (reportType === 'detailed' || reportType === 'performance')) {
            return res.status(403).json({ 
                error: 'Advanced reports require a professional plan or higher',
                upgradeRequired: true,
                currentPlan: userPlan,
                suggestedUpgrade: 'professional'
            });
        }

        // Get report data with additional error handling
        console.log('🔍 [REPORTS] About to fetch report data for userId:', userId);
        let reportData;
        try {
            reportData = await getReportData(userId, dateRange, reportType);
            console.log('✅ [REPORTS] Report data fetched successfully');
        } catch (reportError) {
            console.error('🚨 [REPORTS] Critical error getting report data:', reportError);
            return res.status(500).json({
                error: 'Failed to retrieve report data',
                message: reportError.message,
                debug: {
                    userId: userId,
                    dateRange: dateRange,
                    reportType: reportType
                }
            });
        }

        // Generate report in requested format
        console.log('📊 [REPORTS] Generating report in format:', format);
        let buffer;
        let contentType;
        let filename;

        try {
            switch (format) {
                case 'pdf':
                    console.log('📝 [REPORTS] Generating PDF report');
                    buffer = await generatePDFReport(reportData);
                    contentType = 'application/pdf';
                    filename = `mouna-ai-${reportType}-report-${dateRange}.pdf`;
                    break;
                
                case 'excel':
                    console.log('📈 [REPORTS] Generating Excel report');
                    buffer = await generateExcelReport(reportData);
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    filename = `mouna-ai-${reportType}-report-${dateRange}.xlsx`;
                    break;
                
                case 'csv':
                    console.log('📄 [REPORTS] Generating CSV report');
                    buffer = generateCSVReport(reportData);
                    contentType = 'text/csv';
                    filename = `mouna-ai-${reportType}-report-${dateRange}.csv`;
                    break;
                
                case 'json':
                    console.log('📜 [REPORTS] Generating JSON report');
                    buffer = Buffer.from(JSON.stringify(reportData, null, 2), 'utf8');
                    contentType = 'application/json';
                    filename = `mouna-ai-${reportType}-report-${dateRange}.json`;
                    break;
                
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            console.log('✅ [REPORTS] Report generated successfully:', {
                format,
                bufferSize: buffer?.length || 0,
                filename
            });
            
        } catch (formatError) {
            console.error('🚨 [REPORTS] Error generating report format:', formatError);
            return res.status(500).json({
                error: `Failed to generate ${format} report`,
                message: formatError.message
            });
        }

        // Set response headers for file download
        try {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', buffer.length);
            
            console.log('📦 [REPORTS] Sending file to client:', filename);
            
            // Send the file
            res.send(buffer);
            
            console.log('✅ [REPORTS] File sent successfully');
            
        } catch (sendError) {
            console.error('🚨 [REPORTS] Error sending file:', sendError);
            return res.status(500).json({
                error: 'Failed to send report file',
                message: sendError.message
            });
        }

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
router.get('/preview', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
    try {
        console.log('🐛 [DEBUG] Report preview route hit');
        console.log('🐛 [DEBUG] Preview req.user:', req.user);
        
        if (!req.user) {
            console.error('🚨 [ERROR] Report preview failed - req.user is missing');
            return res.status(401).json({
                error: 'Authentication failed - user information missing',
                message: 'Please log in again and try once more'
            });
        }
        
        const { dateRange = '30days', reportType = 'summary' } = req.query;
        let userId;
        
        // Enhanced user ID extraction
        if (req.user._id) {
            userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
        } else if (req.user.userId) {
            userId = req.user.userId;
        } else if (req.user.id) {
            userId = req.user.id;
        }
        
        console.log('🐛 [DEBUG] Preview userId extraction result:', userId);
        
        if (!userId) {
            console.error('🚨 [ERROR] Report preview failed - no userId found');
            return res.status(400).json({
                error: 'User ID could not be determined',
                debug: { userKeys: Object.keys(req.user) }
            });
        }

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
router.get('/usage/download', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
    try {
        console.log('🐛 [DEBUG] Quick usage download route hit');
        console.log('🐛 [DEBUG] Usage download req.user:', req.user);
        
        if (!req.user) {
            console.error('🚨 [ERROR] Usage report download failed - req.user is missing');
            return res.status(401).json({
                error: 'Authentication failed - user information missing',
                message: 'Please log in again and try once more'
            });
        }
        
        let userId;
        if (req.user._id) {
            userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
        } else if (req.user.userId) {
            userId = req.user.userId;
        } else if (req.user.id) {
            userId = req.user.id;
        }
        
        if (!userId) {
            console.error('🚨 [ERROR] Usage report download failed - no userId found');
            return res.status(400).json({
                error: 'User ID could not be determined',
                debug: { userKeys: Object.keys(req.user) }
            });
        }
        
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
router.get('/conversations/download', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
    try {
        console.log('🐛 [DEBUG] Quick conversations download route hit');
        console.log('🐛 [DEBUG] Conversations download req.user:', req.user);
        
        if (!req.user) {
            console.error('🚨 [ERROR] Conversations report download failed - req.user is missing');
            return res.status(401).json({
                error: 'Authentication failed - user information missing',
                message: 'Please log in again and try once more'
            });
        }
        
        let userId;
        if (req.user._id) {
            userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
        } else if (req.user.userId) {
            userId = req.user.userId;
        } else if (req.user.id) {
            userId = req.user.id;
        }
        
        if (!userId) {
            console.error('🚨 [ERROR] Conversations report download failed - no userId found');
            return res.status(400).json({
                error: 'User ID could not be determined',
                debug: { userKeys: Object.keys(req.user) }
            });
        }
        
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
router.post('/create-sample-data', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
        try {
            // Enhanced user ID extraction with logging
            console.log('🐛 [DEBUG] Create sample data - req.user:', req.user);
            
            if (!req.user) {
                console.error('🚨 [ERROR] Sample data generation failed - req.user is missing');
                return res.status(401).json({
                    error: 'Authentication failed - user information missing',
                    message: 'Please log in again and try once more'
                });
            }
            
            let userId;
            if (req.user._id) {
                userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
            } else if (req.user.userId) {
                userId = req.user.userId;
            } else if (req.user.id) {
                userId = req.user.id;
            }
            
            console.log('🐛 [DEBUG] Sample data userId extraction result:', userId);
            
            if (!userId) {
                console.error('🚨 [ERROR] Sample data generation failed - no userId found');
                return res.status(400).json({
                    error: 'User ID could not be determined',
                    debug: { userKeys: Object.keys(req.user) }
                });
            }
            
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
router.delete('/clear-sample-data', authenticateToken, requireFeature('basicAnalytics'), async (req, res) => {
        try {
            // Enhanced user ID extraction with logging
            console.log('🐛 [DEBUG] Clear sample data - req.user:', req.user);
            
            if (!req.user) {
                console.error('🚨 [ERROR] Sample data clearing failed - req.user is missing');
                return res.status(401).json({
                    error: 'Authentication failed - user information missing',
                    message: 'Please log in again and try once more'
                });
            }
            
            let userId;
            if (req.user._id) {
                userId = typeof req.user._id === 'object' ? req.user._id.toString() : req.user._id;
            } else if (req.user.userId) {
                userId = req.user.userId;
            } else if (req.user.id) {
                userId = req.user.id;
            }
            
            console.log('🐛 [DEBUG] Clear sample data userId extraction result:', userId);
            
            if (!userId) {
                console.error('🚨 [ERROR] Sample data clearing failed - no userId found');
                return res.status(400).json({
                    error: 'User ID could not be determined',
                    debug: { userKeys: Object.keys(req.user) }
                });
            }
            
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
