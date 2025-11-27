import { Campaign, Connection, MessageTemplate, DailyLimit, MessageLog, User } from '../models/index.js';
import { Op } from 'sequelize';
import campaignQueue from '../config/queue.js';

class CampaignController {
  /**
   * Lista todas as campanhas do usuário
   */
  async list(req, res) {
    try {
      const userId = req.user.id;
      const { 
        status, 
        connection_id, 
        date_from, 
        date_to,
        limit = 50, 
        offset = 0 
      } = req.query;

      // Filtrar apenas campanhas do usuário logado
      const where = {
        user_id: userId
      };
      
      if (status) {
        where.status = status;
      }
      
      if (connection_id) {
        where.connection_id = connection_id;
      }
      
      if (date_from || date_to) {
        where.created_at = {};
        if (date_from) {
          where.created_at[Op.gte] = new Date(date_from);
        }
        if (date_to) {
          // Adicionar 23:59:59 ao final do dia para incluir o dia inteiro
          const endDate = new Date(date_to);
          endDate.setHours(23, 59, 59, 999);
          where.created_at[Op.lte] = endDate;
        }
      }

      const campaigns = await Campaign.findAll({
        where,
        include: [
          {
            model: Connection,
            as: 'connection',
            attributes: ['id', 'instance_name', 'phone_number', 'status']
          },
          {
            model: MessageTemplate,
            as: 'template',
            attributes: ['id', 'name', 'message_type']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({ campaigns });
    } catch (error) {
      console.error('List campaigns error:', error);
      res.status(500).json({ error: 'Failed to list campaigns' });
    }
  }

  /**
   * Busca uma campanha específica
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await Campaign.findOne({
        where: { id, user_id: userId },
        include: [
          {
            model: Connection,
            as: 'connection'
          },
          {
            model: MessageTemplate,
            as: 'template'
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: MessageLog,
            as: 'logs',
            limit: 100,
            order: [['sent_at', 'DESC']]
          }
        ]
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({ campaign });
    } catch (error) {
      console.error('Get campaign error:', error);
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  }

  /**
   * Cria nova campanha
   */
  async create(req, res) {
    try {
      const userId = req.user.id;
      const {
        name,
        connection_id,
        template_id,
        recipient_type,
        recipients,
        scheduled_date,
        start_time,
        end_time,
        allowed_days,
        message_interval,
        pause_after_messages,
        pause_duration_seconds,
        max_recipients
      } = req.body;

      // Validar conexão
      const connection = await Connection.findOne({
        where: { id: connection_id, user_id: userId }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      if (connection.status !== 'connected') {
        return res.status(400).json({ error: 'Connection is not active' });
      }

      // Validar template
      const template = await MessageTemplate.findOne({
        where: { id: template_id, user_id: userId }
      });

      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Validar número de destinatários
      if (!recipients || recipients.length === 0) {
        return res.status(400).json({ error: 'Recipients list cannot be empty' });
      }

      // Remover duplicatas da lista de destinatários
      const uniqueRecipients = [...new Set(recipients)];
      
      if (uniqueRecipients.length !== recipients.length) {
        console.warn(`Campaign recipients deduplicated: ${recipients.length} -> ${uniqueRecipients.length}`);
      }

      if (uniqueRecipients.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 recipients allowed' });
      }

      // Validar intervalo entre mensagens
      if (message_interval < 10) {
        return res.status(400).json({ error: 'Minimum message interval is 10 seconds' });
      }

      // VALIDAÇÃO DE LIMITE DIÁRIO - DESABILITADA PARA DESENVOLVIMENTO
      // TODO: Reativar em produção
      /*
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const dailyLimit = await DailyLimit.findOne({
        where: {
          user_id: userId,
          connection_id,
          date: today
        }
      });

      if (dailyLimit && dailyLimit.campaigns_count >= 1) {
        return res.status(400).json({
          error: 'Daily limit reached: Only 1 campaign per day is allowed for this connection'
        });
      }
      */

      let normalizedPauseAfter = null;
      let normalizedPauseDuration = null;

      if (pause_after_messages !== undefined && pause_after_messages !== null && pause_after_messages !== '') {
        normalizedPauseAfter = parseInt(pause_after_messages, 10);
        if (Number.isNaN(normalizedPauseAfter) || normalizedPauseAfter <= 0) {
          return res.status(400).json({ error: 'pause_after_messages must be a positive integer' });
        }
      }

      if (pause_duration_seconds !== undefined && pause_duration_seconds !== null && pause_duration_seconds !== '') {
        normalizedPauseDuration = parseInt(pause_duration_seconds, 10);
        if (Number.isNaN(normalizedPauseDuration) || normalizedPauseDuration <= 0) {
          return res.status(400).json({ error: 'pause_duration_seconds must be a positive integer' });
        }
      }

      if ((normalizedPauseAfter && !normalizedPauseDuration) || (!normalizedPauseAfter && normalizedPauseDuration)) {
        return res.status(400).json({
          error: 'Both pause_after_messages and pause_duration_seconds must be provided together'
        });
      }

      // Criar campanha
      const campaign = await Campaign.create({
        user_id: userId,
        connection_id,
        template_id,
        name,
        recipient_type,
        recipients: uniqueRecipients, // Usar lista deduplicada
        scheduled_date: scheduled_date || null,
        // Se não houver scheduled_date, configurar para disparo imediato
        // (sem restrições de horário)
        start_time: scheduled_date ? (start_time || '09:00:00') : '00:00:00',
        end_time: scheduled_date ? (end_time || '18:00:00') : '23:59:59',
        allowed_days: scheduled_date ? (allowed_days || [1, 2, 3, 4, 5]) : [0, 1, 2, 3, 4, 5, 6], // Todos os dias se imediato
        message_interval: message_interval || 30,
        pause_after_messages: normalizedPauseAfter,
        pause_duration_seconds: normalizedPauseDuration,
        max_recipients: Math.min(max_recipients || 100, uniqueRecipients.length),
        status: 'scheduled'
      });

      // ATUALIZAÇÃO DE LIMITE DIÁRIO - DESABILITADA PARA DESENVOLVIMENTO
      // TODO: Reativar em produção
      /*
      const today = new Date().toISOString().split('T')[0];
      const dailyLimit = await DailyLimit.findOne({
        where: {
          user_id: userId,
          connection_id,
          date: today
        }
      });

      if (dailyLimit) {
        await dailyLimit.update({
          campaigns_count: dailyLimit.campaigns_count + 1
        });
      } else {
        await DailyLimit.create({
          user_id: userId,
          connection_id,
          date: today,
          campaigns_count: 1
        });
      }
      */

      // Adicionar à fila de processamento
      await campaignQueue.add({
        campaignId: campaign.id
      }, {
        delay: scheduled_date ? new Date(scheduled_date).getTime() - Date.now() : 0
      });

      res.status(201).json({
        message: 'Campaign created successfully and added to queue',
        campaign
      });
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  /**
   * Pausa uma campanha em execução
   */
  async pause(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await Campaign.findOne({
        where: { id, user_id: userId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status !== 'running') {
        return res.status(400).json({ error: 'Campaign is not running' });
      }

      await campaign.update({ status: 'paused' });

      res.json({
        message: 'Campaign paused successfully',
        campaign
      });
    } catch (error) {
      console.error('Pause campaign error:', error);
      res.status(500).json({ error: 'Failed to pause campaign' });
    }
  }

  /**
   * Cancela uma campanha
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await Campaign.findOne({
        where: { id, user_id: userId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status === 'completed' || campaign.status === 'cancelled') {
        return res.status(400).json({ error: 'Campaign already finished' });
      }

      // Buscar e remover job da fila do Redis
      try {
        const jobs = await campaignQueue.getJobs(['waiting', 'delayed', 'active']);
        for (const job of jobs) {
          if (job.data.campaignId === id) {
            await job.remove();
            console.log(`Job ${job.id} removed from queue for campaign ${id}`);
            break;
          }
        }
      } catch (queueError) {
        console.warn('Error removing job from queue:', queueError.message);
        // Continuar mesmo se falhar ao remover da fila
        // O worker vai verificar o status e parar se estiver cancelado
      }

      await campaign.update({ status: 'cancelled' });

      res.json({
        message: 'Campaign cancelled successfully',
        campaign
      });
    } catch (error) {
      console.error('Cancel campaign error:', error);
      res.status(500).json({ error: 'Failed to cancel campaign' });
    }
  }

  /**
   * Retoma uma campanha pausada
   */
  async resume(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await Campaign.findOne({
        where: { id, user_id: userId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status !== 'paused') {
        return res.status(400).json({ error: 'Campaign is not paused' });
      }

      await campaign.update({ status: 'scheduled' });

      // Recolocar na fila
      await campaignQueue.add({
        campaignId: campaign.id
      });

      res.json({
        message: 'Campaign resumed successfully',
        campaign
      });
    } catch (error) {
      console.error('Resume campaign error:', error);
      res.status(500).json({ error: 'Failed to resume campaign' });
    }
  }

  /**
   * Busca logs de uma campanha
   */
  async getLogs(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { limit = 100, offset = 0 } = req.query;

      // Verificar se campanha pertence ao usuário
      const campaign = await Campaign.findOne({
        where: { id, user_id: userId }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const logs = await MessageLog.findAll({
        where: { campaign_id: id },
        order: [['sent_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({ logs });
    } catch (error) {
      console.error('Get campaign logs error:', error);
      res.status(500).json({ error: 'Failed to get campaign logs' });
    }
  }

  /**
   * Deleta uma campanha (apenas admins)
   */
  async delete(req, res) {
    try {
      // Verificar se usuário é admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required to delete campaigns' });
      }

      const { id } = req.params;

      const campaign = await Campaign.findOne({
        where: { id }
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status === 'running') {
        return res.status(400).json({
          error: 'Cannot delete a running campaign. Please cancel it first.'
        });
      }

      await campaign.destroy();

      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Delete campaign error:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }
}

export default new CampaignController();
