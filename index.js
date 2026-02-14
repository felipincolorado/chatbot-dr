// index.js

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;

const responses = require('./responses/messages');
const normalizeInput = require('./utils/normalizeInput');
const { getSession, resetSupport } = require('./sessions/sessionManager');

const app = express();

// Aumenta límite por seguridad (evita errores tipo "entity too large")
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Healthcheck simple (algunas plataformas lo necesitan)
app.get('/', (req, res) => res.status(200).send('ok'));

function normalizeRut(input) {
  const raw = String(input || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s/g, '');

  // 12345678-9 o 123456789 (sin guion)
  if (/^\d{7,8}-[\dk]$/.test(raw)) return raw;
  if (/^\d{8,9}$/.test(raw)) return raw.slice(0, -1) + '-' + raw.slice(-1);
  return null;
}

function sendTwiml(res, twiml) {
  res.set('Content-Type', 'text/xml');
  return res.status(200).send(twiml.toString());
}

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();

  const from = req.body && req.body.From;
  const incomingMsg = ((req.body && req.body.Body) || '').trim();

  const session = getSession(from);

  // Si la sesión expiró por inactividad: reiniciamos y mostramos menú
  if (session.isNew) {
    twiml.message(responses.bienvenida);
    return sendTwiml(res, twiml);
  }

  // Validación mínima
  if (!incomingMsg || typeof incomingMsg !== 'string') {
    twiml.message(responses.errorBasico);
    return sendTwiml(res, twiml);
  }

  // Comando menú
  const normalized = normalizeInput(incomingMsg);
  if (normalized === '0') {
    resetSupport(session);
    twiml.message(responses.menuConHeader);
    return sendTwiml(res, twiml);
  }

  // ==== FLUJO SOPORTE (opción 4) ====
  if (session.state === 'SUPPORT_NAME') {
    const name = String(incomingMsg || '').trim();
    if (name.length < 3) {
      twiml.message('Nombre y apellido (ej: Juan Pérez).');
      return sendTwiml(res, twiml);
    }
    session.support.name = name.slice(0, 60);
    session.state = 'SUPPORT_RUT';
    twiml.message('2/4 RUT (sin puntos y con guion):');
    return sendTwiml(res, twiml);
  }

  if (session.state === 'SUPPORT_RUT') {
    const rut = normalizeRut(incomingMsg);
    if (!rut) {
      twiml.message('RUT inválido. Ej: 12345678-9');
      return sendTwiml(res, twiml);
    }
    session.support.rut = rut;
    session.state = 'SUPPORT_MOTIVE';
    twiml.message('3/4 Elige un motivo:');
    twiml.message(responses.soporte_motivo);
    return sendTwiml(res, twiml);
  }

  if (session.state === 'SUPPORT_MOTIVE') {
    const map = {
      '1': 'Licencia rechazada',
      '2': 'Reembolso / Reprogramar',
      '3': 'Problemas al agendar',
      '4': 'Otro',
    };
    const key = String(incomingMsg || '').trim();

    if (!map[key]) {
      twiml.message('3/4 Elige un motivo:');
    twiml.message(responses.soporte_motivo);
      return sendTwiml(res, twiml);
    }

    session.support.motive = map[key];
    session.state = 'SUPPORT_DETAIL';

    if (key === '1') {
      twiml.message('4/4 Detalle en 1 frase (sin datos médicos). Ej: Isapre/COMPIN rechazó el dd/mm por ____.');
    } else {
      twiml.message('4/4 ' + responses.soporte_detalle);
    }

    return sendTwiml(res, twiml);
  }

  if (session.state === 'SUPPORT_DETAIL') {
    const detail = String(incomingMsg || '').trim();
    if (detail.length < 3) {
      twiml.message('4/4 ' + responses.soporte_detalle);
      return sendTwiml(res, twiml);
    }

    session.support.detail = detail.slice(0, 300);

    // Mensaje 1: link corto + instrucción
    twiml.message(responses.soporte_link);
    // Mensaje 2: solo el texto para copiar/pegar
    twiml.message(
      responses.soporte_texto({
        name: session.support.name,
        rut: session.support.rut,
        motive: session.support.motive,
        detail: session.support.detail,
      })
    );

    resetSupport(session);
    return sendTwiml(res, twiml);
  }

  // ==== MENÚ NORMAL ====
  switch (normalized) {
    case '1':
      twiml.message(responses.opcion1);
      break;
    case '2':
      twiml.message(responses.opcion2);
      break;
    case '3':
      twiml.message(responses.opcion3);
      break;
    case '4':
      // soporte empieza pidiendo nombre
      session.state = 'SUPPORT_NAME';
      twiml.message(responses.soporte_inicio);
      break;
    case 'sobrecupo':
      twiml.message(responses.sobrecupoSuave);
      break;
    case 'gracias':
      twiml.message(responses.gracias);
      break;
    default:
      // Si no entiende: mostrar menú (corto)
      twiml.message(responses.error);
      break;
  }

  return sendTwiml(res, twiml);
});

// Handler de errores (incluye body-parser/express)
app.use((err, req, res, next) => {
  try {
    console.error('❌ Error middleware:', err && (err.message || err));
  } catch (_) {}

  const twiml = new MessagingResponse();

  // Si el error es por tamaño de cuerpo
  if (err && err.type === 'entity.too.large') {
    twiml.message('Mensaje demasiado largo. Responde con 1, 2, 3, 4 o 0.');
    return sendTwiml(res, twiml);
  }

  twiml.message('Hubo un error. Responde 0 para volver al menú.');
  return sendTwiml(res, twiml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Miriam Bot v3 corriendo en puerto ${PORT}`);
});
