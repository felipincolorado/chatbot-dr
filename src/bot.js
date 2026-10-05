// src/bot.js
// Lógica conversacional pura: recibe la sesión y el texto, devuelve el texto de
// respuesta. No conoce Express ni Twilio, por eso se prueba fácilmente.

const { buildMessages, SUPPORT_MOTIVES, OTHER_MOTIVE } = require('./messages');
const { detectIntent, selectedNumber } = require('./normalizeInput');

const MAX_INPUT_CHARS = 1000;

// Nombre y apellido: solo letras, 2 a 5 palabras. Sin números (evita RUT/teléfonos).
function cleanName(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length < 3 || t.length > 60 || !/^[\p{L}' -]+$/u.test(t)) return '';
  const words = t.split(' ').filter((w) => /\p{L}/u.test(w));
  if (words.length < 2 || words.length > 5) return '';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Detalle de "Otro": una frase corta; se quitan RUT, correos y números largos.
function cleanDetail(text) {
  return String(text || '')
    .replace(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-?\s*[\dkK]\b/g, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '')
    .replace(/\+?\d[\d\s-]{5,}\d/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function createBot(config, { ai = null } = {}) {
  const msg = buildMessages(config);

  const RESPONSES = {
    saludo: () => msg.bienvenida,
    menu: () => msg.menuConHeader,
    agendar: () => msg.agendar,
    valores: () => msg.valores,
    como_funciona: () => msg.comoFunciona,
    licencias: () => msg.licencias,
    documentos: () => msg.documentos,
    sobrecupo: () => msg.sobrecupo,
    urgencia: () => msg.urgencia,
    crisis: () => msg.urgencia,
    clinico: () => msg.clinico,
    humano: () => msg.humano,
    gracias: () => msg.gracias,
    despedida: () => msg.despedida,
    paciente: (session) => {
      session.state = 'SUPPORT_NAME';
      session.support = {};
      return msg.pacienteInicio;
    },
  };

  function finishSupport(session) {
    const { name, motive, detail } = session.support;
    session.state = 'MENU';
    session.support = undefined;
    return { intent: 'derivacion', text: msg.pacienteDerivacion({ name, motive, detail }) };
  }

  function handleSupportStep(session, text) {
    if (session.state === 'SUPPORT_NAME') {
      const name = cleanName(text);
      if (!name) return { intent: 'nombre_invalido', text: msg.pacienteNombreInvalido };
      session.support = { name };
      session.state = 'SUPPORT_MOTIVE';
      return { intent: 'paciente_nombre', text: msg.pacienteMotivo(name) };
    }

    if (session.state === 'SUPPORT_MOTIVE') {
      const n = selectedNumber(text);
      if (!n || !SUPPORT_MOTIVES[n]) {
        // No se procesa texto libre aquí (puede traer datos sensibles).
        return { intent: 'motivo_invalido', text: msg.pacienteMotivo(session.support.name) };
      }
      session.support.motive = SUPPORT_MOTIVES[n];
      if (n === OTHER_MOTIVE) {
        session.state = 'SUPPORT_DETAIL';
        return { intent: 'paciente_motivo', text: msg.pacienteDetalle };
      }
      return finishSupport(session);
    }

    // SUPPORT_DETAIL
    const detail = cleanDetail(text);
    if (detail.length < 3) return { intent: 'detalle_invalido', text: msg.pacienteDetalle };
    session.support.detail = detail;
    return finishSupport(session);
  }

  // Intenciones que se responden tal cual aunque sea el primer mensaje.
  const NO_INTRO = new Set(['saludo', 'crisis', 'urgencia']);

  function reply(intent, session, isFirstMessage) {
    const text = RESPONSES[intent](session);
    if (isFirstMessage && !NO_INTRO.has(intent)) {
      return `${msg.intro} No realizo diagnósticos ni indicaciones médicas.\n\n${text}`;
    }
    return text;
  }

  async function handleMessage(session, rawText, { hasMedia = false } = {}) {
    const text = String(rawText || '').slice(0, MAX_INPUT_CHARS).trim();
    const isFirstMessage = Boolean(session.isNew);

    if (!text) {
      session.state = 'MENU';
      return { intent: 'sin_texto', text: hasMedia && !isFirstMessage ? msg.sinTexto : msg.bienvenida };
    }

    // Flujo "Ya agendé / soy paciente": nombre -> motivo -> (detalle si es "Otro") -> enlace.
    if (session.state && session.state.startsWith('SUPPORT_')) {
      const exit = detectIntent(text);
      if (exit === 'menu' || exit === 'crisis' || exit === 'urgencia') {
        session.state = 'MENU';
        session.support = undefined;
        return { intent: exit, text: reply(exit, session, false) };
      }
      return handleSupportStep(session, text);
    }

    const intent = detectIntent(text);
    if (intent) {
      session.state = 'MENU';
      return { intent, text: reply(intent, session, isFirstMessage) };
    }

    if (isFirstMessage) {
      return { intent: 'saludo', text: msg.bienvenida };
    }

    // Capa opcional de IA: solo elige entre respuestas aprobadas.
    if (ai) {
      const topic = await ai.pickTopic(text);
      if (topic && RESPONSES[topic]) {
        return { intent: `ai:${topic}`, text: reply(topic, session, false) };
      }
    }

    return { intent: 'no_entendido', text: msg.noEntendido };
  }

  return { handleMessage, messages: msg };
}

module.exports = { createBot, MAX_INPUT_CHARS };
