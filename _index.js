// index.js (Versión 1.1 Final - Corregida y Lista para Producción)

// -------------------
//  1. CONFIGURACIÓN INICIAL
// -------------------
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

const userSessions = {};
const SESSION_TIMEOUT = 15 * 60 * 1000; 

// -------------------
//  2. TEXTOS Y RESPUESTAS DE MYRIAM LUZ (VERSIÓN FINAL)
// -------------------
const responses = {
  menu: 'Para comenzar, cuéntame qué necesitas escribiendo el número de una de las opciones:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',
  menuConHeader: '👩🏻✨ Aquí tienes las opciones de nuevo:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',
  opcion1: '¡Claro! La teleconsulta es con el *Dr. Sebastián Aravena, Médico Cirujano de la U. de Concepción* (Reg. 763509). El servicio está orientado a la medicina general para adultos y, tras evaluación, puede incluir:\n\n• *Recetas Médicas:* (Simples, retenidas o cheques) con una duración de 1 a 3 meses para condiciones crónicas, según criterio médico.\n\n• *Licencia Médica:* Si tu cuadro lo requiere, se emite por un máximo de *14 días*, de acuerdo a la normativa.\n\n• *Órdenes de Examen y Certificados.*\n\nSi esto se ajusta a lo que necesitas, puedes presionar *2* para agendar o *0* para volver al menú principal.',
  opcion2: '¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta directamente en el sitio web oficial.\n\nEl pago se realiza de forma segura con tarjetas *en la misma plataforma* al finalizar el agendamiento.\n\n📅 Haz clic aquí para agendar: https://www.drsebastianaravena.cl\n\nSi tienes otra duda, presiona *0* para ver todas las opciones.',
  opcion3: 'Por supuesto. Los valores son:\n\n• *Atención Fonasa:* $30.000\n• *Atención Isapre/Particular:* $40.000\n\nAceptamos tarjetas a través de Webpay. Al pagar, aceptas los *Términos y Condiciones* del servicio (políticas de anulación/reprogramación).\n\nPresiona *2* para agendar o *0* para volver al menú principal.',
  // NUEVA VERSIÓN DE OPCIÓN 4 EN UN SOLO MENSAJE
  opcion4: '¡Por supuesto! Para iniciar una conversación humana, solo tienes que hacer clic en el siguiente enlace. Serás atendido por el Dr. Aravena o su asistente.\n\n👉 *Iniciar conversación:* https://wa.me/56926125661\n\n---\n\n*Más detalles sobre este canal:*\nEste chat es ideal si eres un paciente nuevo con dudas, si necesitas asistencia con una licencia ya emitida (ej: rechazada) o si tuviste un inconveniente técnico.\n\n*Importante: Es un canal **solo para mensajes de texto**, no recibe llamadas. La evaluación médica se realiza exclusivamente en la teleconsulta agendada.*',
  timeout: 'Veo que no has respondido. No te preocupes, ¡estoy aquí si me necesitas más tarde! 👋 Si tienes otra duda, solo tienes que volver a escribir. ¡Que tengas un excelente día! ✨',
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, aquí estaré. 😊'
};

responses.bienvenida = `¡Hola! Soy Myriam Luz 👩🏻✨, la asistente virtual del Dr. Sebastián Aravena. Estoy aquí para ayudarte con tu teleconsulta.\n\n${responses.menu}`;
responses.error = `Disculpa, no entendí tu mensaje. Por favor, recuerda escribir solo el número de la opción que necesitas.\n\n${responses.menu}`;

// -------------------
//  3. LÓGICA DEL WEBHOOK (VERSIÓN FINAL CORREGIDA)
// -------------------
app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  const from = req.body.From;
  let messageToSend;

  const now = Date.now();
  const userSession = userSessions[from];

  if (!userSession || (now - userSession.lastInteraction > SESSION_TIMEOUT)) {
    messageToSend = responses.bienvenida;
    userSessions[from] = { lastInteraction: now };
  } else {
    userSessions[from].lastInteraction = now;

    switch (incomingMsg) {
      case '1': messageToSend = responses.opcion1; break;
      case '2': messageToSend = responses.opcion2; break;
      case '3': messageToSend = responses.opcion3; break;
      // LÓGICA SIMPLIFICADA: Ahora solo envía un mensaje.
      case '4': messageToSend = responses.opcion4; break;
      case '0': messageToSend = responses.menuConHeader; break;
      case 'hola':
      case 'menú':
      case 'menu':
        messageToSend = responses.menuConHeader; break;
      case 'gracias':
      case 'muchas gracias':
        messageToSend = responses.gracias; break;
      default:
        messageToSend = responses.error; break;
    }
  }

  twiml.message(messageToSend);
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
});

// -------------------
//  4. INICIAR EL SERVIDOR
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Myriam Luz v1.1 (Producción Final) funcionando en el puerto ${PORT}`);
});