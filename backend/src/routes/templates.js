import express from 'express';
import { body } from 'express-validator';
import templateController from '../controllers/templateController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar templates
router.get('/', templateController.list);

// Buscar um template
router.get('/:id', templateController.getOne);

// Criar template
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('message_type')
      .isIn(['text', 'image', 'audio', 'video', 'document', 'interactive_menu', 'carousel'])
      .withMessage('Invalid message type'),
    validate
  ],
  templateController.create
);

// Atualizar template
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('message_type')
      .optional()
      .isIn(['text', 'image', 'audio', 'video', 'document', 'interactive_menu', 'carousel'])
      .withMessage('Invalid message type'),
    body('text_content')
      .optional({ nullable: true })
      .custom((value, { req }) => {
        if (req.body.message_type === 'text') {
          if (!value || !String(value).trim()) {
            throw new Error('Text content is required for text templates');
          }
        }
        return true;
      }),
    validate
  ],
  templateController.update
);

// Deletar template
router.delete('/:id', templateController.delete);

// Duplicar template
router.post('/:id/duplicate', templateController.duplicate);

export default router;
