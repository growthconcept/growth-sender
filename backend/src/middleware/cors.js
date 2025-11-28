// Middleware compartilhado para adicionar headers CORS

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

// Função helper para adicionar headers CORS em respostas de erro
export const addCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (!origin) return;
  
  // Se não há FRONTEND_URL configurado, permitir em desenvolvimento
  if (!process.env.FRONTEND_URL) {
    if (process.env.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    return;
  }
  
  // Verificar se a origin está na lista permitida
  const corsOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
  const normalizedOrigins = corsOrigins.map(normalizeOrigin);
  const normalizedOrigin = normalizeOrigin(origin);
  
  if (normalizedOrigin && normalizedOrigins.includes(normalizedOrigin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
};

