import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    // Pegar token do header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      throw jwtError;
    }

    // Buscar usuário
    let user;
    try {
      user = await User.findByPk(decoded.id);
    } catch (dbError) {
      console.error('Database error in authentication:', dbError);
      // Se o erro for relacionado a coluna não encontrada, tentar buscar sem o campo role
      if (dbError.message && dbError.message.includes('column') && dbError.message.includes('role')) {
        console.warn('Column "role" not found, attempting to fetch user without it');
        // Tentar buscar apenas campos básicos
        user = await User.findByPk(decoded.id, {
          attributes: ['id', 'email', 'name', 'password', 'created_at', 'updated_at']
        });
      } else {
        throw dbError;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Garantir que o campo role existe (para compatibilidade com versões antigas)
    if (!user.role) {
      user.role = 'user';
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};
