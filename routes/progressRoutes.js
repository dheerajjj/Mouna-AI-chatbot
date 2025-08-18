const express = require('express');
const router = express.Router();
const UserProgress = require('../models/UserProgress');
const { authenticateToken } = require('../middleware/auth'); // Assuming you have auth middleware

// Middleware to authenticate all progress routes
router.use(authenticateToken);

/**
 * GET /api/setup-progress
 * Get current user's setup progress
 */
router.get('/setup-progress', async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
    
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
