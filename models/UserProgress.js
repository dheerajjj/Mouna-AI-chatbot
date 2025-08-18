const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  steps: {
    signup: {
      completed: { type: Boolean, default: true }, // Always true since user exists
      completedAt: { type: Date, default: Date.now }
    },
    plan: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      planType: { type: String, default: null } // free, starter, professional
    },
    customize: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      customizationData: {
        theme: { type: String, default: null },
        colors: { type: Object, default: null },
        position: { type: String, default: null }
      }
    },
    embed: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      integrationMethod: { type: String, default: null }, // script, api, widget
      websiteUrl: { type: String, default: null }
    },
    live: {
      completed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      firstInteraction: { type: Date, default: null }
    }
  },
  completionPercentage: {
    type: Number,
    default: 20, // signup is 20%
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  redirectSource: {
    type: String,
    default: null // Track where user came from for analytics
  }
}, {
  timestamps: true
});

// Calculate completion percentage automatically
userProgressSchema.methods.calculateCompletionPercentage = function() {
  const steps = this.steps;
  const stepWeights = {
    signup: 20,   // 20%
    plan: 20,     // 20%
    customize: 25, // 25%
    embed: 25,    // 25%
    live: 10      // 10%
  };
  
  let totalCompleted = 0;
  Object.keys(stepWeights).forEach(step => {
    if (steps[step] && steps[step].completed) {
      totalCompleted += stepWeights[step];
    }
  });
  
  this.completionPercentage = totalCompleted;
  return totalCompleted;
};

// Update a specific step
userProgressSchema.methods.updateStep = function(stepName, completed = true, additionalData = {}) {
  if (!this.steps[stepName]) {
    throw new Error(`Invalid step name: ${stepName}`);
  }
  
  this.steps[stepName].completed = completed;
  this.steps[stepName].completedAt = completed ? new Date() : null;
  
  // Add any additional step-specific data
  if (additionalData && Object.keys(additionalData).length > 0) {
    Object.assign(this.steps[stepName], additionalData);
  }
  
  // Recalculate completion percentage
  this.calculateCompletionPercentage();
  this.lastUpdated = new Date();
  
  return this;
};

// Get progress summary
userProgressSchema.methods.getProgressSummary = function() {
  const summary = {
    userId: this.userId,
    completionPercentage: this.completionPercentage,
    totalSteps: 5,
    completedSteps: 0,
    steps: {}
  };
  
  Object.keys(this.steps).forEach(stepName => {
    const step = this.steps[stepName];
    summary.steps[stepName] = {
      completed: step.completed,
      completedAt: step.completedAt
    };
    
    if (step.completed) {
      summary.completedSteps++;
    }
  });
  
  return summary;
};

// Static method to create or update progress
userProgressSchema.statics.updateUserProgress = async function(userId, stepName, completed = true, additionalData = {}) {
  try {
    let progress = await this.findOne({ userId });
    
    if (!progress) {
      // Create new progress record
      progress = new this({
        userId,
        steps: {
          signup: { completed: true, completedAt: new Date() },
          plan: { completed: false },
          customize: { completed: false },
          embed: { completed: false },
          live: { completed: false }
        }
      });
    }
    
    // Update the specific step
    progress.updateStep(stepName, completed, additionalData);
    
    await progress.save();
    return progress.getProgressSummary();
  } catch (error) {
    throw new Error(`Failed to update user progress: ${error.message}`);
  }
};

// Static method to get user progress
userProgressSchema.statics.getUserProgress = async function(userId) {
  try {
    let progress = await this.findOne({ userId });
    
    if (!progress) {
      // Create default progress for new user
      progress = new this({
        userId,
        steps: {
          signup: { completed: true, completedAt: new Date() },
          plan: { completed: false },
          customize: { completed: false },
          embed: { completed: false },
          live: { completed: false }
        }
      });
      await progress.save();
    }
    
    return progress.getProgressSummary();
  } catch (error) {
    throw new Error(`Failed to get user progress: ${error.message}`);
  }
};

module.exports = mongoose.model('UserProgress', userProgressSchema);
