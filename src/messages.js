// src/messages.js
// Textos del asistente. Se construyen a partir de la configuración para no
// repetir URLs ni datos del médico en distintos lugares.
// Estilo: título en negrita, pasos numerados, una acción clara al final y sin
// emojis (tono de consulta médica, no de delivery).

const SUPPORT_MOTIVES = {
  1: 'Problema con mi reserva',
  2: 'Reprogramar o reembolso',
  3: 'Licencia rechazada u observada',
  4: 'Problema posterior a la consulta',
  5: 'Otro',
};
const OTHER_MOTIVE = '5';

const PRICES = { fonasa: '$35.000', isapre: '$45.000' };

function buildHumanLink(config, { name, rut, motive, detail } = {}) {
  // Nombre y RUT (para ubicar la ficha), motivo y una frase opcional. Nunca datos clínicos.
  const lines = [name ? `Hola, soy ${name}.` : 'Hola.'];
  if (rut) lines.push(`RUT: ${rut}`);
  lines.push(`Motivo: ${motive}`);
  if (detail) lines.push(`Detalle: ${detail}`);
  return `https://wa.me/${config.humanWhatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
}

function credentialLine(config) {
  if (!config.doctorRnpi) return '';
  const base = `El ${config.doctorFullName} está inscrito en el Registro Nacional de Prestadores Individuales de la Superintendencia de Salud (RNPI) con el N° ${config.doctorRnpi}.`;
  return config.doctorRnpiUrl ? `${base}\nPuedes verificarlo aquí: ${config.doctorRnpiUrl}` : base;
}

// Pie común: acciones disponibles en una sola línea.
function footer(...options) {
  return options.map(([n, label]) => `*${n}* ${label}`).join('  ·  ');
}

function buildMessages(config) {
  const precios = `Fonasa/Dipreca ${PRICES.fonasa}  ·  Isapre ${PRICES.isapre}`;

  const opciones =
    '1. Agendar una hora\n' +
    '2. Valores y previsión\n' +
    '3. Cómo funciona la consulta\n' +
    '4. Licencias médicas\n' +
    '5. Ya agendé / soy paciente';
  const menu = `${opciones}\n0. Volver al menú`;

  const credential = credentialLine(config);

  // Quién atiende, respaldo y precio primero; el aviso de asistente automático
  // al final, breve y visible.
  const encabezado =
    `Consulta médica online del *${config.doctorFullName}*` +
    (config.doctorTagline ? `\n${config.doctorTagline}` : '') +
    (config.doctorRnpi ? `\nReg. Superintendencia de Salud N° ${config.doctorRnpi}` : '');
  const aviso = 'Asistente automático de agendamiento. No entrega diagnósticos ni indicaciones médicas.';
  const intro = `Hola, te damos la bienvenida a la consulta online del ${config.doctorFullName}. ${aviso}`;

  return {
    menu,
    intro,

    bienvenida:
      `Hola, te damos la bienvenida.\n\n${encabezado}\n\n` +
      `Atención por videollamada\n${precios}\n\n` +
      `¿En qué te podemos ayudar? Responde con un número:\n\n${opciones}\n\n` +
      `_${aviso}_`,

    menuConHeader: `¿En qué te podemos ayudar?\n\n${menu}`,

    agendar:
      '*Agendar una hora*\n\n' +
      `1. Entra a ${config.agendaUrl}\n` +
      '2. Elige el día y horario que te acomode.\n' +
      `3. Paga online: ${precios}.\n` +
      '4. Recibirás en tu correo la confirmación y el enlace de la videollamada.\n\n' +
      '¿Tienes alguna duda antes de reservar? Escríbela aquí.\n\n' +
      footer(['2', 'valores'], ['3', 'cómo funciona'], ['0', 'menú']),

    valores:
      '*Valores de la consulta*\n\n' +
      `Fonasa / Dipreca: ${PRICES.fonasa}\n` +
      `Isapre: ${PRICES.isapre}\n\n` +
      'Precio único por la atención completa. Si el médico lo indica, la receta, el certificado o la licencia están incluidos, sin costo adicional.\n\n' +
      footer(['1', 'agendar'], ['0', 'menú']),

    comoFunciona:
      '*Cómo funciona la consulta*\n\n' +
      `1. *Reserva:* eliges horario y pagas en ${config.agendaUrl}\n` +
      '2. *Confirmación:* te llega un correo con el enlace de la videollamada.\n' +
      '3. *Consulta:* a la hora agendada entras desde tu celular o computador.\n' +
      '4. *Evaluación:* el médico revisa tu caso contigo.\n' +
      '5. *Documentos:* si corresponde, recibes receta, certificado o licencia médica.\n\n' +
      (credential ? `${credential}\n\n` : '') +
      footer(['1', 'agendar'], ['0', 'menú']),

    licencias:
      '*Licencias médicas*\n\n' +
      'La licencia médica está sujeta a evaluación: el médico determina en la consulta si corresponde y por cuántos días, según tu situación de salud. No se venden ni se garantizan.\n\n' +
      'Si tu licencia es rechazada u observada por la Isapre o la COMPIN, puedes solicitar el informe médico para apelar, sin costo adicional.\n\n' +
      footer(['1', 'agendar'], ['5', 'ya soy paciente'], ['0', 'menú']),

    pacienteInicio:
      '*Atención a pacientes*\n\n' +
      'Este canal es para quienes ya agendaron o se atendieron con el doctor.\n\n' +
      'Para derivarte con el equipo, escribe en un solo mensaje tu *nombre, apellido y RUT*.\n' +
      'Ejemplo: María González 12.345.678-5\n\n' +
      footer(['0', 'menú']),

    pacienteIdInvalido: (error) =>
      ({
        sin_rut: 'Me falta tu RUT.',
        rut_invalido: 'El RUT no es válido. Revisa el dígito verificador.',
        sin_nombre: 'Me falta tu nombre y apellido.',
      }[error] || 'No pude leer tus datos.') +
      '\nEscríbelos así: María González 12.345.678-5\n\n' +
      footer(['0', 'menú']),

    pacienteMotivo: (name) =>
      `Gracias, ${name.split(' ')[0]}. ¿Cuál es el motivo de tu consulta?\n\n` +
      Object.entries(SUPPORT_MOTIVES).map(([n, m]) => `${n}. ${m}`).join('\n') +
      '\n0. Volver al menú',

    pacienteDetalle: 'Cuéntanos el motivo en una frase corta (sin RUT ni datos de salud).',

    pacienteDerivacion: (data) =>
      `Listo, ${data.name.split(' ')[0]}.\n\n` +
      'Toca el enlace para escribir al equipo del doctor. El mensaje ya va redactado con tus datos; solo debes enviarlo:\n' +
      `${buildHumanLink(config, data)}\n\n` +
      `WhatsApp oficial de atención a pacientes del ${config.doctorFullName}.`,

    // Sin enlace: el WhatsApp humano es solo para pacientes (opción 5).
    humano:
      '*Contacto con el equipo*\n\n' +
      'El WhatsApp del equipo atiende a pacientes que ya agendaron o se atendieron.\n\n' +
      '• Si ya agendaste, responde *5*.\n' +
      '• Si aún no, resolvemos tus dudas aquí:\n' +
      footer(['1', 'agendar'], ['2', 'valores'], ['3', 'cómo funciona'], ['4', 'licencias']),

    documentos:
      '*Recetas, certificados y licencias*\n\n' +
      'Se emiten solo si el médico determina, durante la evaluación, que corresponden. Están incluidos en el valor de la consulta, sin costo adicional.\n\n' +
      footer(['1', 'agendar'], ['0', 'menú']),

    sobrecupo:
      '*Disponibilidad*\n\n' +
      `Los horarios disponibles son los que aparecen en ${config.agendaUrl}\n\n` +
      'Si ya eres paciente y tienes un caso especial, responde *5* para contactar al equipo.\n\n' +
      footer(['1', 'agendar'], ['0', 'menú']),

    urgencia:
      'Si es una urgencia médica, acude al servicio de urgencia más cercano o llama al SAMU 131.\n\n' +
      'Esta consulta online no atiende urgencias.\n\n' +
      footer(['1', 'agendar una hora programada'], ['0', 'menú']),

    clinico:
      'Por este chat no podemos evaluar síntomas, diagnosticar ni indicar medicamentos. Te pedimos no enviar antecedentes de salud por aquí.\n\n' +
      'El médico lo revisará contigo en la consulta. Si es una urgencia, acude a urgencias o llama al 131.\n\n' +
      footer(['1', 'agendar'], ['0', 'menú']),

    gracias: `Con gusto. Si necesitas algo más, aquí estamos.\n\n${footer(['1', 'agendar'], ['0', 'menú'])}`,

    despedida: `Que estés muy bien. Cuando quieras, escríbenos.\n\n${footer(['1', 'agendar'], ['0', 'menú'])}`,

    noEntendido:
      'No logramos entender tu mensaje. Podemos ayudarte con la agenda, los valores, cómo funciona la consulta, licencias y atención a pacientes.\n\n' +
      `Responde con un número:\n${menu}`,

    sinTexto:
      'Por ahora solo podemos leer mensajes de texto.\n\n' +
      `Responde con un número:\n${menu}`,

    error: `Tuvimos un problema técnico. Inténtalo de nuevo en un momento.\n\n${footer(['0', 'menú'])}`,
  };
}

module.exports = { buildMessages, buildHumanLink, SUPPORT_MOTIVES, OTHER_MOTIVE };
