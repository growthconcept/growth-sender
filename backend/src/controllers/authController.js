import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

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

  /**
   * Solicita redefinição de senha
   * Gera token seguro, persiste no banco e envia e-mail via Resend
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Buscar usuário (sempre responder com sucesso para não revelar se o e-mail existe)
      const user = await User.findOne({ where: { email } });

      if (user) {
        // Gerar token aleatório e seguro
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // Salvar token hasheado no banco
        await user.update({
          resetPasswordToken: hashedToken,
          resetPasswordExpires: expiresAt
        });

        // Montar URL de reset com o token RAW (não hasheado)
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

        // Enviar e-mail
        try {
          await sendPasswordResetEmail(user.email, resetUrl);
          console.log(`✉️  Reset email sent to ${user.email}`);
        } catch (emailError) {
          console.error('Email send failed:', emailError);
          // Reverter token para não deixar estado inconsistente
          await user.update({ resetPasswordToken: null, resetPasswordExpires: null });
          return res.status(500).json({ error: 'Falha ao enviar o e-mail. Tente novamente.' });
        }
      } else {
        console.log(`ℹ️  Forgot password requested for unknown email: ${email}`);
      }

      // Sempre responder com sucesso (segurança: não revelar se o e-mail existe)
      res.json({
        message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }

  /**
   * Redefine a senha usando o token recebido por e-mail
   */
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
      }

      // Hashear o token recebido para comparar com o banco
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Buscar usuário com token válido e não expirado
      const user = await User.findOne({
        where: {
          resetPasswordToken: hashedToken
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      // Verificar expiração
      if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
        await user.update({ resetPasswordToken: null, resetPasswordExpires: null });
        return res.status(400).json({ error: 'Token expirado. Solicite uma nova redefinição.' });
      }

      // Atualizar senha e invalidar token
      await user.update({
        password,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });

      res.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }
}

export default new AuthController();
