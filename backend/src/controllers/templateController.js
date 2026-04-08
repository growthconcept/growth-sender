import { MessageTemplate, User } from '../models/index.js';

class TemplateController {
  /**
   * Lista todos os templates (visíveis para todos os usuários)
   */
  async list(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Todos os usuários podem ver todos os templates
      const templates = await MessageTemplate.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
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
   * Busca um template específico (visível para todos os usuários)
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;

      // Qualquer usuário pode visualizar qualquer template
      const template = await MessageTemplate.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
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
      const { name, message_type, text_content, media_url, interactive_content } = req.body;

      console.log('Template create payload:', {
        name,
        message_type,
        hasText: !!text_content,
        hasMedia: !!media_url,
        hasInteractive: !!interactive_content,
        mediaUrlSample: typeof media_url === 'string' ? media_url.slice(0, 80) : media_url
      });

      const trimmedName = name?.trim();
      const trimmedText = typeof text_content === 'string' ? text_content.trim() : '';
      const trimmedMedia = typeof media_url === 'string' ? media_url.trim() : '';

      if (!trimmedName) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const validMenuTypes = ['button', 'list', 'poll'];

      if (message_type === 'text') {
        if (!trimmedText) {
          return res.status(400).json({ error: 'text_content is required for text templates' });
        }
      } else if (message_type === 'interactive_menu') {
        if (!interactive_content || !validMenuTypes.includes(interactive_content.menuType)) {
          return res.status(400).json({
            error: 'interactive_content.menuType must be one of: button, list, poll'
          });
        }
        if (!Array.isArray(interactive_content.choices) || interactive_content.choices.length === 0) {
          return res.status(400).json({ error: 'interactive_content.choices must be a non-empty array' });
        }
      } else if (message_type === 'carousel') {
        if (!interactive_content || !Array.isArray(interactive_content.cards) || interactive_content.cards.length === 0) {
          return res.status(400).json({ error: 'interactive_content.cards must be a non-empty array' });
        }
        for (const card of interactive_content.cards) {
          if (!card.text || !Array.isArray(card.buttons)) {
            return res.status(400).json({
              error: 'Each carousel card must have text and buttons array'
            });
          }
        }
      } else if (!trimmedMedia) {
        return res.status(400).json({ error: 'media_url is required for non-text message types' });
      }

      const isInteractive = message_type === 'interactive_menu' || message_type === 'carousel';

      const template = await MessageTemplate.create({
        user_id: userId,
        name: trimmedName,
        message_type,
        text_content: isInteractive
          ? (interactive_content?.text || trimmedText || '')
          : (message_type === 'text' ? trimmedText : (text_content || '')),
        media_url: isInteractive || message_type === 'text' ? null : trimmedMedia,
        interactive_content: isInteractive ? interactive_content : null
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
      const { name, message_type, text_content, media_url, interactive_content } = req.body;

      const template = await MessageTemplate.findOne({
        where: { id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const nextType = message_type || template.message_type;
      const nextText = text_content !== undefined ? text_content : template.text_content;
      const nextMedia = media_url !== undefined ? media_url : template.media_url;
      const nextInteractive = interactive_content !== undefined ? interactive_content : template.interactive_content;

      const trimmedName = name !== undefined ? name?.trim() : template.name;
      const trimmedText = typeof nextText === 'string' ? nextText.trim() : template.text_content;
      const trimmedMedia = typeof nextMedia === 'string' ? nextMedia.trim() : template.media_url;

      const validMenuTypes = ['button', 'list', 'poll'];

      if (nextType === 'text') {
        if (!trimmedText) {
          return res.status(400).json({ error: 'text_content is required for text templates' });
        }
      } else if (nextType === 'interactive_menu') {
        if (!nextInteractive || !validMenuTypes.includes(nextInteractive.menuType)) {
          return res.status(400).json({
            error: 'interactive_content.menuType must be one of: button, list, poll'
          });
        }
        if (!Array.isArray(nextInteractive.choices) || nextInteractive.choices.length === 0) {
          return res.status(400).json({ error: 'interactive_content.choices must be a non-empty array' });
        }
      } else if (nextType === 'carousel') {
        if (!nextInteractive || !Array.isArray(nextInteractive.cards) || nextInteractive.cards.length === 0) {
          return res.status(400).json({ error: 'interactive_content.cards must be a non-empty array' });
        }
        for (const card of nextInteractive.cards) {
          if (!card.text || !Array.isArray(card.buttons)) {
            return res.status(400).json({
              error: 'Each carousel card must have text and buttons array'
            });
          }
        }
      } else if (!trimmedMedia) {
        return res.status(400).json({ error: 'media_url is required for non-text message types' });
      }

      const isInteractive = nextType === 'interactive_menu' || nextType === 'carousel';

      await template.update({
        name: trimmedName,
        message_type: nextType,
        text_content: isInteractive
          ? (nextInteractive?.text || trimmedText || '')
          : (nextType === 'text' ? trimmedText : (nextText || '')),
        media_url: isInteractive || nextType === 'text' ? null : trimmedMedia,
        interactive_content: isInteractive ? nextInteractive : null
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

      // Qualquer usuário pode duplicar qualquer template existente, independente do dono.
      // A cópia sempre será criada com user_id = usuário atual.
      const template = await MessageTemplate.findOne({ where: { id } });

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
        media_url: template.media_url,
        interactive_content: template.interactive_content
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
