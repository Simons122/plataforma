const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function para apagar conta de Staff (Auth + Lookup)
 * Garante que o email é libertado para ser usado novamente.
 */
exports.deleteStaffAccount = functions.https.onCall(async (data, context) => {
    // Verificar autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Necessário autenticação.');
    }

    const { staffAuthId } = data;
    if (!staffAuthId) {
        throw new functions.https.HttpsError('invalid-argument', 'ID de conta necessário.');
    }

    const db = admin.firestore();
    const lookupRef = db.collection('staff_lookup').doc(staffAuthId);

    try {
        // Verificar permissão (Owner)
        const lookupSnap = await lookupRef.get();
        if (lookupSnap.exists) {
            const { ownerId } = lookupSnap.data();
            // Apenas o Owner que criou pode apagar (ou Admins globais se implementado)
            if (ownerId !== context.auth.uid) {
                // Pequena salvaguarda: check se é admin
                const adminRef = db.collection('admins').doc(context.auth.uid);
                const adminSnap = await adminRef.get();
                if (!adminSnap.exists) {
                    throw new functions.https.HttpsError('permission-denied', 'Apenas o proprietário pode apagar esta conta.');
                }
            }
            // Apagar lookup doc
            await lookupRef.delete();
        }

        // Apagar utilizador do Firebase Authentication
        await admin.auth().deleteUser(staffAuthId);

        return { success: true, message: 'Conta apagada com sucesso.' };

    } catch (error) {
        console.error('Erro ao apagar staff:', error);

        // Se utilizador não encontrado no Auth, considerar sucesso (já estava apagado)
        if (error.code === 'auth/user-not-found') {
            // Ainda tentar apagar o lookup se existir
            await lookupRef.delete(); // Ignore error
            return { success: true, message: 'Conta já não existia, registos limpos.' };
        }

        throw new functions.https.HttpsError('internal', 'Erro ao apagar conta de sistema: ' + error.message);
    }
});

/**
 * Cloud Function para enviar emails via Resend
 * Endpoint: https://YOUR-PROJECT.cloudfunctions.net/sendBookingEmail
 */
exports.sendBookingEmail = functions.https.onCall(async (data, context) => {
    // Validar dados recebidos
    const { clientEmail, clientName, professionalName, businessName, serviceName, bookingDate, bookingTime, price, bookingId } = data;

    if (!clientEmail || !clientName || !serviceName) {
        throw new functions.https.HttpsError('invalid-argument', 'Dados incompletos');
    }

    // Chave API do Resend (configurada como variável de ambiente)
    const RESEND_API_KEY = functions.config().resend?.apikey;

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY não configurada');
        throw new functions.https.HttpsError('failed-precondition', 'Serviço de email não configurado');
    }

    // Template de email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .booking-details { background: white; padding: 25px; border-radius: 12px; margin: 25px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .booking-details h3 { margin-top: 0; color: #667eea; font-size: 18px; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e9ecef; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #6c757d; }
        .detail-value { color: #212529; text-align: right; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .highlight { color: #667eea; font-weight: 700; }
        @media only screen and (max-width: 600px) {
            .detail-row { flex-direction: column; }
            .detail-value { text-align: left; margin-top: 4px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Marcação Confirmada!</h1>
        </div>
        <div class="content">
            <p>Olá <strong>${clientName}</strong>,</p>
            <p>A sua marcação foi confirmada com sucesso! Estamos ansiosos para recebê-lo.</p>
            
            <div class="booking-details">
                <h3>📋 Detalhes da Marcação</h3>
                <div class="detail-row">
                    <span class="detail-label">Profissional:</span>
                    <span class="detail-value">${professionalName}</span>
                </div>
                ${businessName ? `
                <div class="detail-row">
                    <span class="detail-label">Estabelecimento:</span>
                    <span class="detail-value">${businessName}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Serviço:</span>
                    <span class="detail-value">${serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Hora:</span>
                    <span class="detail-value">${bookingTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Preço:</span>
                    <span class="detail-value"><strong>${price}€</strong></span>
                </div>
                ${bookingId ? `
                <div class="detail-row">
                    <span class="detail-label">Ref. Marcação:</span>
                    <span class="detail-value" style="font-family: monospace;">#${bookingId.substring(0, 8)}</span>
                </div>
                ` : ''}
            </div>

            <p>✨ <strong>Importante:</strong> Por favor, chegue com alguns minutos de antecedência.</p>
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
                Se precisar de cancelar ou reagendar a sua marcação, entre em contacto connosco o quanto antes.
            </p>
        </div>
        <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda a este email.</p>
            <p style="margin-top: 10px;">Powered by <strong>Bookly</strong></p>
        </div>
    </div>
</body>
</html>
    `.trim();

    try {
        // Enviar email via Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Plataforma <onboarding@resend.dev>', // Troque pelo seu domínio verificado
                to: [clientEmail],
                subject: `✅ Marcação Confirmada - ${serviceName}`,
                html: emailHTML
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Erro Resend:', result);
            throw new functions.https.HttpsError('internal', result.message || 'Erro ao enviar email');
        }

        console.log('Email enviado com sucesso:', result.id);

        return {
            success: true,
            emailId: result.id,
            message: 'Email enviado com sucesso'
        };

    } catch (error) {
        console.error('Erro ao enviar email:', error);
        throw new functions.https.HttpsError('internal', 'Erro ao processar envio de email');
    }
});
