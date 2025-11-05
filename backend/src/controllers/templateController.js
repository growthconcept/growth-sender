import { MessageTemplate } from '../models/index.js';

class TemplateController {
  /**
   * Lista todos os templates do usuário
   */
  async list(req, res) {
    try {
      const userId = req.user.id;

      const templates = await MessageTemplate.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.json({ templates });
    } catch (error) {
      console.error('List templates error:', error);
      res.status(500).json({ error: 'Failed to list templates' });
    }
  }

  /**
   * Busca um template específico
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const template = await MessageTemplate.findOne({
        where: { id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json({ template });
    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({ error: 'Failed to get template' });
    }
  }

  /**
   * Cria novo template
   */
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { name, message_type, text_content, media_url } = req.body;

      // Validar que mídia URL existe para tipos que não são texto
      if (message_type !== 'text' && !media_url) {
        return res.status(400).json({
          error: 'media_url is required for non-text message types'
        });
      }

      const template = await MessageTemplate.create({
        user_id: userId,
        name,
        message_type,
        text_content,
        media_url
      });

      res.status(201).json({
        message: 'Template created successfully',
        template
      });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  /**
   * Atualiza template
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, message_type, text_content, media_url } = req.body;

      const template = await MessageTemplate.findOne({
        where: { id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Validar que mídia URL existe para tipos que não são texto
      if (message_type !== 'text' && !media_url) {
        return res.status(400).json({
          error: 'media_url is required for non-text message types'
        });
      }

      await template.update({
        name,
        message_type,
        text_content,
        media_url
      });

      res.json({
        message: 'Template updated successfully',
        template
      });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  /**
   * Deleta template
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const template = await MessageTemplate.findOne({
        where: { id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      await template.destroy();

      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }
}

export default new TemplateController();
