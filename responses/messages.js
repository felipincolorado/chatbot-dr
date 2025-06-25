const menu = 'Para comenzar, cuéntame qué necesitas escribiendo el número de una de las opciones:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano';

module.exports = {
  bienvenida: `¡Hola! Soy Myriam Luz 👩🏻✨, la asistente virtual del Dr. Sebastián Aravena. Estoy aquí para ayudarte con tu teleconsulta.\n\n${menu}`,
  menu,
  menuConHeader: '👩🏻✨ Aquí tienes las opciones de nuevo:\n\n1️⃣ ¿Qué contempla la Teleconsulta?\n2️⃣ Agendar una hora\n3️⃣ Valores y Métodos de Pago\n4️⃣ Conversar con un humano',
  opcion1: '¡Claro! La teleconsulta es con el *Dr. Sebastián Aravena, Médico Cirujano de la U. de Concepción* (Reg. 763509)...',
  opcion2: '¡Perfecto! Puedes ver la disponibilidad y agendar tu teleconsulta directamente en el sitio web oficial...\n📅 Haz clic aquí: https://www.drsebastianaravena.cl',
  opcion3: 'Por supuesto. Los valores son:\n• *Fonasa:* $30.000\n• *Isapre/Particular:* $40.000\n\nAceptamos tarjetas vía Webpay.',
  opcion4: '¡Entendido! Puedes hablar directamente con el Dr. Aravena o su asistente en el siguiente enlace:\n👇 https://wa.me/56926125661',
  timeout: 'Veo que no has respondido. Si necesitas algo, solo vuelve a escribirme. ¡Que tengas un excelente día! ✨',
  gracias: '¡De nada! Estoy para ayudarte. Si necesitas algo más, aquí estaré. 😊',
  error: `Disculpa, no entendí tu mensaje. Por favor, recuerda escribir solo el número de la opción que necesitas.\n\n${menu}`
};
