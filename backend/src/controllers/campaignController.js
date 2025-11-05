import { Campaign, Connection, MessageTemplate, DailyLimit, MessageLog } from '../models/index.js';
import { Op } from 'sequelize';
import campaignQueue from '../config/queue.js';

class CampaignController {
  /**
   * Lista todas as campanhas do usuário
   */
  async list(req, res) {
    try {
      const userId = req.user.id;
      const { status, limit = 50, offset = 0 } = req.query;

      const where = { user_id: userId };
      if (status) {
        where.status = status;
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

      if (recipients.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 recipients allowed' });
      }

      // Validar intervalo entre mensagens
      if (message_interval < 10) {
        return res.status(400).json({ error: 'Minimum message interval is 10 seconds' });
      }

      // VALIDAÇÃO CRÍTICA: Verificar limite diário (1 campanha por dia por conexão)
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

      // Criar campanha
      const campaign = await Campaign.create({
        user_id: userId,
        connection_id,
        template_id,
        name,
        recipient_type,
        recipients,
        scheduled_date: scheduled_date || null,
        start_time: start_time || '09:00:00',
        end_time: end_time || '18:00:00',
        allowed_days: allowed_days || [1, 2, 3, 4, 5],
        message_interval: message_interval || 30,
        max_recipients: Math.min(max_recipients || 100, recipients.length),
        status: 'scheduled'
      });

      // Atualizar ou criar registro de limite diário
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
   * Deleta uma campanha
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const campaign = await Campaign.findOne({
        where: { id, user_id: userId }
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
