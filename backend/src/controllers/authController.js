import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

class AuthController {
  /**
   * Registra novo usuário
   */
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Criar usuário
      const user = await User.create({
        email,
        password,
        name
      });

      // Gerar token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User created successfully',
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  /**
   * Login de usuário
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verificar senha
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Gerar token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  /**
   * Retorna dados do usuário atual
   */
  async me(req, res) {
    try {
      res.json({ user: req.user.toJSON() });
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  }
}

export default new AuthController();
