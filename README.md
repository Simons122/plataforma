# 📅 Booklyo - Plataforma de Agendamentos Online

Sistema completo de gestão de marcações para profissionais autónomos. Uma solução moderna e intuitiva que permite a profissionais de diversas áreas gerir os seus serviços, horários e clientes — tudo numa única plataforma.

## ✨ O que é o Booklyo?

O Booklyo é uma **Progressive Web App (PWA)** que transforma a forma como profissionais independentes gerem as suas marcações. Seja barbeiro, personal trainer, tatuador, explicador ou freelancer, o Booklyo oferece todas as ferramentas necessárias para profissionalizar o seu negócio.

## 🎯 Funcionalidades

### 👤 Para Profissionais
- **Dashboard Completo** — Estatísticas em tempo real (marcações do dia/mês, receita, clientes ativos)
- **Gestão de Serviços** — Criar, editar e eliminar serviços com preço, duração e tempo de buffer
- **Horários Flexíveis** — Configurar dias de trabalho, pausas, feriados e horários especiais
- **Gestão de Staff** — Adicionar colaboradores para marcações em equipa
- **Perfil Personalizado** — Upload de logo, descrição do negócio e página pública única
- **Link de Marcação** — Página pública personalizada (`/book/seu-nome`) para partilhar com clientes
- **Notificações por Email** — Confirmações automáticas enviadas aos clientes
- **Histórico Completo** — Visualização de todas as marcações passadas e futuras

### 👥 Para Clientes
- **Explorar Profissionais** — Descobrir profissionais disponíveis por categoria
- **Marcação Simples** — Selecionar serviço, data e horário disponível em poucos cliques
- **Conta de Cliente** — Registo com email ou Google para gerir marcações
- **Histórico de Marcações** — Ver marcações passadas e futuras
- **Favoritos** — Guardar profissionais favoritos para acesso rápido
- **Confirmação por Email** — Receber confirmação automática de cada marcação
- **Interface Responsiva** — Funciona perfeitamente em mobile e desktop

### 👨‍💼 Para Administradores
- **Painel Administrativo** — Visão geral de toda a plataforma
- **Gestão de Utilizadores** — Visualizar e gerir profissionais registados
- **Controlo de Pagamentos** — Ativar/desativar acesso de profissionais (pending/active/expired)
- **Super Admin** — Promover ou remover administradores
- **Estatísticas Globais** — Métricas completas da plataforma

### 🔐 Segurança
- **Autenticação Firebase** — Login seguro com email/password ou Google
- **Indicador de Força de Password** — Barra visual de vermelho a verde com requisitos claros
- **Mostrar/Esconder Password** — Botão de olho para visualizar a password
- **Regras de Firestore** — Proteção de dados ao nível da base de dados
- **Validação de Dados** — Sanitização de inputs em todo o sistema

## 🚀 Tecnologias

- **Frontend:** React 19 + Vite
- **Routing:** React Router DOM v7
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Hosting:** Vercel
- **Email:** Resend API
- **Estilo:** CSS Custom Properties (Dark Mode)
- **Ícones:** Lucide React
- **Datas:** date-fns
- **PWA:** Vite PWA Plugin

## ⚙️ Configuração

### 1. Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative Authentication (Email/Password + Google)
3. Crie um banco Firestore
4. Ative Storage
5. Copie as credenciais para o arquivo `src/lib/firebase.js`

### 2. Resend (Email)

1. Crie uma conta em [Resend](https://resend.com)
2. Verifique o seu domínio
3. Adicione a API key às variáveis de ambiente da Vercel:
   ```
   RESEND_API_KEY=re_sua_chave_aqui
   ```

### 3. Vercel

1. Conecte o repositório GitHub à Vercel
2. Configure as variáveis de ambiente necessárias
3. Deploy automático a cada push

## 🏃 Executar Localmente

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build
```

Acesse: http://localhost:5173

## 👨‍💻 Autor

**Simão** - [GitHub](https://github.com/Simons122)

---

**🎉 Booklyo — A sua agenda, simplificada.**
