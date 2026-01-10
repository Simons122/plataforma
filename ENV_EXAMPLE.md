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
# FIREBASE CONFIGURATION (Already configured)
# ==========================================
# Your existing Firebase config...
