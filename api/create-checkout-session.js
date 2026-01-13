import Stripe from 'stripe';

export const config = {
    runtime: 'edge',
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

// Booklyo Pro Plan Configuration
const BOOKLYO_PRO = {
    name: 'Booklyo Pro',
    price: 1500, // 15€ in cents
    currency: 'eur',
    interval: 'month'
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { userId, userEmail, userName, priceId, successUrl, cancelUrl } = await req.json();

        if (!userId || !userEmail) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: userId, userEmail' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get origin for redirect URLs
        const origin = req.headers.get('origin') || 'http://localhost:5173';

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
            locale: 'pt',
            custom_text: {
                submit: {
                    message: 'Após o pagamento, a sua conta será ativada automaticamente.'
                }
            }
        });

        return new Response(
            JSON.stringify({
                sessionId: session.id,
                url: session.url
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error creating checkout session:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
