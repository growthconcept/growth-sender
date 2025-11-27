/**
 * Middleware para verificar permissões de admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Helper para verificar se usuário é admin (sem bloquear requisição)
 */
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

