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
      const { date_from, date_to } = req.query;

      // Construir where clause baseado em permissões
      // Admin e supervisor: podem ver dados de todos os usuários
      // Usuário comum: apenas os próprios dados
      const campaignWhere = {};
      const messageLogCampaignWhere = {};

      if (!isPrivilegedViewer(req.user)) {
        campaignWhere.user_id = userId;
        messageLogCampaignWhere.user_id = userId;
      }

      // Aplicar filtro de data nas campanhas se fornecido
      if (date_from || date_to) {
        campaignWhere.created_at = {};
        if (date_from) {
          const fromDate = new Date(date_from);
          fromDate.setHours(0, 0, 0, 0);
          campaignWhere.created_at[Op.gte] = fromDate;
        }
        if (date_to) {
          const toDate = new Date(date_to);
          toDate.setHours(23, 59, 59, 999);
          campaignWhere.created_at[Op.lte] = toDate;
        }
      }

      // Total de campanhas (com filtro de data se aplicável)
      const totalCampaigns = await Campaign.count({
        where: campaignWhere
      });

      // Campanhas ativas (running ou scheduled) - com filtro de data
      const activeCampaignsWhere = {
        ...campaignWhere,
        status: {
          [Op.in]: ['running', 'scheduled']
        }
      };
      const activeCampaigns = await Campaign.count({
        where: activeCampaignsWhere
      });

      // Construir filtro de data para mensagens
      const messageDateFilter = {};
      if (date_from || date_to) {
        if (date_from) {
          const fromDate = new Date(date_from);
          fromDate.setHours(0, 0, 0, 0);
          messageDateFilter[Op.gte] = fromDate;
        }
        if (date_to) {
          const toDate = new Date(date_to);
          toDate.setHours(23, 59, 59, 999);
          messageDateFilter[Op.lte] = toDate;
        }
      } else {
        // Se não há filtro de data, usar "hoje" como padrão
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        messageDateFilter[Op.gte] = today;
      }

      // Mensagens no período (hoje se não houver filtro)
      const messagesToday = await MessageLog.count({
        include: [{
          model: Campaign,
          as: 'campaign',
          where: messageLogCampaignWhere,
          attributes: []
        }],
        where: {
          status: 'sent',
          sent_at: messageDateFilter
        }
      });

      // Taxa de sucesso no período
      // Se há filtro de data, usar o período filtrado
      // Se não, usar últimos 7 dias
      let successRateStartDate;
      if (date_from) {
        successRateStartDate = new Date(date_from);
        successRateStartDate.setHours(0, 0, 0, 0);
      } else {
        successRateStartDate = new Date();
        successRateStartDate.setDate(successRateStartDate.getDate() - 7);
      }

      let successRateEndDate;
      if (date_to) {
        successRateEndDate = new Date(date_to);
        successRateEndDate.setHours(23, 59, 59, 999);
      } else {
        successRateEndDate = new Date();
        successRateEndDate.setHours(23, 59, 59, 999);
      }

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
              [Op.gte]: successRateStartDate,
              [Op.lte]: successRateEndDate
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
              [Op.gte]: successRateStartDate,
              [Op.lte]: successRateEndDate
            }
          }
        })
      ]);

      const successRate = totalMessages > 0
        ? Math.round((successMessages / totalMessages) * 100)
        : 0;

      res.json({
        metrics: {
          totalCampaigns,
          activeCampaigns,
          messagesToday,
          successRate
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
