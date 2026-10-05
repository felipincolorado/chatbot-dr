// src/app.js
const crypto = require('crypto');
const express = require('express');
const twilio = require('twilio');
const { MessagingResponse } = twilio.twiml;

const { createBot } = require('./bot');
const { createSessionStore } = require('./sessionManager');
const { createAi } = require('./ai');

// Identificador anónimo para logs: nunca se registra el número real.
function anonId(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 10);
}

// Conjunto acotado con expiración, para descartar reintentos duplicados de Twilio.
function createRecentSet({ ttlMs = 10 * 60 * 1000, max = 2000 } = {}) {
  const items = new Map();
  return {
    seen(key) {
      const now = Date.now();
      for (const [k, t] of items) {
        if (now - t > ttlMs || items.size > max) items.delete(k);
        else break;
      }
      if (items.has(key)) return true;
      items.set(key, now);
      return false;
    },
  };
}

// Límite simple por remitente para cortar ciclos o abuso.
function createRateLimiter({ windowMs = 60 * 1000, max = 30 } = {}) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref();
  return {
    allow(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || now - entry.start > windowMs) {
        hits.set(key, { start: now, count: 1 });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
  };
}

function publicUrlFor(req, config) {
  if (config.twilio.publicBaseUrl) return `${config.twilio.publicBaseUrl}${req.originalUrl}`;
  // Railway termina TLS en su proxy y reenvía X-Forwarded-Proto / X-Forwarded-Host.
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}${req.originalUrl}`;
}

function sendTwiml(res, twiml) {
  res.set('Content-Type', 'text/xml');
  return res.status(200).send(twiml.toString());
}

function createApp(config, { ai, logger = console } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  const sessions = createSessionStore();
  const aiLayer = ai !== undefined ? ai : createAi(config.ai);
  const bot = createBot(config, { ai: aiLayer });
  const recent = createRecentSet();
  const limiter = createRateLimiter();

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', version: config.version });
  });

  app.get('/', (req, res) => {
    res.status(200).type('text/plain').send('Miriam - asistente virtual de agendamiento. OK');
  });

  function verifyTwilioSignature(req, res, next) {
    if (!config.twilio.validateSignature) return next();

    if (!config.twilio.authToken) {
      logger.error('[webhook] Validación de firma activa pero falta TWILIO_AUTH_TOKEN.');
      return res.status(500).type('text/plain').send('Server misconfigured');
    }

    const signature = req.get('x-twilio-signature') || '';
    const url = publicUrlFor(req, config);
    const valid = signature && twilio.validateRequest(config.twilio.authToken, signature, url, req.body || {});
    if (!valid) {
      logger.warn('[webhook] Firma de Twilio inválida o ausente; solicitud rechazada.');
      return res.status(403).type('text/plain').send('Forbidden');
    }
    return next();
  }

  app.post(
    '/webhook',
    express.urlencoded({ extended: false, limit: '20kb', parameterLimit: 100 }),
    verifyTwilioSignature,
    async (req, res) => {
      const started = Date.now();
      const twiml = new MessagingResponse();
      const body = req.body || {};
      const from = typeof body.From === 'string' ? body.From : '';
      const to = typeof body.To === 'string' ? body.To : '';
      const sid = typeof body.MessageSid === 'string' ? body.MessageSid : '';
      const user = anonId(from);

      try {
        // Evitar ciclos: nunca responder a nuestro propio número ni a callbacks de estado.
        if (!from || from === to || (body.MessageStatus && body.Body === undefined)) {
          return sendTwiml(res, twiml);
        }
        if (sid && recent.seen(sid)) {
          logger.info(`[webhook] duplicado ignorado user=${user}`);
          return sendTwiml(res, twiml);
        }
        if (!limiter.allow(from)) {
          logger.warn(`[webhook] límite de mensajes alcanzado user=${user}`);
          return sendTwiml(res, twiml);
        }

        const session = sessions.get(from);
        const hasMedia = Number(body.NumMedia || 0) > 0;
        const result = await bot.handleMessage(session, typeof body.Body === 'string' ? body.Body : '', { hasMedia });

        twiml.message(result.text);
        logger.info(`[webhook] user=${user} intent=${result.intent} ms=${Date.now() - started}`);
        return sendTwiml(res, twiml);
      } catch (err) {
        logger.error(`[webhook] error user=${user}: ${err && err.message ? err.message : 'desconocido'}`);
        const fallback = new MessagingResponse();
        fallback.message(bot.messages.error);
        return sendTwiml(res, fallback);
      }
    }
  );

  app.use((req, res) => res.status(404).type('text/plain').send('Not found'));

  // Manejo de errores sin exponer detalles internos (p. ej. cuerpo demasiado grande).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err && err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    logger.error(`[http] ${req.method} ${req.path} -> ${status} (${err && err.type ? err.type : 'error'})`);
    res.status(status).type('text/plain').send(status === 413 ? 'Payload too large' : 'Error');
  });

  return app;
}

module.exports = { createApp, publicUrlFor, anonId };
