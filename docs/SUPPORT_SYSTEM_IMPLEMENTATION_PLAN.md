# DaySave Support System - Complete Implementation Plan

## **🎯 Project Overview**

Implement a comprehensive support ticket system with FAQ management, accessible through:
- **Help Menu (?)** in navbar for all users
- **Admin Dashboard** for support staff management
- **FAQ System** with public view and admin moderation

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
  priority ENUM('low', 'medium', 'high', 'urgent'),
  status ENUM('open', 'in_progress', 'waiting_response', 'resolved', 'closed'),
  attachments JSON,
  metadata JSON, -- Browser info, error context
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

-- FAQ Sharing Log
CREATE TABLE faq_shares (
  id CHAR(36) PRIMARY KEY,
  faq_item_id CHAR(36) REFERENCES faq_items(id),
  shared_by CHAR(36) REFERENCES users(id),
  contact_id CHAR(36) REFERENCES contacts(id),
  share_method ENUM('email', 'link'),
  message TEXT,
  createdAt TIMESTAMP
);
```

### **1.3 Sequelize Models**
- `models/supportTicket.js`
- `models/ticketMessage.js`
- `models/faqCategory.js`
- `models/faqItem.js`
- `models/faqShare.js`

### **1.4 Database Migrations**
- `migrations/20250822000001-create-support-tickets.js`
- `migrations/20250822000002-create-ticket-messages.js`
- `migrations/20250822000003-create-faq-categories.js`
- `migrations/20250822000004-create-faq-items.js`
- `migrations/20250822000005-create-faq-shares.js`

---

## **🎨 Phase 2: User Interface - Help Menu & Navigation (Week 1)**

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
    <!-- Help Dropdown Menu -->
    <li class="nav-item dropdown">
      <a class="nav-link dropdown-toggle" href="#" id="helpDropdown" role="button" 
         data-bs-toggle="dropdown" aria-expanded="false">
        <i class="fas fa-question-circle"></i> Help
      </a>
      <ul class="dropdown-menu" aria-labelledby="helpDropdown">
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
        <li><a class="dropdown-item" href="/support/contact">
          <i class="fas fa-envelope me-2"></i>Contact Support
        </a></li>
      </ul>
    </li>
  </ul>
  <!-- Rest of navbar... -->
</div>
```

### **2.2 Dashboard Support Card Update**
Update dashboard to show different links for admins vs users:
```html
<!-- Support Tickets (Updated) -->
<% if (user.Role.name === 'admin' || user.Role.name === 'support' || user.Role.name === 'manager') { %>
<div class="col-12 col-md-6 col-lg-3">
  <div class="card dashboard-card h-100 text-center">
    <div class="dashboard-icon info">
      <i class="fas fa-headset"></i>
    </div>
    <h5 class="card-title">Support Management</h5>
    <p class="card-text">Manage tickets, FAQ, and customer support</p>
    <div class="d-grid gap-2">
      <a href="/support/admin/tickets" class="btn btn-info btn-sm">All Tickets</a>
      <a href="/support/admin/faq" class="btn btn-outline-info btn-sm">Manage FAQ</a>
    </div>
  </div>
</div>
<% } %>
```

---

## **🎫 Phase 3: Ticket System Implementation (Week 2)**

### **3.1 Routes Structure**
Create `routes/support.js`:
```javascript
// User Routes
router.get('/faq', showPublicFAQ);                    // Public FAQ
router.get('/tickets', isAuthenticated, myTickets);   // My Tickets
router.get('/tickets/new', isAuthenticated, newTicketForm);
router.post('/tickets', isAuthenticated, createTicket);
router.get('/tickets/:id', isAuthenticated, viewTicket);
router.post('/tickets/:id/reply', isAuthenticated, replyToTicket);

// Admin Routes
router.get('/admin/tickets', isAuthenticated, requireRole(['admin', 'support', 'manager']), adminTickets);
router.get('/admin/tickets/:id', isAuthenticated, requireRole(['admin', 'support', 'manager']), adminViewTicket);
router.post('/admin/tickets/:id/assign', isAuthenticated, requireRole(['admin', 'support', 'manager']), assignTicket);
router.post('/admin/tickets/:id/status', isAuthenticated, requireRole(['admin', 'support', 'manager']), updateTicketStatus);

// FAQ Admin Routes
router.get('/admin/faq', isAuthenticated, requireRole(['admin', 'support', 'manager']), manageFAQ);
router.post('/admin/faq', isAuthenticated, requireRole(['admin', 'support', 'manager']), createFAQItem);
router.put('/admin/faq/:id', isAuthenticated, requireRole(['admin', 'support', 'manager']), updateFAQItem);
router.post('/admin/faq/:id/publish', isAuthenticated, requireRole(['admin', 'support', 'manager']), toggleFAQPublish);
router.post('/admin/faq/:id/share', isAuthenticated, requireRole(['admin', 'support', 'manager']), shareFAQWithContact);
```

### **3.2 View Templates**

#### **User Views:**
- `views/support/faq.ejs` - Public FAQ with search and categories
- `views/support/tickets/index.ejs` - My Tickets list
- `views/support/tickets/new.ejs` - Submit new ticket form
- `views/support/tickets/view.ejs` - View ticket conversation

#### **Admin Views:**
- `views/support/admin/tickets.ejs` - All tickets management
- `views/support/admin/ticket-detail.ejs` - Admin ticket view with assignment
- `views/support/admin/faq.ejs` - FAQ management interface
- `views/support/admin/faq-editor.ejs` - FAQ item editor

### **3.3 Key Features**

#### **Ticket Submission Form:**
- Category selection (Technical, Billing, Feature Request, etc.)
- Priority selection
- File attachments
- Auto-capture browser/system info
- Rich text description

#### **My Tickets View:**
- Status-based filtering
- Search functionality
- Card-style layout matching DaySave design
- Real-time status updates

#### **Admin Ticket Management:**
- Queue view with filters (status, priority, assigned agent)
- Bulk actions (assign, close, priority change)
- Internal notes vs customer-facing responses
- SLA tracking and overdue alerts

---

## **📚 Phase 4: FAQ System (Week 3)**

### **4.1 Public FAQ Interface**
- **Card-based layout** matching DaySave design
- **Category filtering** with collapsible sections
- **Search functionality** with highlighting
- **Helpful voting** system
- **Related articles** suggestions

### **4.2 Admin FAQ Management**
- **WYSIWYG editor** for FAQ content
- **Category management** with drag-and-drop ordering
- **Publish/Unpublish** toggle with preview
- **Analytics**: view counts, helpful votes, search terms
- **Bulk operations**: publish multiple, category changes

### **4.3 FAQ Sharing System**
- **Contact integration**: Select from user's contacts
- **Email templates**: Professional FAQ sharing emails
- **Share tracking**: Log who shared what to whom
- **Link generation**: Direct links to specific FAQ items

#### **FAQ Sharing Interface:**
```html
<!-- Share FAQ Modal -->
<div class="modal fade" id="shareFAQModal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Share FAQ with Contact</h5>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Select Contact</label>
          <select class="form-select" id="contactSelect">
            <!-- Populated from user's contacts -->
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Personal Message (Optional)</label>
          <textarea class="form-control" rows="3" placeholder="Add a personal note..."></textarea>
        </div>
        <div class="alert alert-info">
          <strong>FAQ Item:</strong> <span id="faqTitle"></span>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" id="sendFAQBtn">Send FAQ</button>
      </div>
    </div>
  </div>
</div>
```

---

## **🔧 Phase 5: Advanced Features (Week 4)**

### **5.1 Email Integration**
- **Ticket notifications**: Status changes, new responses
- **FAQ sharing emails**: Professional templates with branding
- **Auto-responders**: Ticket confirmation emails
- **Email-to-ticket**: Create tickets from emails (future enhancement)

### **5.2 Search & Analytics**
- **Global search**: Across tickets and FAQ
- **FAQ analytics**: Popular articles, search terms, gaps
- **Ticket metrics**: Response times, resolution rates, satisfaction
- **Agent performance**: Tickets handled, response times

### **5.3 Mobile Optimization**
- **Responsive design** for all support interfaces
- **Touch-friendly** ticket submission
- **Mobile FAQ** with swipe navigation
- **Push notifications** for ticket updates (future)

---

## **🎨 UI/UX Design Specifications**

### **Design Consistency**
- **Card-based layouts** matching existing DaySave style
- **Bootstrap 5** components and utilities
- **FontAwesome icons** for consistency
- **Color scheme**: Match dashboard (primary, success, warning, danger, info)
- **Typography**: Same fonts and sizing as main app

### **FAQ Card Design**
```html
<div class="card faq-card mb-3">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h6 class="mb-0">
      <button class="btn btn-link text-start" data-bs-toggle="collapse" data-bs-target="#faq-1">
        How do I upload files to DaySave?
      </button>
    </h6>
    <div class="faq-meta">
      <span class="badge bg-primary">Getting Started</span>
      <small class="text-muted ms-2">👍 15</small>
    </div>
  </div>
  <div id="faq-1" class="collapse">
    <div class="card-body">
      <p>To upload files to DaySave...</p>
      <div class="faq-actions mt-3">
        <button class="btn btn-sm btn-outline-success me-2">
          <i class="fas fa-thumbs-up"></i> Helpful
        </button>
        <button class="btn btn-sm btn-outline-primary me-2">
          <i class="fas fa-share"></i> Share
        </button>
        <small class="text-muted">Last updated: 2 days ago</small>
      </div>
    </div>
  </div>
</div>
```

---

## **🔐 Security & Permissions**

### **RBAC Integration**
- **New Permissions**:
  - `support.view_tickets` - View own tickets
  - `support.create_tickets` - Submit new tickets
  - `support.manage_tickets` - Admin ticket management
  - `support.manage_faq` - FAQ administration
  - `support.share_faq` - Share FAQ with contacts

### **Data Security**
- **Ticket privacy**: Users only see their own tickets
- **File upload security**: Virus scanning, type validation
- **Input sanitization**: XSS protection for ticket content
- **Audit logging**: All support actions logged

---

## **📊 Success Metrics**

### **User Experience**
- **Ticket resolution time**: Target < 24 hours for standard issues
- **FAQ usage**: Reduce ticket volume by 30% through self-service
- **User satisfaction**: Post-resolution surveys
- **Search success**: FAQ search result relevance

### **Admin Efficiency**
- **Agent productivity**: Tickets handled per hour
- **FAQ effectiveness**: Most viewed/shared articles
- **Response time**: First response within 2 hours
- **Knowledge base growth**: FAQ articles added monthly

---

## **🚀 Implementation Timeline**

### **Week 1: Foundation**
- Database schema and migrations
- Basic models and associations
- Navbar help menu implementation
- Dashboard card updates

### **Week 2: Core Ticketing**
- User ticket submission and viewing
- Basic admin ticket management
- Email notifications
- File attachment handling

### **Week 3: FAQ System**
- Public FAQ interface
- Admin FAQ management
- Category system
- Search functionality

### **Week 4: Advanced Features**
- FAQ sharing with contacts
- Analytics and reporting
- Mobile optimization
- Performance optimization

### **Week 5: Testing & Polish**
- Comprehensive testing
- UI/UX refinements
- Documentation updates
- Performance monitoring

---

## **📋 Next Steps**

1. **Review and approve** this implementation plan
2. **Create database backup** before starting
3. **Set up development branch** for support system
4. **Begin Phase 1** with database schema
5. **Regular progress reviews** after each phase

---

## **📝 REVISED PLAN - Key Updates Based on Feedback**

### **✅ Confirmed Requirements:**
1. **FAQ Categories**: Standard categories (Getting Started, Account Management, Technical Issues, Billing)
2. **No Live Chat**: Focus on ticket system and FAQ for now
3. **User Priority Selection**: Dropdown with 3 priority levels (Low, Medium, High)
4. **FAQ Sharing Correction**: Admin/Support can share FAQs to ANY user (not just contacts)
5. **Manager Permissions**: Full FAQ control + ticket management

### **🔄 Key Changes Made:**

#### **FAQ Sharing System - REVISED**
- **Admin/Support Access**: Can see ALL users in the system for FAQ sharing
- **User Selection**: Dropdown/search of all registered users (not just contacts)
- **Permission-Based**: Only admin/support/manager roles can share FAQs
- **Email Integration**: Send FAQ links directly to any user's email

#### **Priority System - SIMPLIFIED**
```html
<select class="form-select" name="priority" required>
  <option value="">Select Priority</option>
  <option value="low">Low - General questions</option>
  <option value="medium">Medium - Account issues</option>
  <option value="high">High - Technical problems</option>
</select>
```

#### **Updated Database Schema**
```sql
-- FAQ Sharing - REVISED
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

#### **Updated FAQ Sharing Interface**
```html
<!-- Share FAQ Modal - REVISED -->
<div class="modal fade" id="shareFAQModal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Share FAQ with User</h5>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Select User</label>
          <select class="form-select" id="userSelect" data-bs-toggle="tooltip" 
                  title="Search all registered users">
            <option value="">Search users...</option>
            <!-- Populated with ALL system users -->
          </select>
          <small class="text-muted">You can share with any registered user</small>
        </div>
        <div class="mb-3">
          <label class="form-label">Personal Message (Optional)</label>
          <textarea class="form-control" rows="3" 
                    placeholder="Hi [User], I thought this FAQ might help with your question..."></textarea>
        </div>
        <div class="alert alert-info">
          <strong>FAQ Item:</strong> <span id="faqTitle"></span>
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

#### **Updated Permissions**
```javascript
// REVISED Support Permissions
const supportPermissions = {
  'support.view_tickets': 'View own tickets',
  'support.create_tickets': 'Submit new tickets', 
  'support.manage_tickets': 'Admin ticket management',
  'support.manage_faq': 'FAQ administration',
  'support.share_faq_all_users': 'Share FAQ with any system user' // NEW
};

// Role Assignments - UPDATED
const rolePermissions = {
  admin: ['support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users'],
  manager: ['support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users'], 
  support: ['support.manage_tickets', 'support.manage_faq', 'support.share_faq_all_users'],
  user: ['support.view_tickets', 'support.create_tickets'],
  // ... other roles
};
```

---

## **🚀 REVISED Implementation Timeline**

### **Week 1: Foundation & Navigation**
- ✅ Database schema with revised FAQ sharing
- ✅ Models with proper user relationships
- ✅ Navbar help menu (? dropdown)
- ✅ Dashboard card updates

### **Week 2: Core Ticketing System**
- ✅ User ticket submission with 3-priority dropdown
- ✅ "My Tickets" interface
- ✅ Basic admin ticket queue
- ✅ Email notifications

### **Week 3: FAQ System**
- ✅ Public FAQ with categories
- ✅ Admin FAQ management interface
- ✅ Publish/unpublish functionality
- ✅ Search and filtering

### **Week 4: Advanced FAQ Sharing**
- ✅ **ALL USERS** dropdown for FAQ sharing
- ✅ Admin/Support can share to any registered user
- ✅ Email templates for FAQ sharing
- ✅ Sharing history and analytics

### **Week 5: Polish & Testing**
- ✅ Mobile optimization
- ✅ Performance testing
- ✅ RBAC validation
- ✅ Documentation updates

---

## **🎯 Key Features - FINAL SPECIFICATION**

### **1. Help Menu (?)**
```html
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
  </ul>
</li>
```

### **2. Priority Selection - User Friendly**
```html
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
```

### **3. FAQ Sharing - Admin Power**
- **User Database Access**: Admin/Support see ALL registered users
- **Smart Search**: Type-ahead search through all users
- **Email Integration**: Direct email with FAQ link + personal message
- **Tracking**: Log who shared what to whom

### **4. Manager Role - Full Access**
- ✅ All ticket management capabilities
- ✅ Full FAQ administration (create, edit, publish, share)
- ✅ User management for FAQ sharing
- ✅ Analytics and reporting access

---

## **📊 Updated Success Metrics**

### **FAQ Sharing Effectiveness**
- **Admin Usage**: How often admin/support share FAQs
- **User Engagement**: Click-through rates on shared FAQs
- **Ticket Reduction**: Decrease in tickets after FAQ sharing
- **User Satisfaction**: Feedback on shared FAQ helpfulness

### **Priority System Success**
- **Accurate Prioritization**: Users selecting appropriate priorities
- **Response Time Improvement**: Faster handling of high-priority tickets
- **Admin Efficiency**: Better ticket queue management

---

This revised plan addresses all your requirements:
- ✅ Standard FAQ categories
- ✅ No live chat complexity
- ✅ Simple 3-priority dropdown
- ✅ Admin/Support can share FAQs to ANY user
- ✅ Manager has full permissions

**Ready to begin implementation?** I can start with Phase 1 (database schema and navbar help menu) immediately!
