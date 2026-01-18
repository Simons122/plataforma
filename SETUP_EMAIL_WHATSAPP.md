# 📧 Guia de Configuração: Email & WhatsApp APIs

## 📋 Índice
1. [Configuração de Email](#email)
2. [Configuração de WhatsApp](#whatsapp)
3. [Como Usar](#como-usar)
4. [Exemplos Práticos](#exemplos)

---

## 📧 CONFIGURAÇÃO DE EMAIL

### Opção 1: Resend (RECOMENDADO) ⭐

**Porquê Resend?**
- ✅ Setup super simples
- ✅ 3,000 emails/mês GRÁTIS
- ✅ Excelente deliverability
- ✅ Dashboard com analytics

**Passo a passo:**

1. **Criar conta**
   - Acesse: https://resend.com
   - Clique em "Start Building"
   - Registe-se com email

2. **Obter API Key**
   - No dashboard, vá em "API Keys"
   - Clique em "Create API Key"
   - Dê um nome (ex: "Plataforma Production")
   - Copie a chave (começa com `re_`)

3. **Configurar domínio (OPCIONAL mas recomendado)**
   - Vá em "Domains"
   - Adicione seu domínio
   - Configure os DNS records (SPF, DKIM)
   - Depois pode usar: `from: 'Plataforma <noreply@seudominio.com>'`

4. **Adicionar ao .env**
   ```bash
   VITE_RESEND_API_KEY=re_sua_chave_aqui
   ```

**Preços:**
- Grátis: 3,000 emails/mês
- Pro: $20/mês - 50,000 emails
- Scale: $80/mês - 1M emails

---

### Opção 2: EmailJS (Alternativa)

**Porquê EmailJS?**
- ✅ Funciona 100% no client-side (sem backend)
- ✅ 200 emails/mês grátis
- ⚠️ Menos emails grátis que Resend

**Passo a passo:**

1. **Criar conta**
   - Acesse: https://www.emailjs.com
   - Registe-se

2. **Adicionar Email Service**
   - Vá em "Email Services"
   - Escolha seu provedor (Gmail, Outlook, etc.)
   - Configure e obtenha o `SERVICE_ID`

3. **Criar Email Template**
   - Vá em "Email Templates"
   - Crie template com variáveis: `{{to_email}}`, `{{subject}}`, `{{message}}`
   - Obtenha o `TEMPLATE_ID`

4. **Obter Public Key**
   - Vá em "Account" → "General"
   - Copie sua "Public Key"

5. **Adicionar ao .env**
   ```bash
   VITE_EMAILJS_SERVICE_ID=service_xxxxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxxxx
   VITE_EMAILJS_PUBLIC_KEY=xxxxx
   ```

---

## 💬 CONFIGURAÇÃO DE WHATSAPP

### Opção 1: Twilio (MAIS FÁCIL) ⭐

**Porquê Twilio?**
- ✅ Setup rápido (15 minutos)
- ✅ $15 crédito grátis para testar
- ✅ Sandbox para desenvolvimento
- ✅ Documentação excelente

**Passo a passo:**

1. **Criar conta Twilio**
   - Acesse: https://www.twilio.com/try-twilio
   - Registe-se (vai pedir telefone para verificação)
   - Confirme email

2. **Configurar WhatsApp Sandbox (Para testes)**
   - No dashboard, vá em "Messaging" → "Try it out" → "Send a WhatsApp message"
   - Siga as instruções para conectar seu WhatsApp ao sandbox
   - Envie mensagem do seu WhatsApp para o número Twilio com o código fornecido
   - Exemplo: "join happy-tiger" para o número +1 415 523 8886

3. **Obter Credenciais**
   - No dashboard principal:
     - **Account SID**: está no dashboard principal
     - **Auth Token**: clique em "Show" para ver
   - **WhatsApp From Number**: `whatsapp:+14155238886` (número do sandbox)

4. **Adicionar ao .env**
   ```bash
   VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
   VITE_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
   VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

5. **Produção (Quando estiver pronto)**
   - Aplique para WhatsApp número próprio
   - Processo de aprovação: 1-2 semanas
   - Custos: ~$0.005 por mensagem

**Preços:**
- Trial: $15 crédito grátis
- Depois: $0.0079 por mensagem (WhatsApp)

**Limitações Sandbox:**
- ⚠️ Só pode enviar para números que fizeram join no sandbox
- ⚠️ Template de mensagem limitado
- ✅ Perfeito para desenvolvimento/testes

---

### Opção 2: WhatsApp Business API (Meta)

**Porquê Meta/Facebook?**
- ✅ Solução oficial WhatsApp
- ✅ Mais recursos (templates, botões, etc)
- ⚠️ Setup mais complexo
- ⚠️ Requer aprovação de negócio

**Passo a passo:**

1. **Criar conta Facebook Business**
   - Acesse: https://business.facebook.com
   - Crie Business Manager

2. **Configurar WhatsApp Business**
   - Acesse: https://business.whatsapp.com
   - Siga o processo de verificação
   - Adicione número de telefone
   - Aguarde aprovação (pode demorar dias/semanas)

3. **Obter credenciais**
   - No Meta Business Suite, obtenha:
     - Phone Number ID
     - Access Token (Permanent)

4. **Adicionar ao .env**
   ```bash
   VITE_META_PHONE_NUMBER_ID=123456789
   VITE_META_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
   ```

**Preços:**
- Primeiras 1,000 conversas/mês: GRÁTIS
- Depois: varia por país (~€0.05 por conversa)

---

## 🚀 COMO USAR

### 1. Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```bash
# Copie do ENV_EXAMPLE.md e preencha com suas chaves
```

### 2. Importar no código

```javascript
import { 
    sendEmail, 
    sendWhatsAppViaTwilio,
    sendBookingConfirmation 
} from './lib/notifications';
```

### 3. Usar as funções

---

## 💡 EXEMPLOS PRÁTICOS

### Exemplo 1: Enviar email simples

```javascript
import { sendEmail } from './lib/notifications';

const result = await sendEmail({
    to: 'cliente@example.com',
    subject: 'Bem-vindo à Plataforma!',
    html: '<h1>Olá!</h1><p>Obrigado por se registar.</p>'
});

if (result.success) {
    console.log('Email enviado!');
} else {
    console.error('Erro:', result.error);
}
```

### Exemplo 2: Enviar WhatsApp com Twilio

```javascript
import { sendWhatsAppViaTwilio } from './lib/notifications';

const result = await sendWhatsAppViaTwilio({
    to: '+351912345678',  // Ou 'whatsapp:+351912345678'
    message: 'Olá! A sua marcação foi confirmada para amanhã às 14h.'
});

if (result.success) {
    console.log('WhatsApp enviado!');
}
```

### Exemplo 3: Enviar confirmação de marcação (Email + WhatsApp)

```javascript
import { sendBookingConfirmation } from './lib/notifications';

const result = await sendBookingConfirmation({
    booking: {
        id: 'abc123',
        service: 'Corte de Cabelo',
        date: '2026-01-15',
        time: '14:00',
        price: 25
    },
    client: {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+351912345678'
    },
    professional: {
        name: 'Maria Santos',
        businessName: 'Salão da Maria'
    }
});

console.log('Email:', result.email.success ? '✅' : '❌');
console.log('WhatsApp:', result.whatsapp.success ? '✅' : '❌');
```

### Exemplo 4: Integrar no ClientBooking.jsx

```javascript
// Em ClientBooking.jsx, após criar a marcação:

import { sendBookingConfirmation } from '../lib/notifications';

const handleBooking = async (bookingData) => {
    try {
        // 1. Criar marcação no Firestore (já existe)
        const bookingRef = await addDoc(...);
        
        // 2. Enviar notificações
        const notificationResult = await sendBookingConfirmation({
            booking: {
                id: bookingRef.id,
                service: selectedService.name,
                date: selectedDate,
                time: selectedTime,
                price: selectedService.price
            },
            client: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone
            },
            professional: {
                name: professionalData.name,
                businessName: professionalData.businessName
            }
        });

        // 3. Mostrar feedback
        if (notificationResult.email.success) {
            console.log('📧 Email de confirmação enviado!');
        }
        if (notificationResult.whatsapp.success) {
            console.log('💬 WhatsApp enviado!');
        }

        // 4. Sucesso!
        alert('Marcação confirmada! Verifique seu email e WhatsApp.');
        
    } catch (error) {
        console.error('Erro:', error);
    }
};
```

---

## 🔧 TROUBLESHOOTING

### Email não está a ser enviado
- ✅ Verifique se `VITE_RESEND_API_KEY` está no .env
- ✅ Confirme que a chave começa com `re_`
- ✅ Verifique console do browser para erros
- ✅ Teste no dashboard da Resend

### WhatsApp não está a ser enviado (Twilio)
- ✅ No **sandbox**: destinatário fez "join" no sandbox?
- ✅ Número está no formato correto? (`+351912345678` ou `whatsapp:+351912345678`)
- ✅ Credenciais Twilio corretas?
- ✅ Tem crédito na conta Twilio?

### Variáveis de ambiente não estão a funcionar
- ✅ Arquivo chama-se exatamente `.env` (não `.env.txt`)
- ✅ Está na raiz do projeto (junto com `package.json`)
- ✅ Variáveis começam com `VITE_` (obrigatório no Vite)
- ✅ Reiniciou o servidor dev depois de criar .env?

---

## 🎯 RECOMENDAÇÕES

### Para começar (GRÁTIS):
1✅ **Email**: Use **Resend** (3,000/mês grátis)
2. **WhatsApp**: Use **Twilio Sandbox** (grátis para testes)

### Para escalar (PAGO):
1. **Email**: Mantenha Resend ($20/mês para 50k emails)
2. **WhatsApp**: 
   - Twilio (pay-as-you-go) SE: enviar para qualquer número facilmente
   - Meta WhatsApp API SE: quer recursos avançados (templates, botões)

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Escolha um provedor de Email E um de WhatsApp
2. ✅ Configure as credenciais no `.env`
3. ✅ Teste as funções básicas primeiro
4. ✅ Integre no ClientBooking.jsx
5. ✅ Teste marcações reais
6. ✅ Monitore os logs no console

**Boa sorte! 🚀**
