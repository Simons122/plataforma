import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to read the raw body
async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

// 🛡️ Security: Log webhook event for audit
async function logSecurityEvent(eventType, data) {
    try {
        await db.collection('audit_logs').add({
            eventType: `payment.${eventType}`,
            severity: 'info',
            timestamp: new Date(),
            data: {
                stripeEventType: eventType,
                ...data
            },
            source: 'stripe-webhook'
        });
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
}

export default async function handler(req, res) {
    // 🛡️ Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    let rawBody;

    try {
        rawBody = await getRawBody(req);
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        // 🛡️ Log failed webhook attempts (potential attack)
        await logSecurityEvent('webhook.verification_failed', {
            error: err.message,
            ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress
        });
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`📦 Received Stripe event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                await logSecurityEvent('checkout.completed', {
                    userId: event.data.object.metadata?.firebaseUserId
                });
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                await logSecurityEvent('subscription.updated', {
                    status: event.data.object.status
                });
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                await logSecurityEvent('subscription.deleted', {});
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                await logSecurityEvent('payment.succeeded', {
                    amount: event.data.object.amount_paid / 100
                });
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                await logSecurityEvent('payment.failed', {});
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        await logSecurityEvent('webhook.error', { error: error.message });
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
}

/**
 * Handle checkout.session.completed
 * User just completed payment
 */
async function handleCheckoutCompleted(session) {
    const firebaseUserId = session.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in session metadata');
        return;
    }

    console.log(`✅ Checkout completed for user: ${firebaseUserId}`);

    // Update user's payment status to active
    await db.collection('professionals').doc(firebaseUserId).update({
        paymentStatus: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscriptionStartedAt: new Date(),
        lastPaymentAt: new Date()
    });

    console.log(`✅ User ${firebaseUserId} activated successfully`);
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(subscription) {
    const firebaseUserId = subscription.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        // Try to get from customer
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.firebaseUserId;

        if (!userId) {
            console.error('No Firebase user ID found');
            return;
        }

        await updateUserSubscription(userId, subscription);
    } else {
        await updateUserSubscription(firebaseUserId, subscription);
    }
}

async function updateUserSubscription(userId, subscription) {
    const status = subscription.status;
    let paymentStatus = 'active';

    // Map Stripe status to our payment status
    switch (status) {
        case 'active':
        case 'trialing':
            paymentStatus = 'active';
            break;
        case 'past_due':
        case 'unpaid':
            paymentStatus = 'expired';
            break;
        case 'canceled':
        case 'incomplete_expired':
            paymentStatus = 'cancelled';
            break;
        default:
            paymentStatus = 'pending';
    }

    await db.collection('professionals').doc(userId).update({
        paymentStatus,
        stripeSubscriptionId: subscription.id,
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
        subscriptionUpdatedAt: new Date()
    });

    console.log(`📝 Subscription updated for user ${userId}: ${paymentStatus}`);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
    const firebaseUserId = subscription.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.firebaseUserId;

        if (userId) {
            await db.collection('professionals').doc(userId).update({
                paymentStatus: 'expired',
                subscriptionCancelledAt: new Date()
            });
            console.log(`❌ Subscription cancelled for user ${userId}`);
        }
        return;
    }

    await db.collection('professionals').doc(firebaseUserId).update({
        paymentStatus: 'expired',
        subscriptionCancelledAt: new Date()
    });

    console.log(`❌ Subscription cancelled for user ${firebaseUserId}`);
}

/**
 * Handle invoice payment succeeded
 */
async function handlePaymentSucceeded(invoice) {
    // Get customer to find Firebase user
    const customer = await stripe.customers.retrieve(invoice.customer);
    const firebaseUserId = customer.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in customer metadata');
        return;
    }

    await db.collection('professionals').doc(firebaseUserId).update({
        paymentStatus: 'active',
        lastPaymentAt: new Date(),
        lastPaymentAmount: invoice.amount_paid / 100
    });

    console.log(`💰 Payment succeeded for user ${firebaseUserId}: ${invoice.amount_paid / 100}€`);
}

/**
 * Handle invoice payment failed
 */
async function handlePaymentFailed(invoice) {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const firebaseUserId = customer.metadata?.firebaseUserId;

    if (!firebaseUserId) {
        console.error('No Firebase user ID in customer metadata');
        return;
    }

    await db.collection('professionals').doc(firebaseUserId).update({
        paymentStatus: 'expired',
        paymentFailedAt: new Date()
    });

    console.log(`⚠️ Payment failed for user ${firebaseUserId}`);

    // TODO: Send notification email about payment failure
}
