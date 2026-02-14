// index.js
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;

const responses = require('./responses/messages');
const normalizeInput = require('./utils/normalizeInput');
const { getSession, resetSupport } = require('./sessions/sessionManager');

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const incomingMsg = (req.body.Body || '').trim();
    const from = req.body.From;

    // Si no hay texto, responde menú
    if (!incomingMsg || typeof incomingMsg !== 'string') {
      twiml.message(responses.error);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    const session = getSession(from);

    // Saludo / inicio / reinicio por inactividad
    const normalized = normalizeInput(incomingMsg);
    if (session.isNew || normalized === 'hola') {
      resetSupport(session);
      twiml.message(responses.bienvenida);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    // Menú global
    if (normalized === '0') {
      resetSupport(session);
      twiml.message(responses.menuConHeader);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    // Estado: Soporte
    if (session.state === 'SUPPORT_RUT') {
      const rut = responses.normalizeRut(incomingMsg);
      if (!rut) {
        twiml.message(responses.soporte_rut_invalido);
      } else {
        session.support.rut = rut;
        session.state = 'SUPPORT_MOTIVE';
        twiml.message(responses.soporte_motivo);
      }
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    if (session.state === 'SUPPORT_MOTIVE') {
      const key = (incomingMsg || '').trim();
      const map = {
        '1': 'Licencia rechazada',
        '2': 'Reembolso / Reprogramar',
        '3': 'Problemas al agendar',
        '4': 'Otro',
      };

      if (!map[key]) {
        twiml.message(responses.soporte_motivo);
        res.set('Content-Type', 'text/xml');
        return res.status(200).send(twiml.toString());
      }

      session.support.motive = map[key];

      // Solo pedimos detalle si elige "Otro"
      if (key === '4') {
        session.state = 'SUPPORT_DETAIL';
        twiml.message(responses.soporte_detalle);
      } else {
        const link = responses.buildSupportLink({
          rut: session.support.rut,
          motive: session.support.motive,
          detail: '',
        });
        twiml.message(responses.soporte_fin(link));
        resetSupport(session);
      }

      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    if (session.state === 'SUPPORT_DETAIL') {
      const detail = (incomingMsg || '').trim();
      if (detail.length < 3) {
        twiml.message(responses.soporte_detalle);
        res.set('Content-Type', 'text/xml');
        return res.status(200).send(twiml.toString());
      }

      session.support.detail = detail;
      const link = responses.buildSupportLink({
        rut: session.support.rut,
        motive: session.support.motive,
        detail: session.support.detail,
      });
      twiml.message(responses.soporte_fin(link));
      resetSupport(session);

      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    }

    // Flujo normal
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
        twiml.message(responses.soporte_inicio);
        break;
      case 'sobrecupo':
        twiml.message(responses.sobrecupo);
        break;
      case 'gracias':
        twiml.message(responses.gracias);
        break;
      default:
        // Si no entiende, siempre responde con menú (nunca silencio)
        twiml.message(responses.error);
        break;
    }

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  } catch (err) {
    // Si algo falla, no dejar en silencio a WhatsApp/Twilio
    twiml.message('Hubo un error. Responde 0 para ver el menú.');
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml.toString());
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Miriam Bot v11 corriendo en puerto ${PORT}`);
});
