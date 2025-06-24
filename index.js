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
  // Menú actualizado con la nueva opción de redirección.
  menu: '¿Cómo puedo ayudarte hoy? 😊\n\n1️⃣ Valor de la consulta\n2️⃣ Agendar una hora\n3️⃣ Medios de pago\n4️⃣ Información del Médico\n5️⃣ Términos y condiciones\n6️⃣ Consulta Personalizada',

  opcion1: '¡Claro! Le comento. El doctor Sebastián es médico general. La atención es Teleconsulta y se realiza por Google Meet. El valor Fonasa es de 30 mil e Isapre 40 mil pesos. Como médico general, en caso de que el paciente requiera reposo, solo puede otorgar 14 días como máximo por consulta y en el caso de receta o receta cheque (extensión máxima de 3 meses por consulta), ésta llega de forma digital al correo del paciente durante la atención.',
  opcion2: '¡Perfecto! Puedes agendar directamente en este enlace. ¡Será un gusto atenderte!\n\n📅 https://www.drsebastianaravena.cl',
  opcion3: 'Aceptamos pagos con tarjetas de débito y crédito luego de agendar tu hora. 💳\n\n*Importante*: Al realizar el pago, usted acepta nuestros términos y condiciones (consulte la opción 5).',
  opcion4: 'El Dr. Aravena es médico general, egresado de la Universidad de Concepción. Puedes verificar su registro profesional (Nº 763509) aquí: https://rnpi.superdesalud.gob.cl/',
  terminos: '📄 *Términos y Condiciones*\n\nLe informamos sobre nuestras políticas de cancelación y reembolso:\n\n• Si anula su hora con más de 24 horas de anticipación, se le devolverá el 90% del valor pagado.\n• Si anula con menos de 24 horas de anticipación, se le devolverá el 50% del dinero.\n\nAl agendar y pagar su consulta, usted confirma que ha leído y aceptado estos términos.',
  
  // NUEVA RESPUESTA para la opción 6.
  // ¡¡RECUERDA CAMBIAR EL NÚMERO DE TELÉFONO AQUÍ!!
  opcion6: '¡Entendido! Para consultas personalizadas, problemas con licencias o cualquier otro tema que requiera atención humana, puedes hablar directamente con un asistente haciendo clic en este enlace:\n\n👉 https://wa.me/56926125661\n\nTe responderán a la brevedad posible.',

  instrucciones: 'Recuerda escribir solo el número de la opción que deseas.',
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, no dudes en escribir "menú".'
};

responses.bienvenida = `¡Hola! Soy Myriam 👩🏻, la asistente virtual del Dr. Aravena. ${responses.menu}\n\n${responses.instrucciones}`;
responses.error = `Disculpa, no entendí muy bien tu mensaje. ${responses.menu}\n\n${responses.instrucciones}`;


// -------------------
//  3. LÓGICA DEL WEBHOOK
// -------------------
// La lógica ahora es mucho más simple sin el modo "recado".

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  let messageToSend;

  switch (incomingMsg) {
    case '1': messageToSend = responses.opcion1; break;
    case '2': messageToSend = responses.opcion2; break;
    case '3': messageToSend = responses.opcion3; break;
    case '4': messageToSend = responses.opcion4; break;
    case '5': messageToSend = responses.terminos; break;
    
    // El caso '6' ahora envía el enlace al otro WhatsApp.
    case '6': messageToSend = responses.opcion6; break;
      
    case 'hola':
    case 'buenos días':
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