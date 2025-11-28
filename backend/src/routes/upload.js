import express from 'express';
import uploadController, { upload } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { addCorsHeaders } from '../middleware/cors.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticate);

// Upload de arquivo com tratamento de erro do multer
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Erro do multer (tipo de arquivo, tamanho, etc.)
      addCorsHeaders(req, res);
      console.error('Multer error:', err.message);
      return res.status(400).json({ 
        error: err.message || 'Erro ao processar arquivo',
        details: err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande (máximo 50MB)' : undefined
      });
    }
    next();
  });
}, uploadController.uploadFile);

export default router;
