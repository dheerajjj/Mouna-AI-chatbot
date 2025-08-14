const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

async function clearAllUsers() {
    console.log('🧹 Starting comprehensive user cleanup...');
    console.log('This will clear users from both MongoDB and Mock Database\n');
    
    let mongoCleared = false;
    let mockCleared = false;
    
    // 1. Clear MongoDB using Mongoose (matches app's connection method)
    try {
        console.log('📊 Checking MongoDB (Mongoose connection)...');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot';
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000
        });
        
        // Get database name from connection
        const dbName = mongoose.connection.name;
        console.log(`📊 Connected to MongoDB database: ${dbName}`);
        
        // Check if User model exists and clear
        try {
            const UserModel = mongoose.model('User');
            const userCount = await UserModel.countDocuments();
            console.log(`📊 Found ${userCount} users in MongoDB`);
            
            if (userCount > 0) {
                const result = await UserModel.deleteMany({});
                console.log(`🗑️  Deleted ${result.deletedCount} users from MongoDB`);
            }
            mongoCleared = true;
        } catch (modelError) {
            // Try alternative approach with raw collection
            const usersCollection = mongoose.connection.db.collection('users');
            const userCount = await usersCollection.countDocuments();
            console.log(`📊 Found ${userCount} users in MongoDB (raw collection)`);
            
            if (userCount > 0) {
                const result = await usersCollection.deleteMany({});
                console.log(`🗑️  Deleted ${result.deletedCount} users from MongoDB`);
            }
            mongoCleared = true;
        }
        
        await mongoose.disconnect();
        console.log('✅ MongoDB cleanup completed');
        
    } catch (mongoError) {
        console.log('⚠️  MongoDB not accessible:', mongoError.message);
        console.log('📝 App might be using Mock Database instead');
    }
    
    // 2. Clear Mock Database (in case app falls back to it)
    try {
        console.log('\n📊 Checking Mock Database...');
        const mockDB = require('./mockDB');
        
        const mockUserCount = mockDB.users.length;
        console.log(`📊 Found ${mockUserCount} users in Mock Database`);
        
        if (mockUserCount > 0) {
            mockDB.clear();
            console.log(`🗑️  Cleared ${mockUserCount} users from Mock Database`);
        }
        mockCleared = true;
        console.log('✅ Mock Database cleanup completed');
        
    } catch (mockError) {
        console.log('⚠️  Mock Database cleanup failed:', mockError.message);
    }
    
    // 3. Summary
    console.log('\n📋 Cleanup Summary:');
    console.log(`✅ MongoDB: ${mongoCleared ? 'Cleaned' : 'Skipped/Failed'}`);
    console.log(`✅ Mock DB: ${mockCleared ? 'Cleaned' : 'Skipped/Failed'}`);
    
    if (mongoCleared || mockCleared) {
        console.log('\n🎉 User cleanup completed successfully!');
        console.log('🧪 Ready for fresh OTP testing!');
    } else {
        console.log('\n⚠️  No databases were cleared. Please check your configuration.');
    }
}

// Confirmation prompt
console.log('🚨 WARNING: This will delete ALL users from your database!');
console.log('This action cannot be undone.');
console.log('');
console.log('Are you sure you want to proceed? (y/N)');

process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
        const input = chunk.trim().toLowerCase();
        if (input === 'y' || input === 'yes') {
            console.log('🧹 Starting database cleanup...');
            clearAllUsers().then(() => {
                process.exit(0);
            });
        } else {
            console.log('❌ Operation cancelled - no changes made to database');
            process.exit(0);
        }
    }
});

process.stdin.on('end', () => {
    console.log('❌ Operation cancelled - no changes made to database');
    process.exit(0);
});
