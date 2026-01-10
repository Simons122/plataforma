# ⚡ Quick Start: Envio de Emails com Resend

## 🎯 Setup Completo em 3 Comandos

```bash
# 1. Fazer login no Firebase
firebase login

# 2. Configurar API key do Resend
firebase functions:config:set resend.apikey="re_JkSoXJEA_67PFABbLLKUofogWCC87Xutp"

# 3. Deploy!
firebase deploy --only functions
```

Aguarde 2-5 minutos... ✅ **PRONTO!**

---

## 📧 Como Funciona

1. Cliente faz marcação → `ClientBooking.jsx`
2. Marcação salva no Firestore
3. Cloud Function `sendBookingEmail` é chamada automaticamente
4. Resend envia email profissional ao cliente
5. Cliente recebe email bonito com detalhes da marcação

**Tudo automático!** 🎉

---

## 🧪 Testar

Faça uma marcação na aplicação com seu email e verifique a caixa de entrada!

Para ver logs:
```bash
firebase functions:log --only sendBookingEmail
```

---

## 📖 Documentação Completa

Leia: **DEPLOY_FIREBASE_FUNCTIONS.md**

---

**Dúvidas? Veja os logs ou consulte a documentação!**
