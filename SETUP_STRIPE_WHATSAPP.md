# 🚀 Guia de Configuração: Stripe + WhatsApp API

## 📋 Índice
1. [Configuração do Stripe](#stripe)
2. [Configuração do WhatsApp](#whatsapp)
3. [Fluxo de Pagamento](#fluxo)
4. [Deploy no Vercel](#deploy)

---

## 💳 CONFIGURAÇÃO DO STRIPE

### Passo 1: Criar conta Stripe
1. Acesse: https://stripe.com
2. Clique em "Start now"
3. Crie sua conta com email

### Passo 2: Obter API Keys
1. Acesse: https://dashboard.stripe.com/apikeys
2. Copie a **Publishable key** (começa com `pk_test_`)
3. Copie a **Secret key** (começa com `sk_test_`)

### Passo 3: Adicionar ao .env (local)
```bash
# Frontend (pode expor)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_seu_key_aqui

# Backend (NUNCA expor)
STRIPE_SECRET_KEY=sk_test_seu_key_aqui
```

### Passo 4: Criar Produto no Stripe (Opcional)
1. Vá em https://dashboard.stripe.com/products
2. Clique em "Add product"
3. Configure:
   - Name: `Booklyo Pro`
   - Description: `Sistema completo de marcações online`
   - Price: `15,00 €` / `month` / `recurring`
4. Copie o **Price ID** (começa com `price_`)
5. Adicione ao .env:
```bash
VITE_STRIPE_PRICE_ID=price_seu_id_aqui
```

### Passo 5: Configurar Webhook (Para Vercel)
1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. Configure:
   - URL: `https://seu-dominio.vercel.app/api/stripe-webhook`
   - Eventos a ouvir:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Copie o **Webhook Secret** (começa com `whsec_`)
5. Adicione às variáveis do Vercel:
```bash
STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
```

---

## 💬 CONFIGURAÇÃO DO WHATSAPP

### Opção Recomendada: Twilio

#### Passo 1: Criar conta Twilio
1. Acesse: https://www.twilio.com/try-twilio
2. Crie conta (vai pedir verificação de telefone)
3. Confirme email

#### Passo 2: Configurar WhatsApp Sandbox
1. No dashboard, vá em **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Siga as instruções para conectar seu WhatsApp
3. Envie mensagem do seu WhatsApp para o número Twilio:
   - Número: `+1 415 523 8886`
   - Mensagem: `join <código-fornecido>` (ex: `join happy-tiger`)

#### Passo 3: Obter Credenciais
1. No dashboard principal:
   - **Account SID**: está na página inicial
   - **Auth Token**: clique em "Show" para ver
2. O número do WhatsApp sandbox é: `whatsapp:+14155238886`

#### Passo 4: Adicionar ao .env
```bash
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
VITE_TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

#### ⚠️ Importante: Limitações do Sandbox
- Só pode enviar para números que fizeram "join" no sandbox
- Perfeito para testes de desenvolvimento
- Para produção: aplique para número próprio (1-2 semanas de aprovação)

---

## 🔄 FLUXO DE PAGAMENTO

### 1. Registo do Profissional
```
User cria conta → paymentStatus: 'trial' → trialEndsAt: +5 dias
```

### 2. Período de Trial (5 dias)
- ✅ Acesso completo ao dashboard
- ✅ Pode criar serviços e horários
- ✅ Pode receber marcações
- ⚠️ Banner lembrando do trial

### 3. Após Trial (se não pagar)
```
paymentStatus: 'expired' → dashboard bloqueado
```
- ❌ Não recebe novas marcações
- ❌ Dashboard inacessível
- ✅ Pode aceder à página de pricing

### 4. Após Pagamento
```
Stripe webhook → paymentStatus: 'active' → acesso desbloqueado
```
- ✅ Tudo desbloqueado automaticamente
- ✅ Renovação automática mensal

---

## 🌐 DEPLOY NO VERCEL

### Variáveis de Ambiente (Vercel Dashboard)

Vá em **Settings** → **Environment Variables** e adicione:

#### Stripe (Obrigatório)
| Nome | Valor |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` ou `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

#### Stripe Frontend (Opcional - pode estar no .env.local)
| Nome | Valor |
|------|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `VITE_STRIPE_PRICE_ID` | `price_...` (opcional) |

#### WhatsApp/Twilio
| Nome | Valor |
|------|-------|
| `VITE_TWILIO_ACCOUNT_SID` | `ACxxxx...` |
| `VITE_TWILIO_AUTH_TOKEN` | `xxxxx...` |
| `VITE_TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` |

#### Email
| Nome | Valor |
|------|-------|
| `VITE_RESEND_API_KEY` | `re_...` |

#### Firebase Admin (para webhooks)
| Nome | Valor |
|------|-------|
| `FIREBASE_PROJECT_ID` | `seu-projeto` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` |

---

## 🧪 TESTAR LOCALMENTE

### 1. Stripe CLI (para testar webhooks)
```bash
# Instalar
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:5173/api/stripe-webhook

# Copiar o webhook secret que aparece
```

### 2. Testar Pagamento
1. Ir para http://localhost:5173/pricing
2. Clicar em "Subscrever Agora"
3. Usar cartão de teste: `4242 4242 4242 4242`
4. Data: qualquer futura, CVV: qualquer 3 dígitos

### 3. Testar WhatsApp
1. Garantir que seu número fez "join" no sandbox Twilio
2. Criar uma marcação de teste
3. Verificar se recebeu a mensagem

---

## 📝 CHECKLIST FINAL

### Antes de ir para Produção:

- [ ] Trocar chaves Stripe de `test` para `live`
- [ ] Configurar webhook com URL de produção
- [ ] Aplicar para número WhatsApp próprio (Twilio)
- [ ] Configurar domínio de email (Resend)
- [ ] Testar fluxo completo de ponta a ponta
- [ ] Verificar que trial expira corretamente
- [ ] Verificar que pagamento ativa a conta

---

## 🆘 TROUBLESHOOTING

### Stripe
- **Pagamento não funciona**: Verifique se `STRIPE_SECRET_KEY` está nas variáveis do Vercel
- **Webhook não atualiza**: Verifique `STRIPE_WEBHOOK_SECRET` e os logs do Vercel

### WhatsApp
- **Mensagem não enviada**: Destinatário fez "join" no sandbox?
- **Erro de autenticação**: Verifique `TWILIO_AUTH_TOKEN`

### Firebase Admin
- **Webhook não atualiza Firestore**: Verifique as credenciais do Firebase Admin
- **Erro de private key**: A chave deve ter `\n` escapados corretamente

---

**Boa sorte! 🚀**
