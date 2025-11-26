# 🚀 Guia de Deploy - Growth Sender

Este guia fornece instruções detalhadas para colocar a aplicação Growth Sender no ar.

## 🎯 Qual Opção Escolher?

- **🚂 Railway** (Recomendado) - Tudo em um lugar, fácil e rápido
- **🐳 Docker Compose** - Para desenvolvimento local ou servidor próprio
- **🎨 Render** - Alternativa ao Railway
- **🔷 Heroku** - Opção tradicional (pago)

## 📋 Pré-requisitos

- Docker e Docker Compose instalados (para opção Docker)
- Ou acesso a uma plataforma de cloud (Railway, Render, Heroku, etc.)
- PostgreSQL (se não usar Docker)
- Redis (se não usar Docker)

---

## 🚂 Deploy no Railway (Recomendado)

**Pule para a seção Railway abaixo se quiser a opção mais fácil!**

---

## 🐳 Deploy com Docker Compose

### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha_segura_aqui
POSTGRES_DB=growth_sender

# JWT
JWT_SECRET=seu_secret_muito_seguro_aqui_gerado_aleatoriamente

# Evolution API
EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
EVOLUTION_API_KEY=sua_api_key_aqui

# Frontend
VITE_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost

# AWS S3 (opcional)
S3_REGION=us-east-1
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

**⚠️ IMPORTANTE**: 
- Gere um `JWT_SECRET` seguro usando: `openssl rand -base64 32`
- Altere todas as senhas padrão
- Não commite o arquivo `.env` no Git

### 2. Iniciar Aplicação

```bash
# Build e iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f worker
```

### 3. Executar Migrations

```bash
# Executar migrations no banco de dados
docker-compose exec backend npm run migrate
```

### 4. Verificar Status

```bash
# Verificar se todos os serviços estão rodando
docker-compose ps

# Testar API
curl http://localhost:3001/health

# Acessar frontend
# Abra http://localhost no navegador
```

### 5. Parar Aplicação

```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes (⚠️ apaga dados)
docker-compose down -v
```

## ☁️ Deploy em Cloud - Railway (Recomendado) 🚂

O **Railway** é a melhor opção para esta aplicação porque:
- ✅ Suporta PostgreSQL e Redis nativamente
- ✅ Permite múltiplos serviços no mesmo projeto
- ✅ Deploy automático via Git
- ✅ HTTPS automático
- ✅ Variáveis de ambiente fáceis de gerenciar
- ✅ Plano gratuito generoso

### Passo a Passo Completo

#### 1. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"** e conecte seu repositório

#### 2. Adicionar Banco de Dados

1. No projeto, clique em **"+ New"**
2. Selecione **"Database" → "Add PostgreSQL"**
3. Railway criará automaticamente e fornecerá a `DATABASE_URL`

#### 3. Adicionar Redis

1. Clique em **"+ New"** novamente
2. Selecione **"Database" → "Add Redis"**
3. Railway criará automaticamente e fornecerá a `REDIS_URL`

#### 4. Deploy do Backend

1. Clique em **"+ New" → "GitHub Repo"** (se ainda não conectou)
2. Selecione o mesmo repositório
3. Railway detectará automaticamente, mas configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. **Variáveis de ambiente** (Settings → Variables):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=seu_secret_muito_seguro_aqui
   EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
   EVOLUTION_API_KEY=sua_api_key_aqui
   FRONTEND_URL=${{$RAILWAY_PUBLIC_DOMAIN}}
   PORT=${{PORT}}
   NODE_ENV=production
   S3_REGION=us-east-1
   S3_ENDPOINT=
   S3_FORCE_PATH_STYLE=false
   S3_ACCESS_KEY=
   S3_SECRET_KEY=
   ```
5. **Gerar domínio público**: Settings → Generate Domain
6. Anote a URL do backend (ex: `growth-sender-backend.railway.app`)

#### 5. Deploy do Worker

1. No mesmo projeto, clique em **"+ New" → "GitHub Repo"**
2. Selecione o mesmo repositório
3. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `npm run worker`
   - **Build Command**: `npm install`
4. **Variáveis de ambiente** (copie as mesmas do backend):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=seu_secret_muito_seguro_aqui
   EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
   EVOLUTION_API_KEY=sua_api_key_aqui
   NODE_ENV=production
   S3_REGION=us-east-1
   S3_ENDPOINT=
   S3_FORCE_PATH_STYLE=false
   S3_ACCESS_KEY=
   S3_SECRET_KEY=
   ```

#### 6. Deploy do Frontend

1. No mesmo projeto, clique em **"+ New" → "GitHub Repo"**
2. Selecione o mesmo repositório
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`
4. **Variáveis de ambiente**:
   ```
   VITE_API_URL=https://seu-backend.railway.app
   ```
   (Use a URL do backend que você anotou no passo 4)
5. **Gerar domínio público**: Settings → Generate Domain

#### 7. Executar Migrations

Após o deploy do backend, execute as migrations:

1. No serviço do backend, vá em **Settings → Deployments**
2. Clique nos três pontos do último deployment → **"View Logs"**
3. Ou use o Railway CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   railway link
   railway run --service backend npm run migrate
   ```

#### 8. Atualizar CORS no Backend

Após obter a URL do frontend, atualize a variável `FRONTEND_URL` no backend:
```
FRONTEND_URL=https://seu-frontend.railway.app
```

### ✅ Checklist Railway

- [ ] Projeto criado no Railway
- [ ] PostgreSQL adicionado
- [ ] Redis adicionado
- [ ] Backend deployado e rodando
- [ ] Worker deployado e rodando
- [ ] Frontend deployado e rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations executadas
- [ ] Domínios públicos gerados
- [ ] CORS configurado corretamente
- [ ] Health check funcionando: `https://seu-backend.railway.app/health`

### 🎯 URLs Finais

Após o deploy completo, você terá:
- 🌐 **Frontend**: `https://seu-frontend.railway.app`
- 🔌 **Backend API**: `https://seu-backend.railway.app`
- 📊 **Health Check**: `https://seu-backend.railway.app/health`

---

## 🔄 Outras Opções de Deploy

### Render

#### Backend

1. **Criar novo Web Service**
2. **Conectar repositório**
3. **Configurações**:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Node
4. **Adicionar PostgreSQL** (Add → PostgreSQL)
5. **Adicionar Redis** (Add → Redis)
6. **Variáveis de ambiente**:
   ```
   DATABASE_URL=<Internal Database URL>
   REDIS_URL=<Internal Redis URL>
   JWT_SECRET=seu_secret_aqui
   EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
   EVOLUTION_API_KEY=sua_api_key
   FRONTEND_URL=https://seu-frontend.onrender.com
   NODE_ENV=production
   ```

#### Worker

1. **Criar novo Background Worker**
2. **Conectar ao mesmo repositório**
3. **Start Command**: `cd backend && npm run worker`
4. **Mesmas variáveis de ambiente do backend**

#### Frontend

1. **Criar novo Static Site**
2. **Conectar repositório**
3. **Configurações**:
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`
4. **Variáveis de ambiente**:
   ```
   VITE_API_URL=https://seu-backend.onrender.com
   ```

### Vercel (Frontend) + Railway/Render (Backend) ⚡

**⚠️ IMPORTANTE**: O Vercel é perfeito para o frontend, mas o backend precisa ficar em outra plataforma (Railway, Render, etc.) porque:
- Backend precisa de PostgreSQL e Redis
- Worker precisa rodar continuamente (não é serverless)
- Vercel é serverless e tem timeouts limitados

#### Frontend no Vercel

1. **Instalar Vercel CLI** (opcional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Dashboard** (Recomendado):
   - Acesse [vercel.com](https://vercel.com)
   - Conecte seu repositório GitHub/GitLab
   - Configure o projeto:
     - **Framework Preset**: Vite
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://seu-backend.railway.app
   ```
   (Use a URL do seu backend deployado)

4. **Deploy via CLI** (alternativa):
   ```bash
   cd frontend
   vercel
   # Siga as instruções interativas
   ```

5. **Configuração Automática**:
   - O arquivo `frontend/vercel.json` já está configurado
   - Vercel detecta automaticamente Vite
   - SPA routing já configurado

#### Backend no Railway/Render

Siga as instruções de **Railway** ou **Render** acima para o backend e worker.

#### Configuração Final

1. **Atualizar CORS no Backend**:
   ```env
   FRONTEND_URL=https://seu-app.vercel.app
   ```

2. **Atualizar Frontend**:
   ```env
   VITE_API_URL=https://seu-backend.railway.app
   ```

**✅ Vantagens desta abordagem**:
- Frontend super rápido no Vercel (CDN global)
- Backend com recursos completos (PostgreSQL, Redis, Worker)
- Custo otimizado (Vercel free tier generoso)
- Deploy automático via Git

### Heroku

#### Backend

```bash
# Instalar Heroku CLI
# Login
heroku login

# Criar app
heroku create growth-sender-backend

# Adicionar addons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Configurar variáveis
heroku config:set JWT_SECRET=seu_secret_aqui
heroku config:set EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
heroku config:set EVOLUTION_API_KEY=sua_api_key
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL=https://seu-frontend.herokuapp.com

# Deploy
git subtree push --prefix backend heroku main
```

#### Worker

```bash
# Criar worker dyno
heroku ps:scale worker=1 --app growth-sender-backend

# Configurar Procfile no backend/
# worker: node src/workers/campaignWorker.js
```

#### Frontend

```bash
# Criar app
heroku create growth-sender-frontend

# Buildpack
heroku buildpacks:set heroku/nodejs

# Configurar
heroku config:set VITE_API_URL=https://growth-sender-backend.herokuapp.com

# Deploy
git subtree push --prefix frontend heroku main
```

## 🔧 Configurações Pós-Deploy

### 1. Executar Migrations

Após o deploy, execute as migrations:

```bash
# Docker
docker-compose exec backend npm run migrate

# Railway/Render (via console ou CLI)
npm run migrate

# Heroku
heroku run npm run migrate --app growth-sender-backend
```

### 2. Criar Primeiro Usuário

Acesse a aplicação e crie sua conta através da interface de registro.

### 3. Configurar CORS

Certifique-se de que `FRONTEND_URL` no backend aponte para a URL correta do frontend em produção.

### 4. Configurar SSL/HTTPS

- Railway e Render fornecem HTTPS automaticamente
- Heroku fornece HTTPS para apps `.herokuapp.com`
- Para domínios customizados, configure SSL/TLS

## 🔍 Verificação e Troubleshooting

### Verificar Saúde da Aplicação

```bash
# Backend health check
curl https://seu-backend.railway.app/health

# Deve retornar:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Logs

```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f worker

# Railway
railway logs

# Render
# Acesse Dashboard → Logs

# Heroku
heroku logs --tail --app growth-sender-backend
```

### Problemas Comuns

#### Backend não conecta ao banco
- Verifique `DATABASE_URL`
- Confirme que o banco está acessível
- Verifique firewall/security groups

#### Worker não processa campanhas
- Verifique se o worker está rodando
- Confirme `REDIS_URL`
- Veja logs do worker

#### Frontend não carrega
- Verifique `VITE_API_URL`
- Confirme que o build foi executado
- Verifique console do navegador para erros

#### CORS errors
- Verifique `FRONTEND_URL` no backend
- Confirme que a URL está correta (com/sem trailing slash)

## 📊 Monitoramento

### Health Checks

Configure health checks nas plataformas:
- Backend: `GET /health`
- Worker: Verificar logs ou criar endpoint de health

### Métricas Recomendadas

- Uptime do backend
- Latência da API
- Taxa de erro
- Uso de memória/CPU
- Conexões ativas no banco

## 🔐 Segurança em Produção

1. **JWT_SECRET**: Use um valor aleatório e seguro
2. **Senhas do banco**: Use senhas fortes
3. **HTTPS**: Sempre use HTTPS em produção
4. **CORS**: Configure apenas domínios permitidos
5. **Rate Limiting**: Considere adicionar rate limiting
6. **Backups**: Configure backups automáticos do PostgreSQL

## 📝 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] JWT_SECRET gerado e seguro
- [ ] Migrations executadas
- [ ] Backend rodando e acessível
- [ ] Worker rodando
- [ ] Frontend buildado e servindo
- [ ] CORS configurado corretamente
- [ ] Health checks funcionando
- [ ] Primeiro usuário criado
- [ ] SSL/HTTPS configurado
- [ ] Logs sendo coletados
- [ ] Monitoramento configurado

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs
2. Confirme todas as variáveis de ambiente
3. Teste conexões (banco, Redis, Evolution API)
4. Verifique documentação da plataforma escolhida

---

**Boa sorte com o deploy! 🚀**

