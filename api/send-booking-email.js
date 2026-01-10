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

        // Template de email HTML profissional com fonte da plataforma
        const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            background: #f5f5f7;
            padding: 20px;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 48px 32px; 
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 32px; 
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .content { 
            padding: 40px 32px; 
        }
        .content p {
            font-size: 16px;
            color: #4a4a4a;
            margin-bottom: 16px;
        }
        .content strong {
            color: #1a1a1a;
            font-weight: 600;
        }
        .booking-details { 
            background: #f8f9fa; 
            padding: 28px; 
            border-radius: 12px; 
            margin: 28px 0;
            border: 1px solid #e9ecef;
        }
        .booking-details h3 { 
            margin: 0 0 20px 0; 
            color: #667eea; 
            font-size: 18px;
            font-weight: 600;
            letter-spacing: -0.3px;
        }
        .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 14px 0; 
            border-bottom: 1px solid #e9ecef;
            align-items: center;
        }
        .detail-row:last-child { 
            border-bottom: none; 
            padding-bottom: 0;
        }
        .detail-row:first-of-type {
            padding-top: 0;
        }
        .detail-label { 
            font-weight: 500; 
            color: #6c757d;
            font-size: 14px;
        }
        .detail-value { 
            color: #1a1a1a; 
            text-align: right;
            font-weight: 500;
            font-size: 15px;
        }
        .detail-value strong {
            color: #667eea;
            font-weight: 700;
            font-size: 18px;
        }
        .important-note {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 16px 20px;
            margin: 24px 0;
            border-radius: 8px;
        }
        .important-note p {
            margin: 0;
            color: #856404;
            font-size: 14px;
        }
        .footer { 
            text-align: center; 
            padding: 32px; 
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            color: #6c757d; 
            font-size: 13px;
            margin: 4px 0;
        }
        .footer strong {
            color: #667eea;
            font-weight: 600;
        }
        @media only screen and (max-width: 600px) {
            .header { padding: 32px 24px; }
            .header h1 { font-size: 26px; }
            .content { padding: 32px 24px; }
            .booking-details { padding: 20px; }
            .detail-row { 
                flex-direction: column; 
                align-items: flex-start;
                gap: 4px;
            }
            .detail-value { 
                text-align: left;
            }
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
                    <span class="detail-label">Profissional</span>
                    <span class="detail-value">${professionalName}</span>
                </div>
                ${businessName ? `
                <div class="detail-row">
                    <span class="detail-label">Estabelecimento</span>
                    <span class="detail-value">${businessName}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="detail-label">Serviço</span>
                    <span class="detail-value">${serviceName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Data</span>
                    <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Hora</span>
                    <span class="detail-value">${bookingTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Preço</span>
                    <span class="detail-value"><strong>${price}€</strong></span>
                </div>
            </div>

            <div class="important-note">
                <p><strong>⏰ Importante:</strong> Por favor, chegue com alguns minutos de antecedência.</p>
            </div>

            <p style="font-size: 14px; color: #6c757d;">
                Se precisar de cancelar ou reagendar a sua marcação, entre em contacto connosco o quanto antes.
            </p>
        </div>
        <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda a este email.</p>
            <p style="margin-top: 12px;">Powered by <strong>Bookly</strong></p>
        </div>
    </div>
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
