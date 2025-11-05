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
      .isIn(['text', 'image', 'audio', 'video', 'document'])
      .withMessage('Invalid message type'),
    body('text_content').notEmpty().withMessage('Text content is required'),
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
      .isIn(['text', 'image', 'audio', 'video', 'document'])
      .withMessage('Invalid message type'),
    body('text_content').optional().notEmpty().withMessage('Text content cannot be empty'),
    validate
  ],
  templateController.update
);

// Deletar template
router.delete('/:id', templateController.delete);

export default router;
