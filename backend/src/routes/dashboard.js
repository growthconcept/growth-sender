import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Métricas do dashboard
router.get('/metrics', dashboardController.getMetrics);

// Campanhas recentes
router.get('/recent-campaigns', dashboardController.getRecentCampaigns);

// Estatísticas por período
router.get('/stats', dashboardController.getStats);

export default router;
