# 📱 iCell ERP

Sistema ERP para loja de celulares e acessórios — multi-tenant, completo com PDV, estoque, financeiro e laudos técnicos.

## 🚀 Stack

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 4** — estilização
- **Prisma ORM 6** — banco de dados
- **NextAuth 5** — autenticação com credentials
- **SQLite** (dev) / **PostgreSQL** (produção)
- **Playwright** — testes E2E

## ⚙️ Variáveis de Ambiente

Copie o `.env.example` e preencha:

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do banco PostgreSQL (ou SQLite local) |
| `AUTH_SECRET` | Chave secreta para NextAuth |
| `AUTH_URL` | URL pública da aplicação |

## 🖥️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Rodar migrations (cria as tabelas)
npx prisma migrate dev

# Popular banco com dados iniciais
npm run seed

# Iniciar dev server
npm run dev
```

Acesse: http://localhost:3000

### Usuários padrão (seed)

| Email | Senha | Role |
|-------|-------|------|
| admin@loja.com | 123456 | ADMIN |
| comprador@loja.com | 123456 | COMPRADOR |

## 🚆 Deploy na Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. **Conecte o repositório** no Railway
2. A Railway **detecta automaticamente** o Dockerfile e railway.json
3. Adicione um **banco PostgreSQL** no Railway
4. Configure as variáveis de ambiente:
   - `DATABASE_URL` → Railway fornece automaticamente
   - `AUTH_SECRET` → gere uma: `openssl rand -base64 32`
5. **Deploy!** O entrypoint roda migrations + seed automaticamente

### Ou via CLI:

```bash
npm i -g @railway/cli
railway login
railway init
railway add postgresql
railway up
```

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── (dashboard)/   # Área administrativa (protegida)
│   ├── api/            # REST API routes
│   └── auth/           # Login e cadastro
├── components/         # Componentes compartilhados
└── lib/                # Utilitários (prisma, auth, etc.)
prisma/
├── schema.prisma       # Schema do banco
├── seed.ts             # Dados iniciais
└── migrations/         # Migrations geradas
```

## 🧪 Testes

```bash
npm run test:e2e
```

## 📄 Licença

Privado — uso interno.
