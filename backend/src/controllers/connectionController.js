import { Connection, User } from '../models/index.js';
import { Op } from 'sequelize';
import whatsappService from '../services/whatsapp.service.js';

class ConnectionController {
  /**
   * Sincroniza conexões com Evolution API
   */
  async syncConnections(req, res) {
    try {
      const userId = req.user.id;

      console.log('Starting sync for user:', userId);

      // Buscar instâncias via provider ativo (retorna formato normalizado)
      let instances;
      try {
        instances = await whatsappService.fetchInstances();
        console.log('WhatsApp provider fetchInstances count:', instances.length);
      } catch (error) {
        console.error('Error calling WhatsApp provider:', error);
        return res.status(500).json({
          error: 'Failed to fetch instances from WhatsApp provider',
          details: error.message
        });
      }

      if (instances.length === 0) {
        console.log('No instances found');
        return res.json({
          message: 'No instances found',
          connections: []
        });
      }

      const connections = [];
      const processedInstanceNames = new Set();

      // Processar cada instância normalizada
      for (const instance of instances) {
        try {
          const { instanceName, instanceToken, status, phoneNumber, profileName, profilePicUrl } = instance;

          if (!instanceName) {
            console.warn('Instance without name, skipping:', instance);
            continue;
          }

          if (processedInstanceNames.has(instanceName)) {
            console.warn(`Duplicate instance name detected: ${instanceName}, skipping`);
            continue;
          }
          processedInstanceNames.add(instanceName);

          console.log('Processing instance:', instanceName);

          // Verificar se já existe no banco
          let connection = await Connection.findOne({
            where: { instance_name: instanceName }
          });

          if (connection) {
            // Atualizar conexão existente (mantém o user_id original)
            await connection.update({
              instance_key: instanceToken,
              status,
              phone_number: phoneNumber,
              profile_pic_url: profilePicUrl,
              profile_name: profileName
            });
            console.log(`Updated connection: ${instanceName}`);
          } else {
            // Criar nova conexão com o usuário atual como criador
            connection = await Connection.create({
              user_id: userId,
              instance_name: instanceName,
              instance_key: instanceToken,
              status,
              phone_number: phoneNumber,
              profile_pic_url: profilePicUrl,
              profile_name: profileName
            });
            console.log(`Created connection: ${instanceName}`);
          }

          connections.push(connection);
        } catch (error) {
          console.error(`Error processing instance:`, error);
          console.error('Error stack:', error.stack);
        }
      }

      // REMOVER CONEXÕES ÓRFÃS: conexões que existem no banco mas não estão mais na Evolution API
      // Nota: Como as conexões agora são compartilhadas, removemos apenas se não existirem na API
      const existingConnections = await Connection.findAll({
        attributes: ['id', 'instance_name']
      });

      const instanceNamesFromAPI = Array.from(processedInstanceNames);
      const orphanedConnections = existingConnections.filter(
        conn => !instanceNamesFromAPI.includes(conn.instance_name)
      );

      if (orphanedConnections.length > 0) {
        console.log(`Found ${orphanedConnections.length} orphaned connections to remove`);
        const orphanedIds = orphanedConnections.map(conn => conn.id);
        
        // Verificar se há campanhas ativas usando essas conexões antes de deletar
        const { Campaign } = await import('../models/index.js');
        const campaignsUsingOrphaned = await Campaign.count({
          where: {
            connection_id: { [Op.in]: orphanedIds },
            status: { [Op.in]: ['scheduled', 'running'] }
          }
        });

        if (campaignsUsingOrphaned > 0) {
          console.warn(`Cannot remove ${orphanedConnections.length} orphaned connections: ${campaignsUsingOrphaned} active campaigns are using them`);
        } else {
          await Connection.destroy({
            where: {
              id: { [Op.in]: orphanedIds }
            }
          });
          console.log(`Removed ${orphanedConnections.length} orphaned connections`);
        }
      }

      console.log(`Sync completed. Processed ${connections.length} connections, found ${instances.length} instances in API`);

      res.json({
        message: 'Connections synchronized successfully',
        connections
      });
    } catch (error) {
      console.error('Sync connections error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        response: error.response?.data
      });
      res.status(500).json({ 
        error: 'Failed to sync connections',
        details: error.message 
      });
    }
  }

  /**
   * Lista todas as conexões (visíveis para todos os usuários) com paginação e busca
   */
  async list(req, res) {
    try {
      const statusFilter = req.query.status;
      const search = req.query.search || '';
      const page = parseInt(req.query.page) || 1;
      // Permitir limit customizado, mas padrão é 6 para paginação normal
      // Se limit não for especificado e não houver page, buscar todas
      const limit = req.query.limit ? parseInt(req.query.limit) : (req.query.page ? 6 : 1000);
      const offset = (page - 1) * limit;

      const whereClause = {};

      // Filtro por status (opcional via query parameter)
      if (statusFilter === 'connected') {
        whereClause.status = 'connected';
      } else if (statusFilter === 'disconnected') {
        whereClause.status = 'disconnected';
      }

      // Filtro de busca por nome da conexão ou telefone
      if (search) {
        const searchConditions = [
          { instance_name: { [Op.iLike]: `%${search}%` } },
          { phone_number: { [Op.iLike]: `%${search}%` } }
        ];
        
        // Se já existe um filtro de status, combinar com AND
        if (whereClause.status) {
          whereClause[Op.and] = [
            { status: whereClause.status },
            { [Op.or]: searchConditions }
          ];
          delete whereClause.status;
        } else {
          whereClause[Op.or] = searchConditions;
        }
      }

      // Buscar total de registros (para paginação)
      const total = await Connection.count({ where: whereClause });

      // Buscar conexões com paginação e informações do usuário criador
      const connections = await Connection.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      const totalPages = Math.ceil(total / limit);

      res.json({
        connections,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('List connections error:', error);
      res.status(500).json({ error: 'Failed to list connections' });
    }
  }

  /**
   * Busca uma conexão específica (visível para todos os usuários)
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;

      const connection = await Connection.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      res.json({ connection });
    } catch (error) {
      console.error('Get connection error:', error);
      res.status(500).json({ error: 'Failed to get connection' });
    }
  }

  /**
   * Atualiza status de uma conexão (qualquer usuário pode atualizar)
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;

      const connection = await Connection.findOne({
        where: { id }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Buscar status atual via provider ativo
      const connectionInfo = await whatsappService.getInstanceInfo(connection.instance_key);
      const state = connectionInfo?.connectionStatus ||
                   connectionInfo?.instance?.state ||
                   connectionInfo?.state ||
                   connectionInfo?.data?.instance?.state ||
                   connectionInfo?.data?.state;
      const status = (state === 'open' || state === 'connected') ? 'connected' : 'disconnected';
      
      // Extrair ownerJid e remover sufixo @s.whatsapp.net (campo correto da Evolution API)
      const ownerJid = connectionInfo?.ownerJid ||
                      connectionInfo?.instance?.ownerJid ||
                      connectionInfo?.instance?.owner || 
                      connectionInfo?.owner ||
                      connectionInfo?.data?.instance?.ownerJid ||
                      connectionInfo?.data?.instance?.owner ||
                      connectionInfo?.data?.ownerJid ||
                      connectionInfo?.data?.owner ||
                      null;
      const phoneNumber = ownerJid ? ownerJid.replace('@s.whatsapp.net', '') : null;
      
      // Extrair profilePicUrl (campo correto da Evolution API)
      const profilePicUrl = connectionInfo?.profilePicUrl ||
                          connectionInfo?.instance?.profilePicUrl ||
                          connectionInfo?.data?.profilePicUrl ||
                          connectionInfo?.data?.instance?.profilePicUrl ||
                          connectionInfo?.profilePictureUrl ||
                          connectionInfo?.instance?.profilePictureUrl ||
                          connectionInfo?.data?.profilePictureUrl ||
                          connectionInfo?.data?.instance?.profilePictureUrl ||
                          null;
      
      // Extrair profileName (campo correto da Evolution API)
      const profileName = connectionInfo?.profileName ||
                        connectionInfo?.instance?.profileName ||
                        connectionInfo?.data?.profileName ||
                        connectionInfo?.data?.instance?.profileName ||
                        null;

      await connection.update({
        status,
        phone_number: phoneNumber,
        profile_pic_url: profilePicUrl,
        profile_name: profileName
      });

      res.json({
        message: 'Connection status updated',
        connection
      });
    } catch (error) {
      console.error('Update connection status error:', error);
      res.status(500).json({ error: 'Failed to update connection status' });
    }
  }

  /**
   * Lista grupos de uma conexão (qualquer usuário pode visualizar)
   */
  async getGroups(req, res) {
    try {
      const { id } = req.params;

      const connection = await Connection.findOne({
        where: { id }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      if (connection.status !== 'connected') {
        return res.status(400).json({ error: 'Connection is not active' });
      }

      console.log(`Fetching groups for instance: ${connection.instance_name}`);

      let response;
      try {
        response = await whatsappService.fetchAllGroups(connection.instance_key);
      } catch (apiError) {
        console.error('Evolution API error:', apiError);
        throw apiError;
      }
      
      // Log seguro da resposta (sem quebrar se houver circular references)
      try {
        console.log('Groups API response type:', typeof response);
        console.log('Groups API response is array:', Array.isArray(response));
        if (response && typeof response === 'object') {
          console.log('Groups API response keys:', Object.keys(response));
        }
        console.log('Groups API response (safe stringify):', JSON.stringify(response, null, 2));
      } catch (logError) {
        console.warn('Could not stringify response:', logError.message);
      }
      
      // Normalizar resposta da Evolution API
      // A API pode retornar os grupos em diferentes formatos
      let groups = [];
      
      try {
        if (Array.isArray(response)) {
          groups = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.groups)) {
            groups = response.groups;
          } else if (Array.isArray(response.data)) {
            groups = response.data;
          } else if (Array.isArray(response.response)) {
            groups = response.response;
          } else if (Array.isArray(response.result)) {
            groups = response.result;
          } else if (Array.isArray(response.groupsList)) {
            groups = response.groupsList;
          } else {
            console.warn('Unexpected groups response format. Response:', response);
            // Se não conseguir extrair grupos, retornar array vazio ao invés de erro
            groups = [];
          }
        } else {
          console.warn('Response is not an array or object:', typeof response);
          groups = [];
        }
      } catch (parseError) {
        console.error('Error parsing groups response:', parseError);
        groups = [];
      }

      console.log(`Returning ${groups.length} groups`);
      res.json({ groups });
    } catch (error) {
      console.error('Get groups error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to get groups';
      res.status(500).json({ 
        error: errorMessage,
        details: error.response?.data || error.stack
      });
    }
  }

  /**
   * Deleta uma conexão
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const connection = await Connection.findOne({
        where: { id, user_id: userId }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      await connection.destroy();

      res.json({ message: 'Connection deleted successfully' });
    } catch (error) {
      console.error('Delete connection error:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }
}

export default new ConnectionController();
