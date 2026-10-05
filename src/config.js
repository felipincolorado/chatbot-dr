// src/config.js
// Toda la configuración sale de variables de entorno. Los valores por defecto
// son solo datos públicos (web oficial, número de soporte publicado).
const { version } = require('../package.json');

const DEFAULTS = {
  AGENDA_URL: 'https://drsebastianaravena.cl/agendar/',
  HUMAN_WHATSAPP_NUMBER: '56926125661',
  DOCTOR_FULL_NAME: 'Dr. Sebastián Aravena',
};

function str(env, key) {
  const v = env[key];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function bool(env, key, fallback) {
  const v = str(env, key).toLowerCase();
  if (!v) return fallback;
  return ['1', 'true', 'yes', 'si', 'on'].includes(v);
}

function httpsUrl(value) {
  if (!value) return '';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function loadConfig(env = process.env) {
  const isProduction = str(env, 'NODE_ENV') === 'production';
  const humanNumber = digitsOnly(str(env, 'HUMAN_WHATSAPP_NUMBER')) || DEFAULTS.HUMAN_WHATSAPP_NUMBER;

  return {
    version,
    port: Number(str(env, 'PORT')) || 3000,
    isProduction,

    agendaUrl: httpsUrl(str(env, 'AGENDA_URL')) || DEFAULTS.AGENDA_URL,
    humanWhatsappNumber: humanNumber,
    doctorFullName: str(env, 'DOCTOR_FULL_NAME') || DEFAULTS.DOCTOR_FULL_NAME,
    // RNPI: solo se muestra si está configurado. Nunca se inventa.
    doctorRnpi: str(env, 'DOCTOR_RNPI'),
    doctorRnpiUrl: httpsUrl(str(env, 'DOCTOR_RNPI_URL')),

    twilio: {
      // ACCOUNT_SID / AUTH_TOKEN: nombres usados por versiones anteriores del bot.
      accountSid: str(env, 'TWILIO_ACCOUNT_SID') || str(env, 'ACCOUNT_SID'),
      authToken: str(env, 'TWILIO_AUTH_TOKEN') || str(env, 'AUTH_TOKEN'),
      // Por defecto se valida la firma en producción. Solo para emergencias
      // puede desactivarse con TWILIO_VALIDATE_SIGNATURE=false.
      validateSignature: bool(env, 'TWILIO_VALIDATE_SIGNATURE', isProduction),
      // URL pública base (ej. https://xxx.up.railway.app). Si no está, se
      // reconstruye desde las cabeceras del proxy de Railway.
      publicBaseUrl: httpsUrl(str(env, 'PUBLIC_BASE_URL')).replace(/\/$/, ''),
    },

    ai: {
      enabled: bool(env, 'AI_ENABLED', false),
      provider: str(env, 'AI_PROVIDER').toLowerCase() || 'anthropic',
      apiKey: str(env, 'AI_API_KEY') || str(env, 'ANTHROPIC_API_KEY'),
      model: str(env, 'AI_MODEL') || 'claude-opus-5-5',
      timeoutMs: Number(str(env, 'AI_TIMEOUT_MS')) || 6000,
    },
  };
}

module.exports = { loadConfig, DEFAULTS };
