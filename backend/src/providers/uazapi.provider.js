import axios from 'axios';
import dotenv from 'dotenv';
import WhatsAppProviderBase from './whatsappProvider.base.js';

dotenv.config();

class UazapiProvider extends WhatsAppProviderBase {
  /**
   * Cliente HTTP base (sem autenticação — cada método adiciona o header correto).
   */
  get _http() {
    return axios.create({
      baseURL: process.env.UAZAPI_URL,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ─── Gerenciamento de instâncias ────────────────────────────────────────────

  /**
   * Lista todas as instâncias.
   * Usa admintoken para autenticação.
   * @returns {Promise<Array<{instanceName, instanceToken, status, phoneNumber, profileName, profilePicUrl}>>}
   */
  async fetchInstances() {
    try {
      const response = await this._http.get('/instance/all', {
        headers: { admintoken: process.env.UAZAPI_ADMIN_TOKEN }
      });

      const list = Array.isArray(response.data) ? response.data : [];

      return list.map((inst) => ({
        instanceName: inst.name ?? '',
        instanceToken: inst.token ?? '',
        status: inst.status === 'connected' ? 'connected' : 'disconnected',
        phoneNumber: inst.owner ?? null,
        profileName: inst.profileName ?? null,
        profilePicUrl: inst.profilePicUrl ?? null
      }));
    } catch (error) {
      console.error('[Uazapi] Error fetching instances:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw new Error(`Failed to fetch instances from Uazapi: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Retorna informações e status de uma instância.
   * @param {string} instanceToken
   */
  async getInstanceInfo(instanceToken) {
    try {
      const response = await this._http.get('/instance/status', {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error(`[Uazapi] Error getting instance info:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  // ─── Envio de mensagens ──────────────────────────────────────────────────────

  /**
   * Envia mensagem de texto.
   * @param {string} instanceToken
   */
  async sendTextMessage(instanceToken, recipient, text) {
    try {
      const response = await this._http.post('/send/text', {
        number: recipient,
        text
      }, {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error('[Uazapi] Error sending text message:', error.response?.data || error.message);
      throw new Error(`Failed to send text message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Envia mensagem com mídia.
   * @param {string} instanceToken
   * @param {string} mediaType - 'image' | 'video' | 'audio' | 'document'
   */
  async sendMediaMessage(instanceToken, recipient, mediaType, mediaUrl, caption) {
    try {
      const response = await this._http.post('/send/media', {
        number: recipient,
        type: mediaType,
        file: mediaUrl,
        text: caption || ''
      }, {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error('[Uazapi] Error sending media message:', error.response?.data || error.message);
      throw new Error(`Failed to send media message: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Envia áudio como mensagem de voz (PTT).
   * Na Uazapi, é um caso especial de /send/media com type: 'ptt'.
   */
  async sendWhatsAppAudio(instanceToken, recipient, audioUrl, options = {}) {
    try {
      const response = await this._http.post('/send/media', {
        number: recipient,
        type: 'ptt',
        file: audioUrl
      }, {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error('[Uazapi] Error sending audio message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp audio message: ${error.response?.data?.message || error.message}`);
    }
  }

  // ─── Mensagens interativas ───────────────────────────────────────────────────

  /**
   * Envia menu interativo (botões, lista ou enquete).
   * @param {string} instanceToken
   * @param {Object} payload - Payload no formato da Uazapi (type, text, choices, ...)
   */
  async sendInteractiveMenu(instanceToken, recipient, payload) {
    try {
      const response = await this._http.post('/send/menu', {
        number: recipient,
        ...payload
      }, {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error('[Uazapi] Error sending interactive menu:', error.response?.data || error.message);
      throw new Error(`Failed to send interactive menu: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Envia carrossel de cards com botões.
   * @param {string} instanceToken
   * @param {Object} payload - { text, carousel: [...cards] }
   */
  async sendCarousel(instanceToken, recipient, payload) {
    try {
      const response = await this._http.post('/send/carousel', {
        number: recipient,
        ...payload
      }, {
        headers: { token: instanceToken }
      });
      return response.data;
    } catch (error) {
      console.error('[Uazapi] Error sending carousel:', error.response?.data || error.message);
      throw new Error(`Failed to send carousel: ${error.response?.data?.message || error.message}`);
    }
  }

  // ─── Grupos ──────────────────────────────────────────────────────────────────

  /**
   * Lista todos os grupos da instância.
   * @param {string} instanceToken
   * @returns {Promise<Array>}
   */
  async fetchAllGroups(instanceToken) {
    try {
      const response = await this._http.get('/group/list', {
        params: { noparticipants: false },
        headers: { token: instanceToken }
      });

      return Array.isArray(response.data?.groups) ? response.data.groups : [];
    } catch (error) {
      console.error('[Uazapi] Error fetching groups:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
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
   * Filtra pelo jid na listagem completa.
   * @param {string} instanceToken
   * @param {string} groupId
   * @returns {Promise<Array>}
   */
  async fetchGroupParticipants(instanceToken, groupId) {
    try {
      const response = await this._http.get('/group/list', {
        params: { noparticipants: false },
        headers: { token: instanceToken }
      });

      const groups = Array.isArray(response.data?.groups) ? response.data.groups : [];
      const group = groups.find((g) => g.jid === groupId);
      return group?.participants ?? [];
    } catch (error) {
      console.error('[Uazapi] Error fetching group participants:', error.response?.data || error.message);
      throw new Error('Failed to fetch group participants');
    }
  }
}

export default new UazapiProvider();
