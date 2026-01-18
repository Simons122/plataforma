import express from 'express';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Booklyo Pro Plan Configuration
const BOOKLYO_PRO = {
    name: 'Booklyo Pro',
    price: 1500, // 15€ in cents
    currency: 'eur',
    interval: 'month'
};

/**
 * Create a Stripe Checkout Session
 * POST /api/create-checkout-session
 */
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { userId, userEmail, userName, priceId, successUrl, cancelUrl } = req.body;

        if (!userId || !userEmail) {
            return res.status(400).json({ error: 'Missing required fields: userId, userEmail' });
        }

        // Create or get customer
        let customer;
        const existingCustomers = await stripe.customers.list({
            email: userEmail,
            limit: 1
        });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
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
                            description: 'Sistema completo de marcações online - Marcações ilimitadas, confirmações automáticas, painel profissional e muito mais.',
                            images: ['https://booklyo.com/logo.png'] // Update with your logo
                        },
                        unit_amount: BOOKLYO_PRO.price,
                        recurring: {
                            interval: BOOKLYO_PRO.interval
                        }
                    },
                    quantity: 1
                }
            ],
            success_url: successUrl || `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing`,
            metadata: {
                firebaseUserId: userId
            },
            subscription_data: {
                metadata: {
                    firebaseUserId: userId
                },
                trial_period_days: undefined // No additional trial since they already had 5 days
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            locale: 'pt'
        });

        res.json({
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create a Customer Portal Session
 * POST /api/create-portal-session
 */
router.post('/create-portal-session', async (req, res) => {
    try {
        const { customerId, returnUrl } = req.body;

        if (!customerId) {
            return res.status(400).json({ error: 'Missing required field: customerId' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${process.env.FRONTEND_URL}/dashboard`
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Stripe Webhook Handler
 * POST /api/stripe-webhook
 */
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;

        case 'customer.subscription.created':
            await handleSubscriptionCreated(event.data.object);
            break;

        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;

        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;

        case 'invoice.payment_succeeded':
            await handlePaymentSucceeded(event.data.object);
            break;

        case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

/**
 * Handle checkout.session.completed
 */
async function handleCheckoutCompleted(session) {
    const firebaseUserId = session.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in session metadata');
        return;
    }

    console.log(`✅ Checkout completed for user: ${firebaseUserId}`);

    // Note: In production, you would update Firestore here
    // This is handled by Firebase Admin SDK in the server
    // For Vercel, we update the status in the success page
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription) {
    const firebaseUserId = subscription.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in subscription metadata');
        return;
    }

    console.log(`✅ Subscription created for user: ${firebaseUserId}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Current period end: ${new Date(subscription.current_period_end * 1000)}`);
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
    const firebaseUserId = subscription.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in subscription metadata');
        return;
    }

    console.log(`📝 Subscription updated for user: ${firebaseUserId}`);
    console.log(`   New status: ${subscription.status}`);
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
    const firebaseUserId = subscription.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in subscription metadata');
        return;
    }

    console.log(`❌ Subscription cancelled for user: ${firebaseUserId}`);

    // Note: In production, update user's paymentStatus to 'cancelled' or 'expired'
}

/**
 * Handle invoice.payment_succeeded
 */
async function handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;

    console.log(`💰 Payment succeeded for customer: ${customerId}`);
    console.log(`   Amount: ${invoice.amount_paid / 100}€`);

    // Note: In production, update user's paymentStatus to 'active' and lastPaymentAt
}

/**
 * Handle invoice.payment_failed
 */
async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer;

    console.log(`⚠️ Payment failed for customer: ${customerId}`);

    // Note: In production, update user's paymentStatus to 'expired' or send notification
}

/**
 * Get subscription status
 * GET /api/subscription-status/:userId
 */
router.get('/subscription-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // In production, fetch from Firestore
        // For now, return a placeholder
        res.json({
            status: 'active',
            plan: 'booklyo_pro',
            currentPeriodEnd: null
        });

    } catch (error) {
        console.error('Error fetching subscription status:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
