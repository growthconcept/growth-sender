import { Connection } from '../models/index.js';
import evolutionAPI from '../services/evolutionAPI.js';

class ConnectionController {
  /**
   * Sincroniza conexões com Evolution API
   */
  async syncConnections(req, res) {
    try {
      const userId = req.user.id;

      // Buscar instâncias da Evolution API
      const instances = await evolutionAPI.fetchInstances();

      if (!instances || instances.length === 0) {
        return res.json({
          message: 'No instances found',
          connections: []
        });
      }

      const connections = [];

      // Processar cada instância
      for (const instance of instances) {
        try {
          // Buscar informações de conexão
          const connectionInfo = await evolutionAPI.getInstanceInfo(instance.instance.instanceName);

          // Verificar se já existe no banco
          let connection = await Connection.findOne({
            where: {
              user_id: userId,
              instance_name: instance.instance.instanceName
            }
          });

          const status = connectionInfo?.instance?.state === 'open' ? 'connected' : 'disconnected';

          if (connection) {
            // Atualizar conexão existente
            await connection.update({
              status,
              phone_number: connectionInfo?.instance?.owner || null,
              profile_pic_url: connectionInfo?.instance?.profilePicUrl || null
            });
          } else {
            // Criar nova conexão
            connection = await Connection.create({
              user_id: userId,
              instance_name: instance.instance.instanceName,
              instance_key: instance.instance.instanceName, // Pode ser customizado
              status,
              phone_number: connectionInfo?.instance?.owner || null,
              profile_pic_url: connectionInfo?.instance?.profilePicUrl || null
            });
          }

          connections.push(connection);
        } catch (error) {
          console.error(`Error processing instance ${instance.instance.instanceName}:`, error);
          // Continuar processando outras instâncias
        }
      }

      res.json({
        message: 'Connections synchronized successfully',
        connections
      });
    } catch (error) {
      console.error('Sync connections error:', error);
      res.status(500).json({ error: 'Failed to sync connections' });
    }
  }

  /**
   * Lista todas as conexões do usuário
   */
  async list(req, res) {
    try {
      const userId = req.user.id;

      const connections = await Connection.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      res.json({ connections });
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
      const status = connectionInfo?.instance?.state === 'open' ? 'connected' : 'disconnected';

      await connection.update({
        status,
        phone_number: connectionInfo?.instance?.owner || null,
        profile_pic_url: connectionInfo?.instance?.profilePicUrl || null
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

      const groups = await evolutionAPI.fetchAllGroups(connection.instance_name);

      res.json({ groups });
    } catch (error) {
      console.error('Get groups error:', error);
      res.status(500).json({ error: 'Failed to get groups' });
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
