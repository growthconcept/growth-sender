import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Garantir que o .env seja carregado do diretório correto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');

const envResult = dotenv.config({ path: envPath });

// Log para debug
console.log('[Worker] Loading .env from:', envPath);
if (envResult.error) {
  console.error('[Worker] Erro ao carregar .env:', envResult.error.message);
} else {
  console.log('[Worker] .env carregado com sucesso');
}

// Log para verificar se REDIS_URL está carregada
if (process.env.REDIS_URL) {
  const redisUrlForLog = process.env.REDIS_URL.includes('@') 
    ? process.env.REDIS_URL.split('@')[0] + '@***' + process.env.REDIS_URL.split('@')[1]
    : process.env.REDIS_URL;
  console.log('[Worker] REDIS_URL:', `✓ ${redisUrlForLog}`);
} else {
  console.error('[Worker] REDIS_URL: ✗ Não encontrada!');
  console.error('[Worker] Verifique se a variável REDIS_URL está definida no arquivo .env');
  process.exit(1);
}

import campaignQueue from '../config/queue.js';
import { Campaign, Connection, MessageTemplate, MessageLog, sequelize } from '../models/index.js';
import whatsappService from '../services/whatsapp.service.js';
import axios from 'axios';
import s3Client from '../config/s3Client.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


const mimeTypesByMessageType = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mpeg',
  document: 'application/pdf'
};

const base64PreferredTypes = new Set(['audio']);

const streamToBuffer = async (stream) =>
  await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

function resolveS3ObjectKey(mediaUrl) {
  if (!process.env.S3_BUCKET) {
    return null;
  }

  let targetUrl;
  try {
    targetUrl = new URL(mediaUrl);
  } catch {
    return null;
  }

  const candidates = [];
  if (process.env.S3_PUBLIC_URL) {
    try {
      candidates.push(new URL(process.env.S3_PUBLIC_URL));
    } catch {
      // ignore invalid URL
    }
  }
  if (process.env.S3_ENDPOINT) {
    try {
      candidates.push(new URL(process.env.S3_ENDPOINT));
    } catch {
      // ignore invalid URL
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const bucket = process.env.S3_BUCKET;
  const usePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

  for (const base of candidates) {
    if (targetUrl.origin === base.origin) {
      const path = targetUrl.pathname.replace(/^\/+/, '');

      if (usePathStyle) {
        const [bucketSegment, ...rest] = path.split('/');
        if (bucketSegment === bucket && rest.length > 0) {
          return rest.join('/');
        }
      } else {
        if (path.startsWith(`${bucket}/`)) {
          return path.substring(bucket.length + 1);
        }
        return path;
      }
    }
  }

  // Fallback: tentar resolver apenas pelo path, mesmo com origin diferente
  const fallbackPath = targetUrl.pathname.replace(/^\/+/, '');
  if (usePathStyle) {
    const [bucketSegment, ...rest] = fallbackPath.split('/');
    if (bucketSegment === bucket && rest.length > 0) {
      return rest.join('/');
    }
  } else if (fallbackPath.startsWith(`${bucket}/`)) {
    return fallbackPath.substring(bucket.length + 1);
  }

  return null;
}

async function fetchFromS3IfApplicable(template) {
  let mediaUrl = template.media_url;

  const decodedUrl = decodeSharedObjectUrl(mediaUrl);
  if (decodedUrl) {
    mediaUrl = decodedUrl;
  }

  if (!s3Client || !process.env.S3_BUCKET) {
    return null;
  }

  const objectKey = resolveS3ObjectKey(mediaUrl);
  if (!objectKey) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectKey
    });
    const response = await s3Client.send(command);
    const body = await streamToBuffer(response.Body);
    const contentType =
      response.ContentType ||
      mimeTypesByMessageType[template.message_type] ||
      'application/octet-stream';

    return {
      buffer: body,
      contentType
    };
  } catch (error) {
    console.warn(`Não foi possível baixar do S3 (${objectKey}):`, error?.message || error);
    return null;
  }
}

async function generatePresignedUrl(mediaUrl) {
  if (!s3Client || !process.env.S3_BUCKET) {
    return null;
  }
  const decodedUrl = decodeSharedObjectUrl(mediaUrl);
  const targetUrl = decodedUrl || mediaUrl;
  const objectKey = resolveS3ObjectKey(targetUrl);
  if (!objectKey) {
    return null;
  }
  const expiresIn = Number.parseInt(process.env.S3_SIGNED_URL_EXPIRES || '43200', 10);
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: objectKey
    });
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: Number.isNaN(expiresIn) ? 43200 : expiresIn
    });
    
    // Substituir endpoint privado pelo público
    if (process.env.S3_PUBLIC_URL && process.env.S3_ENDPOINT) {
      const privateEndpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
      const publicEndpoint = process.env.S3_PUBLIC_URL.replace(/\/$/, '');
      return signedUrl.replace(privateEndpoint, publicEndpoint);
    }
    
    return signedUrl;
  } catch (error) {
    console.warn('Falha ao gerar URL assinada para mídia:', error?.message || error);
    return null;
  }
}

async function buildMediaPayload(template) {
  if (!template.media_url) {
    return { media: null, mediaType: template.message_type };
  }

  const messageType = template.message_type;
  const preferBase64 = base64PreferredTypes.has(messageType);
  const originalMedia = template.media_url;

  const decodedUrl = decodeSharedObjectUrl(originalMedia);
  if (!preferBase64 && decodedUrl) {
    console.log('Shared-object URL decodificado com sucesso:', decodedUrl);
    return {
      media: decodedUrl,
      mediaType: messageType
    };
  }

  if (!preferBase64) {
    const presignedUrl = await generatePresignedUrl(originalMedia);
    if (presignedUrl) {
      console.log('URL assinada gerada para mídia:', presignedUrl);
      return {
        media: presignedUrl,
        mediaType: messageType
      };
    }
  }

  // Se já for base64/data URI, retornar diretamente
  if (originalMedia.startsWith('data:')) {
    return { media: originalMedia, mediaType: messageType };
  }

  try {
    const s3Result = await fetchFromS3IfApplicable(template);

    if (s3Result) {
      const base64Content = s3Result.buffer.toString('base64');
      console.log(
        `Mídia convertida para base64 via S3 (tipo: ${messageType}, contentType: ${s3Result.contentType})`
      );
      return {
        media: base64Content,
        mediaType: messageType
      };
    }
  } catch (error) {
    console.warn(
      'Falha ao baixar mídia do S3 para conversão base64:',
      error?.message || error
    );
  }

  try {
    const downloadUrl = decodedUrl || originalMedia;

    const axiosOptions = {
      responseType: 'arraybuffer'
    };

    if (downloadUrl.startsWith('https://') && process.env.S3_ALLOW_INSECURE === 'true') {
      const https = await import('https');
      axiosOptions.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
    }

    const response = await axios.get(downloadUrl, {
      ...axiosOptions
    });
    const contentType =
      response.headers['content-type'] ||
      mimeTypesByMessageType[messageType] ||
      'application/octet-stream';

    const base64Content = Buffer.from(response.data).toString('base64');
    console.log(
      `Mídia convertida para base64 via HTTP (tipo: ${messageType}, contentType: ${contentType})`
    );

    return {
      media: base64Content,
      mediaType: messageType
    };
  } catch (error) {
    console.warn(
      `Não foi possível converter a mídia (${originalMedia}) para base64. Usando URL original.`,
      error?.message || error
    );
  }

  return {
    media: originalMedia,
    mediaType: messageType
  };
}

function decodeSharedObjectUrl(mediaUrl) {
  if (!mediaUrl) {
    return null;
  }

  const prefix = '/download-shared-object/';
  const prefixIndex = mediaUrl.indexOf(prefix);
  if (prefixIndex === -1) {
    return null;
  }

  let base64Part = mediaUrl.substring(prefixIndex + prefix.length);

  if (!base64Part) {
    return null;
  }

  try {
    base64Part = decodeURIComponent(base64Part);
    base64Part = base64Part.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Part.length % 4 !== 0) {
      base64Part += '=';
    }

    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8').trim();
    if (!/^https?:\/\//i.test(decoded)) {
      throw new Error('Decoded value is not an HTTP(s) URL');
    }
    return decoded;
  } catch (error) {
    console.warn('Falha ao decodificar shared-object URL:', error?.message || error);
    return null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Processa uma campanha
 */
async function processCampaign(job) {
  const { campaignId } = job.data;

  console.log(`Processing campaign ${campaignId}...`);

  try {
    // Buscar campanha com relações
    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        { model: Connection, as: 'connection' },
        { model: MessageTemplate, as: 'template' }
      ]
    });

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }

    // Verificar se campanha foi cancelada
    if (campaign.status === 'cancelled') {
      console.log(`Campaign ${campaignId} was cancelled`);
      return;
    }

    // Atualizar status para running
    await campaign.update({
      status: 'running',
      started_at: new Date()
    });

    const { connection, template, recipients } = campaign;

    // Verificar se conexão está ativa
    if (connection.status !== 'connected') {
      await campaign.update({
        status: 'error',
        error_count: campaign.error_count + 1
      });
      throw new Error('Connection is not active');
    }

    const recipientType = campaign.recipient_type || 'contacts';
    const recipientLabel = recipientType === 'group' ? 'grupos' : 'contatos';
    console.log(`Sending messages to ${recipients.length} ${recipientLabel}...`);

    const pauseAfter = campaign.pause_after_messages;
    const pauseDuration = campaign.pause_duration_seconds;
    let messagesSincePause = 0;

    // Verificar quais destinatários já foram processados (para evitar duplicatas em retomadas)
    const existingLogs = await MessageLog.findAll({
      where: { campaign_id: campaign.id },
      attributes: ['recipient', 'status']
    });
    const processedRecipients = new Set(existingLogs.map(log => log.recipient));
    
    // Recalcular contadores baseados nos logs existentes (para garantir consistência)
    const actualSentCount = existingLogs.filter(log => log.status === 'sent').length;
    const actualErrorCount = existingLogs.filter(log => log.status === 'error').length;
    
    // Sincronizar contadores se estiverem desatualizados
    if (campaign.sent_count !== actualSentCount || campaign.error_count !== actualErrorCount) {
      console.warn(`Campaign ${campaignId} counters out of sync. Recalculating...`);
      console.warn(`Previous: sent=${campaign.sent_count}, errors=${campaign.error_count}`);
      console.warn(`Actual: sent=${actualSentCount}, errors=${actualErrorCount}`);
      await campaign.update({
        sent_count: actualSentCount,
        error_count: actualErrorCount
      });
    }

    // Processar cada destinatário
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Verificar se campanha foi pausada ou cancelada
      await campaign.reload();
      if (campaign.status === 'paused' || campaign.status === 'cancelled') {
        console.log(`Campaign ${campaignId} was ${campaign.status}, stopping`);
        return;
      }

      // Pular destinatários que já foram processados (evitar duplicatas)
      if (processedRecipients.has(recipient)) {
        console.log(`Skipping already processed recipient: ${recipient}`);
        continue;
      }

      try {
        // Enviar mensagem baseado no tipo
        // Nota: O endpoint é o mesmo para contatos e grupos, apenas o ID/número muda
        if (template.message_type === 'text') {
          await whatsappService.sendTextMessage(
            connection.instance_key,
            recipient,
            template.text_content
          );
        } else if (template.message_type === 'interactive_menu') {
          const ic = template.interactive_content;
          // Converter prefixo interno 'url:' para o formato da API (sem prefixo)
          const apiChoices = (ic.choices ?? []).map((c) => c.replace('|url:', '|'));
          const payload = {
            type: ic.menuType,
            text: ic.text || template.text_content,
            choices: apiChoices,
            ...(ic.footerText !== undefined && { footerText: ic.footerText }),
            ...(ic.listButton !== undefined && { listButton: ic.listButton }),
            ...(ic.imageButton !== undefined && { imageButton: ic.imageButton }),
            ...(ic.selectableCount !== undefined && { selectableCount: ic.selectableCount })
          };
          await whatsappService.sendInteractiveMenu(connection.instance_key, recipient, payload);
        } else if (template.message_type === 'carousel') {
          const ic = template.interactive_content;

          // Resolver URLs das imagens para URLs públicas/assinadas antes de enviar
          const resolvedCards = await Promise.all(
            (ic.cards ?? []).map(async (card) => {
              if (!card.image) return card;
              const presigned = await generatePresignedUrl(card.image);
              return { ...card, image: presigned || card.image };
            })
          );

          const payload = {
            text: ic.text || template.text_content,
            carousel: resolvedCards
          };
          await whatsappService.sendCarousel(connection.instance_key, recipient, payload);
        } else {
          const { media, mediaType } = await buildMediaPayload(template);

          if (mediaType === 'audio') {
            await whatsappService.sendWhatsAppAudio(connection.instance_key, recipient, media);
          } else {
            await whatsappService.sendMediaMessage(
              connection.instance_key,
              recipient,
              mediaType,
              media,
              template.text_content
            );
          }
        }

        // Registrar sucesso
        await MessageLog.create({
          campaign_id: campaign.id,
          recipient,
          status: 'sent',
          sent_at: new Date()
        });

        // Marcar como processado
        processedRecipients.add(recipient);

        // Atualizar contador de enviados (usar incremento atômico)
        await campaign.increment('sent_count');

        const recipientTypeLabel = recipientType === 'group' ? 'grupo' : 'contato';
        console.log(`Message sent to ${recipientTypeLabel} ${recipient} (${i + 1}/${recipients.length})`);

      } catch (error) {
        console.error(`Error sending to ${recipient}:`, {
          message: error.message,
          stack: error.stack,
          apiResponse: error.response?.data,
          apiStatus: error.response?.status
        });

        // Registrar erro
        await MessageLog.create({
          campaign_id: campaign.id,
          recipient,
          status: 'error',
          error_message: error.message,
          sent_at: new Date()
        });

        // Marcar como processado
        processedRecipients.add(recipient);

        // Atualizar contador de erros (usar incremento atômico)
        await campaign.increment('error_count');
      }

      // Aguardar intervalo antes da próxima mensagem (exceto na última)
      if (i < recipients.length - 1) {
        messagesSincePause += 1;

        await sleep(campaign.message_interval * 1000);

        if (
          pauseAfter &&
          pauseDuration &&
          pauseAfter > 0 &&
          messagesSincePause % pauseAfter === 0
        ) {
          console.log(
            `Campaign ${campaignId}: batch pause after ${messagesSincePause} messages for ${pauseDuration}s`
          );
          await sleep(pauseDuration * 1000);
        }
      }
    }

    // Marcar campanha como concluída
    await campaign.update({
      status: 'completed',
      completed_at: new Date()
    });

    console.log(`Campaign ${campaignId} completed successfully`);

  } catch (error) {
    console.error(`Error processing campaign ${campaignId}:`, error);

    // Atualizar campanha com status de erro
    const campaign = await Campaign.findByPk(campaignId);
    if (campaign) {
      await campaign.update({
        status: 'error'
      });
    }

    throw error;
  }
}

// Processar jobs da fila
campaignQueue.process(async (job) => {
  return await processCampaign(job);
});

console.log('Campaign worker started and listening for jobs...');

// Manter processo ativo
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queue...');
  await campaignQueue.close();
  process.exit(0);
});
