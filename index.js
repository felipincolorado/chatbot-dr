// index.js

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const responses = require('./responses/messages');
const normalizeInput = require('./utils/normalizeInput');
const { isNewSession } = require('./sessions/sessionManager');

const app = express();
app.use(express.urlencoded({ extended: false }));

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').trim();
  const from = req.body.From;
  let isHandled = false;

  if (!incomingMsg || typeof incomingMsg !== 'string') {
    twiml.message('Lo siento, no puedo procesar ese tipo de mensaje. Por favor, responde con texto. 🙏');
    isHandled = true;
  } else if (isNewSession(from)) {
    twiml.message(responses.bienvenida);
    isHandled = true;
  } else {
    const normalized = normalizeInput(incomingMsg);

    switch (normalized) {
      case '1':
        twiml.message(responses.opcion1);
        isHandled = true;
        break;
      case '2':
        twiml.message(responses.opcion2);
        isHandled = true;
        break;
      case '3':
        twiml.message(responses.opcion3);
        isHandled = true;
        break;
      case '4':
        twiml.message(responses.opcion4_parte1); // link de WhatsApp
        twiml.message(responses.opcion4_parte2); // instrucciones posteriores
        isHandled = true;
        break;
      case '0':
        twiml.message(responses.menuConHeader);
        isHandled = true;
        break;
      case 'gracias':
        twiml.message(responses.gracias);
        isHandled = true;
        break;
      default:
        twiml.message(responses.error);
        isHandled = true;
        break;
    }
  }

  if (isHandled) {
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml.toString());
  } else {
    res.status(400).send('Bad request');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Myriam Luz v1.3 corriendo en puerto ${PORT}`);
});
