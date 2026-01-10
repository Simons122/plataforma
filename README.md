# 📅 Plataforma de Agendamentos

Sistema completo de gestão de agendamentos para profissionais autônomos, com painel administrativo e página de marcação para clientes.

## ✨ Funcionalidades

### 👤 Para Profissionais
- ✅ Dashboard com estatísticas (marcações, receita, clientes)
- ✅ Gestão de serviços (criar, editar, eliminar)
- ✅ Configuração de horários de trabalho
- ✅ Visualização de agenda de marcações
- ✅ Upload de logo e personalização de perfil
- ✅ Página pública personalizada para receber marcações

### 👨‍💼 Para Administradores
- ✅ Gestão de utilizadores profissionais
- ✅ Controlo de status de pagamento
- ✅ Promoção/remoção de administradores
- ✅ Estatísticas globais da plataforma
- ✅ Super Admin com permissões elevadas

### 👥 Para Clientes
- ✅ Página de marcação pública (`/book/slug`)
- ✅ Seleção de serviços
- ✅ Escolha de data e horário disponível
- ✅ Confirmação automática por email
- ✅ Interface moderna e responsiva

## 🚀 Tecnologias

- **Frontend:** React 19 + Vite
- **Routing:** React Router DOM v7
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Email:** Resend API (via servidor Express.js)
- **Estilo:** CSS Custom Properties (Dark Mode)
- **Ícones:** Lucide React
- **Datas:** date-fns

## 📦 Instalação

```bash
# Clonar repositório
git clone https://github.com/Simons122/plataforma.git
cd plataforma

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

## ⚙️ Configuração

### 1. Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password)
3. Crie um banco Firestore
4. Ative Storage
5. Copie as credenciais para o arquivo `src/lib/firebase.js`

### 2. Resend (Email)

1. Crie uma conta em [Resend](https://resend.com)
2. Obtenha sua API key
3. Adicione ao `.env`:
   ```
   VITE_RESEND_API_KEY=re_sua_chave_aqui
   ```

## 🏃 Executar

```bash
# Desenvolvimento (Frontend)
npm run dev

# Servidor de Email (Backend)
npm run server

# Executar ambos em terminais separados
```

Acesse:
- **Frontend:** http://localhost:5173
- **API Email:** http://localhost:3001

## 📧 Sistema de Emails

O sistema envia emails automáticos de confirmação de marcação usando Resend.

**Importante:** Para produção, configure um domínio verificado no Resend.

Veja: `DEPLOY_FIREBASE_FUNCTIONS.md` para instruções completas.

## 🗂️ Estrutura do Projeto

```
plataforma/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── pages/           # Páginas da aplicação
│   ├── lib/             # Configurações (Firebase, etc)
│   └── index.css        # Estilos globais
├── functions/           # Cloud Functions (opcional)
├── server.js           # Servidor Express para emails
├── .env                # Variáveis de ambiente (não commitado)
└── README.md
```

## 👥 Tipos de Utilizadores

### Professional (Profissional)
- Acesso ao dashboard pessoal
- Gestão de serviços e agenda
- Perfil público para clientes

### Admin (Administrador)
- Acesso ao painel admin
- Gestão de utilizadores
- Visualização de estatísticas

### Super Admin
- Todas as permissões de Admin
- Pode promover/remover outros admins
- Badge especial no dashboard

## 🎨 Design

- **Dark Mode** elegante como padrão
- **Gradientes** roxo/azul para destaques
- **Animações** suaves e micro-interações
- **Responsivo** para mobile e desktop
- **Glassmorphism** e sombras modernas

## 📝 Licença

Este projeto é privado.

## 👨‍💻 Autor

**Simão** - [GitHub](https://github.com/Simons122)

---

**🎉 Plataforma em desenvolvimento ativo!**
