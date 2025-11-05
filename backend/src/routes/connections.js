import express from 'express';
import connectionController from '../controllers/connectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Sincronizar conexões com Evolution API
router.post('/sync', connectionController.syncConnections);

// Listar conexões
router.get('/', connectionController.list);

// Buscar uma conexão
router.get('/:id', connectionController.getOne);

// Atualizar status de conexão
router.put('/:id/status', connectionController.updateStatus);

// Listar grupos de uma conexão
router.get('/:id/groups', connectionController.getGroups);

// Deletar conexão
router.delete('/:id', connectionController.delete);

export default router;
