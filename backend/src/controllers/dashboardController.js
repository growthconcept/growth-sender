import { Campaign, Connection, MessageLog, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { isPrivilegedViewer } from '../middleware/permissions.js';

class DashboardController {
  /**
   * Retorna métricas do dashboard
   */
  async getMetrics(req, res) {
    try {
      const userId = req.user.id;

      // Construir where clause baseado em permissões
      // Admin e supervisor: podem ver dados de todos os usuários
      // Usuário comum: apenas os próprios dados
      const campaignWhere = {};
      const connectionWhere = {};
      const messageLogCampaignWhere = {};

      if (!isPrivilegedViewer(req.user)) {
        campaignWhere.user_id = userId;
        connectionWhere.user_id = userId;
        messageLogCampaignWhere.user_id = userId;
      }

      // Total de campanhas
      const totalCampaigns = await Campaign.count({
        where: campaignWhere
      });

      // Campanhas ativas (running ou scheduled)
      const activeCampaigns = await Campaign.count({
        where: {
          ...campaignWhere,
          status: {
            [Op.in]: ['running', 'scheduled']
          }
        }
      });

      // Mensagens enviadas hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesToday = await MessageLog.count({
        include: [{
          model: Campaign,
          as: 'campaign',
          where: messageLogCampaignWhere,
          attributes: []
        }],
        where: {
          status: 'sent',
          sent_at: {
            [Op.gte]: today
          }
        }
      });

      // Taxa de sucesso (últimos 7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalMessages, successMessages] = await Promise.all([
        MessageLog.count({
          include: [{
            model: Campaign,
            as: 'campaign',
            where: messageLogCampaignWhere,
            attributes: []
          }],
          where: {
            sent_at: {
              [Op.gte]: sevenDaysAgo
            }
          }
        }),
        MessageLog.count({
          include: [{
            model: Campaign,
            as: 'campaign',
            where: messageLogCampaignWhere,
            attributes: []
          }],
          where: {
            status: 'sent',
            sent_at: {
              [Op.gte]: sevenDaysAgo
            }
          }
        })
      ]);

      const successRate = totalMessages > 0
        ? Math.round((successMessages / totalMessages) * 100)
        : 0;

      // Conexões ativas
      const activeConnections = await Connection.count({
        where: {
          ...connectionWhere,
          status: 'connected'
        }
      });

      res.json({
        metrics: {
          totalCampaigns,
          activeCampaigns,
          messagesToday,
          successRate,
          activeConnections
        }
      });
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({ error: 'Failed to get dashboard metrics' });
    }
  }

  /**
   * Retorna campanhas recentes
   */
  async getRecentCampaigns(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;

      // Construir where clause baseado em permissões
      // Admin e supervisor: podem ver campanhas de todos os usuários
      // Usuário comum: apenas as próprias campanhas
      const where = {};
      if (!isPrivilegedViewer(req.user)) {
        where.user_id = userId;
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
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({ campaigns });
    } catch (error) {
      console.error('Get recent campaigns error:', error);
      res.status(500).json({ error: 'Failed to get recent campaigns' });
    }
  }

  /**
   * Retorna estatísticas por período
   */
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '7d' } = req.query;

      // Construir where clause baseado em permissões
      const campaignWhere = {};
      if (!isPrivilegedViewer(req.user)) {
        campaignWhere.user_id = userId;
      }

      // Calcular data de início baseado no período
      const startDate = new Date();
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Mensagens enviadas por dia
      const messagesByDay = await MessageLog.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('sent_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('MessageLog.id')), 'count']
        ],
        include: [{
          model: Campaign,
          as: 'campaign',
          where: campaignWhere,
          attributes: []
        }],
        where: {
          sent_at: {
            [Op.gte]: startDate
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('sent_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('sent_at')), 'ASC']],
        raw: true
      });

      res.json({
        stats: {
          period,
          messagesByDay
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  }
}

export default new DashboardController();
