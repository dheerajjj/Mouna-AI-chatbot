const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearAllUsers() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        console.log('🔌 Connecting to MongoDB...');
        await client.connect();
        
        const db = client.db('chatbot-widget');
        const usersCollection = db.collection('users');
        
        // Get count of existing users
        const userCount = await usersCollection.countDocuments();
        console.log(`📊 Found ${userCount} existing users in database`);
        
        if (userCount === 0) {
            console.log('✅ Database is already clean - no users to remove');
            return;
        }
        
        // Delete all users
        const result = await usersCollection.deleteMany({});
        
        console.log(`🗑️  Successfully deleted ${result.deletedCount} users from database`);
        console.log('✅ Database cleared - ready for OTP testing!');
        
        // Verify deletion
        const remainingCount = await usersCollection.countDocuments();
        if (remainingCount === 0) {
            console.log('✅ Verification: Database is now completely clean');
        } else {
            console.warn(`⚠️  Warning: ${remainingCount} users still remain in database`);
        }
        
    } catch (error) {
        console.error('❌ Error clearing users:', error.message);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔒 Database connection closed');
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
