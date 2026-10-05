// src/bot.js
// Lógica conversacional pura: recibe la sesión y el texto, devuelve la respuesta
// como texto (`text`) y, si corresponde, como sección para botones (`ui`).
// No conoce Express ni Twilio, por eso se prueba fácilmente.

const { buildMessages, render, SUPPORT_MOTIVES, OTHER_MOTIVE, MOTIVE_ITEMS } = require('./messages');
const { detectIntent, selectedNumber, clean } = require('./normalizeInput');

// Respuesta del bot: texto de respaldo + sección para mensajes interactivos.
function out(intent, section) {
  return { intent, text: render(section), ui: typeof section === 'string' ? null : section };
}

// Motivo elegido por número o tocando la opción de la lista (llega su título).
function motiveFrom(text) {
  const n = selectedNumber(text);
  if (n && SUPPORT_MOTIVES[n]) return n;
  const t = clean(text);
  const hit = Object.entries(SUPPORT_MOTIVES).find(([, m]) => clean(m) === t);
  if (hit) return hit[0];
  const item = MOTIVE_ITEMS.find((m) => clean(m.item) === t);
  return item ? item.id : null;
}

const MAX_INPUT_CHARS = 1000;

// RUT chileno con dígito verificador válido (módulo 11). Devuelve "12345678-9" o ''.
const RUT_RE = /(\d{1,2})\.?(\d{3})\.?(\d{3})\s*-?\s*([\dkK])\b/;
function validRut(body, dv) {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const r = 11 - (sum % 11);
  const expected = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return expected === dv.toUpperCase();
}

// Mensaje con nombre y RUT en cualquier orden ("María González 12.345.678-9").
function parseIdentity(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const m = t.match(RUT_RE);
  if (!m) return { error: 'sin_rut' };
  const body = `${m[1]}${m[2]}${m[3]}`;
  if (!validRut(body, m[4])) return { error: 'rut_invalido' };
  const name = cleanName(t.replace(m[0], ' ').replace(/\b(rut|run)\b|[,:;]/gi, ' '));
  if (!name) return { error: 'sin_nombre' };
  return { name, rut: `${body}-${m[4].toUpperCase()}` };
}

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
      session.state = 'SUPPORT_ID';
      session.support = {};
      return msg.pacienteInicio;
    },
  };

  function finishSupport(session) {
    const data = session.support;
    session.state = 'MENU';
    session.support = undefined;
    return out('derivacion', msg.pacienteDerivacion(data));
  }

  function handleSupportStep(session, text) {
    if (session.state === 'SUPPORT_ID') {
      const id = parseIdentity(text);
      if (id.error) return out(`id_${id.error}`, msg.pacienteIdInvalido(id.error));
      session.support = { name: id.name, rut: id.rut };
      session.state = 'SUPPORT_MOTIVE';
      return out('paciente_id', msg.pacienteMotivo(id.name));
    }

    if (session.state === 'SUPPORT_MOTIVE') {
      const n = motiveFrom(text);
      if (!n) {
        // No se procesa texto libre aquí (puede traer datos sensibles).
        return out('motivo_invalido', msg.pacienteMotivo(session.support.name));
      }
      session.support.motive = SUPPORT_MOTIVES[n];
      if (n === OTHER_MOTIVE) {
        session.state = 'SUPPORT_DETAIL';
        return out('paciente_motivo', msg.pacienteDetalle);
      }
      return finishSupport(session);
    }

    // SUPPORT_DETAIL
    const detail = cleanDetail(text);
    if (detail.length < 3) return out('detalle_invalido', msg.pacienteDetalle);
    session.support.detail = detail;
    return finishSupport(session);
  }

  // Intenciones que se responden tal cual aunque sea el primer mensaje.
  const NO_INTRO = new Set(['saludo', 'crisis', 'urgencia']);

  function reply(intent, session, isFirstMessage) {
    const section = RESPONSES[intent](session);
    if (!isFirstMessage || NO_INTRO.has(intent)) return out(intent, section);
    if (typeof section === 'string') return out(intent, `${msg.intro}\n\n${section}`);
    return out(intent, { ...section, body: `${msg.intro}\n\n${section.body}` });
  }

  async function handleMessage(session, rawText, { hasMedia = false } = {}) {
    const text = String(rawText || '').slice(0, MAX_INPUT_CHARS).trim();
    const isFirstMessage = Boolean(session.isNew);

    if (!text) {
      session.state = 'MENU';
      return out('sin_texto', hasMedia && !isFirstMessage ? msg.sinTexto : msg.bienvenida);
    }

    // Flujo "Ya agendé / soy paciente": nombre -> motivo -> (detalle si es "Otro") -> enlace.
    if (session.state && session.state.startsWith('SUPPORT_')) {
      const exit = detectIntent(text);
      if (exit === 'menu' || exit === 'crisis' || exit === 'urgencia') {
        session.state = 'MENU';
        session.support = undefined;
        return reply(exit, session, false);
      }
      return handleSupportStep(session, text);
    }

    const intent = detectIntent(text);
    if (intent) {
      session.state = 'MENU';
      return reply(intent, session, isFirstMessage);
    }

    if (isFirstMessage) {
      return out('saludo', msg.bienvenida);
    }

    // Capa opcional de IA: solo elige entre respuestas aprobadas.
    if (ai) {
      const topic = await ai.pickTopic(text);
      if (topic && RESPONSES[topic]) {
        return { ...reply(topic, session, false), intent: `ai:${topic}` };
      }
    }

    return out('no_entendido', msg.noEntendido);
  }

  return { handleMessage, messages: msg };
}

module.exports = { createBot, parseIdentity, MAX_INPUT_CHARS };
