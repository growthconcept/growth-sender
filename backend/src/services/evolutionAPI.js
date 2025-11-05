import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const evolutionAPI = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  }
});

class EvolutionAPIService {
  /**
   * Busca todas as instâncias disponíveis
   */
  async fetchInstances() {
    try {
      const response = await evolutionAPI.get('/instance/fetchInstances');
      return response.data;
    } catch (error) {
      console.error('Error fetching instances:', error.response?.data || error.message);
      throw new Error('Failed to fetch instances from Evolution API');
    }
  }

  /**
   * Busca informações de uma instância específica
   */
  async getInstanceInfo(instanceName) {
    try {
      const response = await evolutionAPI.get(`/instance/connectionState/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error getting instance info:', error.response?.data || error.message);
      throw new Error('Failed to get instance information');
    }
  }

  /**
   * Envia mensagem de texto
   */
  async sendTextMessage(instanceName, number, text) {
    try {
      const response = await evolutionAPI.post(`/message/sendText/${instanceName}`, {
        number: number,
        text: text
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error.response?.data || error.message);
      throw new Error(`Failed to send text message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Envia mensagem com mídia
   */
  async sendMediaMessage(instanceName, number, mediaType, mediaUrl, caption) {
    try {
      const response = await evolutionAPI.post(`/message/sendMedia/${instanceName}`, {
        number: number,
        mediatype: mediaType, // image, video, audio, document
        media: mediaUrl,
        caption: caption || ''
      });
      return response.data;
    } catch (error) {
      console.error('Error sending media message:', error.response?.data || error.message);
      throw new Error(`Failed to send media message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Lista todos os grupos de uma instância
   */
  async fetchAllGroups(instanceName) {
    try {
      const response = await evolutionAPI.get(`/group/fetchAllGroups/${instanceName}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching groups:', error.response?.data || error.message);
      throw new Error('Failed to fetch groups');
    }
  }

  /**
   * Busca participantes de um grupo
   */
  async fetchGroupParticipants(instanceName, groupId) {
    try {
      const response = await evolutionAPI.get(`/group/fetchAllParticipants/${instanceName}`, {
        params: { groupJid: groupId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching group participants:', error.response?.data || error.message);
      throw new Error('Failed to fetch group participants');
    }
  }

  /**
   * Envia mensagem para um grupo
   */
  async sendGroupMessage(instanceName, groupId, text) {
    try {
      const response = await evolutionAPI.post(`/message/sendText/${instanceName}`, {
        number: groupId,
        text: text
      });
      return response.data;
    } catch (error) {
      console.error('Error sending group message:', error.response?.data || error.message);
      throw new Error('Failed to send group message');
    }
  }
}

export default new EvolutionAPIService();
