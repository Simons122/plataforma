# 🌐 Verificar Domínio no Resend (OBRIGATÓRIO para produção)

## ❓ Por que preciso?

O domínio de teste `onboarding@resend.dev` **só envia para o email da sua conta Resend** (`geralbooklyo@gmail.com`).

Para enviar para **QUALQUER cliente**, precisa verificar um domínio próprio!

---

## 🎯 Opções:

### **Opção 1: Tem domínio próprio?** (Ex: `meusite.com`)

✅ **Melhor opção!** Use o domínio que já tem.

---

### **Opção 2: Comprar domínio** (€1-10/ano)

Domínios baratos:
- **Namecheap:** https://www.namecheap.com (~€1/ano `.xyz`, `.com` ~€10)
- **Porkbun:** https://porkbun.com (~€1/ano)
- **Hostinger:** https://www.hostinger.pt (~€1/ano)

Exemplos de domínios:
- `plataforma-agendamentos.com`
- `bookly.pt`
- `agendamento-facil.com`

---

## 📋 Como Verificar Domínio no Resend

### **Passo 1: Adicionar Domínio**

1. Acesse: https://resend.com/domains
2. Clique **"Add Domain"**
3. Digite seu domínio (ex: `meusite.com`)
4. Clique **"Add"**

---

### **Passo 2: Configurar DNS**

Resend vai mostrar 3 records DNS:

#### **SPF Record (TXT)**
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

#### **DKIM Record (TXT)**
```
Type: TXT  
Name: resend._domainkey
Value: [valor único fornecido pelo Resend]
```

#### **DMARC Record (TXT - Opcional mas recomendado)**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:geralbooklyo@gmail.com
```

---

### **Passo 3: Adicionar no Painel do Domínio**

**Onde adicionar:**
- Se comprou no **Namecheap:** Dashboard → Domain List → Manage → Advanced DNS
- Se comprou no **Hostinger:** Hepsia → DNS Zone Editor
- Se usa **Cloudflare:** DNS → Records

**Como adicionar:**
1. Clique "Add New Record"
2. Escolha tipo **TXT**
3. Copie/cole os valores do Resend
4. Salve

---

### **Passo 4: Aguardar Verificação**

- Resend verifica automaticamente (5-30 minutos)
- Status muda para **"Verified" ✅**

---

### **Passo 5: Atualizar Código**

Depois de verificado, atualize o arquivo `/api/send-booking-email.js`:

**Troque:**
```javascript
from: 'Plataforma <onboarding@resend.dev>',
```

**Por:**
```javascript
from: 'Plataforma <noreply@SEUDOMINIO.com>',
```

**Comite e push:**
```bash
git add .
git commit -m "Update email from address to verified domain"
git push
```

---

## ✅ Testar

Depois do deploy:
1. Faça uma marcação com **QUALQUER email**
2. Email vai chegar! 🎉

---

## 🚨 Troubleshooting

### "Domain not verified"
- Aguarde até 30 minutos
- Verifique se os DNS records estão corretos
- Use ferramenta: https://mxtoolbox.com/SuperTool.aspx

### "SPF record already exists"
- Edite o SPF existente
- Adicione `include:resend.com` antes do `~all`
- Exemplo: `v=spf1 include:existing.com include:resend.com ~all`

### Quanto tempo demora?
- DNS propaga em 5-30 minutos normalmente
- Pode demorar até 24h em casos raros

---

## 💰 Custos

- **Domínio `.xyz`:** ~€1/ano
- **Domínio `.com`:** ~€10/ano
- **Resend:** Grátis até 3,000 emails/mês

**Total:** €1-10/ano + €0/mês 🎯

---

## 🎊 Depois de Configurar

Você pode enviar emails para QUALQUER cliente! ✅

O email virá de: `noreply@seudominio.com`

Fica muito mais profissional! 📧

---

**Tem algum domínio próprio? Me diga e te ajudo a configurar!** 🚀
