// index.js (Versión Final 2.0 - UX Refinada)

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

const userSessions = {};
const SESSION_TIMEOUT = 15 * 60 * 1000; 

const responses = {
  // El menú principal sin saludo.
  menu: '1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',
  
  // La versión del menú con el "header" de Myriam para cuando se presiona 0.
  menuConHeader: '👩🏻✨ Aquí tienes las opciones de nuevo:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',

  opcion1: '¡Claro! La teleconsulta es con el *Dr. Sebastián Aravena, Médico Cirujano de la U. de Concepción* (Reg. 763509). El servicio está orientado a la medicina general para adultos y, tras evaluación, puede incluir:\n\n• *Recetas Médicas:* (Simples, retenidas o cheques) con una duración de 1 a 3 meses para condiciones crónicas, según criterio médico.\n\n• *Licencia Médica:* Si tu cuadro lo requiere, se emite por un máximo de *14 días*, de acuerdo a la normativa.\n\n• *Órdenes de Examen y Certificados.*\n\nSi esto se ajusta a lo que necesitas, puedes presionar *2* para agendar o *0* para volver al menú principal.',
  opcion2: '¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta directamente en el sitio web oficial.\n\nEl pago se realiza de forma segura con tarjetas *en la misma plataforma* al finalizar el agendamiento.\n\n📅 Haz clic aquí para agendar: https://www.drsebastianaravena.cl\n\nSi tienes otra duda, presiona *0* para ver todas las opciones.',
  opcion3: 'Por supuesto. Los valores son:\n\n• *Atención Fonasa:* $30.000\n• *Atención Isapre/Particular:* $40.000\n\nAceptamos tarjetas a través de Webpay. Al pagar, aceptas los *Términos y Condiciones* del servicio (políticas de anulación/reprogramación).\n\nPresiona *2* para agendar o *0* para volver al menú principal.',
  
  // Mensajes divididos para la opción 4
  opcion4_parte1: '¡Entendido! Para iniciar una conversación humana, haz clic en el siguiente enlace. Serás atendido por el Dr. Aravena o su asistente.\n\n👉 *Iniciar conversación:* https://wa.me/56926125661',
  opcion4_parte2: 'Este canal es ideal para resolver dudas específicas, temas administrativos (ej: licencias rechazadas) o cualquier inconveniente que tengas.\n\n*Importante: Es un canal **solo para mensajes de texto**, no recibe llamadas. La evaluación médica se realiza exclusivamente en la teleconsulta agendada.*',

  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, aquí estaré. 😊'
};

responses.bienvenida = `¡Hola! Soy Myriam Luz 👩🏻✨, la asistente virtual del Dr. Sebastián Aravena. Estoy aquí para ayudarte con tu teleconsulta.\n\n${responses.menu}`;
responses.error = `Disculpa, no entendí tu mensaje. Por favor, recuerda escribir solo el número de la opción que necesitas.\n\n${responses.menu}`;

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  const from = req.body.From;
  let messageToSend;

  const now = Date.now();
  const userSession = userSessions[from];

  // Comprueba si la sesión no existe o si ha expirado (timeout pasivo)
  if (!userSession || (now - userSession.lastInteraction > SESSION_TIMEOUT)) {
    messageToSend = responses.bienvenida;
    userSessions[from] = { lastInteraction: now, menuSent: true };
  } else {
    userSessions[from].lastInteraction = now;

    switch (incomingMsg) {
      case '1': messageToSend = responses.opcion1; break;
      case '2': messageToSend = responses.opcion2; break;
      case '3': messageToSend = responses.opcion3; break;
      case '4':
        // Lógica para enviar dos mensajes seguidos
        twiml.message(responses.opcion4_parte1);
        twiml.message(responses.opcion4_parte2);
        // Se envía la respuesta y se detiene el flujo aquí, ya que los mensajes ya están en la cola.
        res.set('Content-Type', 'text/xml');
        res.status(200).send(twiml.toString());
        return; // Detiene la ejecución para no enviar un tercer mensaje.

      case '0': // NUEVA OPCIÓN PARA VOLVER AL MENÚ
        messageToSend = responses.menuConHeader;
        break;

      case 'hola':
      case 'menú':
      case 'menu':
        messageToSend = responses.menuConHeader;
        break;
      
      case 'gracias':
      case 'muchas gracias':
        messageToSend = responses.gracias;
        break;

      default:
        messageToSend = responses.error;
        break;
    }
  }

  twiml.message(messageToSend);
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Myriam Luz v2.0 (UX Final) funcionando en el puerto ${PORT}`);
});