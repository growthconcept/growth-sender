import { User, Campaign, MessageLog, Connection } from '../models/index.js';
import { Op } from 'sequelize';

class AdminUserController {
  /**
   * Lista usuários com informações básicas
   * (apenas para admins)
   */
  async listUsers(req, res) {
    try {
      const { search, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (search) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
          { name: { [Op.iLike]: term } },
          { email: { [Op.iLike]: term } }
        ];
      }

      const users = await User.findAll({
        where,
        attributes: ['id', 'name', 'email', 'role', 'created_at', 'updated_at'],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ users });
    } catch (error) {
      console.error('[Admin] listUsers error:', error);
      res.status(500).json({ error: 'Failed to list users' });
    }
  }

  /**
   * Atualiza a role de um usuário (user/admin/supervisor)
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body || {};

      const allowedRoles = ['user', 'admin', 'supervisor'];
      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be \"user\", \"admin\" or \"supervisor\".' });
      }

      // Impedir que admin remova o próprio acesso admin facilmente (opcional)
      if (req.user.id === id && role !== 'admin') {
        return res.status(400).json({
          error: 'You cannot remove your own admin access.'
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.role = role;
      await user.save();

      res.json({
        message: 'User role updated successfully',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('[Admin] updateUserRole error:', error);
      console.error('[Admin] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Verificar se é erro de ENUM/coluna
      if (error.message && (
        error.message.includes('column') || 
        error.message.includes('enum') ||
        error.message.includes('invalid input value')
      )) {
        return res.status(500).json({ 
          error: 'Database schema error. Please run migration: npm run migrate',
          details: error.message
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to update user role',
        details: error.message 
      });
    }
  }
}

export default new AdminUserController();


