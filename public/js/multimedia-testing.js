/**
 * Multimedia Testing Interface JavaScript
 * 
 * Handles the interactive functionality for the multimedia analysis testing interface
 * including multi-select, progress tracking, and real-time updates.
 */

// Global variables
let currentTestRunId = null;
let progressInterval = null;
let testStartTime = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initializeInterface();
  attachEventListeners();
  updateTestSummary();
});

/**
 * Initialize the interface
 */
function initializeInterface() {
  // Set default test name with timestamp
  const now = new Date();
  const defaultName = `Test Run ${now.toISOString().slice(0, 19).replace('T', ' ')}`;
  document.getElementById('testName').value = defaultName;
  
  // Initialize counters
  updateTestSummary();
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Form submission
  document.getElementById('testConfigForm').addEventListener('submit', handleTestSubmit);
  
  // File and URL checkboxes
  document.querySelectorAll('.test-file-checkbox, .test-url-checkbox, .ai-job-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateTestSummary);
  });
  
  // Master checkboxes
  document.getElementById('selectAllAiJobs').addEventListener('change', updateTestSummary);
}

/**
 * Handle form submission
 */
async function handleTestSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const testData = {
    name: formData.get('testName'),
    description: formData.get('testDescription'),
    selectedFiles: formData.getAll('selectedFiles'),
    selectedUrls: formData.getAll('selectedUrls'),
    selectedAiJobs: formData.getAll('selectedAiJobs')
  };
  
  // Validate selections
  if (!testData.name.trim()) {
    showAlert('Please enter a test name', 'danger');
    return;
  }
  
  if (testData.selectedFiles.length === 0 && testData.selectedUrls.length === 0) {
    showAlert('Please select at least one file or URL to test', 'warning');
    return;
  }
  
  if (testData.selectedAiJobs.length === 0) {
    showAlert('Please select at least one AI job to test', 'warning');
    return;
  }
  
  // Start test run
  try {
    const response = await fetch('/admin/multimedia-testing/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      currentTestRunId = result.testRunId;
      testStartTime = Date.now();
      
      showAlert(`Test run started successfully! Total tests: ${result.totalTests}`, 'success');
      showTestProgress(testData.name);
      startProgressPolling();
      
      // Disable form during test
      disableForm(true);
      
    } else {
      showAlert(result.error || 'Failed to start test run', 'danger');
    }
    
  } catch (error) {
    console.error('Error starting test run:', error);
    showAlert('Network error occurred while starting test run', 'danger');
  }
}

/**
 * Toggle category selection for files
 */
function toggleCategorySelection(category, checked) {
  const checkboxes = document.querySelectorAll(`input[data-category="${category}"]`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateTestSummary();
}

/**
 * Toggle category selection for URLs
 */
function toggleUrlCategorySelection(platform, checked) {
  const checkboxes = document.querySelectorAll(`input[data-platform="${platform}"]`);
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateTestSummary();
}

/**
 * Toggle all AI jobs selection
 */
function toggleAllAiJobs(checked) {
  const checkboxes = document.querySelectorAll('.ai-job-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = checked;
  });
  updateTestSummary();
}

/**
 * Update test summary counts
 */
function updateTestSummary() {
  const selectedFiles = document.querySelectorAll('input[name="selectedFiles"]:checked').length;
  const selectedUrls = document.querySelectorAll('input[name="selectedUrls"]:checked').length;
  const selectedAiJobs = document.querySelectorAll('input[name="selectedAiJobs"]:checked').length;
  const totalTests = (selectedFiles + selectedUrls) * selectedAiJobs;
  
  document.getElementById('selectedFilesCount').textContent = selectedFiles;
  document.getElementById('selectedUrlsCount').textContent = selectedUrls;
  document.getElementById('selectedAiJobsCount').textContent = selectedAiJobs;
  document.getElementById('totalTestsCount').textContent = totalTests;
  
  // Update button state
  const startButton = document.getElementById('startTestBtn');
  const hasSelections = (selectedFiles > 0 || selectedUrls > 0) && selectedAiJobs > 0;
  startButton.disabled = !hasSelections;
}

/**
 * Show test progress panel
 */
function showTestProgress(testName) {
  const panel = document.getElementById('testProgressPanel');
  panel.style.display = 'block';
  
  document.getElementById('currentTestName').textContent = testName;
  document.getElementById('currentTestStatus').textContent = 'Status: Running';
  document.getElementById('currentTestProgress').textContent = '0';
  document.getElementById('currentTestCompleted').textContent = '0';
  document.getElementById('passedCount').textContent = '0 Passed';
  document.getElementById('failedCount').textContent = '0 Failed';
  document.getElementById('elapsedTime').textContent = '0s';
  
  // Scroll to progress panel
  panel.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Start polling for test progress
 */
function startProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  
  progressInterval = setInterval(async () => {
    if (currentTestRunId) {
      await updateTestProgress();
    }
  }, 2000); // Poll every 2 seconds
}

/**
 * Update test progress
 */
async function updateTestProgress() {
  try {
    const response = await fetch(`/admin/multimedia-testing/status/${currentTestRunId}`);
    const status = await response.json();
    
    if (response.ok) {
      updateProgressDisplay(status);
      
      // Check if test is complete
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(progressInterval);
        progressInterval = null;
        
        // Show completion message
        const message = status.status === 'completed' 
          ? `Test completed! ${status.passed_tests} passed, ${status.failed_tests} failed`
          : `Test failed: ${status.error_message}`;
        
        const alertType = status.status === 'completed' ? 'success' : 'danger';
        showAlert(message, alertType);
        
        // Re-enable form
        disableForm(false);
        
        // Add view results button
        showViewResultsButton(currentTestRunId);
      }
    }
  } catch (error) {
    console.error('Error updating test progress:', error);
  }
}

/**
 * Update progress display
 */
function updateProgressDisplay(status) {
  document.getElementById('currentTestProgress').textContent = status.progress;
  document.getElementById('currentTestCompleted').textContent = status.passed_tests + status.failed_tests;
  document.getElementById('currentTestTotal').textContent = status.total_tests;
  document.getElementById('passedCount').textContent = `${status.passed_tests} Passed`;
  document.getElementById('failedCount').textContent = `${status.failed_tests} Failed`;
  
  // Update progress bar
  const progressBar = document.getElementById('testProgressBar');
  progressBar.style.width = `${status.progress}%`;
  progressBar.setAttribute('aria-valuenow', status.progress);
  progressBar.textContent = `${status.progress}%`;
  
  // Update elapsed time
  if (testStartTime) {
    const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
    document.getElementById('elapsedTime').textContent = `${elapsed}s`;
  }
  
  // Update status
  let statusText = 'Status: Running';
  if (status.status === 'completed') {
    statusText = 'Status: Completed';
  } else if (status.status === 'failed') {
    statusText = 'Status: Failed';
  }
  document.getElementById('currentTestStatus').textContent = statusText;
}

/**
 * Show view results button
 */
function showViewResultsButton(testRunId) {
  const panel = document.getElementById('testProgressPanel');
  const cardBody = panel.querySelector('.card-body');
  
  // Check if button already exists
  if (!cardBody.querySelector('.view-results-btn')) {
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'row mt-3';
    buttonDiv.innerHTML = `
      <div class="col-12 text-center">
        <a href="/admin/multimedia-testing/results/${testRunId}" class="btn btn-primary view-results-btn">
          <i class="fas fa-eye me-2"></i>View Detailed Results
        </a>
      </div>
    `;
    cardBody.appendChild(buttonDiv);
  }
}

/**
 * Disable/enable form during test execution
 */
function disableForm(disabled) {
  const form = document.getElementById('testConfigForm');
  const inputs = form.querySelectorAll('input, button');
  
  inputs.forEach(input => {
    input.disabled = disabled;
  });
}

/**
 * Reset form to initial state
 */
function resetForm() {
  // Clear all checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Reset test name
  const now = new Date();
  const defaultName = `Test Run ${now.toISOString().slice(0, 19).replace('T', ' ')}`;
  document.getElementById('testName').value = defaultName;
  
  // Clear description
  document.getElementById('testDescription').value = '';
  
  // Hide progress panel
  document.getElementById('testProgressPanel').style.display = 'none';
  
  // Clear current test
  currentTestRunId = null;
  testStartTime = null;
  
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  
  // Update summary
  updateTestSummary();
  
  // Re-enable form
  disableForm(false);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll('.alert-temporary');
  existingAlerts.forEach(alert => alert.remove());
  
  // Create new alert
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show alert-temporary`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Insert at top of container
  const container = document.querySelector('.container-fluid');
  container.insertBefore(alert, container.firstChild);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove();
    }
  }, 5000);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (progressInterval) {
    clearInterval(progressInterval);
  }
}); 