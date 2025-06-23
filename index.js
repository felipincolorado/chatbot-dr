// index.js

// -------------------
//  1. CONFIGURACIÓN INICIAL
// -------------------

// Importamos las librerías necesarias.
// 'express' para crear el servidor web.
// 'MessagingResponse' de Twilio para construir las respuestas para WhatsApp.
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;

const app = express();

// Middleware de Express para poder entender los datos que envía Twilio.
app.use(express.urlencoded({ extended: false }));


// -------------------
//  2. TEXTOS Y RESPUESTAS DEL BOT
// -------------------
// Centralizamos todos los textos aquí para que sea más fácil editarlos en el futuro.

const responses = {
  // El menú principal que se mostrará en varias situaciones.
  menu: '¿Cómo puedo ayudarte hoy? 😊\n\n1️⃣ Precios y cobertura\n2️⃣ Agendar una cita\n3️⃣ Medios de pago\n4️⃣ Información del Médico',

  // Respuestas para cada opción del menú.
  opcion1: '¡Claro! La atención es por Teleconsulta a través de Google Meet. El valor para Fonasa es de 30 mil pesos y para Isapre es de 40 mil pesos.',
  opcion2: '¡Perfecto! Puedes agendar directamente en este enlace. ¡Será un gusto atenderte!\n\n📅 https://agendamiento.reservo.cl/makereserva/agenda/q0OWB6D0d0pBRf6L4Z64esF1k5i9N2',
  opcion3: 'Aceptamos pagos con tarjetas de débito y crédito a través de un enlace seguro que se te enviará. 💳',
  opcion4: 'El Dr. Aravena es médico general, egresado de la Universidad de Concepción. Puedes verificar su registro profesional (Nº 763509) aquí: https://rnpi.superdesalud.gob.cl/',
  
  // Mensaje de agradecimiento.
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, no dudes en escribir "menú".'
};

// Construimos los mensajes de bienvenida y de error usando los textos de arriba.
// Esto evita repetir texto y mantiene la consistencia.
responses.bienvenida = `¡Hola! Soy Myriam, la asistente virtual del Dr. Aravena. ${responses.menu}`;
responses.error = `Disculpa, no entendí muy bien tu mensaje. ${responses.menu}`;


// -------------------
//  3. LÓGICA DEL WEBHOOK
// -------------------
// Aquí es donde ocurre la magia. Esta ruta recibe los mensajes de WhatsApp.

app.post('/webhook', (req, res) => {
  // Creamos una instancia para construir nuestra respuesta a Twilio.
  const twiml = new MessagingResponse();

  // Obtenemos el mensaje del usuario de forma segura.
  // Lo convertimos a minúsculas y quitamos espacios para facilitar la comparación.
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();

  let messageToSend;

  // Usamos una estructura 'switch' para decidir qué responder.
  switch (incomingMsg) {
    case '1':
      messageToSend = responses.opcion1;
      break;
    
    case '2':
      messageToSend = responses.opcion2;
      break;

    case '3':
      messageToSend = responses.opcion3;
      break;

    case '4':
      messageToSend = responses.opcion4;
      break;
      
    // Podemos añadir palabras clave para que la conversación sea más natural.
    case 'hola':
    case 'buenos días':
    case 'buenas tardes':
    case 'menú':
    case '5': // Mantenemos el 5 por compatibilidad con tu código anterior.
      messageToSend = responses.bienvenida;
      break;
    
    case 'gracias':
    case 'muchas gracias':
      messageToSend = responses.gracias;
      break;

    default:
      // Si el mensaje está vacío o no coincide con ninguna opción,
      // enviamos el mensaje de error que incluye el menú.
      messageToSend = responses.error;
      break;
  }

  // Añadimos el mensaje elegido a nuestra respuesta TwiML.
  twiml.message(messageToSend);

  // Enviamos la respuesta a Twilio.
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
});


// -------------------
//  4. INICIAR EL SERVIDOR
// -------------------

// Usamos el puerto que nos asigne la plataforma (como Railway) o el 3000 si es local.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El bot de Myriam está funcionando en el puerto ${PORT}`);
});
