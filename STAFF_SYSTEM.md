# Sistema de Múltiplos Profissionais por Estabelecimento

## 📋 Descrição

Sistema que permite que um estabelecimento tenha múltiplos profissionais, cada um com seu próprio horário de trabalho e agendamentos. Quando um cliente vai fazer uma marcação, primeiro escolhe o profissional desejado através de fotos de perfil, depois seleciona o serviço e horário disponível daquele profissional específico.

## ✨ Funcionalidades

### Para o Dono do Estabelecimento

#### 1. Gestão de Profissionais (`/dashboard/staff`)
- **Adicionar Profissionais**: Modal para adicionar novos profissionais à equipe
  - Nome completo
  - Email
  - Telefone
  - Profissão/Especialidade
  - Foto de perfil (URL)

- **Definir Horários Individuais**: Cada profissional tem seu horário próprio
  - Horários devem estar dentro do horário do estabelecimento
  - Configuração por dia da semana
  - Validação automática para garantir conformidade

- **Remover Profissionais**: Opção para remover membros da equipe

### Para os Clientes

#### Novo Fluxo de Agendamento (5 passos)

**Step 1: Escolher Profissional** ⭐ NOVO
- Interface visual com cards mostrando:
  - Foto de perfil ou avatar com inicial
  - Nome do profissional
  - Especialidade/Profissão
- Possibilidade de escolher o dono do estabelecimento ou qualquer membro da equipe
- Layout responsivo em grid (2 colunas quando há staff)

**Step 2: Escolher Serviço**
- Lista de serviços disponíveis do estabelecimento

**Step 3: Escolher Data e Horário**
- Calendário com próximos 14 dias
- Horários disponíveis baseados no profissional selecionado
- Mostra apenas slots livres do profissional específico

**Step 4: Confirmar Dados**
- Resumo da marcação incluindo:
  - Nome do profissional escolhido
  - Serviço selecionado
  - Data e hora
- Formulário com dados do cliente

**Step 5: Confirmação**
- Mensagem de sucesso
- Email enviado com detalhes da marcação

## 🗂️ Estrutura de Dados no Firestore

### Coleção: `professionals/{professionalId}/staff`
```javascript
{
  id: "auto-generated",
  name: "João Silva",
  email: "joao@example.com",
  phone: "912345678",
  photoUrl: "https://...",
  profession: "Barbeiro",
  establishmentId: "{professionalId}",
  createdAt: "2026-01-11T..."
}
```

### Documento: `professionals/{professionalId}/staff/{staffId}/settings/schedule`
```javascript
{
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: false, start: "09:00", end: "18:00" },
  sun: { enabled: false, start: "09:00", end: "18:00" }
}
```

### Coleção: `professionals/{professionalId}/staff/{staffId}/bookings`
```javascript
{
  id: "auto-generated",
  serviceId: "...",
  serviceName: "Corte de Cabelo",
  price: 15,
  duration: 30,
  date: "2026-01-15T14:30:00.000Z",
  clientName: "Maria Santos",
  clientEmail: "maria@example.com",
  clientPhone: "913456789",
  status: "confirmed",
  staffId: "{staffId}",
  staffName: "João Silva",
  createdAt: "2026-01-11T..."
}
```

## 🛠️ Arquivos Modificados

### Novos Arquivos
- `src/pages/ManageStaff.jsx` - Página de gestão de profissionais do estabelecimento

### Arquivos Modificados
- `src/App.jsx` - Adicionada rota `/dashboard/staff`
- `src/components/Layout.jsx` - Adicionado link "Profissionais" no menu
- `src/pages/ClientBooking.jsx` - Implementado sistema de seleção de profissional
  - Novo Step 1 para seleção de profissional
  - Modificado `fetchData()` para carregar staff
  - Modificado `generateSlots()` para usar horário do profissional selecionado
  - Modificado `handleBooking()` para salvar no path correto

## 📊 Lógica de Funcionamento

### Validações Implementadas

1. **Horários do Profissional**
   - Devem estar contidos no horário do estabelecimento
   - Validação antes de salvar: `schedule.start >= estStart && schedule.end <= estEnd`

2. **Geração de Slots**
   - Se staff selecionado: usa `staffMember.schedule` e `staffMember.bookings`
   - Se não: usa `establishments.schedule` e `establishmentBookings`

3. **Salvamento de Agendamentos**
   - Com staff: `professionals/{id}/staff/{staffId}/bookings`
   - Sem staff: `professionals/{id}/bookings`

## 🎨 Design e UX

### Seleção de Profissional
- Cards visuais com hover effects
- Fotos de perfil circulares (80x80px)
- Gradientes diferenciados:
  - Dono: `linear-gradient(135deg, var(--accent-primary), #60a5fa)`
  - Staff: `linear-gradient(135deg, #a855f7, #ec4899)`
- Animações suaves de elevação no hover

### Interface de Gestão
- Grid responsivo de profissionais
- Cards informativos com:
  - Avatar/foto
  - Informações de contato
  - Badge com horários ativos
  - Botões de ação (Horário, Remover)
- Modais modernos para adicionar/editar

## 🚀 Como Usar

### Para Estabelecimentos

1. **Acesse `/dashboard/staff`**
2. **Clique em "Adicionar Profissional"**
3. **Preencha os dados**:
   - Nome, email, telefone, profissão, URL da foto
4. **Defina o horário do profissional**:
   - Clique em "Horário"
   - Configure dias e horários (dentro do horário do estabelecimento)
   - Salve as alterações

### Para Clientes

1. **Acesse o link de agendamento** (`/book/{slug}`)
2. **Escolha o profissional** desejado
3. **Selecione o serviço**
4. **Escolha data e horário** disponíveis
5. **Confirme seus dados**
6. **Receba confirmação** por email

## ⚠️ Observações Importantes

- Se um estabelecimento não tiver profissionais adicionados, o cliente agenda diretamente com o dono
- Todos os profissionais compartilham os mesmos serviços do estabelecimento
- A remoção de um profissional não remove seus agendamentos históricos
- Horários de profissionais são validados contra o horário do estabelecimento em tempo real

## 🔄 Retrocompatibilidade

O sistema é totalmente retrocompatível:
- Estabelecimentos sem staff continuam funcionando normalmente
- Agendamentos existentes não são afetados
- A interface adapta-se automaticamente (mostra ou oculta a seleção de profissional)

## 🎯 Próximas Melhorias Sugeridas

- [ ] Permitir que profissionais tenham login próprio
- [ ] Sistema de comissões por profissional
- [ ] Relatórios individuais de performance
- [ ] Cliente poder marcar com "qualquer profissional disponível"
- [ ] Preferências de cliente (profissional favorito)
