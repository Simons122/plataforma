import React, { useState } from 'react';
import { sendEmail, sendBookingConfirmation } from '../lib/notifications';
import Layout from '../components/Layout';

export default function TestNotifications() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [testEmail, setTestEmail] = useState('');

    const testSimpleEmail = async () => {
        if (!testEmail) {
            alert('Por favor, insira um email');
            return;
        }

        setLoading(true);
        setResult(null);

        const emailResult = await sendEmail({
            to: testEmail,
            subject: '✅ Teste de Email - Plataforma',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #667eea;">🎉 Email Funcionando!</h1>
                    <p>Parabéns! O sistema de emails está configurado corretamente.</p>
                    <p>Esta é uma mensagem de teste enviada através da API Resend.</p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
                    <p style="color: #888; font-size: 14px;">
                        Enviado em: ${new Date().toLocaleString('pt-PT')}
                    </p>
                </div>
            `
        });

        setResult(emailResult);
        setLoading(false);
    };

    const testBookingConfirmation = async () => {
        if (!testEmail) {
            alert('Por favor, insira um email');
            return;
        }

        setLoading(true);
        setResult(null);

        const bookingResult = await sendBookingConfirmation({
            booking: {
                id: 'test-' + Date.now(),
                service: 'Corte de Cabelo',
                date: new Date().toISOString().split('T')[0],
                time: '14:30',
                price: 25
            },
            client: {
                name: 'Cliente Teste',
                email: testEmail,
                phone: null // WhatsApp desativado por enquanto
            },
            professional: {
                name: 'Profissional Exemplo',
                businessName: 'Salão de Beleza Exemplo'
            }
        });

        setResult(bookingResult);
        setLoading(false);
    };

    return (
        <Layout role="admin" brandName="Teste de Notificações">
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                    📧 Teste de Notificações
                </h1>

                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    padding: '2rem',
                    marginBottom: '2rem',
                    border: '1px solid var(--border-default)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Configuração Atual
                    </h2>

                    <div style={{
                        background: 'var(--bg-elevated)',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                    }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>EmailJS:</strong> {import.meta.env.VITE_EMAILJS_PUBLIC_KEY ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Resend API (Server-side):</strong> {import.meta.env.VITE_RESEND_API_KEY ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Twilio WhatsApp:</strong> {import.meta.env.VITE_TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                        <div>
                            <strong>Meta WhatsApp:</strong> {import.meta.env.VITE_META_PHONE_NUMBER_ID ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                    </div>
                </div>

                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    padding: '2rem',
                    border: '1px solid var(--border-default)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Testar Envio
                    </h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}>
                            Email de teste:
                        </label>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="seu-email@example.com"
                            className="input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            onClick={testSimpleEmail}
                            disabled={loading || !testEmail}
                            className="btn-primary"
                            style={{ flex: 1 }}
                        >
                            {loading ? '⏳ Enviando...' : '📧 Testar Email Simples'}
                        </button>

                        <button
                            onClick={testBookingConfirmation}
                            disabled={loading || !testEmail}
                            className="btn-primary"
                            style={{ flex: 1 }}
                        >
                            {loading ? '⏳ Enviando...' : '🎫 Testar Confirmação de Marcação'}
                        </button>
                    </div>

                    {result && (
                        <div style={{
                            padding: '1.5rem',
                            borderRadius: '8px',
                            background: result.success || result.email?.success ? '#10b98120' : '#ef444420',
                            border: `1px solid ${result.success || result.email?.success ? '#10b981' : '#ef4444'}`
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                marginBottom: '1rem',
                                color: result.success || result.email?.success ? '#10b981' : '#ef4444'
                            }}>
                                {result.success || result.email?.success ? '✅ Sucesso!' : '❌ Erro'}
                            </h3>

                            {result.email && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <strong>Email:</strong> {result.email.success ? '✅ Enviado' : `❌ ${result.email.error}`}
                                    {result.email.id && (
                                        <span style={{
                                            marginLeft: '0.5rem',
                                            fontFamily: 'monospace',
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            ID: {result.email.id}
                                        </span>
                                    )}
                                </div>
                            )}

                            {result.whatsapp && (
                                <div>
                                    <strong>WhatsApp:</strong> {result.whatsapp.success ? '✅ Enviado' : `⚠️ ${result.whatsapp.error || 'Não configurado'}`}
                                </div>
                            )}

                            {result.id && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <strong>ID:</strong> <code>{result.id}</code>
                                </div>
                            )}

                            {result.error && !result.email && (
                                <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                                    <strong>Erro:</strong> {result.error}
                                </div>
                            )}

                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid var(--border-default)',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)'
                            }}>
                                💡 <strong>Dica:</strong> Verifique a caixa de entrada (e spam) do email fornecido.
                            </div>
                        </div>
                    )}
                </div>

                <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginTop: '2rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                        ℹ️ Informações
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: 1.8 }}>
                        <li>Esta página é apenas para testes de desenvolvimento</li>
                        <li>Emails são enviados via Resend API</li>
                        <li>WhatsApp requer configuração adicional (Twilio ou Meta)</li>
                        <li>Limite: 100 emails/dia em modo de teste (Resend)</li>
                    </ul>
                </div>
            </div>
        </Layout>
    );
}
