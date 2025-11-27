import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/s3Client.js';

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

// Configurar multer
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

class UploadController {
  /**
   * Upload de arquivo
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (!process.env.S3_BUCKET) {
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
      res.status(500).json({ error: 'Erro ao fazer upload do arquivo' });
    }
  }
}

export default new UploadController();
