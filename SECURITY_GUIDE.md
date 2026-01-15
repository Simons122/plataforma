# 🛡️ BOOKLYO - GUIA DE SEGURANÇA MÁXIMA
## Documentação Completa de Segurança

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Camadas de Segurança](#camadas-de-segurança)
3. [Configuração](#configuração)
4. [Firebase App Check](#firebase-app-check)
5. [Rate Limiting](#rate-limiting)
6. [Audit Logging](#audit-logging)
7. [Encriptação](#encriptação)
8. [Boas Práticas](#boas-práticas)
9. [Checklist de Segurança](#checklist-de-segurança)

---

## 🎯 Visão Geral

A Booklyo implementa **7 camadas de segurança** para proteção máxima:

| Camada | Tecnologia | Proteção |
|--------|------------|----------|
| 1 | Firebase Auth | Autenticação segura |
| 2 | Firestore Rules | Controlo de acesso granular |
| 3 | Storage Rules | Proteção de ficheiros |
| 4 | App Check | Anti-bot e anti-abuse |
| 5 | Rate Limiting | Anti-brute-force |
| 6 | Audit Logging | Rastreabilidade RGPD |
| 7 | Encriptação | Proteção de dados sensíveis |

---

## 🔐 Camadas de Segurança

### Camada 1: Firebase Authentication
- Login seguro com email/password
- Suporte para OAuth (Google, etc)
- Tokens JWT com expiração automática
- Verificação de email

### Camada 2: Firestore Security Rules
```javascript
// ✅ Default Deny - Tudo bloqueado por defeito
match /{document=**} {
  allow read, write: if false;
}

// ✅ Validação de dados em todas as operações
allow create: if request.resource.data.keys().hasAll(['name', 'email'])
  && isValidString(request.resource.data.name, 100)
  && isValidEmail(request.resource.data.email);
```

### Camada 3: Rate Limiting
```javascript
// Limites configurados:
login: 5 tentativas / 15 minutos
register: 3 tentativas / hora
booking: 10 por hora
api: 100 requests / minuto
```

### Camada 4: Audit Logging
Todos os eventos críticos são registados:
- Login/Logout
- Alterações de dados
- Operações de admin
- Eventos de segurança

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicione ao seu ficheiro `.env`:

```env
# Firebase (obrigatório)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id

# Segurança Avançada (opcional mas recomendado)
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-v3-key
VITE_ENCRYPTION_KEY=your-secret-encryption-key-min-32-chars

# Stripe (para pagamentos)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email
RESEND_API_KEY=re_...
```

### 2. Inicializar Segurança

No seu `main.jsx` ou `App.jsx`:

```javascript
import { initializeSecuritySystems } from './lib/securityCenter';

// Inicializar no arranque da app
useEffect(() => {
  initializeSecuritySystems();
}, []);
```

---

## 🤖 Firebase App Check

### O que é?
Bloqueia acesso de:
- Bots automatizados
- Scripts maliciosos
- Aplicações não autorizadas
- Emuladores/simuladores

### Configurar reCAPTCHA v3

1. Vá a [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Crie um novo site com reCAPTCHA v3
3. Adicione os domínios:
   - `localhost`
   - `booklyo.pt`
   - `*.vercel.app`
4. Copie a **Site Key** para `VITE_RECAPTCHA_SITE_KEY`
5. No Firebase Console:
   - Vá a **Project Settings > App Check**
   - Registre a sua app com a **Secret Key**

---

## ⏱️ Rate Limiting

### Configuração Padrão

| Ação | Limite | Janela | Bloqueio |
|------|--------|--------|----------|
| Login | 5 tentativas | 15 min | 30 min |
| Registo | 3 tentativas | 1 hora | 1 hora |
| Password Reset | 3 tentativas | 1 hora | 1 hora |
| Booking | 10 por cliente | 1 hora | 30 min |
| API geral | 100 requests | 1 min | 5 min |
| Upload | 5 ficheiros | 1 hora | 1 hora |

### Uso no Código

```javascript
import { checkRateLimit, withRateLimit } from './lib/rateLimiter';

// Verificar antes de ação
const check = checkRateLimit('login', userEmail);
if (!check.allowed) {
  alert(check.message); // "Demasiadas tentativas. Tente em 5 minutos."
  return;
}

// Ou usar wrapper automático
await withRateLimit('login', userEmail, async () => {
  await signInWithEmailAndPassword(auth, email, password);
});
```

---

## 📋 Audit Logging

### Eventos Registados

**Autenticação:**
- `auth.login.success` - Login com sucesso
- `auth.login.failed` - Tentativa falhada
- `auth.logout` - Logout
- `auth.password.reset` - Reset de password

**Dados:**
- `professional.created/updated/deleted`
- `service.created/updated/deleted`
- `booking.created/cancelled`

**Segurança:**
- `security.suspicious` - Atividade suspeita
- `security.ratelimit` - Rate limit atingido
- `security.invalid.access` - Acesso não autorizado

### Visualizar Logs (Admin)

```javascript
import { getAuditLogs } from './lib/auditLog';

// Obter últimos 50 logs
const logs = await getAuditLogs();

// Filtrar por tipo
const securityLogs = await getAuditLogs({ 
  severity: 'critical' 
}, 100);
```

---

## 🔒 Encriptação

### Dados Encriptados
- Notas sensíveis de clientes
- Backups de dados
- Tokens temporários

### Uso

```javascript
import { encryptData, decryptData, maskEmail } from './lib/encryption';

// Encriptar
const encrypted = await encryptData('dados sensíveis');
// Resultado: "U2FsdGVkX1+..."

// Desencriptar
const original = await decryptData(encrypted);

// Mascarar para display
maskEmail('cliente@email.com'); // "c***e@e***l.com"
maskPhone('+351912345678');      // "+351***5678"
```

---

## ✅ Boas Práticas

### 1. Nunca confiar no cliente
```javascript
// ❌ MAU
const userData = req.body; // Usar diretamente

// ✅ BOM
const userData = {
  name: sanitizeText(req.body.name, 100),
  email: sanitizeEmail(req.body.email),
  phone: sanitizePhone(req.body.phone)
};
```

### 2. Verificar permissões no servidor
```javascript
// ❌ MAU - Apenas verificar no frontend
if (user.role === 'admin') { showAdminPanel(); }

// ✅ BOM - Verificar também nas Firestore Rules
allow write: if isAdmin();
```

### 3. Usar HTTPS sempre
```javascript
// Em produção, todas as chamadas devem ser HTTPS
const API_URL = import.meta.env.PROD 
  ? 'https://api.booklyo.pt' 
  : 'http://localhost:3000';
```

### 4. Logs sem dados sensíveis
```javascript
// ❌ MAU
console.log('Login:', email, password);

// ✅ BOM
console.log('Login attempt:', maskEmail(email));
```

---

## 📝 Checklist de Segurança

### Antes de ir para Produção:

- [ ] Firestore Rules testadas e deployadas
- [ ] Storage Rules testadas e deployadas
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] reCAPTCHA v3 configurado
- [ ] Domínios autorizados no Firebase Console
- [ ] HTTPS forçado
- [ ] CORS restrito a domínios conhecidos
- [ ] Rate limiting ativo
- [ ] Audit logging funcional
- [ ] Backups automáticos configurados
- [ ] Alertas de segurança configurados

### Testes de Segurança:

```bash
# Testar rate limiting
for i in {1..10}; do curl -X POST /api/login; done

# Verificar headers de segurança
curl -I https://booklyo.pt | grep -i security

# Verificar CSP
curl -I https://booklyo.pt | grep -i content-security
```

---

## 🚨 Em Caso de Incidente

1. **Identificar** - Verificar audit logs para atividade suspeita
2. **Conter** - Bloquear IPs/utilizadores se necessário
3. **Comunicar** - Notificar utilizadores afetados (RGPD)
4. **Corrigir** - Aplicar patches de segurança
5. **Documentar** - Registar incidente para análise

### Contatos de Emergência
- Firebase Support: https://firebase.google.com/support
- Vercel Security: security@vercel.com

---

## 📚 Recursos Adicionais

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [RGPD Guidelines](https://gdpr.eu/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

*Última atualização: Janeiro 2026*
*Versão: 2.0 - Segurança Máxima*
