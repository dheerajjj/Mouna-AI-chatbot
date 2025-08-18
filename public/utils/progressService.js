/**
 * Progress Tracking Service
 * Handles all progress-related API calls and UI updates
 */

class ProgressService {
  constructor() {
    this.baseUrl = '/api/setup-progress';
    this.authToken = localStorage.getItem('authToken');
  }

  /**
   * Get authorization headers for API requests
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken || localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch current user progress from backend
   * @returns {Promise<Object>} Progress data
   */
  async getUserProgress() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch progress');
      }

      return {
        steps: data.progress,
        completionPercentage: data.completionPercentage,
        completedSteps: data.completedSteps,
        totalSteps: data.totalSteps
      };
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }

  /**
   * Update a specific progress step
   * @param {string} stepName - Name of the step to update
   * @param {boolean} completed - Whether step is completed
   * @param {Object} additionalData - Additional data for the step
   * @param {string} redirectSource - Source of the update for analytics
   * @returns {Promise<Object>} Updated progress data
   */
  async updateStep(stepName, completed = true, additionalData = {}, redirectSource = null) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          step: stepName,
          completed,
          additionalData,
          redirectSource
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update progress');
      }

      // Trigger custom event for UI updates
      this.dispatchProgressUpdateEvent(data);

      return {
        steps: data.progress,
        completionPercentage: data.completionPercentage,
        completedSteps: data.completedSteps,
        stepUpdated: data.stepUpdated
      };
    } catch (error) {
      console.error('Error updating progress step:', error);
      throw error;
    }
  }

  /**
   * Complete a step and handle automatic redirect
   * @param {string} stepName - Name of the step to complete
   * @param {Object} additionalData - Additional data for the step
   * @param {string} redirectTo - Where to redirect after completion
   * @param {boolean} autoRedirect - Whether to auto-redirect
   * @returns {Promise<Object>} Progress data with redirect info
   */
  async completeStepAndRedirect(stepName, additionalData = {}, redirectTo = 'welcome-dashboard', autoRedirect = true) {
    try {
      const response = await fetch(`${this.baseUrl}/complete-step-and-redirect`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          step: stepName,
          additionalData,
          redirectTo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to complete step');
      }

      // Trigger progress update event
      this.dispatchProgressUpdateEvent(data);

      // Show success notification
      this.showSuccessNotification(`${this.getStepDisplayName(stepName)} completed! 🎉`);

      // Handle automatic redirect
      if (autoRedirect && data.shouldRedirect && data.redirectUrl) {
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1500); // Give user time to see success message
      }

      return {
        steps: data.progress,
        completionPercentage: data.completionPercentage,
        completedSteps: data.completedSteps,
        stepCompleted: data.stepCompleted,
        redirectUrl: data.redirectUrl,
        shouldRedirect: data.shouldRedirect
      };
    } catch (error) {
      console.error('Error completing step with redirect:', error);
      this.showErrorNotification('Failed to save progress. Please try again.');
      throw error;
    }
  }

  /**
   * Bulk update multiple steps
   * @param {Array} updates - Array of step updates
   * @param {string} redirectSource - Source for analytics
   * @returns {Promise<Object>} Updated progress data
   */
  async bulkUpdateSteps(updates, redirectSource = null) {
    try {
      const response = await fetch(`${this.baseUrl}/bulk-update`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          updates,
          redirectSource
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to bulk update progress');
      }

      // Trigger progress update event
      this.dispatchProgressUpdateEvent(data);

      return {
        steps: data.progress,
        completionPercentage: data.completionPercentage,
        completedSteps: data.completedSteps,
        stepsUpdated: data.stepsUpdated
      };
    } catch (error) {
      console.error('Error bulk updating progress:', error);
      throw error;
    }
  }

  /**
   * Dispatch custom event for progress updates
   * @param {Object} progressData - Updated progress data
   */
  dispatchProgressUpdateEvent(progressData) {
    const event = new CustomEvent('progressUpdated', {
      detail: {
        steps: progressData.progress,
        completionPercentage: progressData.completionPercentage,
        completedSteps: progressData.completedSteps,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Update progress UI elements on the page
   * @param {Object} progressData - Progress data to display
   */
  updateProgressUI(progressData) {
    const { steps, completionPercentage } = progressData;
    
    // Update each progress step indicator
    Object.keys(steps).forEach(stepName => {
      const stepElement = document.getElementById(`progress-${stepName}`);
      if (stepElement) {
        const indicator = stepElement.querySelector('.progress-indicator');
        const step = steps[stepName];
        
        if (step.completed) {
          stepElement.classList.remove('pending');
          stepElement.classList.add('completed');
          if (indicator) {
            indicator.innerHTML = '<i class="fas fa-check"></i>';
          }
        } else {
          stepElement.classList.remove('completed');
          stepElement.classList.add('pending');
          if (indicator) {
            indicator.innerHTML = '';
          }
        }
      }
    });

    // Update progress bar if it exists
    const progressBar = document.querySelector('.progress-bar-fill, [style*="width"]');
    if (progressBar) {
      progressBar.style.width = `${completionPercentage}%`;
    }

    // Update progress text
    const progressText = document.querySelector('.progress-text, [class*="progress"] p');
    if (progressText) {
      progressText.textContent = `${completionPercentage}% Completed`;
    }

    // Hide plan banner if plan step is completed
    if (steps.plan && steps.plan.completed) {
      const planBanner = document.getElementById('plan-banner');
      if (planBanner) {
        planBanner.style.display = 'none';
      }
    }
  }

  /**
   * Show success notification to user
   * @param {string} message - Success message
   */
  showSuccessNotification(message) {
    // Create or update notification element
    let notification = document.getElementById('progress-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'progress-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        max-width: 300px;
        word-wrap: break-word;
        transition: all 0.3s ease;
        transform: translateX(400px);
      `;
      document.body.appendChild(notification);
    }

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      </div>
    `;

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Show error notification to user
   * @param {string} message - Error message
   */
  showErrorNotification(message) {
    let notification = document.getElementById('progress-notification');
    
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'progress-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f56565, #e53e3e);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(245, 101, 101, 0.3);
        z-index: 10000;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        max-width: 300px;
        word-wrap: break-word;
        transition: all 0.3s ease;
        transform: translateX(400px);
      `;
      document.body.appendChild(notification);
    }

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      </div>
    `;

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto hide after 4 seconds for errors
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  /**
   * Get display name for step
   * @param {string} stepName - Internal step name
   * @returns {string} Display name
   */
  getStepDisplayName(stepName) {
    const displayNames = {
      signup: 'Sign-up',
      plan: 'Plan Selection',
      appearance: 'Widget Appearance',
      customize: 'Chat Configuration',
      embed: 'Integration',
      live: 'Go Live'
    };
    
    return displayNames[stepName] || stepName;
  }

  /**
   * Initialize progress tracking on page load
   */
  async initializeProgress() {
    try {
      // Listen for progress update events
      window.addEventListener('progressUpdated', (event) => {
        this.updateProgressUI(event.detail);
      });

      // Load current progress
      const progress = await this.getUserProgress();
      this.updateProgressUI(progress);
      
      return progress;
    } catch (error) {
      console.error('Error initializing progress:', error);
      // Don't throw - let the page load even if progress fails
    }
  }
}

// Create global instance
window.ProgressService = new ProgressService();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressService;
}
