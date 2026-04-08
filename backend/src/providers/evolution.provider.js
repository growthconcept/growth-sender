import axios from 'axios';
import dotenv from 'dotenv';
import WhatsAppProviderBase from './whatsappProvider.base.js';

dotenv.config();

const evolutionAPI = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  }
});

class EvolutionProvider extends WhatsAppProviderBase {
  /**
   * Lista todas as instâncias disponíveis.
   * Retorna array normalizado independente do formato da resposta da Evolution API.
   * @returns {Promise<Array<{instanceName, instanceToken, status, phoneNumber, profileName, profilePicUrl}>>}
   */
  async fetchInstances() {
    try {
      const response = await evolutionAPI.get('/instance/fetchInstances');
      console.log('Evolution API fetchInstances response status:', response.status);
      console.log('Evolution API fetchInstances response data:', JSON.stringify(response.data, null, 2));

      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.instances ?? []);

      return list.map((item) => {
        // A Evolution API retorna dados em formatos variados — normalizar defensivamente
        const inst = item?.instance ?? item;
        const name = inst?.instanceName ?? inst?.name ?? '';
        const state = (inst?.connectionStatus ?? inst?.status ?? '').toLowerCase();
        const connected = state === 'open' || state === 'connected';

        return {
          instanceName: name,
          instanceToken: name, // Na Evolution, o token é o próprio instanceName
          status: connected ? 'connected' : 'disconnected',
          phoneNumber: inst?.owner?.split(':')[0] ?? inst?.number ?? null,
          profileName: inst?.profileName ?? null,
          profilePicUrl: inst?.profilePicUrl ?? null,
        };
      });
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
   * Retorna informações e status de uma instância.
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async getInstanceInfo(instanceToken) {
    try {
      const response = await evolutionAPI.get(`/instance/connectionState/${instanceToken}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting instance info for ${instanceToken}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  /**
   * Envia mensagem de texto.
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async sendTextMessage(instanceToken, recipient, text) {
    try {
      const response = await evolutionAPI.post(`/message/sendText/${instanceToken}`, {
        number: recipient,
        text
      });
      return response.data;
    } catch (error) {
      console.error('Error sending text message:', error.response?.data || error.message);
      throw new Error(`Failed to send text message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Envia mensagem com mídia.
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async sendMediaMessage(instanceToken, recipient, mediaType, mediaUrl, caption) {
    try {
      const response = await evolutionAPI.post(`/message/sendMedia/${instanceToken}`, {
        number: recipient,
        mediatype: mediaType,
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
   * Envia áudio como mensagem de voz (PTT).
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async sendWhatsAppAudio(instanceToken, recipient, audioUrl, options = {}) {
    try {
      const payload = { number: recipient, audio: audioUrl };

      if (typeof options.delay === 'number') payload.delay = options.delay;
      if (typeof options.linkPreview === 'boolean') payload.linkPreview = options.linkPreview;
      if (typeof options.mentionsEveryOne === 'boolean') payload.mentionsEveryOne = options.mentionsEveryOne;
      if (Array.isArray(options.mentioned) && options.mentioned.length > 0) payload.mentioned = options.mentioned;
      if (options.quoted) payload.quoted = options.quoted;

      const response = await evolutionAPI.post(`/message/sendWhatsAppAudio/${instanceToken}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp audio message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp audio message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Não suportado pela Evolution API.
   */
  async sendInteractiveMenu(instanceToken, recipient, payload) {
    throw new Error('Not supported by Evolution API provider');
  }

  /**
   * Não suportado pela Evolution API.
   */
  async sendCarousel(instanceToken, recipient, payload) {
    throw new Error('Not supported by Evolution API provider');
  }

  /**
   * Lista todos os grupos da instância.
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async fetchAllGroups(instanceToken) {
    try {
      const endpoint = `/group/fetchAllGroups/${instanceToken}`;
      const fullUrl = `${process.env.EVOLUTION_API_URL}${endpoint}`;

      console.log(`[Evolution API] Fetching groups from: ${fullUrl}`);

      const response = await evolutionAPI.get(endpoint, {
        params: { getParticipants: false }
      });

      console.log(`[Evolution API] Response status: ${response.status}`);

      return response.data;
    } catch (error) {
      console.error('[Evolution API] Error fetching groups:', {
        instanceToken,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });

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
   * Busca participantes de um grupo.
   * @param {string} instanceToken - Na Evolution, é o instanceName
   */
  async fetchGroupParticipants(instanceToken, groupId) {
    try {
      const response = await evolutionAPI.get(`/group/fetchAllParticipants/${instanceToken}`, {
        params: { groupJid: groupId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching group participants:', error.response?.data || error.message);
      throw new Error('Failed to fetch group participants');
    }
  }
}

export default new EvolutionProvider();
