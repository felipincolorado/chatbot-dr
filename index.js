// index.js

// -------------------
//  1. CONFIGURACIÓN INICIAL
// -------------------

const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const app = express();
app.use(express.urlencoded({ extended: false }));

// -------------------
//  2. GESTIÓN DE ESTADO
// -------------------
// Este objeto guardará el estado de cada usuario.
// NOTA: Este objeto se reinicia si el servidor se reinicia. Para una solución más permanente, se necesitaría una base de datos.
const userStates = {};


// -------------------
//  3. TEXTOS Y RESPUESTAS DEL BOT
// -------------------

const responses = {
  menu: '¿Cómo puedo ayudarte hoy? 😊 Escribe el número de la opción que deseas. \n\n1️⃣ Valor de la consulta\n2️⃣ Agendar una hora\n3️⃣ Medios de pago\n4️⃣ Información del Médico\n5️⃣ Términos y condiciones\n6️⃣ Dejar un recado al doctor',

  opcion1: '¡Claro! Le comento. El doctor Sebastián es médico general. La atención es Teleconsulta y se realiza por Google Meet. El valor Fonasa es de 30 mil e Isapre 40 mil pesos. Como médico general, en caso de que el paciente requiera reposo, solo puede otorgar 14 días como máximo por consulta y en el caso de receta o receta cheque (extensión máxima de 3 meses por consulta), ésta llega de forma digital al correo del paciente durante la atención.',
  opcion2: '¡Perfecto! Puedes agendar directamente en este enlace. ¡Será un gusto atenderte!\n\n📅 https://agendamiento.reservo.cl/makereserva/agenda/q0OWB6D0d0pBRf6L4Z64esF1k5i9N2',
  opcion3: 'Aceptamos pagos con tarjetas de débito y crédito luego de agendar tu hora. 💳\n\n*Importante*: Al realizar el pago, usted acepta nuestros términos y condiciones (consulte la opción 5).',
  opcion4: 'El Dr. Aravena es médico general, egresado de la Universidad de Concepción. Puedes verificar su registro profesional (Nº 763509) aquí: https://rnpi.superdesalud.gob.cl/',
  terminos: '📄 *Términos y Condiciones*\n\nLe informamos sobre nuestras políticas de cancelación y reembolso:\n\n• Si anula su hora con más de 24 horas de anticipación, se le devolverá el 90% del valor pagado.\n• Si anula con menos de 24 horas de anticipación, se le devolverá el 50% del dinero.\n\nAl agendar y pagar su consulta, usted confirma que ha leído y aceptado estos términos.',
  
  // Textos actualizados para el modo "recado" con la nueva lógica.
  recado_inicio: 'Por supuesto. A partir de este momento, el asistente automático se pausará durante 8 horas para que puedas escribir con calma tu mensaje para el Dr. Aravena. No te interrumpiré.\n\nSi deseas reactivarme antes, simplemente escribe la palabra *Myriam*.\n\nEl doctor revisará tu recado a la brevedad.',
  recado_fin: '¡Hola de nuevo! El asistente automático está activo. Si necesitas algo más, escribe "menú" para ver las opciones. 😊',

  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, no dudes en escribir "menú".'
};

responses.bienvenida = `¡Hola! Soy Myriam 👩🏻, la asistente virtual del Dr. Aravena. ${responses.menu}`;
responses.error = `Disculpa, no entendí muy bien tu mensaje. ${responses.menu}`;


// -------------------
//  4. LÓGICA DEL WEBHOOK
// -------------------

app.post('/webhook', (req, res) => {
  const twiml = new MessagingResponse();
  const userId = req.body.From;
  const incomingMsg = (req.body.Body || '').toLowerCase().trim();
  const userState = userStates[userId];

  // ---- LÓGICA DE MODO "RECADO" ----
  if (userState && userState.mode === 'recado') {
    const eightHours = 8 * 60 * 60 * 1000;
    const timeElapsed = Date.now() - userState.timestamp;

    // Condición para reactivar el bot: si el usuario escribe "myriam" O si ya pasaron las 8 horas.
    if (incomingMsg === 'myriam' || timeElapsed >= eightHours) {
      delete userStates[userId]; // Limpiamos el estado del usuario.
      twiml.message(responses.recado_fin);
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml.toString());
    } else {
      // Si no se cumple la condición de reactivación, el bot se mantiene en silencio.
      // Registramos el mensaje en la consola para que el doctor lo pueda leer.
      console.log(`--- RECADO PARA EL DOCTOR (de ${userId}) ---`);
      console.log(`Mensaje: ${req.body.Body}`); // Guardamos el mensaje original.
      console.log(`------------------------------------------`);
      
      // Enviamos una respuesta vacía para que Twilio no le conteste al usuario.
      return res.send('<Response/>');
    }
  }

  // ---- LÓGICA DE MENÚ ESTÁNDAR ----
  let messageToSend;
  switch (incomingMsg) {
    case '1': messageToSend = responses.opcion1; break;
    case '2': messageToSend = responses.opcion2; break;
    case '3': messageToSend = responses.opcion3; break;
    case '4': messageToSend = responses.opcion4; break;
    case '5': messageToSend = responses.terminos; break;
    
    case '6':
      // Ponemos al usuario en modo "recado" y guardamos la hora de inicio.
      userStates[userId] = { mode: 'recado', timestamp: Date.now() };
      messageToSend = responses.recado_inicio;
      break;
      
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
//  5. INICIAR EL SERVIDOR
// -------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El bot de Myriam está funcionando en el puerto ${PORT}`);
});