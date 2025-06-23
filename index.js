// index.js

// -------------------
//  1. CONFIGURACIÓN INICIAL
// -------------------

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

// -------------------
//  2. TEXTOS Y RESPUESTAS DEL BOT
// -------------------

const responses = {
  // El menú principal ahora incluye la nueva opción.
  menu: '¿Cómo puedo ayudarte hoy? 😊\n\n1️⃣ Precios y cobertura\n2️⃣ Agendar una cita\n3️⃣ Medios de pago\n4️⃣ Información del Médico\n5️⃣ Políticas de cancelación',

  // Respuestas para cada opción, incluyendo tus actualizaciones.
  opcion1: '¡Claro! Le comento. El doctor Sebastián es médico general. La atención es Teleconsulta y se realiza por Google Meet. El valor Fonasa es de 30 mil e Isapre 40 mil pesos. Como médico general, en caso de que el paciente requiera reposo, solo puede otorgar 14 días como máximo por consulta y en el caso de receta o receta cheque (extensión máxima de 3 meses por consulta), ésta llega de forma digital al correo del paciente durante la atención.',
  opcion2: '¡Perfecto! Puedes agendar directamente en este enlace. ¡Será un gusto atenderte!\n\n📅 https://agendamiento.reservo.cl/makereserva/agenda/q0OWB6D0d0pBRf6L4Z64esF1k5i9N2',
  opcion3: 'Aceptamos pagos con tarjetas de débito y crédito luego de agendar tu hora. 💳',
  opcion4: 'El Dr. Aravena es médico general, egresado de la Universidad de Concepción. Puedes verificar su registro profesional (Nº 763509) aquí: https://rnpi.superdesalud.gob.cl/',
  
  // Nueva opción para la política de cancelación.
  opcion5: '¡Por supuesto! Aquí te detallo nuestras políticas de cancelación y reembolso:\n\n• Si anulas tu hora con más de 24 horas de anticipación, se te devolverá el 80% del valor pagado.\n• Si anulas con menos de 24 horas de anticipación, lamentablemente no se realizará la devolución del dinero.',
  
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, no dudes en escribir "menú".'
};

// Mensajes de bienvenida y error actualizados con el nuevo menú y el emoji.
responses.bienvenida = `¡Hola! Soy Myriam 👩🏻, la asistente virtual del Dr. Aravena. ${responses.menu}`;
responses.error = `Disculpa, no entendí muy bien tu mensaje. ${responses.menu}`;


// -------------------
//  3. LÓGICA DEL WEBHOOK
// -------------------

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  let messageToSend;

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

    // Nuevo caso para la opción 5
    case '5':
      messageToSend = responses.opcion5;
      break;
      
    case 'hola':
    case 'buenos días':
    case 'buenas tardes':
    case 'menú':
      messageToSend = responses.bienvenida;
      break;
    
    case 'gracias':
    case 'muchas gracias':
      messageToSend = responses.gracias;
      break;

    default:
      messageToSend = responses.error;
      break;
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
  console.log(`El bot de Myriam está funcionando en el puerto ${PORT}`);
});
