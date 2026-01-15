import Stripe from 'stripe';

export const config = {
    runtime: 'edge',
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

// 🛡️ Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://booklyo.pt',
    'https://www.booklyo.pt',
    'https://plataforma-tau.vercel.app'
];

export default async function handler(req) {
    // 🛡️ Security Headers
    const headers = {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    // 🛡️ CORS validation
    const origin = req.headers.get('origin');
    if (allowedOrigins.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }

    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                ...headers,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    }

    try {
        const { customerId, returnUrl } = await req.json();

        // 🛡️ Validate customer ID format (Stripe customer IDs start with 'cus_')
        if (!customerId || typeof customerId !== 'string' || !customerId.startsWith('cus_')) {
            return new Response(
                JSON.stringify({ error: 'Invalid customer ID' }),
                { status: 400, headers }
            );
        }

        // Get origin for return URL - only use allowed origins
        const requestOrigin = req.headers.get('origin') || 'https://plataforma-tau.vercel.app';
        const safeReturnUrl = allowedOrigins.includes(requestOrigin)
            ? `${requestOrigin}/dashboard`
            : 'https://plataforma-tau.vercel.app/dashboard';

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || safeReturnUrl
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { status: 200, headers }
        );

    } catch (error) {
        console.error('Error creating portal session:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to create portal session' }),
            { status: 500, headers }
        );
    }
}

