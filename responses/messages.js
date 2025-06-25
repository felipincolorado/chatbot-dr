// responses/messages.js

const menuBase = 'Para comenzar, cuéntame qué necesitas escribiendo el número de una de las opciones:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano';

module.exports = {
  bienvenida: `¡Hola! Soy *Myriam Luz* 👩🏻✨, la asistente virtual del *Dr. Sebastián Aravena*. Estoy aquí para ayudarte con tu teleconsulta.\n\n${menuBase}`,

  menu: menuBase,

  menuConHeader: `👩🏻✨ Aquí tienes las opciones de nuevo:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano`,

  opcion1: `¡Claro! La teleconsulta es realizada por el *Dr. Sebastián Aravena, Médico Cirujano titulado en la U. de Concepción* (Reg. 763509). Está enfocada en medicina general para adultos y puede incluir, según evaluación clínica:\n\n• 🩺 *Recetas Médicas*: Simples, retenidas o cheques, con duración de 1 a 3 meses para tratamientos crónicos o agudos.\n• 📄 *Licencias Médicas*: Emitidas hasta 14 días si el diagnóstico lo justifica, conforme a la normativa vigente.\n• 🧪 *Órdenes de Exámenes* y *Certificados Médicos*.\n\nSi esto se ajusta a lo que necesitas, puedes presionar *2* para agendar tu hora, o *0* para volver al menú principal.`,

  opcion2: `¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta de forma segura en el sitio web oficial.\n\n💻 Ingresa aquí para agendar: https://www.drsebastianaravena.cl\n\n🔐 El pago se realiza en la misma plataforma usando tarjetas de débito o crédito a través de Webpay.\n\nSi tienes otra duda, presiona *0* para ver todas las opciones.`,

  opcion3: `Por supuesto. Aquí están los valores y formas de pago:\n\n💰 *Valor de la Teleconsulta:*\n• Fonasa: *$30.000*\n• Isapre o Particular: *$40.000*\n\n💳 *Formas de pago aceptadas:* Solo tarjetas mediante Webpay, al momento de agendar en la plataforma.\n\n📌 Al pagar, aceptas los *Términos y Condiciones* del servicio (incluye políticas de anulación y reprogramación).\n\nPresiona *2* para agendar una hora o *0* para volver al menú principal.`,

  opcion4: `¡Entendido! Puedes hablar directamente con el Dr. Aravena o su asistente a través del siguiente canal de mensajería:\n\n👇 *Haz clic aquí para chatear* 👇\nhttps://wa.me/56926125661\n*(Se abrirá directamente en WhatsApp)*\n\n---\n\nℹ️ *Información importante:*\nEste canal es ideal para dudas específicas, situaciones administrativas (como licencias rechazadas), o ayuda técnica con la plataforma.\n\n⚠️ *Solo se reciben mensajes de texto.* Las consultas médicas deben realizarse exclusivamente en la teleconsulta previamente agendada.`,

  timeout: `⏰ Parece que no has respondido en un buen rato.\n\nNo te preocupes, estaré aquí si me necesitas más adelante. Solo escríbeme de nuevo cuando quieras continuar. ¡Que tengas un excelente día! ✨`,

  gracias: `¡De nada! 😊 Estoy para ayudarte en lo que necesites. Si tienes más dudas, puedes volver al menú escribiendo *0*.`,

  error: `Disculpa, no logré entender tu mensaje. 🙈\n\nRecuerda que solo debes escribir el *número* de la opción que necesitas.\n\n${menuBase}`
};
