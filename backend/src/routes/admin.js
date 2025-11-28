import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/permissions.js';
import adminUserController from '../controllers/adminUserController.js';
import adminMetricsController from '../controllers/adminMetricsController.js';

const router = express.Router();

// Todas as rotas de admin requerem autenticação e role admin
router.use(authenticate, requireAdmin);

// Gestão de usuários
router.get('/users', adminUserController.listUsers);
router.patch('/users/:id/role', adminUserController.updateUserRole);

// Métricas globais
router.get('/metrics/global', adminMetricsController.getGlobalMetrics);
router.get('/metrics/users', adminMetricsController.getUserMetrics);
router.get('/metrics/stats', adminMetricsController.getUsageStats);

export default router;


