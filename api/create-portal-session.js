import Stripe from 'stripe';

export const config = {
    runtime: 'edge',
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { customerId, returnUrl } = await req.json();

        if (!customerId) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: customerId' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get origin for return URL
        const origin = req.headers.get('origin') || 'http://localhost:5173';

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${origin}/dashboard`
        });

        return new Response(
            JSON.stringify({ url: session.url }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error creating portal session:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
