# ==========================================
# EMAIL CONFIGURATION
# ==========================================

# Option 1: Resend (Recommended for email)
# Sign up: https://resend.com
# Free tier: 3,000 emails/month
# Paid: $20/month for 50k emails
VITE_RESEND_API_KEY=re_123456789

# Option 2: EmailJS (Client-side email, no backend needed)
# Sign up: https://www.emailjs.com
# Free tier: 200 emails/month
VITE_EMAILJS_SERVICE_ID=service_xxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxx

# ==========================================
# WHATSAPP CONFIGURATION
# ==========================================

# Option 1: Twilio (Easiest to set up)
# Sign up: https://www.twilio.com
# Free trial: $15 credit
# Pay-as-you-go: ~$0.005 per message
VITE_TWILIO_ACCOUNT_SID=ACxxxxx
VITE_TWILIO_AUTH_TOKEN=xxxxx
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Option 2: WhatsApp Business API (Meta/Facebook)
# Sign up: https://business.whatsapp.com
# More complex but official solution
VITE_META_PHONE_NUMBER_ID=123456789
VITE_META_ACCESS_TOKEN=EAAxxxxx

# ==========================================
# STRIPE CONFIGURATION (Payments)
# ==========================================

# Sign up: https://stripe.com
# Get keys from: https://dashboard.stripe.com/apikeys

# Frontend (Publishable Key - safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Optional: Use a specific Price ID for Booklyo Pro
# Create in Stripe Dashboard > Products
VITE_STRIPE_PRICE_ID=price_xxxxx

# Backend (Secret Key - NEVER expose in frontend)
# Add these in Vercel Environment Variables
STRIPE_SECRET_KEY=sk_test_xxxxx

# Webhook Secret (for Vercel webhook endpoint)
# Get from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ==========================================
# FIREBASE CONFIGURATION (Already configured)
# ==========================================
# Your existing Firebase config...

# For Vercel Webhook (Firebase Admin SDK)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ==========================================
# 🛡️ SECURITY CONFIGURATION (MAXIMUM PROTECTION)
# ==========================================

# reCAPTCHA v3 for App Check (Anti-bot protection)
# Get from: https://www.google.com/recaptcha/admin
# Type: reCAPTCHA v3
# Domains: localhost, booklyo.pt, your-project.vercel.app
VITE_RECAPTCHA_SITE_KEY=6Lcxxxxx

# Encryption key for sensitive data (min 32 characters)
# Generate with: openssl rand -hex 32
VITE_ENCRYPTION_KEY=your-super-secret-key-at-least-32-chars

# ==========================================
# VERCEL ENVIRONMENT VARIABLES
# ==========================================
# Add these in Vercel Dashboard > Settings > Environment Variables:
#
# Production:
# - STRIPE_SECRET_KEY=sk_live_xxxxx
# - STRIPE_WEBHOOK_SECRET=whsec_xxxxx
# - RESEND_API_KEY=re_xxxxx
# - FIREBASE_PROJECT_ID=your-project-id
# - FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com  
# - FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
#
# Preview/Development:
# - STRIPE_SECRET_KEY=sk_test_xxxxx
# - (same as above with test keys)
