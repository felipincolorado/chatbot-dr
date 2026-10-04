// src/bot.js
// Lógica conversacional pura: recibe la sesión y el texto, devuelve el texto de
// respuesta. No conoce Express ni Twilio, por eso se prueba fácilmente.

const { buildMessages, SUPPORT_MOTIVES } = require('./messages');
const { detectIntent, selectedNumber } = require('./normalizeInput');

const MAX_INPUT_CHARS = 1000;

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
    crisis: () => msg.crisis,
    clinico: () => msg.clinico,
    humano: () => msg.humano,
    gracias: () => msg.gracias,
    despedida: () => msg.despedida,
    paciente: (session) => {
      session.state = 'SUPPORT_MOTIVE';
      return msg.pacienteInicio;
    },
  };

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

    // Flujo "Ya soy paciente": solo se pregunta el motivo general.
    if (session.state === 'SUPPORT_MOTIVE') {
      const n = selectedNumber(text);
      if (n && SUPPORT_MOTIVES[n]) {
        session.state = 'MENU';
        return { intent: 'derivacion', text: msg.pacienteDerivacion(SUPPORT_MOTIVES[n]) };
      }
      const intent = detectIntent(text);
      if (!intent || intent === 'clinico') {
        // Seguimos esperando el motivo; no se procesa texto libre (puede traer datos sensibles).
        return { intent: 'motivo_invalido', text: msg.pacienteInicio };
      }
      session.state = 'MENU';
      return { intent, text: reply(intent, session, false) };
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
