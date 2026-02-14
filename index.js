// index.js

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const responses = require('./responses/messages');
const normalizeInput = require('./utils/normalizeInput');
const { getSession, resetSupport } = require('./sessions/sessionManager');

const app = express();
app.use(express.urlencoded({ extended: false }));

function normalizeRut(input) {
  const raw = String(input || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s/g, '');

  // acepta 12345678-9 o 123456789 (sin guion)
  if (/^\d{7,8}-[\dk]$/.test(raw)) return raw;
  if (/^\d{8,9}$/.test(raw)) return raw.slice(0, -1) + '-' + raw.slice(-1);
  return null;
}

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').trim();
  const from = req.body.From;

  const session = getSession(from);

  // primer mensaje de sesión
  if (session.isNew) {
    twiml.message(responses.bienvenida);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  // validación mínima
  if (!incomingMsg || typeof incomingMsg !== 'string') {
    twiml.message('No puedo procesar ese mensaje. Responde con texto.');
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  const normalized = normalizeInput(incomingMsg);

  // salir a menú siempre
  if (normalized === '0') {
    resetSupport(session);
    twiml.message(responses.menuConHeader);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  // flujo soporte (4) por estados
  if (session.state === 'SUPPORT_RUT') {
    const rut = normalizeRut(incomingMsg);
    if (!rut) {
      twiml.message('RUT inválido. Ej: 12345678-9');
    } else {
      session.support.rut = rut;
      session.state = 'SUPPORT_MOTIVE';
      twiml.message(responses.soporte_motivo);
    }
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
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
      twiml.message(responses.soporte_motivo);
    } else {
      session.support.motive = map[key];
      session.state = 'SUPPORT_DETAIL';
      twiml.message(responses.soporte_detalle);
    }
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  if (session.state === 'SUPPORT_DETAIL') {
    const detail = String(incomingMsg || '').trim();
    if (detail.length < 3) {
      twiml.message(responses.soporte_detalle);
    } else {
      session.support.detail = detail;
      twiml.message(
        responses.soporte_fin({
          rut: session.support.rut,
          motive: session.support.motive,
          detail: session.support.detail,
        })
      );
      resetSupport(session);
    }
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }

  // flujo menú normal
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
      session.state = 'SUPPORT_RUT';
      twiml.message(responses.soporte_rut);
      break;
    case 'sobrecupo':
      twiml.message(responses.sobrecupo);
      break;
    case 'gracias':
      twiml.message(responses.gracias);
      break;
    default:
      // si no hay palabra clave: obligar a números
      twiml.message(responses.error);
      break;
  }

  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Miriam Bot v2 corriendo en puerto ${PORT}`);
});
