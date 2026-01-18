# Script para fazer push para GitHub
# Execute este arquivo em um NOVO PowerShell/Terminal

# Navegar para o diretório do projeto
cd "c:/Users/User/.gemini/antigravity/scratch/solo-scheduler/lib/Plataforma"

# Configurar Git (primeira vez - ajuste com seu nome e email)
git config --global user.name "Simao"
git config --global user.email "devpages4@gmail.com"

# Inicializar repositório Git
git init

# Adicionar todos os arquivos (respeitando .gitignore)
git add .

# Verificar o que será commitado (IMPORTANTE: .env NÃO deve aparecer!)
Write-Host "`n=== Arquivos que serão commitados ===" -ForegroundColor Cyan
git status

Write-Host "`n⚠️  ATENÇÃO: Verifique se .env NÃO está na lista acima!" -ForegroundColor Yellow
Write-Host "Se .env aparecer, PARE E NÃO CONTINUE!`n" -ForegroundColor Red

# Perguntar se quer continuar
$continue = Read-Host "Continuar com o commit? (S/N)"

if ($continue -eq "S" -or $continue -eq "s") {
    # Fazer commit
    git commit -m "Initial commit - Plataforma de Agendamentos

    ✨ Funcionalidades:
    - Dashboard para profissionais e admins
    - Sistema de marcações online
    - Gestão de serviços e horários
    - Envio de emails via Resend
    - Autenticação Firebase
    - Interface moderna em dark mode
    "

    # Adicionar remote do GitHub
    git remote add origin https://github.com/Simons122/plataforma.git

    # Renomear branch para main
    git branch -M main

    # Fazer push
    Write-Host "`n📤 Fazendo push para GitHub..." -ForegroundColor Green
    git push -u origin main

    Write-Host "`n✅ Concluído! Veja seu código em: https://github.com/Simons122/plataforma" -ForegroundColor Green
} else {
    Write-Host "`n❌ Cancelado pelo usuário" -ForegroundColor Yellow
}
