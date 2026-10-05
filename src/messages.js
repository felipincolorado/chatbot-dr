// src/messages.js
// Textos del asistente. Se construyen a partir de la configuración para no
// repetir URLs ni datos del médico en distintos lugares.

const SUPPORT_MOTIVES = {
  1: 'Problema con mi reserva',
  2: 'Reprogramación o reembolso',
  3: 'Problema posterior a la consulta',
  4: 'Otro tema',
};

function buildHumanLink(config, motive) {
  // Solo se precarga el motivo general. Nunca RUT, nombre ni datos clínicos.
  const text = `Hola, escribo desde el asistente virtual. Motivo: ${motive}.`;
  return `https://wa.me/${config.humanWhatsappNumber}?text=${encodeURIComponent(text)}`;
}

function credentialLine(config) {
  if (!config.doctorRnpi) return '';
  const base = `${config.doctorFullName} está inscrito en el Registro Nacional de Prestadores Individuales de Salud (RNPI) con el N° ${config.doctorRnpi}.`;
  return config.doctorRnpiUrl ? `${base}\nPuedes verificarlo aquí: ${config.doctorRnpiUrl}` : base;
}

function buildMessages(config) {
  const menu =
    '1. Agendar consulta online\n' +
    '2. Valores y previsión\n' +
    '3. Cómo funciona la consulta\n' +
    '4. Información sobre licencias\n' +
    '5. Ya soy paciente\n' +
    '0. Volver al menú';

  const intro =
    `Hola, soy Miriam, la asistente virtual de agendamiento del ${config.doctorFullName}.`;

  const credential = credentialLine(config);
  const withCredential = (text) => (credential ? `${text}\n\n${credential}` : text);

  return {
    menu,
    intro,

    bienvenida:
      `${intro}\n\n` +
      'Puedo ayudarte con información sobre la consulta y dirigirte al sitio oficial para reservar una hora. ' +
      'No realizo diagnósticos ni indicaciones médicas.\n\n' +
      `¿Qué necesitas?\n\n${menu}`,

    menuConHeader: `¿En qué te ayudo?\n\n${menu}`,

    agendar: withCredential(
      'La consulta es online, por videollamada.\n\n' +
        'Para reservar:\n' +
        '• Elige el horario que te acomode y paga en el sitio oficial.\n' +
        '• Te llegará la confirmación y el enlace de la videollamada a tu correo.\n\n' +
        `Reserva aquí: ${config.agendaUrl}\n\n` +
        '¿Tienes alguna pregunta antes de reservar? Escríbela aquí, o responde 2 (valores), 3 (cómo funciona) o 0 (menú).'
    ),

    valores:
      'Valores de la consulta:\n' +
      '• Fonasa / Dipreca: $35.000\n' +
      '• Isapre: $45.000\n\n' +
      'Es un precio único por la atención completa. Recetas, certificados o licencias se emiten solo si el médico determina que corresponden.\n\n' +
      '¿Revisamos horarios? Responde 1 para agendar o 0 para el menú.',

    comoFunciona: withCredential(
      'Así funciona la consulta:\n' +
        '1) Agendas y pagas en el sitio oficial.\n' +
        '2) Recibes la confirmación por correo.\n' +
        '3) A la hora reservada ingresas a la videollamada con el enlace.\n' +
        '4) El médico realiza la evaluación.\n' +
        '5) Si clínicamente corresponde, se emiten los documentos necesarios.\n\n' +
        'Responde 1 para agendar o 0 para el menú.'
    ),

    licencias:
      'Las licencias médicas no se venden ni se garantizan.\n\n' +
      'Si corresponde una licencia, lo determina el médico durante la evaluación, según tu situación de salud.\n\n' +
      'Si buscas una evaluación, responde 1 para agendar o 0 para el menú.',

    pacienteInicio:
      'Te derivo con nuestro equipo de soporte. ¿Cuál es el motivo general?\n\n' +
      '1. Problema con reserva\n' +
      '2. Reprogramación o reembolso\n' +
      '3. Problema posterior a la consulta\n' +
      '4. Otro\n' +
      '0. Volver al menú\n\n' +
      'No envíes RUT ni datos de salud por este chat.',

    pacienteDerivacion: (motive) =>
      `Listo. Toca este enlace para escribir al equipo de soporte (${motive}):\n` +
      `${buildHumanLink(config, motive)}\n\n` +
      'Es el WhatsApp oficial de soporte del ' + config.doctorFullName + '. ' +
      'El equipo te pedirá los datos necesarios para identificarte.\n\n' +
      '0 para volver al menú.',

    humano:
      'Puedes escribir directamente a nuestro equipo aquí:\n' +
      `${buildHumanLink(config, 'Consulta general')}\n\n` +
      'Si ya eres paciente, responde 5 para indicar el motivo. 0 para el menú.',

    documentos:
      'Recetas, certificados y licencias se emiten solo si el médico determina, durante la evaluación, que corresponden. ' +
      'No tienen un costo adicional al valor de la consulta.\n\n' +
      'Responde 1 para agendar o 0 para el menú.',

    sobrecupo:
      `Los horarios disponibles son los que aparecen en el sitio de agendamiento: ${config.agendaUrl}\n\n` +
      'Si ya eres paciente y tienes un caso especial, responde 5 para hablar con soporte. 0 para el menú.',

    urgencia:
      'Si es una urgencia médica, acude al servicio de urgencia más cercano o llama al SAMU 131.\n\n' +
      'Esta consulta online no atiende urgencias. Para una hora programada responde 1, o 0 para el menú.',


    clinico:
      'Por este chat no puedo evaluar síntomas, diagnosticar ni indicar medicamentos, y te pido no enviar antecedentes de salud aquí.\n\n' +
      'El médico podrá revisarlo contigo en la consulta. Responde 1 para agendar, o 0 para el menú. ' +
      'Si es una urgencia, acude a urgencias o llama al 131.',

    gracias: 'Con gusto. Si necesitas algo más, responde 0 para ver el menú o 1 para agendar.',

    despedida: '¡Que estés bien! Cuando quieras, escribe 0 para ver el menú o 1 para agendar.',

    noEntendido:
      'Puedo ayudarte con la agenda, los valores, cómo funciona la consulta y soporte para pacientes.\n\n' +
      `Elige una opción:\n${menu}`,

    sinTexto:
      'Por ahora solo puedo leer mensajes de texto.\n\n' +
      `Elige una opción:\n${menu}`,

    error: 'Tuve un problema técnico. Responde 0 para ver el menú.',
  };
}

module.exports = { buildMessages, buildHumanLink, SUPPORT_MOTIVES };
