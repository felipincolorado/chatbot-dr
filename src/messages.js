// src/messages.js
// Textos del asistente. Se construyen a partir de la configuración para no
// repetir URLs ni datos del médico en distintos lugares.
//
// Cada respuesta es una "sección": { title, body, nav }. `nav` indica qué
// botones de navegación acompañan la respuesta. Con mensajes interactivos se
// envía como botones de WhatsApp; sin ellos, se renderiza como texto con un
// pie "*1* agendar · *0* menú". Estilo: sobrio, sin emojis (tono de consulta
// médica, no de delivery).

const SUPPORT_MOTIVES = {
  1: 'Problema con mi reserva',
  2: 'Reprogramar o reembolso',
  3: 'Licencia rechazada u observada',
  4: 'Problema posterior a la consulta',
  5: 'Otro',
};
const OTHER_MOTIVE = '5';

// Versión corta de cada motivo para la lista desplegable (título máx. 24).
const MOTIVE_ITEMS = [
  { id: '1', item: 'Problema con reserva', description: 'Pago, horario o confirmación' },
  { id: '2', item: 'Reprogramar o reembolso', description: 'Cambiar la hora o solicitar devolución' },
  { id: '3', item: 'Licencia rechazada', description: 'Rechazada u observada por Isapre o COMPIN' },
  { id: '4', item: 'Después de la consulta', description: 'Receta, certificado u otro documento' },
  { id: '5', item: 'Otro motivo', description: 'Cuéntanos en una frase' },
];

const PRICES = { fonasa: '$35.000', isapre: '$45.000' };

// Opciones del menú principal. `item` (máx. 24) y `description` (máx. 72) se
// usan en la lista desplegable de WhatsApp.
const MENU_OPTIONS = [
  { id: '1', label: 'Agendar una hora', item: 'Agendar una hora', description: 'Reserva y paga online en el sitio oficial' },
  { id: '2', label: 'Valores y previsión', item: 'Valores y previsión', description: `Fonasa/Dipreca ${PRICES.fonasa} · Isapre ${PRICES.isapre}` },
  { id: '3', label: 'Cómo funciona la consulta', item: 'Cómo funciona', description: 'Paso a paso de la atención por videollamada' },
  { id: '4', label: 'Licencias médicas', item: 'Licencias médicas', description: 'Sujetas a evaluación médica' },
  { id: '5', label: 'Ya agendé / soy paciente', item: 'Ya agendé / paciente', description: 'Escribir a atención a pacientes' },
];

// Conjuntos de botones (máx. 3 por mensaje; título máx. 20 caracteres).
const NAV = {
  agendar: [['2', 'Valores'], ['3', 'Cómo funciona'], ['0', 'Menú principal']],
  principal: [['1', 'Agendar hora'], ['0', 'Menú principal']],
  licencias: [['1', 'Agendar hora'], ['5', 'Ya soy paciente'], ['0', 'Menú principal']],
  menu: [['0', 'Menú principal']],
};

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

function footer(nav) {
  return nav.map(([n, label]) => `*${n}* ${label.toLowerCase()}`).join('  ·  ');
}

// Versión en texto de una sección (respaldo cuando no hay botones).
function render(section) {
  if (typeof section === 'string') return section;
  const parts = [];
  if (section.title) parts.push(`*${section.title}*`);
  if (section.body) parts.push(section.body);
  if (section.options) parts.push(`Responde con un número:\n${section.options}`);
  if (section.nav) parts.push(footer(section.nav));
  if (section.note) parts.push(`_${section.note}_`);
  return parts.join('\n\n');
}

function buildMessages(config) {
  const precios = `Fonasa/Dipreca ${PRICES.fonasa}  ·  Isapre ${PRICES.isapre}`;
  const opciones = MENU_OPTIONS.map((o) => `${o.id}. ${o.label}`).join('\n');
  const menu = `${opciones}\n0. Volver al menú`;
  const credential = credentialLine(config);

  // Quién atiende, respaldo y precio primero; el aviso de asistente automático
  // al final, breve y visible.
  const encabezado =
    `Consulta médica online del *${config.doctorFullName}*` +
    (config.doctorTagline ? `\n${config.doctorTagline}` : '') +
    (config.doctorRnpi ? `\nReg. Superintendencia de Salud N° ${config.doctorRnpi}` : '');
  const aviso = 'Secretaria virtual del doctor (respuestas automáticas). No entrega diagnósticos ni indicaciones médicas.';
  const intro = `Hola, te doy la bienvenida a la consulta online del ${config.doctorFullName}. ${aviso}`;

  // Secciones con lista desplegable del menú principal (kind: 'menu').
  const menuSection = (title, body) => ({ kind: 'menu', title, body, options: opciones });

  return {
    menu,
    intro,
    aviso,

    bienvenida: {
      kind: 'menu',
      title: 'Hola, te doy la bienvenida',
      body: `${encabezado}\n\nAtención por videollamada\n${precios}\n\n¿En qué te puedo ayudar?`,
      options: opciones,
      note: aviso,
    },

    menuConHeader: menuSection('Menú principal', '¿En qué te puedo ayudar?'),

    agendar: {
      title: 'Agendar una hora',
      body:
        `1. Entra a ${config.agendaUrl}\n` +
        '2. Elige el día y horario que te acomode.\n' +
        `3. Paga online: ${precios}.\n` +
        '4. Recibirás en tu correo la confirmación y el enlace de la videollamada.\n\n' +
        '¿Tienes alguna duda antes de reservar? Escríbela aquí.',
      nav: NAV.agendar,
    },

    valores: {
      title: 'Valores de la consulta',
      body:
        `Fonasa / Dipreca: ${PRICES.fonasa}\n` +
        `Isapre: ${PRICES.isapre}\n\n` +
        'Precio único por la atención completa. Si el médico lo indica, la receta, el certificado o la licencia están incluidos, sin costo adicional.',
      nav: NAV.principal,
    },

    comoFunciona: {
      title: 'Cómo funciona la consulta',
      body:
        `1. *Reserva:* eliges horario y pagas en ${config.agendaUrl}\n` +
        '2. *Confirmación:* te llega un correo con el enlace de la videollamada.\n' +
        '3. *Consulta:* a la hora agendada entras desde tu celular o computador.\n' +
        '4. *Evaluación:* el médico revisa tu caso contigo.\n' +
        '5. *Documentos:* si corresponde, recibes receta, certificado o licencia médica.' +
        (credential ? `\n\n${credential}` : ''),
      nav: NAV.principal,
    },

    licencias: {
      title: 'Licencias médicas',
      body:
        'Por teleconsulta también se emiten licencias médicas electrónicas, igual que en una consulta presencial.\n\n' +
        'La licencia está sujeta a evaluación: el médico determina en la consulta si corresponde y por cuántos días, según tu situación de salud. No se venden ni se garantizan.\n\n' +
        'Si tu licencia es rechazada u observada por la Isapre o la COMPIN, puedes solicitar el informe médico para apelar, sin costo adicional.',
      nav: NAV.licencias,
    },

    pacienteInicio: {
      title: 'Atención a pacientes',
      body:
        'Este canal es para quienes ya agendaron o se atendieron con el doctor.\n\n' +
        'Para derivarte a atención a pacientes, escribe en un solo mensaje tu *nombre, apellido y RUT*.\n' +
        'Ejemplo: María González 12.345.678-5',
      nav: NAV.menu,
    },

    pacienteIdInvalido: (error) => ({
      title: 'Faltan datos',
      body:
        ({
          sin_rut: 'Me falta tu RUT.',
          rut_invalido: 'El RUT no es válido. Revisa el dígito verificador.',
          sin_nombre: 'Me falta tu nombre y apellido.',
        }[error] || 'No pude leer tus datos.') + '\nEscríbelos así: María González 12.345.678-5',
      nav: NAV.menu,
    }),

    // Lista desplegable de motivos (kind: 'motives').
    pacienteMotivo: (name) => ({
      kind: 'motives',
      firstName: name.split(' ')[0],
      body: `Gracias, ${name.split(' ')[0]}. ¿Cuál es el motivo de tu consulta?`,
      options: Object.entries(SUPPORT_MOTIVES).map(([n, m]) => `${n}. ${m}`).join('\n') + '\n0. Volver al menú',
    }),

    pacienteDetalle: 'Cuéntanos el motivo en una frase corta (sin RUT ni datos de salud).',

    // Texto simple: el enlace se ve mejor sin botones.
    pacienteDerivacion: (data) =>
      `Listo, ${data.name.split(' ')[0]}.\n\n` +
      'Toca el enlace para escribir a atención a pacientes. El mensaje ya va redactado con tus datos; solo debes enviarlo:\n' +
      `${buildHumanLink(config, data)}\n\n` +
      `WhatsApp oficial de atención a pacientes del ${config.doctorFullName}.`,

    // Sin enlace: el WhatsApp humano es solo para pacientes (opción 5).
    humano: {
      title: 'Atención a pacientes',
      body:
        'El WhatsApp de atención a pacientes es para quienes ya agendaron o se atendieron con el doctor.\n\n' +
        '• Si ya agendaste, responde *5* o toca "Ya soy paciente".\n' +
        '• Si aún no, resuelvo tus dudas aquí.',
      nav: NAV.licencias,
    },

    documentos: {
      title: 'Recetas, certificados y licencias',
      body: 'Se emiten solo si el médico determina, durante la evaluación, que corresponden. Están incluidos en el valor de la consulta, sin costo adicional.',
      nav: NAV.principal,
    },

    sobrecupo: {
      title: 'Disponibilidad',
      body:
        `Los horarios disponibles son los que aparecen en ${config.agendaUrl}\n\n` +
        'Si ya eres paciente y tienes un caso especial, responde *5* para escribir a atención a pacientes.',
      nav: NAV.licencias,
    },

    urgencia: {
      title: 'Urgencias',
      body:
        'Si es una urgencia médica, acude al servicio de urgencia más cercano o llama al SAMU 131.\n\n' +
        'Esta consulta online no atiende urgencias.',
      nav: NAV.principal,
    },

    clinico: {
      title: 'Consultas de salud',
      body:
        'Por este chat no puedo evaluar síntomas, diagnosticar ni indicar medicamentos. Te pido no enviar antecedentes de salud por aquí.\n\n' +
        'El médico lo revisará contigo en la consulta. Si es una urgencia, acude a urgencias o llama al 131.',
      nav: NAV.principal,
    },

    gracias: { title: 'Gracias por escribir', body: 'Si necesitas algo más, aquí estoy.', nav: NAV.principal },

    despedida: { title: 'Hasta pronto', body: 'Que estés muy bien. Cuando quieras, escríbenos.', nav: NAV.principal },

    noEntendido: menuSection(
      'No logré entender tu mensaje',
      'Puedo ayudarte con la agenda, los valores, cómo funciona la consulta, licencias y atención a pacientes.'
    ),

    sinTexto: menuSection('Solo mensajes de texto', 'Por ahora solo puedo leer mensajes de texto.'),

    error: 'Tuve un problema técnico. Inténtalo de nuevo en un momento, o escribe 0 para ver el menú.',
  };
}

module.exports = {
  buildMessages,
  buildHumanLink,
  render,
  SUPPORT_MOTIVES,
  OTHER_MOTIVE,
  MOTIVE_ITEMS,
  MENU_OPTIONS,
  NAV,
  PRICES,
};
