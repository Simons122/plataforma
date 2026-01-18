# 🚀 Configurar Resend no Vercel

## ✅ O Que Foi Criado

Criamos uma **Serverless Function** no Vercel que envia emails via Resend:
- Arquivo: `/api/send-booking-email.js`
- Será deployada automaticamente no Vercel
- URL: `https://plataforma-tau.vercel.app/api/send-booking-email`

---

## 📋 Passo a Passo

### **1. Fazer Push das Alterações**

Execute no terminal:

```bash
# Adicionar novos arquivos
git add .

# Commit
git commit -m "feat: Add Vercel serverless function for emails"

# Push para GitHub
git push origin main
```

O Vercel vai fazer deploy automaticamente! 🎉

---

### **2. Configurar Variável de Ambiente no Vercel**

⚠️ **IMPORTANTE:** A API key do Resend precisa estar no Vercel!

1. **Acesse:** https://vercel.com/seu-usuario/plataforma
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_JkSoXJEA_67PFABbLLKUofogWCC87Xutp`
   - **Environments:** ✅ Production ✅ Preview ✅ Development
4. Clique **Save**

---

### **3. Fazer Redeploy**

Depois de adicionar a variável:

1. Vá em **Deployments**
2. Clique nos **3 pontinhos** (⋯) do último deploy
3. Escolha **Redeploy**
4. Confirme

Ou simplesmente faça outro push!

---

## ✅ Testar

1. Acesse: `https://plataforma-tau.vercel.app`
2. Faça uma marcação de teste
3. Verifique seu email!

---

## 🔍 Verificar Logs

Se houver erro, veja os logs:

1. Vercel Dashboard → **Functions**
2. Clique em `send-booking-email`
3. Veja logs de execução

---

## 📧 Configurar Domínio Verificado (OPCIONAL)

Para enviar para QUALQUER email (não só o seu):

### **No Resend:**

1. Acesse: https://resend.com/domains
2. Clique **Add Domain**
3. Digite: `plataforma-tau.vercel.app`
4. Copie os DNS records

### **No Vercel:**

1. Dashboard → **Settings** → **Domains**
2. Clique em `plataforma-tau.vercel.app`
3. **Vai em DNS settings** (se disponível)
4. Adicione os records do Resend

**OU use um domínio próprio!**

---

## 🎯 Resumo Rápido

```bash
# 1. Push código
git add .
git commit -m "Add email API"
git push

# 2. Configurar no Vercel
# - Settings → Environment Variables
# - Adicionar RESEND_API_KEY

# 3. Redeploy

# 4. Testar! ✅
```

---

**Pronto! Emails funcionando em produção! 🎉**
