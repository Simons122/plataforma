# 📧 Guia Rápido: Configurar EmailJS (5 minutos)

## ⚡ Porquê EmailJS?
- ✅ Funciona 100% client-side (sem servidor necessário)
- ✅ Sem problemas de CORS
- ✅ 200 emails/mês GRÁTIS
- ✅ Configuração super rápida

---

## 🚀 Passo a Passo

### 1. Criar Conta (1 minuto)
1. Acesse: **https://www.emailjs.com/**
2. Clique em "Sign Up"
3. Use seu email e crie uma senha

---

### 2. Configurar Email Service (2 minutos)

1. No dashboard, clique em **"Email Services"**
2. Clique em **"Add New Service"**
3. Escolha seu provedor:
   - **Gmail** (recomendado se usa Gmail)
   - **Outlook** (se usa Hotmail/Outlook)
   - **Outro** (qualquer SMTP)

4. Para **Gmail**:
   - Faça login com sua conta Google
   - Autorize o EmailJS
   - **COPIE o Service ID** (ex: `service_abc123`)

---

### 3. Criar Template de Email (2 minutos)

1. No dashboard, vá em **"Email Templates"**
2. Clique em **"Create New Template"**
3. Cole este código no **Subject**:
```
✅ Marcação Confirmada - {{service_name}}
```

4. Cole este código no **Content (HTML)**:
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">🎉 Marcação Confirmada!</h1>
    </div>
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Olá <strong>{{client_name}}</strong>,</p>
        <p>A sua marcação foi confirmada com sucesso!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">📋 Detalhes da Marcação</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Profissional:</td>
                    <td style="padding: 10px 0; color: #212529;">{{professional_name}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Estabelecimento:</td>
                    <td style="padding: 10px 0; color: #212529;">{{business_name}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Serviço:</td>
                    <td style="padding: 10px 0; color: #212529;">{{service_name}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Data:</td>
                    <td style="padding: 10px 0; color: #212529;">{{booking_date}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Hora:</td>
                    <td style="padding: 10px 0; color: #212529;">{{booking_time}}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; font-weight: 600; color: #6c757d;">Preço:</td>
                    <td style="padding: 10px 0; color: #212529;"><strong>{{price}}€</strong></td>
                </tr>
            </table>
        </div>

        <p>Aguardamos por si! Por favor, chegue com alguns minutos de antecedência.</p>
        <p style="color: #6c757d; font-size: 14px;">Se precisar de cancelar ou reagendar, entre em contacto connosco o quanto antes.</p>
    </div>
    <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 14px;">
        <p>Esta é uma mensagem automática. Por favor, não responda a este email.</p>
    </div>
</div>
```

5. Clique em **"Save"**
6. **COPIE o Template ID** (ex: `template_xyz789`)

---

### 4. Obter Public Key (30 segundos)

1. No dashboard, vá em **"Account"** → **"General"**
2. Encontre a seção **"API Keys"**
3.  **COPIE sua Public Key** (ex: `user_abc123xyz`)

---

### 5. Configurar no Projeto

Abra o arquivo `.env` e adicione (ou edite se já existir):

```bash
VITE_EMAILJS_SERVICE_ID=SEU_SERVICE_ID_AQUI
VITE_EMAILJS_TEMPLATE_ID=SEU_TEMPLATE_ID_AQUI
VITE_EMAILJS_PUBLIC_KEY=SUA_PUBLIC_KEY_AQUI
```

**Substitua** pelos valores que copiou!

**Exemplo:**
```bash
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=user_abc123xyz
```

---

### 6. Reiniciar Servidor

```bash
# Pare o servidor (Ctrl + C)
# E inicie novamente:
npm run dev
```

---

## ✅ Testar

1. Acesse: `http://localhost:5173/admin/test-notifications`
2. Insira seu email
3. Clique em "🎫 Testar Confirmação de Marcação"
4. Verifique seu email (e pasta de spam!)

---

## 🎯 Resumo dos Passos

1. ✅ Criar conta no EmailJS
2. ✅ Configurar Email Service → Copiar **Service ID**
3. ✅ Criar Template → Copiar **Template ID**
4. ✅ Obter **Public Key** nas configurações
5. ✅ Adicionar as 3 chaves no `.env`
6. ✅ Reiniciar servidor
7. ✅ Testar!

---

## 📝 Notas Importantes

- **Limite Grátis:** 200 emails/mês
- **Tempo de envio:** 2-5 segundos
- **Entrega:** Pode levar 1-2 minutos para chegar
- **Spam:** Primeiros emails podem ir para spam

---

## ❓ Problemas?

### "EmailJS não configurado"
- ✅ Verifique se adicionou as 3 variáveis no `.env`
- ✅ Certifique-se que começam com `VITE_`
- ✅ Reiniciou o servidor?

### "Email não chega"
- ✅ Verifique pasta de spam
- ✅ Aguarde 1-2 minutos
- ✅ Verifique no dashboard do EmailJS se o email foi enviado (Email History)

### "Failed to send"
- ✅ Verifique se o Service ID, Template ID e Public Key estão corretos
- ✅ Acesse o dashboard do EmailJS para ver se há erros

---

**Bom trabalho! 🚀**
