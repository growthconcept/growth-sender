# 🚀 Quick Start - Growth Sender

Guia rápido para colocar a aplicação no ar em 5 minutos.

## Opção 1: Docker Compose (Mais Fácil) 🐳

### Passo 1: Configurar Variáveis

Crie um arquivo `.env` na raiz do projeto copiando de `.env.example`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

Edite o `.env` e preencha:
- `JWT_SECRET`: Gere com `openssl rand -base64 32` ou use um valor aleatório seguro
- `EVOLUTION_API_KEY`: Sua chave da Evolution API
- `POSTGRES_PASSWORD`: Senha para o banco de dados

### Passo 2: Iniciar Aplicação

```bash
# Build e iniciar
docker-compose up -d --build

# Executar migrations
docker-compose exec backend npm run migrate
```

### Passo 3: Acessar

- 🌐 **Frontend**: http://localhost
- 🔌 **Backend API**: http://localhost:3001/health
- 📊 **Logs**: `docker-compose logs -f`

Pronto! 🎉

## Opção 2: Deploy Manual (Sem Docker)

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando
- Redis rodando

### Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite o .env com suas configurações

# Executar migrations
npm run migrate

# Iniciar servidor
npm start
```

### Worker (em outro terminal)

```bash
cd backend
npm run worker
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite: VITE_API_URL=http://localhost:3001

# Build
npm run build

# Servir (opção 1: Vite preview)
npm run preview

# Servir (opção 2: Nginx ou outro servidor)
# Copie a pasta dist para seu servidor web
```

## Opção 3: Deploy em Cloud - Railway ☁️ (Recomendado)

### Deploy Rápido no Railway

1. **Acesse [railway.app](https://railway.app)** e faça login
2. **Crie novo projeto** e conecte seu repositório GitHub
3. **Adicione PostgreSQL** (Database → Add PostgreSQL)
4. **Adicione Redis** (Database → Add Redis)
5. **Deploy Backend**:
   - New → GitHub Repo → Selecione seu repo
   - Root Directory: `backend`
   - Start Command: `npm start`
   - Variáveis: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `REDIS_URL=${{Redis.REDIS_URL}}`, `JWT_SECRET=...`, etc.
6. **Deploy Worker**:
   - New → GitHub Repo → Mesmo repo
   - Root Directory: `backend`
   - Start Command: `npm run worker`
   - Mesmas variáveis do backend
7. **Deploy Frontend**:
   - New → GitHub Repo → Mesmo repo
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve -s dist -l $PORT`
   - Variável: `VITE_API_URL=https://seu-backend.railway.app`
8. **Executar migrations**: `railway run --service backend npm run migrate`

**Consulte [DEPLOY.md](./DEPLOY.md) para guia completo e outras opções (Render, Heroku).**

## ⚠️ Checklist Rápido

- [ ] Arquivo `.env` configurado
- [ ] `JWT_SECRET` gerado e seguro
- [ ] `EVOLUTION_API_KEY` configurada
- [ ] PostgreSQL acessível
- [ ] Redis acessível
- [ ] Migrations executadas
- [ ] Backend rodando
- [ ] Worker rodando
- [ ] Frontend buildado e servindo

## 🆘 Problemas?

1. **Backend não inicia**: Verifique `DATABASE_URL` e `REDIS_URL`
2. **Worker não processa**: Confirme que Redis está rodando
3. **Frontend não carrega**: Verifique `VITE_API_URL` no build
4. **CORS errors**: Confirme `FRONTEND_URL` no backend

Veja **[DEPLOY.md](./DEPLOY.md)** para troubleshooting detalhado.

---

**Pronto para começar! 🚀**

