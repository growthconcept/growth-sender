import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { sequelize } from './models/index.js';

// Importar rotas
import authRoutes from './routes/auth.js';
import connectionRoutes from './routes/connections.js';
import templateRoutes from './routes/templates.js';
import campaignRoutes from './routes/campaigns.js';
import dashboardRoutes from './routes/dashboard.js';
import uploadRoutes from './routes/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// Configurar CORS - suporta múltiplas origens separadas por vírgula
const corsOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc) em desenvolvimento
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    // Em outros ambientes, só permitir se a origin existir e estiver na lista permitida
    if (origin && corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
    message: 'WhatsApp Bulk Sender API',
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
  res.status(404).json({ error: 'Route not found' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Testar conexão com banco de dados
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');

    // Sincronizar models (em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✓ Database models synchronized');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
