const { ObjectId } = require('mongodb');

/**
 * Generate sample data for testing report functionality
 */
async function createSampleReportData(DatabaseService, userId) {
    try {
        console.log('🔄 Creating sample report data for user:', userId);
        
        const { getDb } = require('../server-mongo');
        const db = getDb();
        
        // Ensure userId is ObjectId
        const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
        
        // Generate sample chat sessions for the last 30 days
        const now = new Date();
        const sampleSessions = [];
        
        for (let i = 0; i < 15; i++) {
            const sessionDate = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000));
            const messageCount = Math.floor(Math.random() * 10) + 2; // 2-12 messages per session
            
            const sessionId = new ObjectId().toString();
            const messages = [];
            
            // Generate conversation messages
            for (let j = 0; j < messageCount; j++) {
                const isUser = j % 2 === 0;
                const messageTime = new Date(sessionDate.getTime() + (j * 2 * 60 * 1000)); // 2 minutes apart
                
                if (isUser) {
                    const userMessages = [
                        'Hello, I need help with my account',
                        'Can you help me with pricing information?',
                        'What are your business hours?',
                        'I have a question about your services',
                        'How do I get started?',
                        'What features do you offer?',
                        'Can I schedule a demo?',
                        'I need technical support',
                        'What payment methods do you accept?',
                        'How can I contact support?'
                    ];
                    
                    messages.push({
                        timestamp: messageTime,
                        sender: 'user',
                        message: userMessages[Math.floor(Math.random() * userMessages.length)],
                        type: 'text'
                    });
                } else {
                    const botMessages = [
                        'Hello! I\'d be happy to help you with your account. What specific information do you need?',
                        'Our pricing plans start at ₹499/month for the Starter plan. Would you like to see all our options?',
                        'We\'re available 24/7 to assist you. How can I help you today?',
                        'I\'m here to answer any questions about our services. What would you like to know?',
                        'Getting started is easy! You can sign up for a free account and begin customizing your chatbot right away.',
                        'We offer chatbot customization, analytics, multi-format reporting, and 24/7 support. What interests you most?',
                        'Absolutely! I can help you schedule a demo. What time works best for you?',
                        'I\'ll connect you with our technical support team. Can you describe the issue you\'re experiencing?',
                        'We accept all major credit cards, UPI, and bank transfers. Which payment method would you prefer?',
                        'You can reach our support team at support@mouna-ai.com or through this chat. How can we assist you?'
                    ];
                    
                    messages.push({
                        timestamp: messageTime,
                        sender: 'assistant',
                        message: botMessages[Math.floor(Math.random() * botMessages.length)],
                        type: 'text',
                        responseTime: Math.floor(Math.random() * 2000) + 500, // 500-2500ms
                        model: 'gpt-4o-mini',
                        tokens: {
                            prompt: Math.floor(Math.random() * 100) + 50,
                            completion: Math.floor(Math.random() * 150) + 30,
                            total: Math.floor(Math.random() * 250) + 80
                        },
                        cost: (Math.floor(Math.random() * 250) + 80) * 0.00001
                    });
                }
            }
            
            sampleSessions.push({
                _id: new ObjectId(),
                sessionId: sessionId,
                userId: userObjectId,
                createdAt: sessionDate,
                updatedAt: new Date(sessionDate.getTime() + (messageCount * 2 * 60 * 1000)),
                messages: messages,
                website: {
                    domain: ['example.com', 'testsite.org', 'demo.website', 'mystore.com'][Math.floor(Math.random() * 4)],
                    page: ['/', '/pricing', '/contact', '/about', '/services'][Math.floor(Math.random() * 5)],
                    title: 'Sample Website'
                },
                visitor: {
                    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
        }
        
        // Insert sample sessions into database
        if (sampleSessions.length > 0) {
            await db.collection('chat_sessions').insertMany(sampleSessions);
            console.log('✅ Created', sampleSessions.length, 'sample chat sessions');
        }
        
        // Update user usage statistics
        const totalMessages = sampleSessions.reduce((sum, session) => sum + session.messages.length, 0);
        const messagesThisMonth = sampleSessions
            .filter(session => {
                const sessionDate = new Date(session.createdAt);
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return sessionDate >= monthStart;
            })
            .reduce((sum, session) => sum + session.messages.length, 0);
        
        await DatabaseService.updateUser(userObjectId, {
            'usage.totalMessages': totalMessages,
            'usage.messagesThisMonth': messagesThisMonth,
            'usage.totalSessions': sampleSessions.length,
            'usage.lastActivity': now
        });
        
        console.log('✅ Updated user usage statistics');
        console.log('📊 Sample data summary:');
        console.log(`   • ${sampleSessions.length} chat sessions`);
        console.log(`   • ${totalMessages} total messages`);
        console.log(`   • ${messagesThisMonth} messages this month`);
        
        return {
            success: true,
            sessions: sampleSessions.length,
            totalMessages,
            messagesThisMonth
        };
        
    } catch (error) {
        console.error('❌ Error creating sample report data:', error);
        throw error;
    }
}

/**
 * Clear existing sample data for a user
 */
async function clearSampleReportData(userId) {
    try {
        console.log('🧹 Clearing sample report data for user:', userId);
        
        const { getDb } = require('../server-mongo');
        const db = getDb();
        
        const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
        
        // Remove chat sessions
        const result = await db.collection('chat_sessions').deleteMany({
            userId: userObjectId
        });
        
        console.log('✅ Removed', result.deletedCount, 'chat sessions');
        
        return {
            success: true,
            deletedSessions: result.deletedCount
        };
        
    } catch (error) {
        console.error('❌ Error clearing sample report data:', error);
        throw error;
    }
}

module.exports = {
    createSampleReportData,
    clearSampleReportData
};
