import express from 'express';
import { body } from 'express-validator';
import campaignController from '../controllers/campaignController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Listar campanhas
router.get('/', campaignController.list);

// Buscar uma campanha
router.get('/:id', campaignController.getOne);

// Buscar logs de uma campanha
router.get('/:id/logs', campaignController.getLogs);

// Criar campanha
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('connection_id').isUUID().withMessage('Valid connection_id is required'),
    body('template_id').isUUID().withMessage('Valid template_id is required'),
    body('recipient_type')
      .isIn(['contacts', 'group'])
      .withMessage('recipient_type must be contacts or group'),
    body('recipients').isArray({ min: 1 }).withMessage('Recipients must be a non-empty array'),
    body('message_interval')
      .optional()
      .isInt({ min: 10 })
      .withMessage('Message interval must be at least 10 seconds'),
    validate
  ],
  campaignController.create
);

// Pausar campanha
router.post('/:id/pause', campaignController.pause);

// Cancelar campanha
router.post('/:id/cancel', campaignController.cancel);

// Retomar campanha
router.post('/:id/resume', campaignController.resume);

// Deletar campanha
router.delete('/:id', campaignController.delete);

export default router;
