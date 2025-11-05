# WhatsApp Bulk Sender

Sistema completo de gerenciamento de disparos em massa via WhatsApp usando Evolution API.

## 🚀 Tecnologias

### Backend
- **Node.js** + **Express** - API RESTful
- **PostgreSQL** - Banco de dados
- **Sequelize** - ORM
- **Bull** - Fila de processamento com Redis
- **JWT** - Autenticação
- **Axios** - Integração com Evolution API

### Frontend
- **React 18** - Interface do usuário
- **Vite** - Build tool
- **TailwindCSS** - Estilização
- **React Router** - Navegação
- **React Query** - Gerenciamento de estado e cache
- **Lucide React** - Ícones

## 📋 Funcionalidades

### ✅ Implementadas

- **Autenticação completa** (registro, login, JWT)
- **Gerenciamento de conexões** WhatsApp via Evolution API
- **Sistema de templates** de mensagens (texto, imagem, áudio, vídeo, documento)
- **Criação de campanhas** com validações
- **Worker em background** para processar disparos
- **Dashboard** com métricas em tempo real
- **Limite diário** de 1 campanha por conexão
- **Horário comercial configurável**
- **Intervalo entre mensagens** configurável
- **Logs detalhados** de cada envio

### 🔄 Regras de Negócio

- Máximo de **100 destinatários** por campanha
- **1 campanha por dia** por conexão
- Intervalo mínimo de **10 segundos** entre mensagens
- Envios apenas em **horário comercial** configurável
- Suporte a **dias da semana específicos**
- Pausa/retomada de campanhas
- Cancelamento de campanhas

## 📁 Estrutura do Projeto

```
growth-sender/
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações (DB, Queue)
│   │   ├── controllers/     # Controladores
│   │   ├── middleware/      # Middlewares (auth, validation)
│   │   ├── models/          # Models Sequelize
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Serviços (Evolution API)
│   │   ├── workers/         # Workers (Campaign Worker)
│   │   └── server.js        # Entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/      # Componentes React
    │   ├── pages/           # Páginas
    │   ├── services/        # API client
    │   ├── hooks/           # Custom hooks
    │   └── main.jsx         # Entry point
    └── package.json
```

## 🔧 Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- Redis
- Conta na Evolution API

### 1. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=seu_secret_muito_seguro_aqui
EVOLUTION_API_URL=https://api.growthdigitalmkt.com.br
EVOLUTION_API_KEY=sua_api_key_aqui
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```bash
# Executar migrations
npm run migrate

# Iniciar servidor de desenvolvimento
npm run dev

# EM OUTRO TERMINAL: Iniciar worker
npm run worker
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3001
```

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:5173

## 🗄️ Banco de Dados

### Tabelas

- **users** - Usuários do sistema
- **connections** - Conexões WhatsApp (instâncias Evolution API)
- **message_templates** - Templates de mensagens
- **campaigns** - Campanhas de disparo
- **message_logs** - Logs de envio
- **daily_limits** - Controle de limite diário

### Migration

```bash
cd backend
npm run migrate
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário atual

### Conexões
- `GET /api/connections` - Listar conexões
- `POST /api/connections/sync` - Sincronizar com Evolution API
- `GET /api/connections/:id` - Buscar conexão
- `PUT /api/connections/:id/status` - Atualizar status
- `GET /api/connections/:id/groups` - Listar grupos
- `DELETE /api/connections/:id` - Deletar conexão

### Templates
- `GET /api/templates` - Listar templates
- `GET /api/templates/:id` - Buscar template
- `POST /api/templates` - Criar template
- `PUT /api/templates/:id` - Atualizar template
- `DELETE /api/templates/:id` - Deletar template

### Campanhas
- `GET /api/campaigns` - Listar campanhas
- `GET /api/campaigns/:id` - Buscar campanha
- `GET /api/campaigns/:id/logs` - Logs da campanha
- `POST /api/campaigns` - Criar campanha
- `POST /api/campaigns/:id/pause` - Pausar
- `POST /api/campaigns/:id/cancel` - Cancelar
- `POST /api/campaigns/:id/resume` - Retomar
- `DELETE /api/campaigns/:id` - Deletar

### Dashboard
- `GET /api/dashboard/metrics` - Métricas gerais
- `GET /api/dashboard/recent-campaigns` - Campanhas recentes
- `GET /api/dashboard/stats` - Estatísticas

## 📦 Deploy

### Railway / Render

1. **Backend**:
   - Adicione as variáveis de ambiente
   - Configure PostgreSQL e Redis
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`
   - **Worker**: Create um serviço separado com `cd backend && npm run worker`

2. **Frontend**:
   - Adicione `VITE_API_URL` apontando para o backend
   - Build command: `cd frontend && npm install && npm run build`
   - Start command: Servir pasta `dist`

### Importante para Deploy

- Altere `JWT_SECRET` para um valor seguro
- Use SSL/TLS em produção
- Configure CORS adequadamente
- Configure variáveis de ambiente corretamente
- Execute migrations: `npm run migrate`
- Inicie o worker separadamente

## 🔐 Segurança

- Senhas hasheadas com bcrypt
- JWT com expiração de 7 dias
- Validação de inputs com express-validator
- CORS configurado
- Rate limiting recomendado (adicionar)

## 📝 Próximos Passos / Melhorias

- [ ] Implementar páginas de Templates (CRUD completo)
- [ ] Implementar página de Campanhas (formulário de criação)
- [ ] Implementar página de Histórico
- [ ] Upload de CSV para contatos
- [ ] Preview de mensagens
- [ ] Gráficos e estatísticas avançadas
- [ ] Webhooks para status de mensagens
- [ ] Rate limiting
- [ ] Testes automatizados
- [ ] Documentação com Swagger
- [ ] Suporte a variáveis nos templates (ex: {nome})
- [ ] Agendamento recorrente

## 🐛 Debugging

### Backend não conecta ao banco
- Verifique se PostgreSQL está rodando
- Confira as credenciais no `DATABASE_URL`
- Teste a conexão: `npm run migrate`

### Worker não processa campanhas
- Verifique se Redis está rodando
- Confirme que o worker está ativo: `npm run worker`
- Veja os logs do worker

### Evolution API retorna erro
- Verifique se a `EVOLUTION_API_KEY` está correta
- Confirme se a URL está acessível
- Teste diretamente: `curl https://api.growthdigitalmkt.com.br/instance/fetchInstances -H "apikey: SUA_KEY"`

## 📄 Licença

Este projeto é privado e de uso interno.

## 👥 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ usando Node.js e React**
