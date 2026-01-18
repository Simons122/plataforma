/**
 * Stripe Payment Service
 * Handles subscription payments for Booklyo Pro
 */

// Stripe Configuration
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const STRIPE_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID; // Price ID for Booklyo Pro (15€/month)

// Plan Configuration
export const BOOKLYO_PRO_PLAN = {
    name: 'Booklyo Pro',
    price: 15,
    currency: 'EUR',
    interval: 'month',
    trialDays: 5,
    features: [
        'Marcações ilimitadas',
        'Confirmações automáticas por email e WhatsApp',
        'Gestão de serviços e horários',
        'Painel profissional',
        'Suporte básico',
        'Atualizações incluídas'
    ]
};

/**
 * Load Stripe.js dynamically
 */
let stripePromise = null;

export async function getStripe() {
    if (!STRIPE_PUBLISHABLE_KEY) {
        console.warn('⚠️ Stripe publishable key not configured');
        return null;
    }

    if (!stripePromise) {
        // Dynamically load Stripe.js
        if (!window.Stripe) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        stripePromise = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    }

    return stripePromise;
}

/**
 * Create a Stripe Checkout Session
 * This redirects the user to Stripe's hosted checkout page
 */
export async function createCheckoutSession({ userId, userEmail, userName, successUrl, cancelUrl }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // For local development, use Stripe Payment Link directly
    // In production, the API endpoint will handle this
    if (isLocalDev && !BACKEND_URL) {
        console.log('🧪 Development mode: Using Stripe Payment Link');

        // Create a payment link URL with metadata
        // This uses Stripe's hosted checkout with the price ID
        const stripe = await getStripe();
        if (!stripe) {
            console.error('❌ Stripe not initialized');
            return { success: false, error: 'Stripe não disponível' };
        }

        // For local dev, redirect to Stripe's test payment page
        // You can create a Payment Link in the Stripe Dashboard and use it here
        // Or use the Stripe CLI to forward webhooks locally
        const paymentLinkUrl = `https://checkout.stripe.com/pay/${STRIPE_PRICE_ID}`;

        // Alternative: Use Stripe Checkout with prefilled data
        // This requires the backend, but we can redirect to pricing with a message
        const returnUrl = `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;

        // Create a simple redirect to Stripe's test checkout
        // Note: For full functionality in local dev, run: npx vercel dev
        const testCheckoutUrl = `https://buy.stripe.com/test_00g7t88e5f9b3vy9AA?prefilled_email=${encodeURIComponent(userEmail)}&client_reference_id=${userId}`;

        // Try the backend API first, fallback to redirect
        try {
            const response = await fetch(`${window.location.origin}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userEmail,
                    userName,
                    priceId: STRIPE_PRICE_ID,
                    successUrl: successUrl || `${window.location.origin}/payment-success`,
                    cancelUrl: cancelUrl || `${window.location.origin}/pricing`
                })
            });

            if (response.ok) {
                const { sessionId, url } = await response.json();
                if (url) {
                    window.location.href = url;
                    return { success: true };
                }
            }
        } catch (e) {
            console.log('📝 Backend não disponível, usando redirect alternativo');
        }

        // Fallback: Redirect to dashboard with info
        console.log('📝 Desenvolvimento local - pagamentos via Vercel');
        // For local dev testing, just go to dashboard
        window.location.href = '/dashboard';
        return { success: true }; // Consider it success for dev testing
    }

    // Production: Use the API endpoint
    try {
        const baseUrl = BACKEND_URL || window.location.origin;
        const response = await fetch(`${baseUrl}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                userEmail,
                userName,
                priceId: STRIPE_PRICE_ID,
                successUrl: successUrl || `${window.location.origin}/payment-success`,
                cancelUrl: cancelUrl || `${window.location.origin}/pricing`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create checkout session');
        }

        const { sessionId, url } = await response.json();

        // If we have a direct URL, redirect to it
        if (url) {
            window.location.href = url;
            return { success: true };
        }

        // Otherwise, use Stripe.js to redirect
        const stripe = await getStripe();
        if (stripe) {
            const { error } = await stripe.redirectToCheckout({ sessionId });
            if (error) {
                throw new Error(error.message);
            }
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a Customer Portal Session
 * Allows users to manage their subscription
 */
export async function createPortalSession({ customerId, returnUrl }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

    try {
        const response = await fetch(`${BACKEND_URL}/api/create-portal-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId,
                returnUrl: returnUrl || `${window.location.origin}/dashboard`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create portal session');
        }

        const { url } = await response.json();
        window.location.href = url;

        return { success: true };
    } catch (error) {
        console.error('❌ Error creating portal session:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check subscription status from Firestore
 */
export function getSubscriptionStatus(user) {
    if (!user) return 'none';

    const { paymentStatus, trialEndsAt, subscriptionEndsAt } = user;

    // Check if user has active subscription
    if (paymentStatus === 'active' || paymentStatus === 'paid') {
        return 'active';
    }

    // Check if in trial period
    if (paymentStatus === 'trial' || paymentStatus === 'pending') {
        const trialEnd = trialEndsAt?.toDate ? trialEndsAt.toDate() : new Date(trialEndsAt);
        if (trialEnd > new Date()) {
            return 'trial';
        }
        return 'expired';
    }

    // Check if subscription expired
    if (paymentStatus === 'expired' || paymentStatus === 'cancelled') {
        return 'expired';
    }

    return 'none';
}

/**
 * Calculate days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt) {
    if (!trialEndsAt) return 0;

    const endDate = trialEndsAt?.toDate ? trialEndsAt.toDate() : new Date(trialEndsAt);
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

/**
 * Format price for display
 */
export function formatPrice(amount, currency = 'EUR') {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

export default {
    BOOKLYO_PRO_PLAN,
    getStripe,
    createCheckoutSession,
    createPortalSession,
    getSubscriptionStatus,
    getTrialDaysRemaining,
    formatPrice
};
