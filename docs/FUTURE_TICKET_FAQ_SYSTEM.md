# DaySave Support System - Complete Implementation Plan with Enhanced Diagnostics

## **🎯 Project Overview**

Implement a comprehensive support ticket system with FAQ management and **advanced diagnostic capabilities**, including:
- **Screenshot capture** directly in the browser
- **Session log collection** with error tracking
- **Automatic diagnostic data** attachment to tickets
- **Help Menu (?)** in navbar for all users
- **Admin Dashboard** for support staff management
- **FAQ System** with public view and admin moderation

---

## **🆕 NEW FEATURE: Enhanced Diagnostic Collection**

### **Screenshot Capture System**
- **Browser-based capture** using HTML5 Canvas API or Screen Capture API
- **Annotation tools** for highlighting issues
- **Automatic attachment** to support tickets
- **Privacy controls** with user consent

### **Session Log Collection**
- **JavaScript error tracking** with stack traces
- **Console log capture** (filtered for relevant errors)
- **Network request failures** and API errors
- **Browser/device information** collection
- **User action timeline** leading to the issue

### **Diagnostic Data Package**
- **System information**: Browser, OS, screen resolution
- **DaySave session data**: User role, current page, recent actions
- **Error context**: JavaScript errors, failed requests, console warnings
- **Performance metrics**: Page load times, memory usage
- **User preferences**: Language, settings that might affect the issue

---

## **📋 Phase 1: Database Schema & Models (Week 1)**

### **1.1 Support Tickets Tables**
```sql
-- Support Tickets
CREATE TABLE support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) REFERENCES users(id),
  assigned_to CHAR(36) REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('technical', 'billing', 'feature_request', 'bug_report', 'account', 'general'),
  priority ENUM('low', 'medium', 'high'),
  status ENUM('open', 'in_progress', 'waiting_response', 'resolved', 'closed'),
  attachments JSON, -- File references including screenshots
  diagnostic_data JSON, -- NEW: System info, logs, errors
  session_context JSON, -- NEW: User session data at time of ticket
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Ticket Messages/Responses
CREATE TABLE ticket_messages (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) REFERENCES support_tickets(id),
  user_id CHAR(36) REFERENCES users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSON,
  createdAt TIMESTAMP
);

-- NEW: Diagnostic Attachments
CREATE TABLE ticket_diagnostics (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36) REFERENCES support_tickets(id),
  type ENUM('screenshot', 'session_log', 'error_log', 'system_info'),
  file_path VARCHAR(500), -- For screenshots
  data JSON, -- For logs and system info
  metadata JSON, -- Additional context
  createdAt TIMESTAMP
);
```

### **1.2 FAQ System Tables**
```sql
-- FAQ Categories
CREATE TABLE faq_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- FAQ Items
CREATE TABLE faq_items (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) REFERENCES faq_categories(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags JSON,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  created_by CHAR(36) REFERENCES users(id),
  updated_by CHAR(36) REFERENCES users(id),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- FAQ Sharing - REVISED for all users
CREATE TABLE faq_shares (
  id CHAR(36) PRIMARY KEY,
  faq_item_id CHAR(36) REFERENCES faq_items(id),
  shared_by CHAR(36) REFERENCES users(id), -- Admin/Support user
  shared_to_user_id CHAR(36) REFERENCES users(id), -- ANY system user
  share_method ENUM('email', 'link') DEFAULT 'email',
  message TEXT, -- Personal message from admin
  createdAt TIMESTAMP
);
```

### **1.3 Sequelize Models**
- `models/supportTicket.js` - Enhanced with diagnostic data
- `models/ticketMessage.js`
- `models/ticketDiagnostic.js` - **NEW**
- `models/faqCategory.js`
- `models/faqItem.js`
- `models/faqShare.js`

---

## **🎨 Phase 2: Enhanced User Interface - Help Menu & Diagnostic Tools (Week 1-2)**

### **2.1 Navbar Help Menu**
Update `views/partials/header.ejs`:
```html
<div class="collapse navbar-collapse" id="navbarNav">
  <ul class="navbar-nav me-auto">
    <li class="nav-item">
      <a class="nav-link" href="/about">About</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="/dashboard">Dashboard</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="/content">Content</a>
    </li>
    <li class="nav-item">
      <a class="nav-link" href="/subscription/plans">Plans</a>
    </li>
    <!-- Enhanced Help Dropdown Menu -->
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="#" id="helpDropdown" role="button" 
         data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fas fa-question-circle"></i> Help
      </a>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="/support/faq">
          <i class="fas fa-book me-2"></i>FAQ
        </a></li>
        <li><a class="dropdown-item" href="/support/tickets/new">
          <i class="fas fa-plus me-2"></i>Submit Ticket
        </a></li>
        <li><a class="dropdown-item" href="/support/tickets">
          <i class="fas fa-ticket-alt me-2"></i>My Tickets
        </a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" onclick="captureScreenshotForSupport()">
          <i class="fas fa-camera me-2"></i>Report Issue with Screenshot
        </a></li>
        <li><a class="dropdown-item" href="/support/contact">
          <i class="fas fa-envelope me-2"></i>Contact Support
        </a></li>
      </ul>
    </li>
  </ul>
  <!-- Rest of navbar... -->
</div>
```

### **2.2 Enhanced Ticket Submission Form**
```html
<!-- Enhanced Ticket Submission Form -->
<form id="ticketForm" enctype="multipart/form-data">
  <div class="row">
    <div class="col-md-8">
      <div class="mb-3">
        <label class="form-label">Issue Title</label>
        <input type="text" class="form-control" name="title" required>
      </div>
      
      <div class="mb-3">
        <label class="form-label">Category</label>
        <select class="form-select" name="category" required>
          <option value="">Select Category</option>
          <option value="technical">🔧 Technical Issue</option>
          <option value="billing">💳 Billing Question</option>
          <option value="account">👤 Account Problem</option>
          <option value="feature_request">💡 Feature Request</option>
          <option value="bug_report">🐛 Bug Report</option>
          <option value="general">❓ General Question</option>
        </select>
      </div>
      
      <div class="mb-3">
        <label class="form-label">Priority Level</label>
        <select class="form-select" name="priority" required>
          <option value="">How urgent is this issue?</option>
          <option value="low">🟢 Low - General questions, feature requests</option>
          <option value="medium">🟡 Medium - Account issues, billing questions</option>
          <option value="high">🔴 High - Technical problems, urgent issues</option>
        </select>
        <small class="text-muted">Help us prioritize your request</small>
      </div>
      
      <div class="mb-3">
        <label class="form-label">Description</label>
        <textarea class="form-control" name="description" rows="6" required
                  placeholder="Please describe your issue in detail..."></textarea>
      </div>
    </div>
    
    <!-- NEW: Diagnostic Tools Panel -->
    <div class="col-md-4">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="fas fa-tools me-2"></i>Diagnostic Tools
          </h6>
        </div>
        <div class="card-body">
          <!-- Screenshot Capture -->
          <div class="mb-3">
            <button type="button" class="btn btn-outline-primary w-100" 
                    onclick="captureScreenshot()">
              <i class="fas fa-camera me-2"></i>Capture Screenshot
            </button>
            <small class="text-muted">Take a screenshot to show the issue</small>
            <div id="screenshotPreview" class="mt-2" style="display: none;">
              <img id="screenshotImg" class="img-fluid rounded" style="max-height: 150px;">
              <button type="button" class="btn btn-sm btn-outline-danger mt-1" 
                      onclick="removeScreenshot()">Remove</button>
            </div>
          </div>
          
          <!-- Session Log Collection -->
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="includeSessionLogs" checked>
              <label class="form-check-label" for="includeSessionLogs">
                Include session logs
              </label>
            </div>
            <small class="text-muted">Helps us diagnose technical issues</small>
          </div>
          
          <!-- System Information -->
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="includeSystemInfo" checked>
              <label class="form-check-label" for="includeSystemInfo">
                Include system information
              </label>
            </div>
            <small class="text-muted">Browser, OS, and device details</small>
          </div>
          
          <!-- Diagnostic Summary -->
          <div class="alert alert-info" id="diagnosticSummary" style="display: none;">
            <small>
              <strong>Diagnostic data ready:</strong>
              <ul class="mb-0 mt-1" id="diagnosticList"></ul>
            </small>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- File Attachments -->
  <div class="mb-3">
    <label class="form-label">Additional Files (Optional)</label>
    <input type="file" class="form-control" name="attachments" multiple 
           accept=".jpg,.jpeg,.png,.pdf,.txt,.log">
    <small class="text-muted">Screenshots, logs, or other relevant files</small>
  </div>
  
  <div class="d-flex justify-content-between">
    <button type="button" class="btn btn-secondary" onclick="history.back()">Cancel</button>
    <button type="submit" class="btn btn-primary">
      <i class="fas fa-paper-plane me-2"></i>Submit Ticket
    </button>
  </div>
</form>
```

---

## **🛠️ Phase 3: Diagnostic Collection System (Week 2-3)**

### **3.1 Screenshot Capture JavaScript**
Create `public/js/diagnostic-tools.js`:
```javascript
/**
 * DaySave Diagnostic Tools
 * Screenshot capture and session log collection for support tickets
 */

class DiagnosticTools {
  constructor() {
    this.screenshot = null;
    this.sessionLogs = [];
    this.systemInfo = null;
    this.errorLogs = [];
    
    // Start collecting logs immediately
    this.initializeLogCollection();
    this.collectSystemInfo();
  }
  
  /**
   * Capture screenshot using Screen Capture API or Canvas
   */
  async captureScreenshot() {
    try {
      // Try modern Screen Capture API first
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' }
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          // Convert to blob
          canvas.toBlob((blob) => {
            this.screenshot = blob;
            this.showScreenshotPreview(canvas.toDataURL());
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
          }, 'image/png');
        });
        
      } else {
        // Fallback: Capture current page only
        await this.capturePageScreenshot();
      }
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      this.showScreenshotError('Screenshot capture failed. Please try again or attach a manual screenshot.');
    }
  }
  
  /**
   * Fallback: Capture current page using html2canvas
   */
  async capturePageScreenshot() {
    // Load html2canvas if not already loaded
    if (typeof html2canvas === 'undefined') {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }
    
    const canvas = await html2canvas(document.body, {
      height: window.innerHeight,
      width: window.innerWidth,
      scrollX: 0,
      scrollY: 0
    });
    
    canvas.toBlob((blob) => {
      this.screenshot = blob;
      this.showScreenshotPreview(canvas.toDataURL());
    }, 'image/png');
  }
  
  /**
   * Show screenshot preview in the form
   */
  showScreenshotPreview(dataUrl) {
    const preview = document.getElementById('screenshotPreview');
    const img = document.getElementById('screenshotImg');
    
    img.src = dataUrl;
    preview.style.display = 'block';
    
    this.updateDiagnosticSummary();
  }
  
  /**
   * Remove captured screenshot
   */
  removeScreenshot() {
    this.screenshot = null;
    document.getElementById('screenshotPreview').style.display = 'none';
    this.updateDiagnosticSummary();
  }
  
  /**
   * Initialize session log collection
   */
  initializeLogCollection() {
    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.errorLogs.push({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        timestamp: new Date().toISOString()
      });
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorLogs.push({
        type: 'unhandled_promise_rejection',
        message: event.reason ? event.reason.toString() : 'Unknown promise rejection',
        timestamp: new Date().toISOString()
      });
    });
    
    // Capture console errors (override console.error)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.sessionLogs.push({
        type: 'console_error',
        message: args.join(' '),
        timestamp: new Date().toISOString()
      });
      originalConsoleError.apply(console, args);
    };
    
    // Capture failed network requests
    this.interceptFetchErrors();
  }
  
  /**
   * Intercept and log failed network requests
   */
  interceptFetchErrors() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.sessionLogs.push({
            type: 'network_error',
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
        
        return response;
      } catch (error) {
        this.sessionLogs.push({
          type: 'network_failure',
          url: args[0],
          error: error.message,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  }
  
  /**
   * Collect system information
   */
  collectSystemInfo() {
    this.systemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get current session context
   */
  getSessionContext() {
    return {
      currentPage: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionStorage: this.getRelevantSessionStorage(),
      localStorage: this.getRelevantLocalStorage(),
      recentErrors: this.errorLogs.slice(-10), // Last 10 errors
      recentLogs: this.sessionLogs.slice(-20) // Last 20 log entries
    };
  }
  
  /**
   * Get relevant session storage data (filtered for privacy)
   */
  getRelevantSessionStorage() {
    const relevant = {};
    const allowedKeys = ['theme', 'language', 'lastPage', 'debugMode'];
    
    allowedKeys.forEach(key => {
      if (sessionStorage.getItem(key)) {
        relevant[key] = sessionStorage.getItem(key);
      }
    });
    
    return relevant;
  }
  
  /**
   * Get relevant local storage data (filtered for privacy)
   */
  getRelevantLocalStorage() {
    const relevant = {};
    const allowedKeys = ['theme', 'language', 'preferences'];
    
    allowedKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        relevant[key] = localStorage.getItem(key);
      }
    });
    
    return relevant;
  }
  
  /**
   * Update diagnostic summary display
   */
  updateDiagnosticSummary() {
    const summary = document.getElementById('diagnosticSummary');
    const list = document.getElementById('diagnosticList');
    
    const items = [];
    
    if (this.screenshot) {
      items.push('Screenshot captured');
    }
    
    if (document.getElementById('includeSessionLogs')?.checked) {
      items.push(`${this.sessionLogs.length + this.errorLogs.length} log entries`);
    }
    
    if (document.getElementById('includeSystemInfo')?.checked) {
      items.push('System information');
    }
    
    if (items.length > 0) {
      list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
      summary.style.display = 'block';
    } else {
      summary.style.display = 'none';
    }
  }
  
  /**
   * Prepare diagnostic data for ticket submission
   */
  prepareDiagnosticData() {
    const data = {
      systemInfo: this.systemInfo,
      sessionContext: this.getSessionContext(),
      timestamp: new Date().toISOString()
    };
    
    if (document.getElementById('includeSessionLogs')?.checked) {
      data.sessionLogs = this.sessionLogs;
      data.errorLogs = this.errorLogs;
    }
    
    return data;
  }
  
  /**
   * Load external script dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}

// Initialize diagnostic tools
const diagnosticTools = new DiagnosticTools();

// Global functions for UI interaction
function captureScreenshot() {
  diagnosticTools.captureScreenshot();
}

function removeScreenshot() {
  diagnosticTools.removeScreenshot();
}

function captureScreenshotForSupport() {
  // Quick screenshot capture from help menu
  diagnosticTools.captureScreenshot().then(() => {
    // Redirect to ticket creation with screenshot ready
    window.location.href = '/support/tickets/new?screenshot=ready';
  });
}

// Update diagnostic summary when checkboxes change
document.addEventListener('DOMContentLoaded', () => {
  const checkboxes = ['includeSessionLogs', 'includeSystemInfo'];
  checkboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        diagnosticTools.updateDiagnosticSummary();
      });
    }
  });
});
```

### **3.2 Enhanced Ticket Submission Handler**
```javascript
/**
 * Enhanced ticket submission with diagnostic data
 */
document.getElementById('ticketForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  
  // Add screenshot if captured
  if (diagnosticTools.screenshot) {
    formData.append('screenshot', diagnosticTools.screenshot, 'screenshot.png');
  }
  
  // Add diagnostic data
  const diagnosticData = diagnosticTools.prepareDiagnosticData();
  formData.append('diagnosticData', JSON.stringify(diagnosticData));
  
  // Submit ticket
  try {
    const response = await fetch('/support/tickets', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.json();
      window.location.href = `/support/tickets/${result.ticketId}?created=true`;
    } else {
      throw new Error('Failed to submit ticket');
    }
  } catch (error) {
    console.error('Ticket submission failed:', error);
    alert('Failed to submit ticket. Please try again.');
  }
});
```

---

## **🎫 Phase 4: Enhanced Ticket System Implementation (Week 3-4)**

### **4.1 Routes Structure**
Create `routes/support.js`:
```javascript
// User Routes
router.get('/faq', showPublicFAQ);
router.get('/tickets', isAuthenticated, myTickets);
router.get('/tickets/new', isAuthenticated, newTicketForm);
router.post('/tickets', isAuthenticated, upload.array('attachments'), createTicketWithDiagnostics); // Enhanced
router.get('/tickets/:id', isAuthenticated, viewTicket);
router.post('/tickets/:id/reply', isAuthenticated, replyToTicket);

// Admin Routes
router.get('/admin/tickets', isAuthenticated, requireRole(['admin', 'support', 'manager']), adminTickets);
router.get('/admin/tickets/:id', isAuthenticated, requireRole(['admin', 'support', 'manager']), adminViewTicketWithDiagnostics); // Enhanced
router.post('/admin/tickets/:id/assign', isAuthenticated, requireRole(['admin', 'support', 'manager']), assignTicket);
router.post('/admin/tickets/:id/status', isAuthenticated, requireRole(['admin', 'support', 'manager']), updateTicketStatus);

// FAQ Admin Routes
router.get('/admin/faq', isAuthenticated, requireRole(['admin', 'support', 'manager']), manageFAQ);
router.post('/admin/faq', isAuthenticated, requireRole(['admin', 'support', 'manager']), createFAQItem);
router.put('/admin/faq/:id', isAuthenticated, requireRole(['admin', 'support', 'manager']), updateFAQItem);
router.post('/admin/faq/:id/publish', isAuthenticated, requireRole(['admin', 'support', 'manager']), toggleFAQPublish);
router.post('/admin/faq/:id/share', isAuthenticated, requireRole(['admin', 'support', 'manager']), shareFAQWithUser);

// NEW: Diagnostic Routes
router.get('/tickets/:id/diagnostics', isAuthenticated, viewTicketDiagnostics);
router.get('/admin/tickets/:id/diagnostics', isAuthenticated, requireRole(['admin', 'support', 'manager']), viewFullDiagnostics);
```

### **4.2 Enhanced Ticket Creation Controller**
```javascript
/**
 * Create ticket with enhanced diagnostic data
 */
async function createTicketWithDiagnostics(req, res) {
  try {
    const { title, description, category, priority } = req.body;
    const userId = req.user.id;
    
    // Parse diagnostic data
    let diagnosticData = {};
    let sessionContext = {};
    
    if (req.body.diagnosticData) {
      const parsed = JSON.parse(req.body.diagnosticData);
      diagnosticData = parsed;
      sessionContext = parsed.sessionContext || {};
    }
    
    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        });
      }
    }
    
    // Create ticket
    const ticket = await SupportTicket.create({
      id: uuidv4(),
      user_id: userId,
      title,
      description,
      category,
      priority,
      status: 'open',
      attachments: attachments,
      diagnostic_data: diagnosticData,
      session_context: sessionContext
    });
    
    // Save diagnostic details separately for better querying
    if (diagnosticData.errorLogs && diagnosticData.errorLogs.length > 0) {
      await TicketDiagnostic.create({
        id: uuidv4(),
        ticket_id: ticket.id,
        type: 'error_log',
        data: diagnosticData.errorLogs,
        metadata: { count: diagnosticData.errorLogs.length }
      });
    }
    
    if (diagnosticData.sessionLogs && diagnosticData.sessionLogs.length > 0) {
      await TicketDiagnostic.create({
        id: uuidv4(),
        ticket_id: ticket.id,
        type: 'session_log',
        data: diagnosticData.sessionLogs,
        metadata: { count: diagnosticData.sessionLogs.length }
      });
    }
    
    if (diagnosticData.systemInfo) {
      await TicketDiagnostic.create({
        id: uuidv4(),
        ticket_id: ticket.id,
        type: 'system_info',
        data: diagnosticData.systemInfo,
        metadata: { 
          browser: diagnosticData.systemInfo.userAgent,
          platform: diagnosticData.systemInfo.platform
        }
      });
    }
    
    // Send confirmation email
    await sendTicketConfirmationEmail(req.user, ticket);
    
    // Notify support team for high priority tickets
    if (priority === 'high') {
      await notifySupportTeam(ticket);
    }
    
    res.json({
      success: true,
      ticketId: ticket.id,
      message: 'Ticket created successfully with diagnostic data'
    });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket'
    });
  }
}
```

---

## **📚 Phase 5: FAQ System with Enhanced Sharing (Week 4-5)**

### **5.1 FAQ Sharing Interface - Admin View**
```html
<!-- Enhanced FAQ Management with User Sharing -->
<div class="card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="mb-0">FAQ Management</h5>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createFAQModal">
      <i class="fas fa-plus me-2"></i>Create FAQ
    </button>
  </div>
  <div class="card-body">
    <!-- FAQ Items List -->
    <div class="row">
      <% faqItems.forEach(faq => { %>
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card faq-admin-card">
          <div class="card-body">
            <h6 class="card-title"><%= faq.title %></h6>
            <p class="card-text text-muted small">
              <%= faq.content.substring(0, 100) %>...
            </p>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <span class="badge bg-<%= faq.is_published ? 'success' : 'secondary' %>">
                  <%= faq.is_published ? 'Published' : 'Draft' %>
                </span>
                <small class="text-muted ms-2">👁️ <%= faq.view_count %></small>
              </div>
              <div class="btn-group" role="group">
                <button class="btn btn-sm btn-outline-primary" 
                        onclick="editFAQ('<%= faq.id %>')">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-success" 
                        onclick="shareFAQModal('<%= faq.id %>', '<%= faq.title %>')">
                  <i class="fas fa-share"></i>
                </button>
                <button class="btn btn-sm btn-outline-<%= faq.is_published ? 'warning' : 'success' %>" 
                        onclick="togglePublish('<%= faq.id %>', <%= faq.is_published %>)">
                  <i class="fas fa-<%= faq.is_published ? 'eye-slash' : 'eye' %>"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <% }); %>
    </div>
  </div>
</div>

<!-- Enhanced FAQ Sharing Modal -->
<div class="modal fade" id="shareFAQModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="fas fa-share me-2"></i>Share FAQ with User
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="col-md-8">
            <div class="mb-3">
              <label class="form-label">Select User</label>
              <select class="form-select" id="userSelect" data-live-search="true">
                <option value="">Search all registered users...</option>
                <!-- Populated via AJAX with all system users -->
              </select>
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                You can share with any registered user in the system
              </small>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Personal Message (Optional)</label>
              <textarea class="form-control" id="shareMessage" rows="4" 
                        placeholder="Hi [User], I thought this FAQ might help answer your question about..."></textarea>
            </div>
            
            <div class="mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="followUpEnabled">
                <label class="form-check-label" for="followUpEnabled">
                  Request feedback on FAQ helpfulness
                </label>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card bg-light">
              <div class="card-body">
                <h6 class="card-title">FAQ Preview</h6>
                <p class="card-text">
                  <strong id="faqTitlePreview"></strong>
                </p>
                <p class="card-text small text-muted" id="faqContentPreview"></p>
                <div class="mt-2">
                  <small class="text-muted">
                    <i class="fas fa-eye me-1"></i><span id="faqViewCount"></span> views
                    <br>
                    <i class="fas fa-thumbs-up me-1"></i><span id="faqHelpfulCount"></span> helpful votes
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="sendFAQBtn">
          <i class="fas fa-paper-plane me-2"></i>Send FAQ
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## **🔐 Enhanced Security & Permissions**

### **RBAC Integration - Updated**
```javascript
// Enhanced Support Permissions
const supportPermissions = {
  'support.view_tickets': 'View own tickets',
  'support.create_tickets': 'Submit new tickets',
  'support.manage_tickets': 'Admin ticket management',
  'support.manage_faq': 'FAQ administration',
  'support.share_faq_all_users': 'Share FAQ with any system user',
  'support.view_diagnostics': 'View diagnostic data in tickets', // NEW
  'support.capture_diagnostics': 'Capture screenshots and logs' // NEW
};

// Role Assignments - UPDATED
const rolePermissions = {
  admin: [
    'support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users',
    'support.view_diagnostics', 'support.capture_diagnostics'
  ],
  manager: [
    'support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users',
    'support.view_diagnostics', 'support.capture_diagnostics'
  ],
  support: [
    'support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users',
    'support.view_diagnostics', 'support.capture_diagnostics'
  ],
  user: [
    'support.view_tickets', 'support.create_tickets', 'support.capture_diagnostics'
  ],
  // ... other roles get basic ticket access + diagnostic capture
};
```

### **Privacy & Data Protection**
- **Screenshot Privacy**: User consent required before capture
- **Log Filtering**: Only relevant, non-sensitive data collected
- **Data Retention**: Diagnostic data purged after ticket resolution + 30 days
- **Access Control**: Diagnostic data only visible to ticket owner and support staff

---

## **📊 Success Metrics - Enhanced**

### **Diagnostic Effectiveness**
- **Issue Resolution Speed**: Faster resolution with diagnostic data
- **First Contact Resolution**: Percentage resolved without back-and-forth
- **Screenshot Usage**: How often screenshots help identify issues
- **Log Analysis Impact**: Technical issues resolved using session logs

### **User Experience**
- **Diagnostic Adoption**: Percentage of tickets with diagnostic data
- **User Satisfaction**: Feedback on diagnostic tools helpfulness
- **Support Efficiency**: Reduced time to understand and resolve issues

---

## **🚀 Implementation Timeline - REVISED**

### **Week 1: Foundation & Diagnostic Infrastructure**
- ✅ Database schema with diagnostic tables
- ✅ Basic models and associations
- ✅ Navbar help menu implementation
- ✅ Screenshot capture system (basic)

### **Week 2: Enhanced Diagnostic Tools**
- ✅ Session log collection system
- ✅ System information gathering
- ✅ Enhanced ticket submission form
- ✅ Diagnostic data processing backend

### **Week 3: Core Ticketing with Diagnostics**
- ✅ User ticket submission with diagnostic attachment
- ✅ "My Tickets" interface with diagnostic preview
- ✅ Admin ticket queue with diagnostic indicators
- ✅ Email notifications

### **Week 4: FAQ System & Advanced Sharing**
- ✅ Public FAQ with categories and search
- ✅ Admin FAQ management interface
- ✅ **ALL USERS** selection for FAQ sharing
- ✅ Email templates for FAQ sharing

### **Week 5: Polish, Testing & Analytics**
- ✅ Mobile optimization for diagnostic tools
- ✅ Performance testing with large diagnostic datasets
- ✅ Privacy compliance validation
- ✅ Analytics dashboard for diagnostic effectiveness

---

## **🎯 Key Features - FINAL SPECIFICATION**

### **1. Enhanced Help Menu (?)**
```
Help ▼
├── 📖 FAQ
├── ➕ Submit Ticket
├── 🎫 My Tickets
├── 📸 Report Issue with Screenshot (NEW)
└── ✉️ Contact Support
```

### **2. Diagnostic Collection System**
- **Screenshot Capture**: Browser-based with annotation tools
- **Session Log Collection**: JavaScript errors, network failures, console logs
- **System Information**: Browser, OS, device, performance metrics
- **Privacy Controls**: User consent and data filtering

### **3. Enhanced Ticket Interface**
- **Diagnostic Panel**: Screenshot capture, log collection toggles
- **Visual Feedback**: Preview of captured data before submission
- **Smart Defaults**: Automatic inclusion of relevant diagnostic data
- **File Attachments**: Traditional file uploads + diagnostic data

### **4. Admin Diagnostic View**
- **Diagnostic Dashboard**: Visual representation of collected data
- **Error Analysis**: Grouped and categorized error logs
- **System Context**: Complete picture of user's environment
- **Resolution Tracking**: Link diagnostic data to resolution methods

---

This enhanced plan provides a comprehensive support system with advanced diagnostic capabilities that will significantly improve issue resolution speed and accuracy while maintaining user privacy and system security.

**Ready to begin implementation?** The diagnostic tools will transform your support experience from reactive to proactive! 🚀
