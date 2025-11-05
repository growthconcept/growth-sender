import campaignQueue from '../config/queue.js';
import { Campaign, Connection, MessageTemplate, MessageLog, sequelize } from '../models/index.js';
import evolutionAPI from '../services/evolutionAPI.js';

/**
 * Verifica se está dentro do horário permitido
 */
function isWithinAllowedTime(campaign) {
  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc

  // Verificar dia da semana
  if (!campaign.allowed_days.includes(currentDay)) {
    return false;
  }

  // Verificar horário
  if (currentTime < campaign.start_time || currentTime > campaign.end_time) {
    return false;
  }

  return true;
}

/**
 * Calcula próximo horário válido
 */
function getNextValidTime(campaign) {
  const now = new Date();
  let nextDate = new Date(now);

  // Se passou do horário de hoje, ir para próximo dia permitido
  const currentTime = now.toTimeString().split(' ')[0];
  if (currentTime > campaign.end_time) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // Encontrar próximo dia permitido
  while (!campaign.allowed_days.includes(nextDate.getDay())) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // Definir horário de início
  const [hours, minutes] = campaign.start_time.split(':');
  nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return nextDate;
}

/**
 * Aguarda até próximo horário válido
 */
async function waitForValidTime(campaign) {
  if (isWithinAllowedTime(campaign)) {
    return;
  }

  const nextValidTime = getNextValidTime(campaign);
  const waitTime = nextValidTime.getTime() - Date.now();

  console.log(`Campaign ${campaign.id}: Waiting until ${nextValidTime.toISOString()}`);

  return new Promise(resolve => setTimeout(resolve, waitTime));
}

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

    // Aguardar horário válido se necessário
    await waitForValidTime(campaign);

    // Verificar novamente se foi cancelada durante a espera
    await campaign.reload();
    if (campaign.status === 'cancelled' || campaign.status === 'paused') {
      console.log(`Campaign ${campaignId} was ${campaign.status} during wait`);
      return;
    }

    const { connection, template, recipients } = campaign;

    // Verificar se conexão está ativa
    if (connection.status !== 'connected') {
      await campaign.update({
        status: 'error',
        error_count: campaign.error_count + 1
      });
      throw new Error('Connection is not active');
    }

    console.log(`Sending messages to ${recipients.length} recipients...`);

    // Processar cada destinatário
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Verificar se campanha foi pausada ou cancelada
      await campaign.reload();
      if (campaign.status === 'paused' || campaign.status === 'cancelled') {
        console.log(`Campaign ${campaignId} was ${campaign.status}, stopping`);
        return;
      }

      // Verificar se ainda está dentro do horário permitido
      if (!isWithinAllowedTime(campaign)) {
        console.log(`Campaign ${campaignId} outside allowed time, waiting...`);
        await waitForValidTime(campaign);

        // Verificar novamente status após espera
        await campaign.reload();
        if (campaign.status === 'paused' || campaign.status === 'cancelled') {
          console.log(`Campaign ${campaignId} was ${campaign.status} during wait`);
          return;
        }
      }

      try {
        // Enviar mensagem baseado no tipo
        if (template.message_type === 'text') {
          await evolutionAPI.sendTextMessage(
            connection.instance_name,
            recipient,
            template.text_content
          );
        } else {
          await evolutionAPI.sendMediaMessage(
            connection.instance_name,
            recipient,
            template.message_type,
            template.media_url,
            template.text_content
          );
        }

        // Registrar sucesso
        await MessageLog.create({
          campaign_id: campaign.id,
          recipient,
          status: 'sent',
          sent_at: new Date()
        });

        // Atualizar contador de enviados
        await campaign.update({
          sent_count: campaign.sent_count + 1
        });

        console.log(`Message sent to ${recipient} (${i + 1}/${recipients.length})`);

      } catch (error) {
        console.error(`Error sending to ${recipient}:`, error.message);

        // Registrar erro
        await MessageLog.create({
          campaign_id: campaign.id,
          recipient,
          status: 'error',
          error_message: error.message,
          sent_at: new Date()
        });

        // Atualizar contador de erros
        await campaign.update({
          error_count: campaign.error_count + 1
        });
      }

      // Aguardar intervalo antes da próxima mensagem (exceto na última)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, campaign.message_interval * 1000));
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
