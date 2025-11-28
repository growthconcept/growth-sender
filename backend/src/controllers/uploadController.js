import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/s3Client.js';
import { addCorsHeaders } from '../middleware/cors.js';

// Filtro de tipos de arquivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'video': ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    'audio': ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  };

  const allAllowedTypes = [
    ...allowedTypes.image,
    ...allowedTypes.video,
    ...allowedTypes.audio,
    ...allowedTypes.document
  ];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido'), false);
  }
};

// Limites de tamanho por tipo de arquivo
const FILE_SIZE_LIMITS = {
  image: 50 * 1024 * 1024,      // 50MB para imagens
  video: 50 * 1024 * 1024,      // 50MB para vídeos
  document: 500 * 1024 * 1024,  // 500MB para documentos
  audio: 50 * 1024 * 1024       // 50MB para áudios
};

// Configurar multer com limite máximo de 2GB
// A validação de tamanho por tipo de arquivo é feita no controller
// (Imagens/Vídeos: 50MB, Documentos: 500MB)
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 // 2GB (limite máximo do Nginx)
  }
});

// Função auxiliar para determinar o tipo de arquivo
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || 
      mimetype.includes('msword') || 
      mimetype.includes('wordprocessingml') ||
      mimetype.includes('ms-excel') ||
      mimetype.includes('spreadsheetml')) {
    return 'document';
  }
  return null;
};

class UploadController {
  /**
   * Upload de arquivo
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        addCorsHeaders(req, res);
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Validar tamanho do arquivo baseado no tipo
      const fileCategory = getFileCategory(req.file.mimetype);
      if (fileCategory) {
        const maxSize = FILE_SIZE_LIMITS[fileCategory];
        if (req.file.size > maxSize) {
          const maxSizeMB = maxSize / (1024 * 1024);
          const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
          addCorsHeaders(req, res);
          return res.status(413).json({
            error: 'Arquivo muito grande',
            message: `O arquivo enviado (${fileSizeMB}MB) excede o limite máximo permitido de ${maxSizeMB}MB para ${fileCategory === 'image' ? 'imagens' : fileCategory === 'video' ? 'vídeos' : fileCategory === 'document' ? 'documentos' : 'áudios'}`,
            maxSize: maxSizeMB,
            maxSizeBytes: maxSize,
            fileSize: req.file.size,
            fileSizeMB: parseFloat(fileSizeMB),
            category: fileCategory,
            code: 'LIMIT_FILE_SIZE'
          });
        }
      }

      if (!process.env.S3_BUCKET) {
        addCorsHeaders(req, res);
        return res.status(500).json({ error: 'Configuração S3_BUCKET ausente' });
      }

      const fileExtension = path.extname(req.file.originalname) || '';
      const objectKey = `${process.env.S3_PREFIX || 'uploads'}/${randomUUID()}${fileExtension}`;

      const putParams = {
        Bucket: process.env.S3_BUCKET,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };

      if (process.env.S3_OBJECT_ACL) {
        putParams.ACL = process.env.S3_OBJECT_ACL;
      }

      const putCommand = new PutObjectCommand(putParams);

      await s3Client.send(putCommand);

      const storageBaseUrl =
        process.env.S3_PUBLIC_URL ||
        process.env.S3_ENDPOINT ||
        `https://${process.env.S3_BUCKET}.s3.amazonaws.com`;

      const normalizedBase = storageBaseUrl.replace(/\/$/, '');
      const usePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

      const fileUrl = usePathStyle
        ? `${normalizedBase}/${process.env.S3_BUCKET}/${objectKey}`
        : `${normalizedBase}/${objectKey}`;

      addCorsHeaders(req, res);
      res.json({
        message: 'Arquivo enviado com sucesso',
        file: {
          filename: objectKey,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl
        },
        preview: {
          src: fileUrl,
          type: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      addCorsHeaders(req, res);
      res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
    }
  }
}

export default new UploadController();
