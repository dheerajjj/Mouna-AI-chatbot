const express = require('express');
const path = require('path');
const TenantSettings = require('../models/TenantSettings');
const { authenticateToken } = require('./auth');
const router = express.Router();

/**
 * TEST ROUTE: Tenant Settings Dashboard Page (No Auth)
 * For development and testing purposes
 */
router.get('/test-dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tenant Settings - Mouna AI (Test)</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
                padding: 2rem;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                background: rgba(255, 255, 255, 0.95);
                padding: 2rem;
                border-radius: 12px;
                margin-bottom: 2rem;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .header h1 {
                color: #667eea;
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }
            
            .header p {
                color: #666;
                font-size: 1.1rem;
            }
            
            .card {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .card h2 {
                color: #333;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .status {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
            }
            
            .status.success {
                background: #d4edda;
                color: #155724;
            }
            
            .status.warning {
                background: #fff3cd;
                color: #856404;
            }
            
            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }
            
            .feature-card {
                background: #f8f9ff;
                border: 2px solid #e1e5e9;
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                transition: all 0.3s;
            }
            
            .feature-card:hover {
                border-color: #667eea;
                transform: translateY(-2px);
            }
            
            .feature-icon {
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }
            
            .feature-title {
                font-size: 1.2rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: #333;
            }
            
            .feature-desc {
                color: #666;
                font-size: 0.9rem;
            }
            
            .btn {
                display: inline-block;
                padding: 0.75rem 2rem;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 0.5rem;
                transition: all 0.3s;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .code-block {
                background: #2d3748;
                color: #e2e8f0;
                padding: 1.5rem;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                overflow-x: auto;
                margin: 1rem 0;
            }
            
            .highlight {
                background: #667eea;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 Tenant Configuration Dashboard</h1>
                <p>Multi-tenant chatbot management system - <span class="highlight">TEST MODE</span></p>
            </div>
            
            <div class="card">
                <h2>🚀 System Status</h2>
                <p>Tenant system is <span class="status success">ACTIVE</span></p>
                <p>Database: <span class="status success">MongoDB Connected</span></p>
                <p>Widget Integration: <span class="status success">Ready</span></p>
            </div>
            
            <div class="card">
                <h2>✨ Available Features</h2>
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📋</div>
                        <div class="feature-title">Bookings</div>
                        <div class="feature-desc">Appointment scheduling system</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🛒</div>
                        <div class="feature-title">Orders</div>
                        <div class="feature-desc">Order tracking & management</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">⏰</div>
                        <div class="feature-title">Time Slots</div>
                        <div class="feature-desc">Available time slot management</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">💳</div>
                        <div class="feature-title">Payments</div>
                        <div class="feature-desc">Payment processing integration</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <div class="feature-title">Analytics</div>
                        <div class="feature-desc">Usage tracking & reporting</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🎨</div>
                        <div class="feature-title">Custom Branding</div>
                        <div class="feature-desc">Colors, messages, themes</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2>🧪 Test Integration</h2>
                <p>Use this code to test the tenant-based widget on your website:</p>
                <div class="code-block">
&lt;script&gt;<br>
(function() {<br>
&nbsp;&nbsp;&nbsp;&nbsp;var script = document.createElement('script');<br>
&nbsp;&nbsp;&nbsp;&nbsp;script.src = 'http://localhost:3000/widget-fixed.js';<br>
&nbsp;&nbsp;&nbsp;&nbsp;script.setAttribute('data-api-key', 'test-api-key-123');<br>
&nbsp;&nbsp;&nbsp;&nbsp;script.setAttribute('data-tenant-id', 'tenant_test_123456'); // Optional<br>
&nbsp;&nbsp;&nbsp;&nbsp;script.async = true;<br>
&nbsp;&nbsp;&nbsp;&nbsp;document.head.appendChild(script);<br>
})();<br>
&lt;/script&gt;
                </div>
            </div>
            
            <div class="card">
                <h2>🔗 Quick Links</h2>
                <a href="/api/test-tenant/status" class="btn">System Status API</a>
                <a href="/api/test-tenant/create-test-tenant" class="btn">Create Test Tenant</a>
                <a href="/health" class="btn">Health Check</a>
                <a href="/widget-test" class="btn">Widget Test Page</a>
            </div>
            
            <div class="card">
                <h2>📋 How It Works</h2>
                <ol style="line-height: 1.8; color: #555;">
                    <li><strong>Create Tenant:</strong> Each client gets a unique tenant configuration</li>
                    <li><strong>Configure Features:</strong> Enable/disable features per tenant (bookings, orders, etc.)</li>
                    <li><strong>Custom Branding:</strong> Set colors, messages, and branding per tenant</li>
                    <li><strong>Widget Integration:</strong> Add tenant ID to widget script for automatic configuration</li>
                    <li><strong>Isolated Experience:</strong> Each tenant has completely separate settings and analytics</li>
                </ol>
            </div>
        </div>
    </body>
    </html>
  `);
});

/**
 * PROTECTED ROUTE: Tenant Settings Dashboard Page
 * Serves the tenant configuration management interface
 */
router.get('/dashboard', authenticateToken, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tenant Settings - Mouna AI</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            
            .header {
                background: rgba(255, 255, 255, 0.95);
                padding: 1rem 2rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header h1 {
                color: #667eea;
                font-size: 1.5rem;
            }
            
            .user-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .container {
                max-width: 1200px;
                margin: 2rem auto;
                padding: 0 1rem;
            }
            
            .card {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                margin-bottom: 2rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            
            .card h2 {
                color: #333;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .icon {
                font-size: 1.2rem;
            }
            
            .form-group {
                margin-bottom: 1.5rem;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #555;
            }
            
            .form-control {
                width: 100%;
                padding: 0.75rem;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                font-size: 1rem;
                transition: border-color 0.3s;
            }
            
            .form-control:focus {
                outline: none;
                border-color: #667eea;
            }
            
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }
            
            .checkbox-group {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }
            
            .checkbox-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: #f8f9ff;
                border-radius: 8px;
                border: 2px solid #e1e5e9;
                transition: all 0.3s;
                cursor: pointer;
            }
            
            .checkbox-item:hover {
                border-color: #667eea;
                background: #f0f4ff;
            }
            
            .checkbox-item input[type="checkbox"] {
                width: 20px;
                height: 20px;
                accent-color: #667eea;
            }
            
            .btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
            
            .btn-danger {
                background: #dc3545;
                color: white;
            }
            
            .tenant-list {
                display: grid;
                gap: 1rem;
            }
            
            .tenant-item {
                background: #f8f9ff;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                padding: 1.5rem;
                transition: all 0.3s;
            }
            
            .tenant-item:hover {
                border-color: #667eea;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .tenant-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }
            
            .tenant-name {
                font-size: 1.2rem;
                font-weight: 600;
                color: #333;
            }
            
            .tenant-id {
                font-family: monospace;
                background: #e1e5e9;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.85rem;
            }
            
            .feature-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-bottom: 1rem;
            }
            
            .feature-tag {
                background: #28a745;
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                font-size: 0.85rem;
            }
            
            .feature-tag.disabled {
                background: #6c757d;
            }
            
            .alert {
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
            }
            
            .alert-success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            
            .alert-error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            
            .loading {
                text-align: center;
                padding: 2rem;
            }
            
            .spinner {
                display: inline-block;
                width: 2rem;
                height: 2rem;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 1000;
            }
            
            .modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
            }
            
            @media (max-width: 768px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
                
                .checkbox-group {
                    grid-template-columns: 1fr;
                }
                
                .container {
                    padding: 0 0.5rem;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 Mouna AI - Tenant Settings</h1>
            <div class="user-info">
                <span id="userEmail">Loading...</span>
                <button class="btn btn-secondary" onclick="logout()">Logout</button>
            </div>
        </div>
        
        <div class="container">
            <!-- Alert Messages -->
            <div id="alertContainer"></div>
            
            <!-- Existing Tenants -->
            <div class="card">
                <h2><span class="icon">🏢</span> Your Tenant Configurations</h2>
                <div id="tenantList" class="tenant-list">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading tenant configurations...</p>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="openCreateTenantModal()">
                    <span>+</span> Create New Tenant
                </button>
            </div>
            
            <!-- Usage Instructions -->
            <div class="card">
                <h2><span class="icon">📖</span> How to Integrate</h2>
                <p>Once you've configured your tenant settings, use this script tag to embed the chatbot on your website:</p>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-family: monospace; overflow-x: auto;">
                    <code id="integrationCode">&lt;script 
  src="https://your-domain.com/widget-fixed.js"
  data-api-key="your_api_key_here"
  data-tenant-id="your_tenant_id_here"
  data-api-url="https://your-domain.com"&gt;&lt;/script&gt;</code>
                </div>
                <p><strong>Note:</strong> Replace <code>your_api_key_here</code> with your actual API key and <code>your_tenant_id_here</code> with the tenant ID from your configuration.</p>
            </div>
        </div>
        
        <!-- Create/Edit Tenant Modal -->
        <div id="tenantModal" class="modal">
            <div class="modal-content">
                <button class="close" onclick="closeTenantModal()">&times;</button>
                <h2 id="modalTitle">Create New Tenant</h2>
                
                <form id="tenantForm" onsubmit="saveTenant(event)">
                    <div class="form-group">
                        <label for="tenantName">Business Name *</label>
                        <input type="text" id="tenantName" class="form-control" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="tenantDescription">Description</label>
                        <textarea id="tenantDescription" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tenantWebsite">Website URL</label>
                            <input type="url" id="tenantWebsite" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="tenantDomain">Domain</label>
                            <input type="text" id="tenantDomain" class="form-control" placeholder="example.com">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="contactEmail">Contact Email</label>
                            <input type="email" id="contactEmail" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="contactPhone">Contact Phone</label>
                            <input type="tel" id="contactPhone" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Enabled Features</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item">
                                <input type="checkbox" id="enableBookings" name="features" value="bookings">
                                <span>🗓️ Bookings & Appointments</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="enableOrders" name="features" value="orders">
                                <span>🛒 Orders & E-commerce</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="enableSlots" name="features" value="slots">
                                <span>⏰ Time Slots Management</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="enablePayments" name="features" value="payments">
                                <span>💳 Payment Processing</span>
                            </label>
                            <label class="checkbox-item">
                                <input type="checkbox" id="enableAnalytics" name="features" value="analytics">
                                <span>📊 Advanced Analytics</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="primaryColor">Primary Color</label>
                        <input type="color" id="primaryColor" class="form-control" value="#667eea">
                    </div>
                    
                    <div class="form-group">
                        <label for="welcomeMessage">Custom Welcome Message</label>
                        <textarea id="welcomeMessage" class="form-control" rows="2" placeholder="Welcome to our business! How can we help you today?"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                        <button type="button" class="btn btn-secondary" onclick="closeTenantModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <span id="saveButtonText">Create Tenant</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <script>
            let currentTenants = [];
            let editingTenantId = null;
            let authToken = null;
            
            // Initialize
            document.addEventListener('DOMContentLoaded', function() {
                loadUserInfo();
                loadTenants();
            });
            
            async function loadUserInfo() {
                try {
                    authToken = localStorage.getItem('authToken');
                    if (!authToken) {
                        window.location.href = '/login';
                        return;
                    }
                    
                    const response = await fetch('/auth/profile', {
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        document.getElementById('userEmail').textContent = data.user.email;
                    }
                } catch (error) {
                    console.error('Error loading user info:', error);
                }
            }
            
            async function loadTenants() {
                try {
                    const response = await fetch('/api/tenant/my-settings', {
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        currentTenants = data.tenants;
                        renderTenants();
                    } else {
                        showAlert('Failed to load tenant configurations', 'error');
                    }
                } catch (error) {
                    console.error('Error loading tenants:', error);
                    showAlert('Error loading tenant configurations', 'error');
                }
            }
            
            function renderTenants() {
                const container = document.getElementById('tenantList');
                
                if (currentTenants.length === 0) {
                    container.innerHTML = \`
                        <div style="text-align: center; padding: 2rem; color: #666;">
                            <p>No tenant configurations found.</p>
                            <p>Create your first tenant configuration to get started.</p>
                        </div>
                    \`;
                    return;
                }
                
                container.innerHTML = currentTenants.map(tenant => \`
                    <div class="tenant-item">
                        <div class="tenant-header">
                            <div>
                                <div class="tenant-name">\${tenant.tenantInfo.name}</div>
                                <div class="tenant-id">ID: \${tenant.tenantId}</div>
                            </div>
                            <div>
                                <button class="btn btn-primary" onclick="editTenant('\${tenant.tenantId}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteTenant('\${tenant.tenantId}')">Delete</button>
                            </div>
                        </div>
                        
                        <div class="feature-tags">
                            \${Object.entries(tenant.enabledFeatures).map(([feature, enabled]) => 
                                \`<span class="feature-tag \${enabled ? '' : 'disabled'}">\${feature}</span>\`
                            ).join('')}
                        </div>
                        
                        <p><strong>Created:</strong> \${new Date(tenant.createdAt).toLocaleDateString()}</p>
                        <p><strong>Last Active:</strong> \${new Date(tenant.usage.lastActive).toLocaleDateString()}</p>
                    </div>
                \`).join('');
            }
            
            function openCreateTenantModal() {
                editingTenantId = null;
                document.getElementById('modalTitle').textContent = 'Create New Tenant';
                document.getElementById('saveButtonText').textContent = 'Create Tenant';
                document.getElementById('tenantForm').reset();
                document.getElementById('tenantModal').style.display = 'block';
            }
            
            function closeTenantModal() {
                document.getElementById('tenantModal').style.display = 'none';
                editingTenantId = null;
            }
            
            async function editTenant(tenantId) {
                try {
                    const response = await fetch(\`/api/tenant/settings/\${tenantId}\`, {
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        const tenant = data.tenant;
                        
                        editingTenantId = tenantId;
                        document.getElementById('modalTitle').textContent = 'Edit Tenant';
                        document.getElementById('saveButtonText').textContent = 'Update Tenant';
                        
                        // Populate form
                        document.getElementById('tenantName').value = tenant.tenantInfo.name;
                        document.getElementById('tenantDescription').value = tenant.tenantInfo.description;
                        document.getElementById('tenantWebsite').value = tenant.tenantInfo.website;
                        document.getElementById('tenantDomain').value = tenant.tenantInfo.domain;
                        document.getElementById('contactEmail').value = tenant.tenantInfo.contactEmail;
                        document.getElementById('contactPhone').value = tenant.tenantInfo.contactPhone;
                        document.getElementById('primaryColor').value = tenant.widgetCustomization.primaryColor;
                        document.getElementById('welcomeMessage').value = tenant.widgetCustomization.welcomeMessage;
                        
                        // Set checkboxes
                        document.getElementById('enableBookings').checked = tenant.enabledFeatures.bookings;
                        document.getElementById('enableOrders').checked = tenant.enabledFeatures.orders;
                        document.getElementById('enableSlots').checked = tenant.enabledFeatures.slots;
                        document.getElementById('enablePayments').checked = tenant.enabledFeatures.payments;
                        document.getElementById('enableAnalytics').checked = tenant.enabledFeatures.analytics;
                        
                        document.getElementById('tenantModal').style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error loading tenant for editing:', error);
                    showAlert('Error loading tenant configuration', 'error');
                }
            }
            
            async function saveTenant(event) {
                event.preventDefault();
                
                const formData = {
                    tenantInfo: {
                        name: document.getElementById('tenantName').value,
                        description: document.getElementById('tenantDescription').value,
                        website: document.getElementById('tenantWebsite').value,
                        domain: document.getElementById('tenantDomain').value,
                        contactEmail: document.getElementById('contactEmail').value,
                        contactPhone: document.getElementById('contactPhone').value
                    },
                    enabledFeatures: {
                        bookings: document.getElementById('enableBookings').checked,
                        orders: document.getElementById('enableOrders').checked,
                        slots: document.getElementById('enableSlots').checked,
                        payments: document.getElementById('enablePayments').checked,
                        analytics: document.getElementById('enableAnalytics').checked
                    },
                    widgetCustomization: {
                        primaryColor: document.getElementById('primaryColor').value,
                        welcomeMessage: document.getElementById('welcomeMessage').value
                    }
                };
                
                try {
                    const url = editingTenantId 
                        ? \`/api/tenant/settings/\${editingTenantId}\`
                        : '/api/tenant/settings';
                    const method = editingTenantId ? 'PUT' : 'POST';
                    
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + authToken
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        showAlert(editingTenantId ? 'Tenant updated successfully!' : 'Tenant created successfully!', 'success');
                        closeTenantModal();
                        loadTenants();
                    } else {
                        const error = await response.json();
                        showAlert(error.error || 'Failed to save tenant', 'error');
                    }
                } catch (error) {
                    console.error('Error saving tenant:', error);
                    showAlert('Error saving tenant configuration', 'error');
                }
            }
            
            async function deleteTenant(tenantId) {
                if (!confirm('Are you sure you want to delete this tenant configuration?')) {
                    return;
                }
                
                try {
                    const response = await fetch(\`/api/tenant/settings/\${tenantId}\`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + authToken
                        }
                    });
                    
                    if (response.ok) {
                        showAlert('Tenant configuration deleted successfully!', 'success');
                        loadTenants();
                    } else {
                        const error = await response.json();
                        showAlert(error.error || 'Failed to delete tenant', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting tenant:', error);
                    showAlert('Error deleting tenant configuration', 'error');
                }
            }
            
            function showAlert(message, type) {
                const container = document.getElementById('alertContainer');
                const alert = document.createElement('div');
                alert.className = \`alert alert-\${type}\`;
                alert.textContent = message;
                
                container.appendChild(alert);
                
                setTimeout(() => {
                    alert.remove();
                }, 5000);
            }
            
            function logout() {
                localStorage.removeItem('authToken');
                window.location.href = '/login';
            }
            
            // Close modal when clicking outside
            document.getElementById('tenantModal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeTenantModal();
                }
            });
        </script>
    </body>
    </html>
  `);
});

module.exports = router;
