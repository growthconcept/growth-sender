import { MessageTemplate } from '../models/index.js';
import { isPrivilegedViewer } from '../middleware/permissions.js';

class TemplateController {
  /**
   * Lista todos os templates do usuário
   */
  async list(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userId = req.user.id;

      const templates = await MessageTemplate.findAll({
        where: isPrivilegedViewer(req.user) ? {} : { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.json({ templates });
    } catch (error) {
      console.error('List templates error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to list templates',
        message: error.message 
      });
    }
  }

  /**
   * Busca um template específico
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const where = { id };
      if (!isPrivilegedViewer(req.user)) {
        where.user_id = userId;
      }

      const template = await MessageTemplate.findOne({
        where
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

      console.log('Template create payload:', {
        name,
        message_type,
        hasText: !!text_content,
        hasMedia: !!media_url,
        mediaUrlSample: typeof media_url === 'string' ? media_url.slice(0, 80) : media_url
      });

      const trimmedName = name?.trim();
      const trimmedText = typeof text_content === 'string' ? text_content.trim() : '';
      const trimmedMedia = typeof media_url === 'string' ? media_url.trim() : '';

      if (!trimmedName) {
        return res.status(400).json({ error: 'Name is required' });
      }

      if (message_type === 'text') {
        if (!trimmedText) {
          return res.status(400).json({
            error: 'text_content is required for text templates'
          });
        }
      } else if (!trimmedMedia) {
        return res.status(400).json({
          error: 'media_url is required for non-text message types'
        });
      }

      const template = await MessageTemplate.create({
        user_id: userId,
        name: trimmedName,
        message_type,
        text_content: message_type === 'text' ? trimmedText : text_content || '',
        media_url: message_type === 'text' ? null : trimmedMedia
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

      const nextType = message_type || template.message_type;
      const nextText =
        text_content !== undefined ? text_content : template.text_content;
      const nextMedia =
        media_url !== undefined ? media_url : template.media_url;

      const trimmedName = name !== undefined ? name?.trim() : template.name;
      const trimmedText =
        typeof nextText === 'string' ? nextText.trim() : template.text_content;
      const trimmedMedia =
        typeof nextMedia === 'string' ? nextMedia.trim() : template.media_url;

      if (nextType === 'text') {
        if (!trimmedText) {
          return res.status(400).json({
            error: 'text_content is required for text templates'
          });
        }
      } else if (!trimmedMedia) {
        return res.status(400).json({
          error: 'media_url is required for non-text message types'
        });
      }

      await template.update({
        name: trimmedName,
        message_type: nextType,
        text_content: nextType === 'text' ? trimmedText : nextText || '',
        media_url: nextType === 'text' ? null : trimmedMedia
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

  /**
   * Duplica um template
   */
  async duplicate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name } = req.body || {};

      const template = await MessageTemplate.findOne({
        where: { id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      let newName = name && name.trim();
      if (!newName) {
        const baseName = `${template.name} (cópia`;
        let suffix = ')';
        let counter = 1;

        let existing = await MessageTemplate.findOne({
          where: { user_id: userId, name: `${baseName}${suffix}` }
        });

        while (existing) {
          suffix = ` ${counter})`;
          existing = await MessageTemplate.findOne({
            where: { user_id: userId, name: `${baseName}${suffix}` }
          });
          counter += 1;
        }

        newName = `${baseName}${suffix}`;
      }

      const duplicated = await MessageTemplate.create({
        user_id: userId,
        name: newName,
        message_type: template.message_type,
        text_content: template.text_content,
        media_url: template.media_url
      });

      res.status(201).json({
        message: 'Template duplicated successfully',
        template: duplicated
      });
    } catch (error) {
      console.error('Duplicate template error:', error);
      res.status(500).json({ error: 'Failed to duplicate template' });
    }
  }
}

export default new TemplateController();
