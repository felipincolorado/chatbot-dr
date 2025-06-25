// responses/messages.js

const menuBase =
  'Para comenzar, cuéntame qué necesitas escribiendo el número de una de las opciones:\n\n' +
  '1️⃣ ¿Qué contempla la Teleconsulta?\n' +
  '2️⃣ Agendar una hora\n' +
  '3️⃣ Valores y Métodos de Pago\n' +
  '4️⃣ Hablar directamente con el doctor o su asistente\n\n' +
  '*Espero tu mensaje para continuar.*';

module.exports = {
  bienvenida:
    `¡Hola! Soy *Myriam Luz* 👩🏻✨, la asistente virtual del *Dr. Sebastián Aravena*. Estoy aquí para ayudarte con tu teleconsulta.\n\n${menuBase}`,

  menu: menuBase,

  menuConHeader:
    `👩🏻✨ Aquí tienes las opciones nuevamente:\n\n` +
    '1️⃣ ¿Qué contempla la Teleconsulta?\n' +
    '2️⃣ Agendar una hora\n' +
    '3️⃣ Valores y Métodos de Pago\n' +
    '4️⃣ Hablar directamente con el doctor o su asistente\n\n' +
    '*Espero tu mensaje para continuar.*',

  opcion1:
    `¡Claro! La teleconsulta es realizada por el *Dr. Sebastián Aravena, Médico Cirujano titulado en la U. de Concepción* (Reg. 763509). Está enfocada en medicina general para adultos y puede incluir, según evaluación clínica:\n\n` +
    `📝 *Recetas Médicas*: simples, retenidas o cheques, con duración de 1 a 3 meses.\n` +
    `📆 *Licencia Médica*: hasta 14 días, si corresponde.\n` +
    `📄 *Órdenes de Exámenes* y certificados médicos.\n\n` +
    `Si esto se ajusta a lo que necesitas, puedes presionar *2* para agendar, o *0* para volver al menú.`,

  opcion2:
    `¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta en el sitio web oficial:\n\n` +
    `💻 https://www.drsebastianaravena.cl\n\n` +
    `🔐 El pago se realiza en la misma plataforma con tarjeta, vía Webpay.\n\n` +
    `Si tienes otra duda, presiona *0* para volver al menú.`,

  opcion3:
    `Por supuesto. Aquí tienes la información:\n\n` +
    `💰 *Valor Teleconsulta:*\n` +
    `• Fonasa: *$30.000*\n` +
    `• Isapre o Particular: *$40.000*\n\n` +
    `💳 *Forma de pago:* Solo tarjetas mediante Webpay, al momento de agendar en el sitio web.\n\n` +
    `📌 Al pagar, aceptas los *Términos y Condiciones* presentes al momento de agendar (incluye políticas de reprogramación y anulación).\n\n` +
    `Presiona *2* para agendar, o *0* para volver al menú.`,

  // Opción 4 dividida en dos partes
  opcion4_parte1:
    `Puedes hablar directamente con el Dr. Aravena o su asistente a través de WhatsApp:\n\n` +
    `📲 https://wa.me/56926125661`,

  opcion4_parte2:
    `ℹ️ Este canal es ideal para dudas específicas, temas administrativos (como licencias rechazadas) o inconvenientes técnicos.\n\n` +
    `⚠️ *Solo se reciben mensajes de texto.* Las consultas médicas deben hacerse exclusivamente mediante teleconsulta agendada.`,

  timeout:
    `⏰ Parece que no has respondido en un rato.\n\nNo te preocupes, estaré aquí si me necesitas más adelante. Solo escríbeme cuando quieras continuar. ¡Que tengas un excelente día! ✨`,

  gracias:
    `¡De nada! 😊 Estoy para ayudarte en lo que necesites. Si tienes más dudas, puedes volver al menú escribiendo *0*.`,

  error:
    `Disculpa, no logré entender tu mensaje. 🙋🏻‍♀\n\nRecuerda que solo debes escribir el *número* de la opción que necesitas.\n\n${menuBase}`
};
