const mongoose = require('mongoose');
const TenantSettings = require('./models/TenantSettings');
const { User } = require('./models/User');
require('dotenv').config();

async function checkTenantCount() {
  try {
    console.log('🔍 Checking tenant count for user...');
    
    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user by email (Dheeraj Koduru)
    const user = await User.findOne({ 
      $or: [
        { email: { $regex: /dheeraj/i } },
        { name: { $regex: /dheeraj.*koduru/i } }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`📊 Subscription: ${user.subscription?.plan || 'free'}`);

    // Get all tenants for this user
    const allTenants = await TenantSettings.find({ 
      userId: user._id, 
      status: { $ne: 'suspended' }
    }).select('tenantId tenantInfo.name tenantInfo.description isPersonalTenant createdAt');

    console.log(`\n📋 All tenants (${allTenants.length} total):`);
    allTenants.forEach((tenant, index) => {
      const type = tenant.isPersonalTenant ? 'PERSONAL' : 'CLIENT';
      console.log(`  ${index + 1}. [${type}] ${tenant.tenantInfo.name}`);
      console.log(`     ID: ${tenant.tenantId}`);
      console.log(`     Created: ${tenant.createdAt}`);
      if (tenant.tenantInfo.description) {
        console.log(`     Description: ${tenant.tenantInfo.description}`);
      }
      console.log('');
    });

    // Count client tenants (what matters for limits)
    const clientTenants = await TenantSettings.countDocuments({ 
      userId: user._id, 
      status: { $ne: 'suspended' },
      isPersonalTenant: { $ne: true }
    });

    // Count personal tenants (should not count toward limits)
    const personalTenants = await TenantSettings.countDocuments({ 
      userId: user._id, 
      status: { $ne: 'suspended' },
      isPersonalTenant: true
    });

    console.log(`\n📊 TENANT SUMMARY:`);
    console.log(`   👥 CLIENT tenants: ${clientTenants} (counts toward limit)`);
    console.log(`   🏠 PERSONAL tenants: ${personalTenants} (does not count)`);
    console.log(`   📝 TOTAL tenants: ${allTenants.length}`);
    
    // Check limits based on plan
    const limits = {
      'free': 0,
      'starter': 2,
      'professional': 5,
      'enterprise': 'unlimited'
    };
    
    const planLimit = limits[user.subscription?.plan || 'free'];
    console.log(`\n🎯 PLAN LIMITS:`);
    console.log(`   Plan: ${user.subscription?.plan || 'free'}`);
    console.log(`   Client tenant limit: ${planLimit}`);
    
    if (planLimit === 'unlimited') {
      console.log(`   ✅ Can create more tenants: YES (unlimited)`);
    } else {
      const canCreateMore = clientTenants < planLimit;
      console.log(`   ✅ Can create more tenants: ${canCreateMore ? 'YES' : 'NO'}`);
      console.log(`   🔢 Remaining slots: ${Math.max(0, planLimit - clientTenants)}`);
    }

  } catch (error) {
    console.error('❌ Error checking tenant count:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
  }
}

// Run the check
checkTenantCount().catch(console.error);
