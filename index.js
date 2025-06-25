// index.js (Versión 1.0 Final - Lista para Producción)

// -------------------
//  1. CONFIGURACIÓN INICIAL
// -------------------
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

// Memoria de sesiones para una experiencia de usuario inteligente.
const userSessions = {};
// Tiempo de espera en milisegundos (15 minutos para ser seguros)
const SESSION_TIMEOUT = 15 * 60 * 1000; 

// -------------------
//  2. TEXTOS Y RESPUESTAS DE MYRIAM LUZ (VERSIÓN FINAL)
// -------------------
const responses = {
  menu: 'Para comenzar, cuéntame qué necesitas escribiendo el número de una de las opciones:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',
  opcion1: '¡Claro! Es muy importante que sepas qué incluye nuestro servicio. La teleconsulta con el Dr. Aravena está orientada a la atención de medicina general para adultos y, tras una evaluación médica completa, puede incluir:\n\n• *Emisión de Recetas Médicas:* Se emiten recetas (simples, retenidas o cheques) si el criterio médico lo justifica. Para tratamientos de condiciones crónicas ya estudiadas, las recetas pueden tener una duración de *1 a 3 meses*, según evaluación.\n\n• *Emisión de Licencia Médica:* Si tu cuadro clínico lo requiere, se puede emitir una Licencia Médica Electrónica. Es importante que sepas que, de acuerdo a la normativa y las buenas prácticas, la extensión máxima por consulta es de *14 días*.\n\n• *Órdenes de Examen y Certificados:* También se pueden emitir según corresponda a la evaluación.\n\nSi el alcance de nuestra atención se ajusta a lo que necesitas, puedes agendar en la opción 2.',
  opcion2: '¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta directamente en el sitio web oficial.\n\nEl pago se realiza de forma segura con tarjetas de débito o crédito *en la misma plataforma* al finalizar el agendamiento.\n\n📅 Haz clic aquí para agendar: https://www.drsebastianaravena.cl',
  opcion3: 'Por supuesto. Los valores de la teleconsulta son:\n\n• *Atención Fonasa:* $30.000\n• *Atención Isapre/Particular:* $40.000\n\nAceptamos tarjetas de débito y crédito a través de Webpay.\n\n*Importante:* Al realizar el pago en la plataforma, estarás aceptando los *Términos y Condiciones* del servicio, que incluyen nuestras políticas de anulación y reprogramación.',
  opcion4: '¡Por supuesto! Este es el canal directo para resolver cualquier duda o inconveniente. Queremos que te sientas libre de hablar con nosotros si:\n\n• Eres un paciente nuevo y tienes dudas específicas.\n• Necesitas asistencia con una licencia médica ya emitida (ej: rechazada).\n• Tuviste un inconveniente técnico o con el pago.\n• O tu consulta simplemente no se ajusta a las opciones automáticas.\n\nSerás atendido personalmente por el *Dr. Aravena o su asistente*. Para hacerlo, solo tienes que hacer clic en el siguiente enlace. Se abrirá un chat directamente con ellos.\n\n👉 *Iniciar conversación:* https://wa.me/56926125661\n\n*Importante: Este canal es **solo para mensajes de texto**, no recibe llamadas.*',
  timeout: 'Veo que no has respondido. No te preocupes, ¡estoy aquí si me necesitas más tarde! 👋 Si tienes otra duda, solo tienes que volver a escribir. ¡Que tengas un excelente día! ✨',
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, aquí estaré. 😊'
};

// Combinación de textos para los mensajes completos
responses.bienvenida = `¡Hola! Soy Myriam Luz 👩🏻✨, la asistente virtual del Dr. Sebastián Aravena. Estoy aquí para ayudarte con tu teleconsulta.\n\n${responses.menu}`;
responses.error = `Disculpa, no entendí tu mensaje. Por favor, recuerda escribir solo el número de la opción que necesitas.\n\n${responses.menu}`;

// -------------------
//  3. LÓGICA DEL WEBHOOK (VERSIÓN FINAL)
// -------------------
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
    userSessions[from] = { lastInteraction: now };
  } else {
    // Si el usuario ya está en una sesión activa, procesamos su mensaje.
    userSessions[from].lastInteraction = now;

    switch (incomingMsg) {
      case '1': messageToSend = responses.opcion1; break;
      case '2': messageToSend = responses.opcion2; break;
      case '3': messageToSend = responses.opcion3; break;
      case '4': messageToSend = responses.opcion4; break;
      
      case 'hola':
      case 'menú':
      case 'menu':
        messageToSend = `¡Claro! Aquí tienes las opciones de nuevo.\n\n${responses.menu}`;
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

// -------------------
//  4. INICIAR EL SERVIDOR
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot Myriam Luz v1.0 (Producción) funcionando en el puerto ${PORT}`);
});