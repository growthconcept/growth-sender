import Queue from 'bull';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Garantir que o .env seja carregado do diretório correto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');

dotenv.config({ path: envPath });

// Log para debug
console.log('[Queue Config] Loading .env from:', envPath);
console.log('[Queue Config] REDIS_URL:', process.env.REDIS_URL ? `✓ ${process.env.REDIS_URL.split('@')[0]}@***` : '✗ Não encontrada');

// Configuração do Redis com retry e reconexão
// O Bull aceita opções do ioredis diretamente
const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis reconnection attempt ${times}, retrying in ${delay}ms...`);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message && err.message.includes(targetError)) {
      // Reconectar apenas em caso de erro READONLY
      return true;
    }
    // Para ECONNRESET e ECONNREFUSED, sempre tentar reconectar
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
      return true;
    }
    return false;
  },
  lazyConnect: false,
  keepAlive: 30000
};

// Queue para processar campanhas
// O Bull aceita a URL do Redis como segundo parâmetro
// Passar a URL diretamente garante que todas as conexões (client, subscriber, etc) usem a mesma configuração
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Log para debug (sem mostrar senha se houver)
const redisUrlForLog = redisUrl.includes('@') 
  ? redisUrl.split('@')[0].split(':').slice(0, 2).join(':') + '@***' + redisUrl.split('@')[1]
  : redisUrl;
console.log(`[Queue] Connecting to Redis: ${redisUrlForLog}`);

// Parsear para log
try {
  const url = new URL(redisUrl);
  console.log(`[Queue] Redis config: host=${url.hostname}, port=${url.port || 6379}, db=${url.pathname ? url.pathname.slice(1) : 0}`);
} catch (e) {
  console.error('[Queue] Error parsing Redis URL for log:', e.message);
}

// Parsear a URL do Redis para criar configuração de objeto
let redisConnectionConfig;
if (redisUrl.startsWith('redis://')) {
  try {
    const url = new URL(redisUrl);
    redisConnectionConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1)) : 0,
      ...redisOptions
    };
  } catch (e) {
    console.error('[Queue] Error parsing Redis URL:', e.message);
    redisConnectionConfig = redisUrl;
  }
} else {
  redisConnectionConfig = redisUrl;
}

// O Bull cria múltiplas conexões (client, subscriber, bclient)
// Precisamos usar createClient para garantir que todas usem a mesma configuração
export const campaignQueue = new Queue(
  'campaign-processing',
  {
    createClient: (type) => {
      if (typeof redisConnectionConfig === 'object') {
        console.log(`[Queue] Creating Redis client type: ${type} with host=${redisConnectionConfig.host}, port=${redisConnectionConfig.port}, db=${redisConnectionConfig.db}`);
      } else {
        console.log(`[Queue] Creating Redis client type: ${type} with URL: ${redisConnectionConfig}`);
      }
      // Retornar uma nova instância do Redis com a mesma configuração
      return new Redis(redisConnectionConfig);
    }
  },
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  }
);

// Eventos da queue para logging e tratamento de erros
campaignQueue.on('error', (error) => {
  // Ignorar erros de reconexão que são tratados automaticamente
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    console.warn('Redis connection issue (will retry):', error.message);
    return;
  }
  console.error('Queue error:', error);
});

campaignQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting to be processed`);
});

campaignQueue.on('active', (job) => {
  console.log(`Job ${job.id} is now active`);
});

campaignQueue.on('stalled', (job) => {
  console.warn(`Job ${job.id} has stalled`);
});

campaignQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

campaignQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

campaignQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error.message);
});

campaignQueue.on('paused', () => {
  console.log('Queue paused');
});

campaignQueue.on('resumed', () => {
  console.log('Queue resumed');
});

campaignQueue.on('cleaned', (jobs, type) => {
  console.log(`Cleaned ${jobs.length} jobs of type ${type}`);
});

// Tratamento de desconexão e reconexão
// O Bull expõe o cliente Redis através de .client (ioredis)
if (campaignQueue.client) {
  campaignQueue.client.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
      console.warn('Redis client error (will reconnect):', err.message);
    } else {
      console.error('Redis client error:', err);
    }
  });

  campaignQueue.client.on('ready', () => {
    console.log('✓ Redis client connected and ready');
  });

  campaignQueue.client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  campaignQueue.client.on('end', () => {
    console.warn('Redis client connection ended');
  });
}

export default campaignQueue;
