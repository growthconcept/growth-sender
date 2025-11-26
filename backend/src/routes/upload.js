import express from 'express';
import uploadController, { upload } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Upload de arquivo
router.post('/', upload.single('file'), uploadController.uploadFile);

export default router;
