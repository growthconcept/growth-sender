import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sequelize } from './models/index.js';
import { addCorsHeaders } from './middleware/cors.js';

// Importar rotas
import authRoutes from './routes/auth.js';
import connectionRoutes from './routes/connections.js';
import templateRoutes from './routes/templates.js';
import campaignRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// Configurar CORS - suporta múltiplas origens separadas por vírgula
const corsOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

// Função para normalizar URL (remove trailing slash e normaliza)
const normalizeOrigin = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url.replace(/\/$/, '');
  }
};

// Normalizar todas as origens permitidas
const normalizedOrigins = corsOrigins.map(normalizeOrigin);

console.log('🔒 CORS Origins configurados:', normalizedOrigins);
console.log('🔒 FRONTEND_URL env:', process.env.FRONTEND_URL);

// Configuração de CORS mais robusta
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, healthchecks)
    if (!origin) {
      console.log('✅ CORS: Requisição sem origin permitida');
      return callback(null, true);
    }
    
    // Normalizar a origin recebida
    const normalizedOrigin = normalizeOrigin(origin);
    
    // Verificar se a origin normalizada está na lista permitida
    if (normalizedOrigin && normalizedOrigins.includes(normalizedOrigin)) {
      console.log(`✅ CORS: Origin permitida: ${origin} (normalized: ${normalizedOrigin})`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked: ${origin} (normalized: ${normalizedOrigin})`);
      console.warn(`📋 Allowed origins: ${normalizedOrigins.join(', ')}`);
      // Em produção, rejeitar. Em desenvolvimento, permitir para debug
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Development mode: permitindo origin mesmo não configurada');
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 horas
};

// Aplicar CORS ANTES de tudo - ordem é crítica!
app.use(cors(corsOptions));

// Middleware que SEMPRE adiciona headers CORS em TODAS as requisições
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Se a origin está na lista permitida, sempre adicionar headers
  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin && normalizedOrigins.includes(normalizedOrigin)) {
      // Adicionar headers CORS em TODA resposta
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
    }
  }
  
  next();
});

// Handler explícito para requisições OPTIONS (preflight) - DEVE vir antes das rotas
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (normalizedOrigin && normalizedOrigins.includes(normalizedOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
  }
  res.status(204).end();
});

// Configurar body parsers com limite aumentado (500MB para documentos)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Growth Sender API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      connections: '/api/connections',
      templates: '/api/templates',
      campaigns: '/api/campaigns',
      dashboard: '/api/dashboard',
      upload: '/api/upload'
    }
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  addCorsHeaders(req, res);
  console.warn(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  addCorsHeaders(req, res);
  
  // Log do erro
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || err.statusCode,
    code: err.code,
    type: err.type,
    path: req.path,
    method: req.method
  });

  // Se já foi enviada uma resposta, não enviar novamente
  if (res.headersSent) {
    return next(err);
  }

  // Tratamento específico para erros de payload muito grande do Express
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload muito grande',
      message: 'O tamanho da requisição excede o limite máximo permitido. Limites: Imagens e vídeos: 50MB | Documentos: 500MB',
      maxSize: 500,
      maxSizeBytes: 500 * 1024 * 1024,
      limits: {
        image: 50,
        video: 50,
        document: 500,
        audio: 50
      },
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  // Tratamento para erros de parsing JSON
  // Erros de parsing JSON do express.json() são SyntaxError com status 400
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      error: 'Erro ao processar requisição',
      message: 'O corpo da requisição é inválido ou muito grande',
      code: 'INVALID_BODY'
    });
  }

  // Status code padrão
  const statusCode = err.status || err.statusCode || 500;

  // Resposta de erro
  const errorResponse = {
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: {
        code: err.code,
        type: err.type,
        path: req.path,
        method: req.method
      }
    })
  };

  res.status(statusCode).json(errorResponse);
});

// Inicializar servidor
async function startServer() {
  try {
    // Testar conexão com banco de dados
    console.log('🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');

    // Sincronizar models (em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔄 Synchronizing database models...');
        await sequelize.sync({ alter: true });
        console.log('✓ Database models synchronized');
      } catch (syncError) {
        console.warn('⚠️  Database sync warning (continuing anyway):', syncError.message);
        // Não bloquear o servidor se o sync falhar
      }
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API URL: http://localhost:${PORT}`);
    });

    // Tratamento de erros não capturados
    process.on('unhandledRejection', (reason, promise) => {
      console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('✗ Uncaught Exception:', error);
      // Não encerrar o processo imediatamente, apenas logar
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    process.exit(1);
  }
}

startServer();