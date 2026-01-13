import Stripe from 'stripe';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;

// Booklyo Pro Plan Configuration
const BOOKLYO_PRO = {
    name: 'Booklyo Pro',
    price: 1500, // 15€ in cents
    currency: 'eur',
    interval: 'month'
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if Stripe is configured
    if (!stripe) {
        console.error('❌ Stripe not initialized - STRIPE_SECRET_KEY missing');
        return res.status(500).json({
            error: 'Payment system not configured. Please add STRIPE_SECRET_KEY to environment variables.'
        });
    }

    try {
        const { userId, userEmail, userName, priceId, successUrl, cancelUrl } = req.body;

        if (!userId || !userEmail) {
            return res.status(400).json({ error: 'Missing required fields: userId, userEmail' });
        }

        // Get origin for redirect URLs
        const origin = req.headers.origin || req.headers.referer || 'https://plataforma-tau.vercel.app';

        // Create or get customer
        let customer;
        const existingCustomers = await stripe.customers.list({
            email: userEmail,
            limit: 1
        });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
            // Update metadata if needed
            await stripe.customers.update(customer.id, {
                metadata: { firebaseUserId: userId }
            });
        } else {
            customer = await stripe.customers.create({
                email: userEmail,
                name: userName || undefined,
                metadata: {
                    firebaseUserId: userId
                }
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                priceId ? {
                    price: priceId,
                    quantity: 1
                } : {
                    price_data: {
                        currency: BOOKLYO_PRO.currency,
                        product_data: {
                            name: BOOKLYO_PRO.name,
                            description: 'Sistema completo de marcações online - Marcações ilimitadas, confirmações automáticas por email e WhatsApp, painel profissional e muito mais.',
                        },
                        unit_amount: BOOKLYO_PRO.price,
                        recurring: {
                            interval: BOOKLYO_PRO.interval
                        }
                    },
                    quantity: 1
                }
            ],
            success_url: successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${origin}/pricing`,
            metadata: {
                firebaseUserId: userId
            },
            subscription_data: {
                metadata: {
                    firebaseUserId: userId
                }
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            locale: 'pt'
        });

        return res.status(200).json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({ error: error.message });
    }
}
