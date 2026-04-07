# SUPERCOB - Sistema de Gestão e Automação de Cobranças

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/SQL%20Server-Database-CC2927?style=for-the-badge&logo=microsoft-sql-server" alt="SQL Server" />
</div>

## 🚀 Sobre o Projeto

O **SUPERCOB** é uma plataforma SaaS robusta desenvolvida para otimizar e automatizar o processo de recuperação de crédito. Focado em eficiência, o sistema oferece dashboards detalhados, gestão inteligente de carteiras e ferramentas de comunicação interna e externa (WhatsApp).

## ✨ Principais Funcionalidades

- **🔐 Autenticação Segura**: Implementada com NextAuth.js (v5 Beta) e proteção de rotas via Middleware.
- **📊 Dashboard Executivo**: Visão em tempo real de KPIs, taxa de recuperação, capital em risco e gráficos de evolução.
- **👥 Gestão de Clientes**: Cadastro completo de tomadores com histórico de contratos.
- **💸 Controle de Empréstimos**: Status dinâmicos (*Aberto*, *Negociação*, *Quitado*), cálculo de juros e datas de vencimento.
- **💬 Chat Interno**: Comunicação 1-1 entre Colaboradores e Admin, além de disparos de mensagens em massa (Broadcast).
- **📱 Integração WhatsApp**: Links diretos para cobrança facilitada com mensagens pré-configuradas.
- **📄 Relatórios Avançados**: Curva ABC de clientes, relatórios de inadimplência e exportação para PDF.
- **🎨 UI/UX Moderna**: Interface responsiva (Mobile/Tablet/Desktop), modo escuro no login, animações com Framer Motion e notificações via Sonner.

## 🛠️ Tecnologias Utilizadas

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 + Framer Motion
- **Banco de Dados**: Microsoft SQL Server (via Prisma ORM)
- **Autenticação**: NextAuth.js v5
- **Componentes**: Shadcn/UI (Radix UI) + Lucide Icons
- **Notificações**: Sonner

## ⚙️ Como Executar

### Pré-requisitos
- Node.js 18+
- Instância do SQL Server

### Passo a Passo
1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente**:
   Crie um arquivo `.env` na raiz do projeto seguindo o modelo:
   ```env
   DATABASE_URL="sqlserver://SEU_SERVIDOR;database=SUPERCOB;user=SEU_USUARIO;password=SUA_SENHA;encrypt=true"
   AUTH_SECRET="seu-segredo-aqui"
   APP_URL="http://localhost:3000"
   SMTP_HOST="smtp.seu-provedor.com"
   SMTP_PORT="587"
   SMTP_USER="seu-usuario"
   SMTP_PASS="sua-senha"
   EMAIL_FROM="SUPERCOB <no-reply@supercob.com.br>"
   ```

3. **Migrar o banco de dados**:
   ```bash
   npx prisma db push
   ```

4. **Rodar o ambiente de desenvolvimento**:
   ```bash
   npm run dev
   ```

## 🔑 Acessos Temporários (Dev)

Para facilitar testes em desenvolvimento, habilite o login temporário via variável de ambiente:

```env
ALLOW_DEV_LOGIN="true"
```

Credenciais:

- **Admin**: `admin@supercob.com.br` / `admin123`
- **Operador**: `op@supercob.com.br` / `op123456`

## 🧾 Alterações Recentes

- **Contratos**
  - Cards com borda por status e botão "Ver Detalhes".
  - Página de detalhes `/emprestimos/[id]` com histórico em timeline, adicionar detalhes e ações Cancelar/Concluir.
  - Pagamento parcial disponível apenas na tela de detalhes, com atualização automática do status e histórico.

- **Clientes**
  - Campo obrigatório "Número" no endereço (validação no fluxo de cadastro/edição).
  - Navegação por abas com validação progressiva e avanço automático quando a aba estiver completa.
  - Campo de anexos (JPEG/PNG/PDF, até 5MB) com preview, progresso, visualização e exclusão.
  - Página de histórico do cliente em `/clientes/[id]` com filtro por período e exportação CSV.
  - Cobrança inicial opcional no cadastro/edição (cria contrato automaticamente).

- **Relatórios**
  - Acesso restrito a usuários administradores.
  - Evolução de juros mensal baseada na data de vencimento (quando disponível).

- **UI/UX**
  - Ajustes de contraste no modo escuro para melhorar legibilidade.
  - Em telas pequenas, menu principal como barra fixa no rodapé.

- **Auditoria**
  - Registro de auditoria para alterações de role de usuários.

- **Seed**
  - Base de dados com pelo menos 5 clientes e cobranças com status e movimentações variadas.

