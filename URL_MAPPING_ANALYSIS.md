# AI Chatbot Widget - Complete URL Mapping & Navigation Flow

## 🏠 **LANDING PAGE (Root)**
**URL:** `/` → `index.html`

### Navigation Options from Landing Page:
1. **"Sign In" Button** → `/login`
2. **"Get Started" Button** → `/signup`  
3. **"Get Started" (Hero Button)** → `/signup`
4. **Pricing Plans:**
   - "Start Free" → `/signup?plan=free`
   - "Choose Plan (Basic)" → `/signup?plan=basic`
   - "Choose Plan (Pro)" → `/signup?plan=pro` 
   - "Choose Plan (Enterprise)" → `/signup?plan=enterprise`
5. **"Start Your Free Trial"** → `/signup`
6. **"Try Live Demo" Button** → Loads widget demo on same page

---

## 🔐 **AUTHENTICATION FLOW**

### Sign Up Process
**URL:** `/signup` → `signup.html`
- **Action:** Form submission to `/api/signup`
- **On Success:** Redirects to `/verify-otp` (if OTP required) or `/dashboard`
- **Link:** "Already have an account? Sign In" → `/login`

### Email Verification (OTP)
**URL:** `/verify-otp` → `verify-otp.html`
- **Action:** Form submission to `/api/email/verify-otp`
- **On Success:** Redirects to `/welcome-dashboard`
- **Features:** 6-digit OTP input, countdown timer, resend functionality

### Sign In Process  
**URL:** `/login` → `login.html`
- **Action:** Form submission to `/api/login`
- **On Success:** Redirects to `/dashboard`
- **Link:** "Don't have an account? Sign Up" → `/signup`

---

## 📊 **USER DASHBOARD FLOW**

### Main Dashboard
**URL:** `/dashboard` → `dashboard.html`
- **Navigation Options:**
  1. "Customize Widget" → `/customize-widget`
  2. "Advanced Customization" → `/customize-widget-advanced`
  3. "Configure AI Prompt" → `/configure-prompt`
  4. "Integration Guide" → `/integration`
  5. "View Pricing" → `/pricing`
  6. "Upgrade Plan" → `/pricing`
  7. "Logout" → Clears auth and redirects to `/`

### Welcome Dashboard (New Users)
**URL:** `/welcome-dashboard` → `welcome-dashboard.html`
- **Navigation Options:**
  1. "Customize Your Widget" → `/customize-widget-advanced`
  2. "Set Up AI Responses" → `/configure-prompt`
  3. "Get Integration Code" → `/integration`
  4. "Choose Your Plan" → `/pricing`
  5. "Skip to Dashboard" → `/dashboard`

---

## ⚙️ **WIDGET CONFIGURATION FLOW**

### Basic Widget Customization
**URL:** `/customize-widget` → `customize-widget.html`
- **API Endpoint:** `POST /api/widget/customize`
- **Navigation:**
  - "Back to Dashboard" → `/dashboard`
  - "Advanced Settings" → `/customize-widget-advanced`

### Advanced Widget Customization  
**URL:** `/customize-widget-advanced` → `customize-widget-advanced.html`
- **API Endpoint:** `POST /api/widget/customize-advanced`
- **Navigation:**
  - "Back to Dashboard" → `/dashboard`
  - "Basic Settings" → `/customize-widget`
  - "Configure AI Prompt" → `/configure-prompt`

### AI Prompt Configuration
**URL:** `/configure-prompt` → `configure-prompt.html`
- **API Endpoint:** `POST /api/widget/prompt`
- **Navigation:**
  - "Back to Dashboard" → `/dashboard`
  - "Widget Customization" → `/customize-widget-advanced`

### Integration Guide
**URL:** `/integration` → `integration.html`
- **Navigation:**
  - "Back to Dashboard" → `/dashboard`
  - "Test Widget" → `/widget-test`

---

## 💳 **PRICING & PAYMENTS**

### Pricing Page
**URL:** `/pricing` → `pricing.html`
- **Navigation:**
  - "Back to Dashboard" → `/dashboard`
  - Plan Selection Buttons → Payment flow (via `/api/payments/create-order`)

### Payment Demo
**URL:** `/payment-demo` → `payment-demo.html`
- **API Endpoints:**
  - `GET /api/payments/plans`
  - `POST /api/payments/create-order`
  - `POST /api/payments/verify`

### Payment Success Page
**URL:** `/payment-success` → `payment-success.html`
- **Features:** Transaction details, plan confirmation, next steps
- **Navigation:** 
  - "Go to Dashboard" → `/dashboard`
  - "Start Customizing Widget" → `/customize-widget-advanced`

### Payment Failed Page
**URL:** `/payment-failed` → `payment-failed.html`
- **Features:** Error details, retry options, common failure reasons
- **Navigation:**
  - "Try Again" → Retry payment flow
  - "Choose Different Plan" → `/pricing`
  - "Back to Dashboard" → `/dashboard`

---

## 🔧 **ADMIN PANEL**

### Admin Login
**URL:** `/admin-login` → `admin-login.html`
- **Action:** Form submission to `/admin/login`
- **On Success:** Redirects to `/admin`

### Admin Dashboard
**URL:** `/admin` → `admin.html`
- **API Endpoints:** Various admin routes under `/admin/*`

---

## 🧪 **TESTING & DEBUGGING PAGES**

### Widget Testing
**URL:** `/widget-test` → `widget-test.html`
- **Purpose:** Test widget functionality

### Debug Chat
**URL:** `/debug-chat` → `debug-chat.html`
- **API Endpoint:** `POST /ask`

### Simple Test
**URL:** `/test-simple` → `test-simple.html`

### Email Validation Test
**URL:** `/email-validation-test` → `email-validation-test.html`
- **API Endpoint:** `POST /api/validate-email`

### Registration Test with OTP
**URL:** `/test-registration` → `test-registration.html`
- **API Endpoint:** `POST /api/signup`

### Robust Email Test
**URL:** `/robust-email-test` → `robust-email-test.html`
- **API Endpoints:** Various under `/api/email/*`

---

## 🔗 **API ENDPOINTS**

### Authentication APIs
- `POST /api/signup` - User registration
- `POST /api/login` - User authentication
- `POST /api/logout` - User logout

### Widget APIs
- `GET /api/widget/config` - Get widget configuration
- `POST /api/widget/customize` - Save basic customization
- `POST /api/widget/customize-advanced` - Save advanced customization
- `POST /api/widget/prompt` - Save AI prompt configuration

### Chat API
- `POST /ask` - Chat with AI (requires API key)

### Payment APIs
- `GET /api/payments/plans` - Get pricing plans
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment

### Utility APIs
- `GET /health` - Server health check
- `GET /test-api-key` - Get test API key
- `POST /api/validate-email` - Validate email
- `GET /ip` - Get IP information

### Email Validation APIs (Robust)
- `POST /api/email/validate` - Advanced email validation
- `POST /api/email/send-otp` - Send OTP
- `POST /api/email/verify-otp` - Verify OTP
- `POST /api/email/batch-validate` - Batch email validation

### Admin APIs
- `POST /admin/login` - Admin authentication
- Various admin routes under `/admin/*`

---

## 🚫 **ERROR HANDLING PAGES**

### 404 Not Found
**URL:** Any non-existent route → `404.html`
- **Features:** Smart search, popular destination links, go back functionality
- **Navigation:** 
  - Quick links to common pages
  - Search functionality with keyword redirection
  - "Take Me Home" → `/`
  - "Go Back" → Previous page or home

---

## ✅ **COMPLETED IMPLEMENTATIONS**

### Recently Added Pages:
- ✅ **OTP verification page** (`/verify-otp`)
- ✅ **Payment success page** (`/payment-success`)
- ✅ **Payment failed page** (`/payment-failed`)
- ✅ **404 error page** (automatic routing)
- ✅ **Complete URL routing structure**

### Enhanced Features:
- ✅ **Proper OTP flow** from signup to verification to welcome dashboard
- ✅ **Payment result handling** with detailed transaction information
- ✅ **Custom 404 page** with smart navigation options
- ✅ **Complete authentication flow** with email verification

---

## ⚠️ **REMAINING ITEMS TO IMPLEMENT**

### Critical Missing Features:
1. **Password reset** functionality
   - Forgot password page
   - Reset password form
   - Email-based reset flow

2. **Enhanced Error Pages:**
   - 403 forbidden page
   - 500 server error page

3. **User Profile Management:**
   - Edit profile page
   - Account settings
   - API key management

### UI/UX Improvements:
1. **Navigation Consistency**
   - Add breadcrumb navigation
   - Consistent header/footer across pages
   - Loading states and progress indicators

2. **Enhanced Dashboard**
   - Real-time usage statistics
   - Chat history viewer
   - Analytics dashboard

### Backend Enhancements:
1. **Additional API endpoints** for payment callbacks
2. **Email confirmation** workflows
3. **Advanced admin features**

---

This analysis shows the complete URL structure and navigation flow. All major routes are functional, but there are some missing pages and inconsistencies that should be addressed for a complete user experience.
