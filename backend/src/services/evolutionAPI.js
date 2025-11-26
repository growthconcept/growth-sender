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
      console.log('Evolution API fetchInstances response status:', response.status);
      console.log('Evolution API fetchInstances response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error fetching instances:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });
      throw new Error(`Failed to fetch instances from Evolution API: ${error.response?.data?.message || error.message}`);
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
      console.error(`Error getting instance info for ${instanceName}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Não lançar erro, apenas retornar null para permitir continuar
      return null;
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
   * Envia mensagem de áudio específico (WhatsApp)
   */
  async sendWhatsAppAudio(instanceName, number, audio, options = {}) {
    try {
      const payload = {
        number,
        audio
      };

      if (typeof options.delay === 'number') {
        payload.delay = options.delay;
      }
      if (typeof options.linkPreview === 'boolean') {
        payload.linkPreview = options.linkPreview;
      }
      if (typeof options.mentionsEveryOne === 'boolean') {
        payload.mentionsEveryOne = options.mentionsEveryOne;
      }
      if (Array.isArray(options.mentioned) && options.mentioned.length > 0) {
        payload.mentioned = options.mentioned;
      }
      if (options.quoted) {
        payload.quoted = options.quoted;
      }

      const response = await evolutionAPI.post(`/message/sendWhatsAppAudio/${instanceName}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp audio message:', error.response?.data || error.message);
      throw new Error(
        `Failed to send WhatsApp audio message: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Lista todos os grupos de uma instância
   */
  async fetchAllGroups(instanceName, getParticipants = false) {
    try {
      const endpoint = `/group/fetchAllGroups/${instanceName}`;
      const fullUrl = `${process.env.EVOLUTION_API_URL}${endpoint}`;
      
      console.log(`[Evolution API] Fetching groups from: ${fullUrl}`);
      console.log(`[Evolution API] Instance name: ${instanceName}`);
      console.log(`[Evolution API] getParticipants: ${getParticipants}`);
      console.log(`[Evolution API] API Key: ${process.env.EVOLUTION_API_KEY ? '✓ Present' : '✗ Missing'}`);
      
      // Evolution API usa GET com getParticipants como query parameter ou body
      // Tentar primeiro com query parameter (mais comum para GET)
      const response = await evolutionAPI.get(endpoint, {
        params: {
          getParticipants: getParticipants
        }
      });
      
      console.log(`[Evolution API] Response status: ${response.status}`);
      console.log(`[Evolution API] Response data type:`, typeof response.data);
      console.log(`[Evolution API] Response data keys:`, response.data ? Object.keys(response.data) : 'null');
      
      return response.data;
    } catch (error) {
      console.error('[Evolution API] Error fetching groups:', {
        instanceName,
        endpoint: `/group/fetchAllGroups/${instanceName}`,
        fullUrl: `${process.env.EVOLUTION_API_URL}/group/fetchAllGroups/${instanceName}`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
      
      // Preservar informações do erro para melhor tratamento
      const apiError = new Error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        error.message || 
        'Failed to fetch groups'
      );
      apiError.status = error.response?.status;
      apiError.response = error.response?.data;
      throw apiError;
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
