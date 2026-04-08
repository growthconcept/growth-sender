/**
 * Contrato base para providers de WhatsApp.
 * Qualquer provider concreto deve estender esta classe e implementar todos os métodos.
 *
 * Formato normalizado retornado por fetchInstances():
 * [
 *   {
 *     instanceName: string,
 *     instanceToken: string,
 *     status: 'connected' | 'disconnected',
 *     phoneNumber: string | null,
 *     profileName: string | null,
 *     profilePicUrl: string | null
 *   }
 * ]
 *
 * Nota sobre instanceToken:
 * - Na Uazapi: é o token individual da instância
 * - Na Evolution API: é o próprio instanceName (usado na URL)
 */
class WhatsAppProviderBase {
  // ─── Gerenciamento de instâncias ────────────────────────────────────────────

  /**
   * Lista todas as instâncias disponíveis.
   * @returns {Promise<Array>} Array normalizado de instâncias
   */
  async fetchInstances() {
    throw new Error(`${this.constructor.name} must implement fetchInstances()`);
  }

  /**
   * Retorna informações e status de uma instância específica.
   * @param {string} instanceToken - Token da instância
   * @returns {Promise<Object|null>}
   */
  async getInstanceInfo(instanceToken) {
    throw new Error(`${this.constructor.name} must implement getInstanceInfo()`);
  }

  // ─── Envio de mensagens ──────────────────────────────────────────────────────

  /**
   * Envia mensagem de texto.
   * @param {string} instanceToken
   * @param {string} recipient - Número do destinatário
   * @param {string} text
   * @returns {Promise<Object>}
   */
  async sendTextMessage(instanceToken, recipient, text) {
    throw new Error(`${this.constructor.name} must implement sendTextMessage()`);
  }

  /**
   * Envia mensagem com mídia (imagem, vídeo, documento).
   * @param {string} instanceToken
   * @param {string} recipient
   * @param {string} mediaType - 'image' | 'video' | 'audio' | 'document'
   * @param {string} mediaUrl
   * @param {string} caption
   * @returns {Promise<Object>}
   */
  async sendMediaMessage(instanceToken, recipient, mediaType, mediaUrl, caption) {
    throw new Error(`${this.constructor.name} must implement sendMediaMessage()`);
  }

  /**
   * Envia áudio como mensagem de voz (PTT).
   * @param {string} instanceToken
   * @param {string} recipient
   * @param {string} audioUrl
   * @param {Object} options - Opções adicionais (delay, etc.)
   * @returns {Promise<Object>}
   */
  async sendWhatsAppAudio(instanceToken, recipient, audioUrl, options = {}) {
    throw new Error(`${this.constructor.name} must implement sendWhatsAppAudio()`);
  }

  // ─── Mensagens interativas ───────────────────────────────────────────────────

  /**
   * Envia menu interativo (botões, lista ou enquete).
   * Suportado apenas na Uazapi.
   * @param {string} instanceToken
   * @param {string} recipient
   * @param {Object} payload - Payload no formato da Uazapi
   * @returns {Promise<Object>}
   */
  async sendInteractiveMenu(instanceToken, recipient, payload) {
    throw new Error(`${this.constructor.name} must implement sendInteractiveMenu()`);
  }

  /**
   * Envia carrossel de cards com botões.
   * Suportado apenas na Uazapi.
   * @param {string} instanceToken
   * @param {string} recipient
   * @param {Object} payload - Payload no formato da Uazapi
   * @returns {Promise<Object>}
   */
  async sendCarousel(instanceToken, recipient, payload) {
    throw new Error(`${this.constructor.name} must implement sendCarousel()`);
  }

  // ─── Grupos ──────────────────────────────────────────────────────────────────

  /**
   * Lista todos os grupos da instância.
   * @param {string} instanceToken
   * @returns {Promise<Array>}
   */
  async fetchAllGroups(instanceToken) {
    throw new Error(`${this.constructor.name} must implement fetchAllGroups()`);
  }

  /**
   * Busca participantes de um grupo.
   * @param {string} instanceToken
   * @param {string} groupId
   * @returns {Promise<Array>}
   */
  async fetchGroupParticipants(instanceToken, groupId) {
    throw new Error(`${this.constructor.name} must implement fetchGroupParticipants()`);
  }
}

export default WhatsAppProviderBase;
