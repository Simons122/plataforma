/**
 * Notification Service
 * Handles Email and WhatsApp notifications
 */

// ==========================================
// EMAIL CONFIGURATION
// ==========================================

/**
 * Send email using Resend API (recommended)
 * Sign up at: https://resend.com
 * Pricing: 3,000 emails/month free, then $20/month for 50k emails
 */
export async function sendEmail({ to, subject, html, from = 'Plataforma <onboarding@resend.dev>' }) {
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured. Email not sent.');
        console.log('To configure: Add VITE_RESEND_API_KEY to your .env file');
        return { success: false, error: 'API key not configured' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: Array.isArray(to) ? to : [to],
                subject,
                html
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send email');
        }

        console.log('✅ Email sent successfully:', data.id);
        return { success: true, id: data.id };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Alternative: Send email using EmailJS (client-side, no backend needed)
 * Sign up at: https://www.emailjs.com
 * Pricing: 200 emails/month free, then $7/month for 1k emails
 */
export async function sendEmailViaEmailJS({ to, subject, message, templateParams = {} }) {
    const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        console.warn('⚠️ EmailJS not configured. Email not sent.');
        return { success: false, error: 'EmailJS not configured' };
    }

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_id: EMAILJS_SERVICE_ID,
                template_id: EMAILJS_TEMPLATE_ID,
                user_id: EMAILJS_PUBLIC_KEY,
                template_params: {
                    to_email: to,
                    subject: subject,
                    message: message,
                    ...templateParams
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send email via EmailJS');
        }

        console.log('✅ Email sent via EmailJS');
        return { success: true };
    } catch (error) {
        console.error('❌ Error sending email via EmailJS:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// WHATSAPP CONFIGURATION
// ==========================================

/**
 * Send WhatsApp message using Twilio API
 * Sign up at: https://www.twilio.com
 * Pricing: Pay-as-you-go, ~$0.005 per message
 */
export async function sendWhatsAppViaTwilio({ to, message }) {
    const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = import.meta.env.VITE_TWILIO_WHATSAPP_FROM; // Format: 'whatsapp:+14155238886'

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
        console.warn('⚠️ Twilio not configured. WhatsApp message not sent.');
        console.log('To configure: Add Twilio credentials to your .env file');
        return { success: false, error: 'Twilio not configured' };
    }

    try {
        // Ensure phone number is in WhatsApp format
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    From: TWILIO_WHATSAPP_FROM,
                    To: formattedTo,
                    Body: message
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send WhatsApp message');
        }

        console.log('✅ WhatsApp message sent successfully:', data.sid);
        return { success: true, sid: data.sid };
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Alternative: WhatsApp Business API (Meta)
 * More complex setup but official Meta solution
 * Sign up at: https://business.whatsapp.com/products/business-platform
 */
export async function sendWhatsAppViaMeta({ to, message, templateName = null, templateParams = {} }) {
    const META_PHONE_NUMBER_ID = import.meta.env.VITE_META_PHONE_NUMBER_ID;
    const META_ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN;

    if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
        console.warn('⚠️ Meta WhatsApp API not configured. Message not sent.');
        return { success: false, error: 'Meta WhatsApp API not configured' };
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`;

        const body = templateName
            ? {
                messaging_product: 'whatsapp',
                to: to.replace(/\D/g, ''), // Remove non-digits
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'pt_PT' },
                    components: templateParams.components || []
                }
            }
            : {
                messaging_product: 'whatsapp',
                to: to.replace(/\D/g, ''),
                type: 'text',
                text: { body: message }
            };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send WhatsApp message');
        }

        console.log('✅ WhatsApp message sent via Meta API:', data.messages[0].id);
        return { success: true, messageId: data.messages[0].id };
    } catch (error) {
        console.error('❌ Error sending WhatsApp via Meta:', error);
        return { success: false, error: error.message };
    }
}

// ==========================================
// NOTIFICATION TEMPLATES
// ==========================================

/**
 * Generate booking confirmation email HTML
 */
export function generateBookingConfirmationEmail({
    clientName,
    professionalName,
    businessName,
    serviceName,
    date,
    time,
    price,
    bookingId
}) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .detail-label { font-weight: 600; color: #6c757d; }
        .detail-value { color: #212529; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Marcação Confirmada!</h1>
        </div>
        <div class="content">
            <p>Olá <strong>${clientName}</strong>,</p>
            <p>A sua marcação foi confirmada com sucesso!</p>
            
            <div class="booking-details">
                <h3 style="margin-top: 0; color: #667eea;">📋 Detalhes da Marcação</h3>
                <div class="detail-row">
                    <span class="detail-label">Profissional:</span>
                    <span class="detail-value">${professionalName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Estabelecimento:</span>
                    <span class="detail-value">${businessName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Serviço:</span>
                    <span class="detail-value">${serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Hora:</span>
                    <span class="detail-value">${time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Preço:</span>
                    <span class="detail-value"><strong>${price}€</strong></span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                    <span class="detail-label">Ref. Marcação:</span>
                    <span class="detail-value" style="font-family: monospace;">#${bookingId.substring(0, 8)}</span>
                </div>
            </div>

            <p>Aguardamos por si! Por favor, chegue com alguns minutos de antecedência.</p>
            <p style="color: #6c757d; font-size: 14px;">Se precisar de cancelar ou reagendar, entre em contacto connosco o quanto antes.</p>
        </div>
        <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda a este email.</p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Generate booking confirmation WhatsApp message
 */
export function generateBookingConfirmationWhatsApp({
    clientName,
    professionalName,
    businessName,
    serviceName,
    date,
    time,
    price
}) {
    return `
🎉 *Marcação Confirmada!*

Olá ${clientName},

A sua marcação foi confirmada:

📋 *Detalhes:*
👨‍💼 Profissional: ${professionalName}
🏢 Estabelecimento: ${businessName}
✂️ Serviço: ${serviceName}
📅 Data: ${date}
🕐 Hora: ${time}
💰 Preço: ${price}€

Aguardamos por si! 😊
Por favor, chegue com alguns minutos de antecedência.

_Se precisar de cancelar ou reagendar, entre em contacto connosco._
    `.trim();
}

/**
 * Send booking confirmation (Email + WhatsApp)
 */
export async function sendBookingConfirmation({ booking, client, professional }) {
    const results = {
        email: null,
        whatsapp: null
    };

    // Prepare booking details
    const bookingDetails = {
        clientName: client.name,
        professionalName: professional.name,
        businessName: professional.businessName || professional.name,
        serviceName: booking.service,
        date: new Date(booking.date).toLocaleDateString('pt-PT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        time: booking.time,
        price: booking.price,
        bookingId: booking.id
    };

    // Send Email
    if (client.email) {
        results.email = await sendEmail({
            to: client.email,
            subject: `✅ Marcação Confirmada - ${bookingDetails.date}`,
            html: generateBookingConfirmationEmail(bookingDetails)
        });
    }

    // Send WhatsApp (choose one method)
    if (client.phone) {
        // Option 1: Using Twilio
        results.whatsapp = await sendWhatsAppViaTwilio({
            to: client.phone,
            message: generateBookingConfirmationWhatsApp(bookingDetails)
        });

        // Option 2: Using Meta WhatsApp API (comment out Twilio if using this)
        // results.whatsapp = await sendWhatsAppViaMeta({
        //     to: client.phone,
        //     message: generateBookingConfirmationWhatsApp(bookingDetails)
        // });
    }

    return results;
}

// ==========================================
// EXPORT ALL
// ==========================================

export default {
    sendEmail,
    sendEmailViaEmailJS,
    sendWhatsAppViaTwilio,
    sendWhatsAppViaMeta,
    sendBookingConfirmation,
    generateBookingConfirmationEmail,
    generateBookingConfirmationWhatsApp
};
