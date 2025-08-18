const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const UserProgress = require('../models/UserProgress');

// Token blacklist for logout functionality (shared)
const tokenBlacklist = new Set();

// JWT authentication middleware (compatible with main server)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token has expired' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(403).json({ error: 'Token verification failed' });
      }
      
      // Get full user data from database to match main server behavior
      try {
        const DatabaseService = require('../services/DatabaseService');
        const user = await DatabaseService.findUserById(decoded.userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = user;
        req.token = token;
        next();
      } catch (dbError) {
        console.error('Database error in JWT auth:', dbError);
        return res.status(500).json({ error: 'Authentication error' });
      }
    });
  } catch (error) {
    console.error('JWT authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to authenticate all progress routes
router.use(authenticateToken);

/**
 * GET /api/setup-progress
 * Get current user's setup progress
 */
router.get('/setup-progress', async (req, res) => {
  try {
    const userId = req.user._id; // From auth middleware
    
    const progress = await UserProgress.getUserProgress(userId);
    
    res.json({
      success: true,
      progress: progress.steps,
      completionPercentage: progress.completionPercentage,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setup progress',
      error: error.message
    });
  }
});

/**
 * PUT /api/setup-progress
 * Update a specific step in user's setup progress
 * Body: { step: 'customize', completed: true, additionalData: {...} }
 */
router.put('/setup-progress', async (req, res) => {
  try {
    const userId = req.user._id;
    const { step, completed = true, additionalData = {}, redirectSource } = req.body;
    
    // Validate step name
    const validSteps = ['signup', 'plan', 'customize', 'embed', 'live'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        message: `Invalid step name. Must be one of: ${validSteps.join(', ')}`
      });
    }
    
    // Update progress with redirect source for analytics
    const progressData = { ...additionalData };
    if (redirectSource) {
      progressData.redirectSource = redirectSource;
    }
    
    const updatedProgress = await UserProgress.updateUserProgress(
      userId, 
      step, 
      completed, 
      progressData
    );
    
    // Log progress update for analytics
    console.log(`✅ Progress updated: User ${userId} - ${step} = ${completed ? 'completed' : 'uncompleted'}`);
    
    res.json({
      success: true,
      message: `Step '${step}' ${completed ? 'completed' : 'updated'} successfully`,
      progress: updatedProgress.steps,
      completionPercentage: updatedProgress.completionPercentage,
      completedSteps: updatedProgress.completedSteps,
      stepUpdated: step
    });
  } catch (error) {
    console.error('Error updating user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setup progress',
      error: error.message
    });
  }
});

/**
 * POST /api/setup-progress/bulk-update
 * Update multiple steps at once
 * Body: { updates: [{ step: 'customize', completed: true }, { step: 'embed', completed: true }] }
 */
router.post('/setup-progress/bulk-update', async (req, res) => {
  try {
    const userId = req.user._id;
    const { updates, redirectSource } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
    }
    
    // Validate all steps first
    const validSteps = ['signup', 'plan', 'customize', 'embed', 'live'];
    for (const update of updates) {
      if (!validSteps.includes(update.step)) {
        return res.status(400).json({
          success: false,
          message: `Invalid step name '${update.step}'. Must be one of: ${validSteps.join(', ')}`
        });
      }
    }
    
    // Apply updates sequentially
    let finalProgress;
    for (const update of updates) {
      const additionalData = { ...update.additionalData };
      if (redirectSource) {
        additionalData.redirectSource = redirectSource;
      }
      
      finalProgress = await UserProgress.updateUserProgress(
        userId,
        update.step,
        update.completed !== false, // Default to true
        additionalData
      );
    }
    
    console.log(`✅ Bulk progress updated: User ${userId} - ${updates.length} steps updated`);
    
    res.json({
      success: true,
      message: `${updates.length} step(s) updated successfully`,
      progress: finalProgress.steps,
      completionPercentage: finalProgress.completionPercentage,
      completedSteps: finalProgress.completedSteps,
      stepsUpdated: updates.map(u => u.step)
    });
  } catch (error) {
    console.error('Error bulk updating user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update setup progress',
      error: error.message
    });
  }
});

/**
 * POST /api/setup-progress/complete-step-and-redirect
 * Complete a step and get redirect URL
 * Body: { step: 'customize', additionalData: {...}, redirectTo: 'welcome-dashboard' }
 */
router.post('/setup-progress/complete-step-and-redirect', async (req, res) => {
  try {
    const userId = req.user._id;
    const { step, additionalData = {}, redirectTo = 'welcome-dashboard' } = req.body;
    
    // Validate step name
    const validSteps = ['signup', 'plan', 'customize', 'embed', 'live'];
    if (!validSteps.includes(step)) {
      return res.status(400).json({
        success: false,
        message: `Invalid step name. Must be one of: ${validSteps.join(', ')}`
      });
    }
    
    // Update progress
    const updatedProgress = await UserProgress.updateUserProgress(
      userId, 
      step, 
      true, 
      { ...additionalData, redirectSource: `${step}-completion` }
    );
    
    // Determine redirect URL
    const redirectUrls = {
      'welcome-dashboard': '/welcome-dashboard',
      'dashboard': '/dashboard',
      'customize': '/customize-widget',
      'configure': '/configure-prompt',
      'integration': '/integration',
      'pricing': '/pricing'
    };
    
    const redirectUrl = redirectUrls[redirectTo] || '/welcome-dashboard';
    
    console.log(`✅ Step completed with redirect: User ${userId} - ${step} -> ${redirectUrl}`);
    
    res.json({
      success: true,
      message: `Step '${step}' completed successfully`,
      progress: updatedProgress.steps,
      completionPercentage: updatedProgress.completionPercentage,
      completedSteps: updatedProgress.completedSteps,
      stepCompleted: step,
      redirectUrl: redirectUrl,
      shouldRedirect: true
    });
  } catch (error) {
    console.error('Error completing step with redirect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete step and get redirect',
      error: error.message
    });
  }
});

/**
 * GET /api/setup-progress/analytics
 * Get progress analytics for the user (optional admin feature)
 */
router.get('/setup-progress/analytics', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const progress = await UserProgress.findOne({ userId }).lean();
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No progress data found for user'
      });
    }
    
    // Calculate time between steps
    const analytics = {
      userId,
      overallCompletion: progress.completionPercentage,
      timeToComplete: {},
      stepHistory: []
    };
    
    const stepOrder = ['signup', 'plan', 'customize', 'embed', 'live'];
    let previousDate = progress.createdAt;
    
    stepOrder.forEach(stepName => {
      const step = progress.steps[stepName];
      if (step && step.completed && step.completedAt) {
        const timeFromPrevious = step.completedAt - previousDate;
        analytics.timeToComplete[stepName] = {
          completedAt: step.completedAt,
          timeFromPrevious: Math.round(timeFromPrevious / (1000 * 60)), // minutes
          timeFromStart: Math.round((step.completedAt - progress.createdAt) / (1000 * 60)) // minutes
        };
        
        analytics.stepHistory.push({
          step: stepName,
          completedAt: step.completedAt,
          timeFromStart: analytics.timeToComplete[stepName].timeFromStart
        });
        
        previousDate = step.completedAt;
      }
    });
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching progress analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress analytics',
      error: error.message
    });
  }
});

module.exports = router;
