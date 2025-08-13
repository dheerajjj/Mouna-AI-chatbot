const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot');
    console.log('✅ Connected to MongoDB');
    
    // Get the User collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).limit(10).toArray();
    
    console.log('\n📊 Recent Users:');
    console.log('================');
    
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Plan: ${user.subscription?.plan || 'free'}`);
        console.log(`   Joined: ${user.createdAt}`);
        console.log('   ---');
      });
    }
    
    const totalCount = await usersCollection.countDocuments();
    console.log(`\n📈 Total Users: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
