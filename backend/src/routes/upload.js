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
      // Sempre adicionar headers CORS em caso de erro
      addCorsHeaders(req, res);
      console.error('Multer error:', err.message, 'Code:', err.code);

      // Tratamento específico para diferentes tipos de erro
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSizeMB = 200;
        const fileSizeMB = req.headers['content-length'] 
          ? (parseInt(req.headers['content-length']) / (1024 * 1024)).toFixed(2)
          : 'desconhecido';
        
        return res.status(413).json({ 
          error: 'Arquivo muito grande',
          message: `O arquivo enviado (${fileSizeMB}MB) excede o limite máximo permitido de ${maxSizeMB}MB`,
          maxSize: maxSizeMB,
          maxSizeBytes: maxSizeMB * 1024 * 1024,
          code: 'LIMIT_FILE_SIZE'
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: 'Campo de arquivo inválido',
          message: 'O campo do arquivo deve ser nomeado como "file"',
          code: 'LIMIT_UNEXPECTED_FILE'
        });
      }

      if (err.message && err.message.includes('Tipo de arquivo não permitido')) {
        return res.status(400).json({ 
          error: 'Tipo de arquivo não permitido',
          message: 'O tipo de arquivo enviado não é suportado. Tipos permitidos: imagens (JPEG, PNG, GIF, WebP), vídeos (MP4, QuickTime, AVI, WebM), áudios (MP3, WAV, OGG, WebM) e documentos (PDF, DOC, DOCX, XLS, XLSX)',
          code: 'INVALID_FILE_TYPE'
        });
      }

      // Erro genérico do multer
      return res.status(400).json({ 
        error: 'Erro ao processar arquivo',
        message: err.message || 'Ocorreu um erro ao processar o arquivo enviado',
        code: err.code || 'UPLOAD_ERROR'
      });
    }
    next();
  });
}, uploadController.uploadFile);

export default router;
