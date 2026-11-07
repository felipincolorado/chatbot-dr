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
  { id: '4', item: 'Después de la consulta', description: 'Receta, orden de exámenes u otro' },
  { id: '5', item: 'Otro motivo', description: 'Cuéntanos en una frase' },
];

const PRICES = { fonasa: '$35.000', isapre: '$45.000' };

// Horario general de atención (las horas exactas se ven en la agenda).
const HORARIO = 'Lunes a jueves de 18:00 a 19:20, viernes de 17:00 a 18:20 y sábados de 11:00 a 12:20.';

// Enlace a la agenda marcado con UTM para contar en las estadísticas del sitio
// cuántas visitas llegan desde el bot. Respeta parámetros que ya traiga la URL.
function trackedUrl(url) {
  // Enlace limpio y corto en el chat (los UTM se veían como spam).
  return String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function trackedUrlUtm(url) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('utm_source')) {
      u.searchParams.set('utm_source', 'whatsapp');
      u.searchParams.set('utm_medium', 'chatbot');
      u.searchParams.set('utm_campaign', 'bot_agenda');
    }
    return u.toString();
  } catch {
    return url;
  }
}

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
  const agenda = trackedUrl(config.agendaUrl);

  // Quién atiende, respaldo y precio primero; el aviso de asistente automático
  // al final, breve y visible.
  const encabezado =
    `Consulta médica online del *${config.doctorFullName}*` +
    (config.doctorTagline ? `\n${config.doctorTagline}` : '') +
    (config.doctorRnpi ? `\nReg. Superintendencia de Salud N° ${config.doctorRnpi}` : '');
  const aviso = 'Secretaria virtual del doctor (respuestas automáticas). No entrega diagnósticos ni indicaciones médicas.';
  const intro = `Hola, soy la secretaria virtual del ${config.doctorFullName}.`;

  // Secciones con lista desplegable del menú principal (kind: 'menu').
  const menuSection = (title, body) => ({ kind: 'menu', title, body, options: opciones });

  return {
    menu,
    intro,
    aviso,

    // Texto simple (no lista): ocupa todo el ancho y cabe en una pantalla.
    bienvenida:
      `Hola, soy la secretaria virtual del ${config.doctorFullName}.\n\n` +
      `Consulta médica por videollamada:\nFonasa/Dipreca ${PRICES.fonasa} · Isapre ${PRICES.isapre}\n\n` +
      `Agenda aquí: ${agenda}\n\n` +
      '¿Tienes alguna duda? Escríbeme, o responde *0* para ver las opciones.',

    menuConHeader: menuSection('Menú principal', '¿En qué te puedo ayudar?'),

    agendar: {
      title: 'Agendar una hora',
      body:
        `Elige tu hora y paga aquí: ${agenda}\n\n` +
        'Te llega al correo la confirmación y el enlace de la videollamada.',
      nav: NAV.agendar,
    },

    valores: {
      title: 'Valores de la consulta',
      body:
        `Fonasa/Dipreca ${PRICES.fonasa} · Isapre ${PRICES.isapre}\n\n` +
        'Atención particular, sin bono. Si el doctor los indica, receta, exámenes, certificado o licencia van incluidos.',
      nav: NAV.principal,
    },

    comoFunciona: {
      title: 'Cómo funciona la consulta',
      body:
        'Reservas y pagas online, te llega el enlace al correo y a la hora agendada entras por videollamada desde el celular o el computador. Dura 20 minutos.\n\n' +
        'Si corresponde, el doctor emite receta, exámenes, certificado o licencia electrónica.',
      nav: NAV.principal,
    },

    licencias: {
      title: 'Licencias médicas',
      body:
        'Sí, se emiten licencias electrónicas. Cada licencia está sujeta a evaluación: el doctor decide si corresponde.\n\n' +
        'Como médico general, cada licencia es de hasta 14 días, con un máximo de una renovación.',
      nav: NAV.licencias,
    },

    pacienteInicio: {
      title: 'Atención a pacientes',
      body:
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
      'Toca el enlace para escribir a atención a pacientes (responde lunes a viernes de 9:00 a 19:00 y sábados de 9:00 a 13:00). El mensaje ya va redactado con tus datos; solo debes enviarlo:\n' +
      `${buildHumanLink(config, data)}\n\n` +
      `WhatsApp oficial de atención a pacientes del ${config.doctorFullName}.`,

    // Sin enlace: el WhatsApp humano es solo para pacientes (opción 5).
    humano: {
      title: 'Atención a pacientes',
      body:
        'Si ya agendaste o te atendiste, toca "Ya soy paciente". Si aún no, resuelvo tus dudas aquí.',
      nav: NAV.licencias,
    },

    documentos: {
      title: 'Recetas, exámenes, certificados y licencias',
      body: 'Se emiten solo si el médico determina, durante la evaluación, que corresponden. Están incluidos en el valor de la consulta, sin costo adicional.',
      nav: NAV.principal,
    },

    sobrecupo: {
      title: 'Disponibilidad',
      body:
        `*Horario de atención:* ${HORARIO}\n` +
        `Las horas libres se ven en ${agenda}\n\n` +
        'Si ya eres paciente y tienes un caso especial, responde *5* para escribir a atención a pacientes.',
      nav: NAV.licencias,
    },

    urgencia: {
      title: 'Urgencias',
      body:
        'Esta consulta online no atiende urgencias. Acude a la urgencia más cercana o llama al SAMU 131.',
      nav: NAV.principal,
    },

    clinico: {
      title: 'Consultas de salud',
      body:
        'Por aquí no puedo evaluar síntomas ni indicar medicamentos; eso lo revisa el doctor en la consulta.\n\n' +
        `Agenda aquí: ${agenda}\n\n` +
        'Si es una urgencia, llama al SAMU 131.',
      nav: NAV.principal,
    },

    gracias: { title: 'Gracias por escribir', body: 'Si necesitas algo más, aquí estoy.', nav: NAV.principal },

    despedida: { title: 'Hasta pronto', body: 'Que estés muy bien. Cuando quieras, escríbenos.', nav: NAV.principal },

    noEntendido: menuSection(
      'No logré entender tu mensaje',
      `Para agendar: ${agenda}\n\nO elige un tema de la lista.`
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
  trackedUrl,
};
