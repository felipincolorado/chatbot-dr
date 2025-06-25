const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

const responses = require('./responses/messages');
const normalizeInput = require('./utils/normalizeInput');
const { isNewSession } = require('./sessions/sessionManager');

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').trim();
  const from = req.body.From;
  let messageToSend;

  if (!incomingMsg || typeof incomingMsg !== 'string') {
    messageToSend = 'Lo siento, no puedo procesar ese tipo de mensaje. Por favor, responde con texto. 🙏';
  } else if (isNewSession(from)) {
    messageToSend = responses.bienvenida;
  } else {
    const userIntent = normalizeInput(incomingMsg);
    switch (userIntent) {
      case '1': messageToSend = responses.opcion1; break;
      case '2': messageToSend = responses.opcion2; break;
      case '3': messageToSend = responses.opcion3; break;
      case '4': messageToSend = responses.opcion4; break;
      case '0': messageToSend = responses.menuConHeader; break;
      case 'gracias': messageToSend = responses.gracias; break;
      default: messageToSend = responses.error; break;
    }
  }

  twiml.message(messageToSend);
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Myriam Luz v1.3 corriendo en puerto ${PORT}`);
});
