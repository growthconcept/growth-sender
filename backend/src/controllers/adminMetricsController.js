import { User, Campaign, MessageLog, Connection, MessageTemplate } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

class AdminMetricsController {
  /**
   * Retorna métricas globais do sistema
   * (apenas para admins)
   */
  async getGlobalMetrics(req, res) {
    try {
      // Total de usuários
      const totalUsers = await User.count();

      // Total de usuários por role
      const usersByRole = await User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['role'],
        raw: true
      });

      // Total de campanhas
      const totalCampaigns = await Campaign.count();

      // Campanhas por status
      const campaignsByStatus = await Campaign.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Total de mensagens enviadas
      const totalMessages = await MessageLog.count({
        where: { status: 'sent' }
      });

      // Total de mensagens com erro
      const totalErrors = await MessageLog.count({
        where: { status: 'error' }
      });

      // Taxa de sucesso global
      const totalAttempts = totalMessages + totalErrors;
      const successRate = totalAttempts > 0
        ? Math.round((totalMessages / totalAttempts) * 100)
        : 0;

      // Mensagens enviadas hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = await MessageLog.count({
        where: {
          status: 'sent',
          sent_at: {
            [Op.gte]: today
          }
        }
      });

      // Total de conexões ativas
      const activeConnections = await Connection.count({
        where: { status: 'connected' }
      });

      // Total de templates
      const totalTemplates = await MessageTemplate.count();

      res.json({
        metrics: {
          users: {
            total: totalUsers,
            byRole: usersByRole.reduce((acc, item) => {
              acc[item.role] = parseInt(item.count, 10);
              return acc;
            }, {})
          },
          campaigns: {
            total: totalCampaigns,
            byStatus: campaignsByStatus.reduce((acc, item) => {
              acc[item.status] = parseInt(item.count, 10);
              return acc;
            }, {})
          },
          messages: {
            total: totalMessages,
            errors: totalErrors,
            successRate,
            today: messagesToday
          },
          connections: {
            active: activeConnections
          },
          templates: {
            total: totalTemplates
          }
        }
      });
    } catch (error) {
      console.error('[Admin] getGlobalMetrics error:', error);
      res.status(500).json({ error: 'Failed to get global metrics' });
    }
  }

  /**
   * Retorna métricas detalhadas por usuário
   * (apenas para admins)
   */
  async getUserMetrics(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;

      // Buscar todos os usuários com suas métricas
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      // Calcular métricas para cada usuário
      const usersWithMetrics = await Promise.all(
        users.map(async (user) => {
          const userId = user.id;

          // Total de campanhas do usuário
          const totalCampaigns = await Campaign.count({
            where: { user_id: userId }
          });

          // Campanhas ativas
          const activeCampaigns = await Campaign.count({
            where: {
              user_id: userId,
              status: {
                [Op.in]: ['running', 'scheduled']
              }
            }
          });

          // Total de mensagens enviadas
          const totalMessages = await MessageLog.count({
            include: [{
              model: Campaign,
              as: 'campaign',
              where: { user_id: userId },
              attributes: []
            }],
            where: { status: 'sent' }
          });

          // Total de erros
          const totalErrors = await MessageLog.count({
            include: [{
              model: Campaign,
              as: 'campaign',
              where: { user_id: userId },
              attributes: []
            }],
            where: { status: 'error' }
          });

          // Taxa de sucesso
          const totalAttempts = totalMessages + totalErrors;
          const successRate = totalAttempts > 0
            ? Math.round((totalMessages / totalAttempts) * 100)
            : 0;

          // Mensagens enviadas hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const messagesToday = await MessageLog.count({
            include: [{
              model: Campaign,
              as: 'campaign',
              where: { user_id: userId },
              attributes: []
            }],
            where: {
              status: 'sent',
              sent_at: {
                [Op.gte]: today
              }
            }
          });

          // Última campanha criada
          const lastCampaign = await Campaign.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            attributes: ['created_at']
          });

          // Última mensagem enviada
          const lastMessage = await MessageLog.findOne({
            include: [{
              model: Campaign,
              as: 'campaign',
              where: { user_id: userId },
              attributes: []
            }],
            where: { status: 'sent' },
            order: [['sent_at', 'DESC']],
            attributes: ['sent_at']
          });

          // Total de templates
          const totalTemplates = await MessageTemplate.count({
            where: { user_id: userId }
          });

          // Conexões ativas
          const activeConnections = await Connection.count({
            where: {
              user_id: userId,
              status: 'connected'
            }
          });

          return {
            ...user.toJSON(),
            metrics: {
              campaigns: {
                total: totalCampaigns,
                active: activeCampaigns,
                lastCreated: lastCampaign?.created_at || null
              },
              messages: {
                total: totalMessages,
                errors: totalErrors,
                successRate,
                today: messagesToday,
                lastSent: lastMessage?.sent_at || null
              },
              templates: {
                total: totalTemplates
              },
              connections: {
                active: activeConnections
              }
            }
          };
        })
      );

      res.json({ users: usersWithMetrics });
    } catch (error) {
      console.error('[Admin] getUserMetrics error:', error);
      res.status(500).json({ error: 'Failed to get user metrics' });
    }
  }

  /**
   * Retorna estatísticas de uso por período
   * (apenas para admins)
   */
  async getUsageStats(req, res) {
    try {
      const { period = '7d' } = req.query;

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
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
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
        where: {
          status: 'sent',
          sent_at: {
            [Op.gte]: startDate
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('sent_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('sent_at')), 'ASC']],
        raw: true
      });

      // Campanhas criadas por dia
      const campaignsByDay = await Campaign.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('Campaign.id')), 'count']
        ],
        where: {
          created_at: {
            [Op.gte]: startDate
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('created_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
        raw: true
      });

      // Usuários ativos por dia (que enviaram mensagens)
      const activeUsersByDay = await sequelize.query(
        `SELECT 
          DATE(sent_at) as date,
          COUNT(DISTINCT campaigns.user_id) as count
        FROM message_logs
        INNER JOIN campaigns ON message_logs.campaign_id = campaigns.id
        WHERE message_logs.status = 'sent' 
          AND message_logs.sent_at >= :startDate
        GROUP BY DATE(sent_at)
        ORDER BY DATE(sent_at) ASC`,
        {
          replacements: { startDate },
          type: sequelize.QueryTypes.SELECT
        }
      );

      res.json({
        stats: {
          period,
          messagesByDay,
          campaignsByDay,
          activeUsersByDay
        }
      });
    } catch (error) {
      console.error('[Admin] getUsageStats error:', error);
      res.status(500).json({ error: 'Failed to get usage statistics' });
    }
  }
}

export default new AdminMetricsController();

