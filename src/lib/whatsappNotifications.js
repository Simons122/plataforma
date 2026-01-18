/**
 * 📲 WhatsApp Notification Service
 * Sistema de notificações automáticas pelo WhatsApp
 */

import { db } from './firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ============================================
// CONFIGURAÇÕES
// ============================================

/**
 * Tipos de notificação WhatsApp suportados
 */
export const WHATSAPP_NOTIFICATION_TYPES = {
    BOOKING_CONFIRMATION: 'booking_confirmation',
    BOOKING_REMINDER_24H: 'booking_reminder_24h',
    BOOKING_REMINDER_1H: 'booking_reminder_1h',
    BOOKING_CANCELLED: 'booking_cancelled',
    REVIEW_REQUEST: 'review_request',
    PROFESSIONAL_NEW_BOOKING: 'professional_new_booking'
};

/**
 * Obter configurações de WhatsApp de um profissional
 */
export async function getWhatsAppSettings(professionalId) {
    try {
        const settingsRef = doc(db, `professionals/${professionalId}/settings`, 'notifications');
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
            return settingsSnap.data().whatsapp || getDefaultWhatsAppSettings();
        }

        return getDefaultWhatsAppSettings();
    } catch (error) {
        console.error('Erro ao obter configurações WhatsApp:', error);
        return getDefaultWhatsAppSettings();
    }
}

/**
 * Configurações padrão de WhatsApp
 */
function getDefaultWhatsAppSettings() {
    return {
        enabled: false,
        provider: 'twilio', // 'twilio' ou 'meta'
        sendConfirmation: true,
        sendReminder24h: true,
        sendReminder1h: true,
        sendCancellation: true,
        sendReviewRequest: true,
        notifyProfessional: true
    };
}

/**
 * Guardar configurações de WhatsApp
 */
export async function saveWhatsAppSettings(professionalId, settings) {
    try {
        const settingsRef = doc(db, `professionals/${professionalId}/settings`, 'notifications');
        await updateDoc(settingsRef, {
            whatsapp: {
                ...settings,
                updatedAt: serverTimestamp()
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Erro ao guardar configurações:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TEMPLATES DE MENSAGENS
// ============================================

/**
 * Templates de mensagens em PT e EN
 */
export const messageTemplates = {
    booking_confirmation: {
        pt: ({ clientName, professionalName, businessName, serviceName, date, time, price }) => `
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
`.trim(),
        en: ({ clientName, professionalName, businessName, serviceName, date, time, price }) => `
🎉 *Booking Confirmed!*

Hello ${clientName},

Your booking has been confirmed:

📋 *Details:*
👨‍💼 Professional: ${professionalName}
🏢 Business: ${businessName}
✂️ Service: ${serviceName}
📅 Date: ${date}
🕐 Time: ${time}
💰 Price: ${price}€

We look forward to seeing you! 😊
Please arrive a few minutes early.

_If you need to cancel or reschedule, please contact us._
`.trim()
    },

    booking_reminder_24h: {
        pt: ({ clientName, professionalName, serviceName, date, time }) => `
⏰ *Lembrete de Marcação*

Olá ${clientName},

Lembramos que tem uma marcação *amanhã*:

📋 *Detalhes:*
👨‍💼 Profissional: ${professionalName}
✂️ Serviço: ${serviceName}
📅 Data: ${date}
🕐 Hora: ${time}

Aguardamos por si! 😊
`.trim(),
        en: ({ clientName, professionalName, serviceName, date, time }) => `
⏰ *Booking Reminder*

Hello ${clientName},

This is a reminder that you have a booking *tomorrow*:

📋 *Details:*
👨‍💼 Professional: ${professionalName}
✂️ Service: ${serviceName}
📅 Date: ${date}
🕐 Time: ${time}

We look forward to seeing you! 😊
`.trim()
    },

    booking_reminder_1h: {
        pt: ({ clientName, professionalName, serviceName, time }) => `
🔔 *A sua marcação é em 1 hora!*

Olá ${clientName},

Lembramos que a sua marcação com ${professionalName} é às *${time}*.

Serviço: ${serviceName}

Até já! 👋
`.trim(),
        en: ({ clientName, professionalName, serviceName, time }) => `
🔔 *Your booking is in 1 hour!*

Hello ${clientName},

This is a reminder that your booking with ${professionalName} is at *${time}*.

Service: ${serviceName}

See you soon! 👋
`.trim()
    },

    booking_cancelled: {
        pt: ({ clientName, professionalName, serviceName, date, time }) => `
❌ *Marcação Cancelada*

Olá ${clientName},

A sua marcação foi cancelada:

👨‍💼 Profissional: ${professionalName}
✂️ Serviço: ${serviceName}
📅 Data: ${date}
🕐 Hora: ${time}

Se desejar, pode fazer uma nova marcação.
`.trim(),
        en: ({ clientName, professionalName, serviceName, date, time }) => `
❌ *Booking Cancelled*

Hello ${clientName},

Your booking has been cancelled:

👨‍💼 Professional: ${professionalName}
✂️ Service: ${serviceName}
📅 Date: ${date}
🕐 Time: ${time}

You can make a new booking if you wish.
`.trim()
    },

    review_request: {
        pt: ({ clientName, professionalName, serviceName, reviewUrl }) => `
⭐ *Como foi a sua experiência?*

Olá ${clientName},

Esperamos que tenha gostado do serviço "${serviceName}" com ${professionalName}!

A sua opinião é muito importante para nós. 🙏

Deixe a sua avaliação aqui: ${reviewUrl}

Obrigado! 💜
`.trim(),
        en: ({ clientName, professionalName, serviceName, reviewUrl }) => `
⭐ *How was your experience?*

Hello ${clientName},

We hope you enjoyed your "${serviceName}" with ${professionalName}!

Your feedback is very important to us. 🙏

Leave your review here: ${reviewUrl}

Thank you! 💜
`.trim()
    },

    professional_new_booking: {
        pt: ({ professionalName, clientName, serviceName, date, time, clientPhone }) => `
📅 *Nova Marcação!*

Olá ${professionalName},

Tem uma nova marcação:

👤 Cliente: ${clientName}
📱 Contacto: ${clientPhone}
✂️ Serviço: ${serviceName}
📅 Data: ${date}
🕐 Hora: ${time}

Aceda ao dashboard para mais detalhes.
`.trim(),
        en: ({ professionalName, clientName, serviceName, date, time, clientPhone }) => `
📅 *New Booking!*

Hello ${professionalName},

You have a new booking:

👤 Client: ${clientName}
📱 Contact: ${clientPhone}
✂️ Service: ${serviceName}
📅 Date: ${date}
🕐 Time: ${time}

Check your dashboard for more details.
`.trim()
    }
};

// ============================================
// ENVIO DE NOTIFICAÇÕES
// ============================================

/**
 * Enviar notificação WhatsApp
 * Esta função chama a API configurada (Twilio ou Meta)
 */
export async function sendWhatsAppNotification({
    to,
    type,
    language = 'pt',
    data
}) {
    console.log(`📲 Preparando WhatsApp (${type}) para: ${to}`);

    try {
        // Obter template da mensagem
        const template = messageTemplates[type];
        if (!template) {
            throw new Error(`Template não encontrado: ${type}`);
        }

        const message = template[language](data);

        // Determinar qual API usar
        const provider = import.meta.env.VITE_WHATSAPP_PROVIDER || 'twilio';

        let result;
        if (provider === 'meta') {
            result = await sendViaMeta(to, message);
        } else {
            result = await sendViaTwilio(to, message);
        }

        // Registar envio (para analytics)
        await logNotification({
            type,
            to,
            success: result.success,
            provider,
            timestamp: new Date().toISOString()
        });

        return result;

    } catch (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enviar via Twilio
 */
async function sendViaTwilio(to, message) {
    const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_FROM = import.meta.env.VITE_TWILIO_WHATSAPP_FROM;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
        console.warn('⚠️ Twilio não configurado');
        return { success: false, error: 'Twilio not configured' };
    }

    try {
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
            throw new Error(data.message || 'Failed to send WhatsApp via Twilio');
        }

        console.log('✅ WhatsApp enviado via Twilio:', data.sid);
        return { success: true, sid: data.sid };

    } catch (error) {
        console.error('❌ Erro Twilio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enviar via Meta (WhatsApp Business API)
 */
async function sendViaMeta(to, message) {
    const META_PHONE_NUMBER_ID = import.meta.env.VITE_META_PHONE_NUMBER_ID;
    const META_ACCESS_TOKEN = import.meta.env.VITE_META_ACCESS_TOKEN;

    if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) {
        console.warn('⚠️ Meta WhatsApp API não configurado');
        return { success: false, error: 'Meta API not configured' };
    }

    try {
        const url = `https://graph.facebook.com/v18.0/${META_PHONE_NUMBER_ID}/messages`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: to.replace(/\D/g, ''),
                type: 'text',
                text: { body: message }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to send WhatsApp via Meta');
        }

        console.log('✅ WhatsApp enviado via Meta:', data.messages[0].id);
        return { success: true, messageId: data.messages[0].id };

    } catch (error) {
        console.error('❌ Erro Meta:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Log de notificação para analytics
 */
async function logNotification(data) {
    try {
        // Em produção, salvar em coleção de analytics
        console.log('📊 Notification log:', data);
    } catch (error) {
        console.warn('Não foi possível registar notificação:', error);
    }
}

// ============================================
// FUNÇÕES DE CONVENIÊNCIA
// ============================================

/**
 * Enviar confirmação de marcação
 */
export async function sendBookingConfirmationWhatsApp(booking, professional, client) {
    const settings = await getWhatsAppSettings(professional.id);

    if (!settings.enabled || !settings.sendConfirmation) {
        console.log('📲 WhatsApp confirmação desativado');
        return { success: false, reason: 'disabled' };
    }

    if (!client.phone) {
        return { success: false, reason: 'no_phone' };
    }

    return sendWhatsAppNotification({
        to: client.phone,
        type: WHATSAPP_NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
        language: professional.language || 'pt',
        data: {
            clientName: client.name,
            professionalName: professional.name,
            businessName: professional.businessName || professional.name,
            serviceName: booking.serviceName,
            date: booking.formattedDate,
            time: booking.formattedTime,
            price: booking.price
        }
    });
}

/**
 * Enviar lembrete de marcação (24h)
 */
export async function sendBookingReminder24h(booking, professional, client) {
    const settings = await getWhatsAppSettings(professional.id);

    if (!settings.enabled || !settings.sendReminder24h) {
        return { success: false, reason: 'disabled' };
    }

    if (!client.phone) {
        return { success: false, reason: 'no_phone' };
    }

    return sendWhatsAppNotification({
        to: client.phone,
        type: WHATSAPP_NOTIFICATION_TYPES.BOOKING_REMINDER_24H,
        language: professional.language || 'pt',
        data: {
            clientName: client.name,
            professionalName: professional.name,
            serviceName: booking.serviceName,
            date: booking.formattedDate,
            time: booking.formattedTime
        }
    });
}

/**
 * Enviar lembrete de marcação (1h)
 */
export async function sendBookingReminder1h(booking, professional, client) {
    const settings = await getWhatsAppSettings(professional.id);

    if (!settings.enabled || !settings.sendReminder1h) {
        return { success: false, reason: 'disabled' };
    }

    if (!client.phone) {
        return { success: false, reason: 'no_phone' };
    }

    return sendWhatsAppNotification({
        to: client.phone,
        type: WHATSAPP_NOTIFICATION_TYPES.BOOKING_REMINDER_1H,
        language: professional.language || 'pt',
        data: {
            clientName: client.name,
            professionalName: professional.name,
            serviceName: booking.serviceName,
            time: booking.formattedTime
        }
    });
}

/**
 * Enviar pedido de avaliação
 */
export async function sendReviewRequestWhatsApp(booking, professional, client, reviewUrl) {
    const settings = await getWhatsAppSettings(professional.id);

    if (!settings.enabled || !settings.sendReviewRequest) {
        return { success: false, reason: 'disabled' };
    }

    if (!client.phone) {
        return { success: false, reason: 'no_phone' };
    }

    return sendWhatsAppNotification({
        to: client.phone,
        type: WHATSAPP_NOTIFICATION_TYPES.REVIEW_REQUEST,
        language: professional.language || 'pt',
        data: {
            clientName: client.name,
            professionalName: professional.name,
            serviceName: booking.serviceName,
            reviewUrl
        }
    });
}

/**
 * Notificar profissional sobre nova marcação
 */
export async function notifyProfessionalNewBooking(booking, professional, client) {
    const settings = await getWhatsAppSettings(professional.id);

    if (!settings.enabled || !settings.notifyProfessional) {
        return { success: false, reason: 'disabled' };
    }

    if (!professional.phone) {
        return { success: false, reason: 'no_phone' };
    }

    return sendWhatsAppNotification({
        to: professional.phone,
        type: WHATSAPP_NOTIFICATION_TYPES.PROFESSIONAL_NEW_BOOKING,
        language: professional.language || 'pt',
        data: {
            professionalName: professional.name,
            clientName: client.name,
            clientPhone: client.phone || 'Não disponível',
            serviceName: booking.serviceName,
            date: booking.formattedDate,
            time: booking.formattedTime
        }
    });
}

// ============================================
// EXPORT
// ============================================

export default {
    WHATSAPP_NOTIFICATION_TYPES,
    getWhatsAppSettings,
    saveWhatsAppSettings,
    sendWhatsAppNotification,
    sendBookingConfirmationWhatsApp,
    sendBookingReminder24h,
    sendBookingReminder1h,
    sendReviewRequestWhatsApp,
    notifyProfessionalNewBooking,
    messageTemplates
};
