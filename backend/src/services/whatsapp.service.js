import dotenv from 'dotenv';

dotenv.config();

/**
 * Factory que retorna o provider de WhatsApp ativo com base em WHATSAPP_PROVIDER.
 *
 * Uso nos consumidores:
 *   import whatsappService from '../services/whatsapp.service.js';
 *   await whatsappService.sendTextMessage(instanceToken, recipient, text);
 *
 * Valores válidos para WHATSAPP_PROVIDER: 'uazapi' | 'evolution' (padrão)
 */
const provider = (process.env.WHATSAPP_PROVIDER ?? 'evolution').toLowerCase();

let whatsappService;

if (provider === 'uazapi') {
  const { default: uazapiProvider } = await import('../providers/uazapi.provider.js');
  whatsappService = uazapiProvider;
} else {
  const { default: evolutionProvider } = await import('../providers/evolution.provider.js');
  whatsappService = evolutionProvider;
}

export default whatsappService;
