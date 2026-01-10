// Serverless Function para enviar emails via Resend
// Deploy automático no Vercel em: /api/send-booking-email

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            clientEmail,
            clientName,
            professionalName,
            businessName,
            serviceName,
            bookingDate,
            bookingTime,
            price,
            bookingId
        } = req.body;

        // Validar dados
        if (!clientEmail || !clientName || !serviceName) {
            return res.status(400).json({
                success: false,
                error: 'Dados incompletos'
            });
        }

        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY não configurada');
            return res.status(500).json({
                success: false,
                error: 'Serviço de email não configurado'
            });
        }

        // Template de email SUPER profissional
        const emailHTML = `
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmação de Marcação</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
    
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa; padding: 40px 20px;">
        <tr>
            <td align="center">
                
                <!-- Main Card -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 48px 40px; text-align: center;">
                            <div style="background-color: rgba(255,255,255,0.15); width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 24px; display: inline-flex; align-items: center; justify-content: center;">
                                <div style="font-size: 32px; line-height: 1;">✓</div>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3; letter-spacing: -0.5px;">Marcação Confirmada</h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.5;">Tudo pronto! Os detalhes estão abaixo.</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 48px 40px;">
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                                Olá <strong style="color: #111827; font-weight: 600;">${clientName}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 32px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                A sua marcação foi confirmada com sucesso. Estamos ansiosos para recebê-lo!
                            </p>
                            
                            <!-- Details Card -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 32px;">
                                <tr>
                                    <td style="padding: 24px 28px;">
                                        <h2 style="margin: 0 0 20px 0; color: #4F46E5; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes da Marcação</h2>
                                        
                                        <!-- Detail Row -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                                            <tr>
                                                <td style="padding: 0 0 16px 0; border-bottom: 1px solid #e5e7eb;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Profissional</div>
                                                    <div style="color: #111827; font-size: 16px; font-weight: 600;">${professionalName}</div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        ${businessName ? `
                                        <!-- Business Name -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                                            <tr>
                                                <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Estabelecimento</div>
                                                    <div style="color: #111827; font-size: 16px; font-weight: 600;">${businessName}</div>
                                                </td>
                                            </tr>
                                        </table>
                                        ` : ''}
                                        
                                        <!-- Service -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                                            <tr>
                                                <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Serviço</div>
                                                    <div style="color: #111827; font-size: 16px; font-weight: 600;">${serviceName}</div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Date & Time Row -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                                            <tr>
                                                <td width="50%" style="padding: 16px 12px 16px 0; border-bottom: 1px solid #e5e7eb;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Data</div>
                                                    <div style="color: #111827; font-size: 15px; font-weight: 600;">${bookingDate}</div>
                                                </td>
                                                <td width="50%" style="padding: 16px 0 16px 12px; border-bottom: 1px solid #e5e7eb;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Hora</div>
                                                    <div style="color: #111827; font-size: 15px; font-weight: 600;">${bookingTime}</div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Price -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 16px 0 0 0;">
                                                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Valor</div>
                                                    <div style="color: #4F46E5; font-size: 24px; font-weight: 700;">${price}€</div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Important Notice -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 32px;">
                                <tr>
                                    <td style="padding: 20px 24px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                            <strong style="font-weight: 600;">⏰ Importante:</strong> Por favor, chegue com alguns minutos de antecedência.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Additional Info -->
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Se precisar de cancelar ou reagendar a sua marcação, entre em contacto connosco o quanto antes.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                                Esta é uma mensagem automática. Por favor, não responda a este email.
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 13px; font-weight: 500;">
                                Powered by <span style="color: #4F46E5; font-weight: 600;">Bookly</span>
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
        `.trim();

        // Enviar via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Plataforma <onboarding@resend.dev>',
                to: [clientEmail],
                subject: `✅ Marcação Confirmada - ${serviceName}`,
                html: emailHTML
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('❌ Erro Resend:', result);
            return res.status(500).json({
                success: false,
                error: result.message || 'Erro ao enviar email'
            });
        }

        console.log('✅ Email enviado com sucesso:', result.id);

        return res.status(200).json({
            success: true,
            emailId: result.id,
            message: 'Email enviado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao processar email:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno ao enviar email'
        });
    }
}
