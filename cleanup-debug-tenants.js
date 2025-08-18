const mongoose = require('mongoose');
const TenantSettings = require('./models/TenantSettings');
require('dotenv').config();

async function cleanupDebugTenants() {
  try {
    console.log('🧹 Starting debug tenant cleanup...');
    
    // Connect to database
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all debug test tenants
    const debugTenants = await TenantSettings.find({
      $or: [
        { 'tenantInfo.name': 'Debug Test Tenant' },
        { 'tenantInfo.name': { $regex: /debug.*test.*tenant/i } },
        { 'tenantInfo.description': 'Debug tenant for testing issues' },
        { 'tenantInfo.description': { $regex: /debug.*tenant.*for.*testing/i } }
      ]
    });

    console.log(`🔍 Found ${debugTenants.length} debug tenants to remove:`);
    debugTenants.forEach((tenant, index) => {
      console.log(`  ${index + 1}. ${tenant.tenantInfo.name} (${tenant.tenantId}) - Created: ${tenant.createdAt}`);
    });

    if (debugTenants.length === 0) {
      console.log('✅ No debug tenants found. Database is clean!');
      return;
    }

    // Confirm deletion (skip in production)
    const shouldDelete = process.env.NODE_ENV === 'production' || process.argv.includes('--force');
    
    if (!shouldDelete) {
      console.log('⚠️  Run with --force flag to actually delete the debug tenants');
      console.log('   Example: node cleanup-debug-tenants.js --force');
      return;
    }

    console.log('🗑️  Deleting debug tenants...');
    
    // Delete debug tenants
    const deleteResult = await TenantSettings.deleteMany({
      $or: [
        { 'tenantInfo.name': 'Debug Test Tenant' },
        { 'tenantInfo.name': { $regex: /debug.*test.*tenant/i } },
        { 'tenantInfo.description': 'Debug tenant for testing issues' },
        { 'tenantInfo.description': { $regex: /debug.*tenant.*for.*testing/i } }
      ]
    });

    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} debug tenants`);
    
    // Verify cleanup
    const remainingDebugTenants = await TenantSettings.find({
      $or: [
        { 'tenantInfo.name': { $regex: /debug.*test.*tenant/i } },
        { 'tenantInfo.description': { $regex: /debug.*tenant.*for.*testing/i } }
      ]
    });
    
    if (remainingDebugTenants.length === 0) {
      console.log('✅ Cleanup completed successfully! No debug tenants remain.');
    } else {
      console.log(`⚠️  ${remainingDebugTenants.length} debug tenants still remain:`);
      remainingDebugTenants.forEach(tenant => {
        console.log(`  - ${tenant.tenantInfo.name} (${tenant.tenantId})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupDebugTenants().catch(console.error);
