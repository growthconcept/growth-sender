import { Connection } from '../models/index.js';
import { Op } from 'sequelize';
import evolutionAPI from '../services/evolutionAPI.js';

class ConnectionController {
  /**
   * Sincroniza conexões com Evolution API
   */
  async syncConnections(req, res) {
    try {
      const userId = req.user.id;

      console.log('Starting sync for user:', userId);

      // Buscar instâncias da Evolution API
      let instancesResponse;
      try {
        instancesResponse = await evolutionAPI.fetchInstances();
        console.log('Evolution API Response type:', typeof instancesResponse);
        console.log('Evolution API Response:', JSON.stringify(instancesResponse, null, 2));
      } catch (error) {
        console.error('Error calling Evolution API:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch instances from Evolution API',
          details: error.message 
        });
      }

      // A resposta pode vir em diferentes formatos
      let instances = [];
      
      if (Array.isArray(instancesResponse)) {
        instances = instancesResponse;
        console.log('Found array format, instances count:', instances.length);
      } else if (instancesResponse?.instances && Array.isArray(instancesResponse.instances)) {
        instances = instancesResponse.instances;
        console.log('Found instances property, count:', instances.length);
      } else if (instancesResponse?.data?.instances && Array.isArray(instancesResponse.data.instances)) {
        instances = instancesResponse.data.instances;
        console.log('Found data.instances, count:', instances.length);
      } else if (instancesResponse?.data && Array.isArray(instancesResponse.data)) {
        instances = instancesResponse.data;
        console.log('Found data array, count:', instances.length);
      } else {
        console.warn('Unexpected response format:', instancesResponse);
        return res.json({
          message: 'No instances found or unexpected response format',
          connections: []
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

      // Processar cada instância
      for (const instance of instances) {
        try {
          // Extrair o nome da instância de diferentes formatos possíveis
          let instanceName = null;
          
          if (typeof instance === 'string') {
            instanceName = instance;
          } else if (instance?.instanceName) {
            instanceName = instance.instanceName;
          } else if (instance?.instance?.instanceName) {
            instanceName = instance.instance.instanceName;
          } else if (instance?.name) {
            instanceName = instance.name;
          } else if (instance?.id) {
            instanceName = instance.id;
          }

          if (!instanceName) {
            console.warn('Could not extract instance name from:', JSON.stringify(instance));
            continue;
          }

          console.log('Processing instance:', instanceName);

          // Determinar status, phoneNumber, profilePicUrl e profileName diretamente da resposta
          // A resposta de fetchInstances já contém essas informações
          let status = 'disconnected';
          let phoneNumber = null;
          let profilePicUrl = null;
          let profileName = null;

          // Extrair connectionStatus (campo direto da resposta)
          const connectionStatus = instance?.connectionStatus;
          status = (connectionStatus === 'open' || connectionStatus === 'connected') ? 'connected' : 'disconnected';
          
          // Extrair ownerJid diretamente da resposta (campo correto da Evolution API)
          const ownerJid = instance?.ownerJid || null;
          
          // Remover sufixo @s.whatsapp.net do ownerJid
          if (ownerJid) {
            phoneNumber = ownerJid.replace('@s.whatsapp.net', '');
          }
          
          // Extrair profilePicUrl diretamente da resposta (campo correto da Evolution API)
          profilePicUrl = instance?.profilePicUrl || null;
          
          // Extrair profileName diretamente da resposta (campo correto da Evolution API)
          profileName = instance?.profileName || null;

          // Se não encontrou os dados na resposta direta, tentar buscar via getInstanceInfo
          if (!phoneNumber || !profilePicUrl) {
            try {
              const connectionInfo = await evolutionAPI.getInstanceInfo(instanceName);
              if (connectionInfo) {
                // Usar dados do getInstanceInfo como fallback
                if (!phoneNumber) {
                  const fallbackOwnerJid = connectionInfo?.ownerJid ||
                                         connectionInfo?.instance?.ownerJid ||
                                         connectionInfo?.instance?.owner || 
                                         connectionInfo?.owner ||
                                         connectionInfo?.data?.instance?.ownerJid ||
                                         connectionInfo?.data?.instance?.owner ||
                                         connectionInfo?.data?.ownerJid ||
                                         connectionInfo?.data?.owner ||
                                         null;
                  if (fallbackOwnerJid) {
                    phoneNumber = fallbackOwnerJid.replace('@s.whatsapp.net', '');
                  }
                }
                
                if (!profilePicUrl) {
                  profilePicUrl = connectionInfo?.profilePicUrl ||
                                connectionInfo?.instance?.profilePicUrl ||
                                connectionInfo?.data?.profilePicUrl ||
                                connectionInfo?.data?.instance?.profilePicUrl ||
                                connectionInfo?.profilePictureUrl ||
                                connectionInfo?.instance?.profilePictureUrl ||
                                connectionInfo?.data?.profilePictureUrl ||
                                connectionInfo?.data?.instance?.profilePictureUrl ||
                                null;
                }
                
                if (!profileName) {
                  profileName = connectionInfo?.profileName ||
                              connectionInfo?.instance?.profileName ||
                              connectionInfo?.data?.profileName ||
                              connectionInfo?.data?.instance?.profileName ||
                              null;
                }
                
                // Atualizar status se necessário
                const fallbackState = connectionInfo?.connectionStatus ||
                                    connectionInfo?.instance?.state || 
                                    connectionInfo?.state || 
                                    connectionInfo?.data?.instance?.state ||
                                    connectionInfo?.data?.state;
                if (fallbackState) {
                  status = (fallbackState === 'open' || fallbackState === 'connected') ? 'connected' : 'disconnected';
                }
              }
            } catch (error) {
              console.warn(`Could not get info for instance ${instanceName}:`, error.message);
              // Continuar mesmo se não conseguir buscar info
            }
          }

          // Verificar se já existe no banco
          let connection = await Connection.findOne({
            where: {
              user_id: userId,
              instance_name: instanceName
            }
          });

          if (connection) {
            // Atualizar conexão existente
            await connection.update({
              status,
              phone_number: phoneNumber,
              profile_pic_url: profilePicUrl,
              profile_name: profileName
            });
            console.log(`Updated connection: ${instanceName}`);
          } else {
            // Criar nova conexão
            connection = await Connection.create({
              user_id: userId,
              instance_name: instanceName,
              instance_key: instanceName,
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
          // Continuar processando outras instâncias
        }
      }

      console.log(`Sync completed. Processed ${connections.length} connections`);

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
   * Lista todas as conexões do usuário com paginação e busca
   */
  async list(req, res) {
    try {
      const userId = req.user.id;

      const statusFilter = req.query.status;
      const search = req.query.search || '';
      const page = parseInt(req.query.page) || 1;
      // Permitir limit customizado, mas padrão é 6 para paginação normal
      // Se limit não for especificado e não houver page, buscar todas
      const limit = req.query.limit ? parseInt(req.query.limit) : (req.query.page ? 6 : 1000);
      const offset = (page - 1) * limit;

      const whereClause = { user_id: userId };

      // Filtro por status
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

      // Buscar conexões com paginação
      const connections = await Connection.findAll({
        where: whereClause,
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
   * Busca uma conexão específica
   */
  async getOne(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const connection = await Connection.findOne({
        where: { id, user_id: userId }
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
   * Atualiza status de uma conexão
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const connection = await Connection.findOne({
        where: { id, user_id: userId }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Buscar status atual da Evolution API
      const connectionInfo = await evolutionAPI.getInstanceInfo(connection.instance_name);
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
   * Lista grupos de uma conexão
   */
  async getGroups(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const connection = await Connection.findOne({
        where: { id, user_id: userId }
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      if (connection.status !== 'connected') {
        return res.status(400).json({ error: 'Connection is not active' });
      }

      console.log(`Fetching groups for instance: ${connection.instance_name}`);
      
      // getParticipants pode ser passado via query string (opcional, padrão: false)
      const getParticipants = req.query.getParticipants === 'true' || req.query.getParticipants === true;
      
      let response;
      try {
        response = await evolutionAPI.fetchAllGroups(connection.instance_name, getParticipants);
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
