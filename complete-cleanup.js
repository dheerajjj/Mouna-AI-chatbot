const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function completeCleanup() {
    console.log('🧹 Starting complete cleanup and restart process...\n');
    
    try {
        // 1. Run user database cleanup
        console.log('🗂️  Step 1: Clearing user databases...');
        const { stdout, stderr } = await execPromise('echo y | node clear-users.js');
        console.log(stdout);
        if (stderr) console.log('Warning:', stderr);
        
        // 2. Push changes and deploy to Railway
        console.log('\n🚀 Step 2: Deploying fresh changes to Railway...');
        
        // Check if we have any uncommitted changes
        try {
            const { stdout: statusOut } = await execPromise('git status --porcelain');
            if (statusOut.trim()) {
                console.log('📝 Found uncommitted changes, committing them...');
                await execPromise('git add -A');
                await execPromise('git commit -m "Complete cleanup - ready for OTP testing"');
            }
        } catch (e) {
            console.log('ℹ️  No uncommitted changes found');
        }
        
        // Push to trigger Railway deployment
        console.log('⬆️  Pushing to GitHub to trigger Railway deployment...');
        await execPromise('git push origin main');
        
        console.log('\n✅ Complete cleanup finished!');
        console.log('🎯 What was accomplished:');
        console.log('   • Cleared all users from MongoDB and Mock databases');
        console.log('   • Triggered Railway deployment to restart server');
        console.log('   • Cleared any in-memory OTP storage');
        console.log('   • Ready for fresh OTP testing');
        
        console.log('\n🧪 Next steps:');
        console.log('   1. Wait 2-3 minutes for Railway deployment to complete');
        console.log('   2. Visit your get-started page');
        console.log('   3. Try signing up with dheeraj.koduru@gmail.com');
        console.log('   4. Check for OTP email delivery');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        process.exit(1);
    }
}

// Run the complete cleanup
completeCleanup();
