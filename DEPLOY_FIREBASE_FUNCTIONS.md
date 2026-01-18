# 🚀 Guia: Deploy Firebase Cloud Functions com Resend

## 📋 O Que Foi Criado

Criamos uma **Cloud Function do Firebase** que:
- ✅ Roda no servidor (backend seguro)
- ✅ Envia emails via Resend
- ✅ Protege sua API key
- ✅ É chamada automaticamente ao fazer marcação

---

## 🔧 Passo a Passo para Deploy

### 1. Instalar Firebase CLI (se ainda não tem)

```bash
npm install -g firebase-tools
```

### 2. Fazer Login no Firebase

```bash
firebase login
```

### 3. Inicializar Firebase Functions (se necessário)

```bash
firebase init functions
```

Selecione:
- ✅ Use an existing project
- ✅ Escolha **platforma-e0c48**
- ✅ JavaScript
- ✅ ESLint: No (ou Yes, como preferir)
- ✅ Install dependencies: Yes

### 4. Instalar Dependências nas Functions

```bash
cd functions
npm install
cd ..
```

### 5. Configurar API Key do Resend

⚠️ **IMPORTANTE**: A API key fica no servidor, não no código!

```bash
firebase functions:config:set resend.apikey="re_JkSoXJEA_67PFABbLLKUofogWCC87Xutp"
```

Para verificar:
```bash
firebase functions:config:get
```

### 6. Deploy da Cloud Function

```bash
firebase deploy --only functions
```

Aguarde... pode demorar 2-5 minutos.

✅ **Quando terminar**, verá a URL da função:
```
✔  functions[sendBookingEmail(us-central1)]: Successful create operation.
Function URL: https://us-central1-platforma-e0c48.cloudfunctions.net/sendBookingEmail
```

---

## 🧪 Testar Localmente (OPCIONAL)

Antes de fazer deploy, pode testar localmente:

### 1. Instalar Emuladores

```bash
firebase init emulators
```

Selecione:
- ✅ Functions
- ✅ Use as portas padrão

### 2. Rodar Emuladores

```bash
firebase emulators:start
```

### 3. Configurar .env local para emulador

Adicione ao `.env`:
```
VITE_USE_EMULATOR=true
```

### 4. Atualizar firebase.js para usar emulador

```javascript
import { connectFunctionsEmulator } from 'firebase/functions';

// ... existing code ...

export const functions = getFunctions(app);

// Apenas em desenvolvimento
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
```

---

## ✅ Verificar se Funcionou

### 1. Verificar Logs

```bash
firebase functions:log
```

### 2. Fazer uma Marcação de Teste

1. Acesse sua aplicação
2. Faça uma marcação com seu email
3. Verifique:
   - ✅ Marcação criada no Firestore
   - ✅ Email recebido (verifique spam também!)
   - ✅ Logs no Firebase mostram sucesso

### 3. Ver Logs no Console do Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione projeto **platforma-e0c48**
3. Vá em **Functions** → **Logs**
4. Veja execuções da função `sendBookingEmail`

---

## 💰 Custos

### Firebase Cloud Functions
- ✅ **GRÁTIS**: 2M invocações/mês
- ✅ **GRÁTIS**: 400,000 GB-segundos/mês
- ✅ **GRÁTIS**: 200,000 CPU-segundos/mês

**Para esta função simples de email: TOTALMENTE GRÁTIS** até milhares de emails/mês!

### Resend
- ✅ **GRÁTIS**: 3,000 emails/mês
- 💰 Depois: $20/mês para 50,000 emails

---

## 🔥 Comandos Úteis

### Ver logs em tempo real
```bash
firebase functions:log --only sendBookingEmail
```

### Fazer deploy apenas desta função
```bash
firebase deploy --only functions:sendBookingEmail
```

### Ver configurações
```bash
firebase functions:config:get
```

### Apagar configuração (se precisar)
```bash
firebase functions:config:unset resend.apikey
```

### Verificar quota/uso
- Firebase: https://console.firebase.google.com → Usage
- Resend: https://resend.com/dashboard → Usage

---

## 🚨 Troubleshooting

### Erro: "RESEND_API_KEY não configurada"
```bash
firebase functions:config:set resend.apikey="SUA_CHAVE_AQUI"
firebase deploy --only functions
```

### Erro: "Permission denied"
- Verifique que está logado: `firebase login`
- Verifique o projeto: `firebase use platforma-e0c48`

### Email não chega
1. ✅ Verifique logs: `firebase functions:log`
2. ✅ Verifique pasta de spam
3. ✅ Verifique dashboard Resend: https://resend.com/emails

### Function muito lenta
- Primeira execução é sempre lenta (cold start ~5s)
- Execuções seguintes: <1s

### Erro CORS
- Cloud Functions não têm CORS! São chamadas diretamente via SDK
- Se ver erro CORS, está chamando errado

---

## 📚 Próximos Passos

### 1. Domínio Próprio no Resend (Recomendado)

Atualmente usa: `onboarding@resend.dev`
Melhor usar: `noreply@seudominio.com`

**Como configurar:**
1. Acesse Resend Dashboard → Domains
2. Adicione seu domínio
3. Configure DNS records (SPF, DKIM, DMARC)
4. Atualize `from:` no `functions/index.js`

### 2. Adicionar Mais Notificações

Pode criar funções para:
- 📧 Lembrete 24h antes da marcação
- 📧 Email de agradecimento pós-serviço
- 📧 Notificar profissional de nova marcação
- 📧 Email de cancelamento

### 3. Monitoramento

Configure alertas no Firebase para:
- Erros nas functions
- Uso acima do esperado
- Falhas de email

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] Cloud Function deployed com sucesso
- [ ] Resend API key configurada no Firebase
- [ ] Testado com marcação real
- [ ] Email chegando corretamente
- [ ] Logs sem erros
- [ ] Removido variáveis de teste do código
- [ ] (Opcional) Domínio próprio configurado no Resend

---

**🎉 Parabéns! Seu sistema de emails está pronto para produção!**

Qualquer dúvida, consulte:
- Firebase Docs: https://firebase.google.com/docs/functions
- Resend Docs: https://resend.com/docs
