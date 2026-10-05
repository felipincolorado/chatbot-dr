// src/interactive.js
// Mensajes interactivos de WhatsApp (lista desplegable y botones) mediante
// plantillas de contenido de Twilio. Las plantillas se crean solas al arrancar
// a partir de los textos del código; si el contenido cambia, se crea una
// versión nueva (el nombre incluye un hash). Son mensajes dentro de la sesión
// de 24 h que abre el paciente: no requieren aprobación de Meta ni tienen
// costo adicional por sobre un mensaje normal.
//
// Si algo falla (credenciales, red, Twilio), el webhook responde con el texto
// de siempre: los botones nunca son imprescindibles.

const crypto = require('crypto');
const { MENU_OPTIONS, NAV, MOTIVE_ITEMS } = require('./messages');

const PREFIX = 'drbot';

function hash(obj) {
  return crypto.createHash('sha1').update(JSON.stringify(obj)).digest('hex').slice(0, 8);
}

// Valores de ejemplo solo para las variables que usa el cuerpo ({{1}}, {{2}}).
function sampleVariables(types) {
  const body = Object.values(types)[0].body;
  const ids = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]))];
  return Object.fromEntries(ids.map((id) => [id, 'Texto de ejemplo']));
}

// Definiciones de plantillas. Los cuerpos variables nunca empiezan ni terminan
// con una variable (regla de WhatsApp).
function templateDefinitions() {
  const menuItems = MENU_OPTIONS.map((o) => ({ id: o.id, item: o.item, description: o.description }));
  const motiveItems = MOTIVE_ITEMS.map((m) => ({ ...m }));
  motiveItems.push({ id: '0', item: 'Volver al menú', description: 'Ver todas las opciones' });

  const defs = {
    menu: {
      'twilio/list-picker': { body: '*{{1}}*\n\n{{2}}\n\nToca "Ver opciones" para elegir.', button: 'Ver opciones', items: menuItems },
    },
    motives: {
      'twilio/list-picker': { body: 'Gracias, {{1}}. ¿Cuál es el motivo de tu consulta?', button: 'Elegir motivo', items: motiveItems },
    },
  };
  for (const [key, actions] of Object.entries(NAV)) {
    defs[`nav_${key}`] = {
      'twilio/quick-reply': {
        body: '*{{1}}*\n\n{{2}}\n\nElige una opción:',
        actions: actions.map(([id, title]) => ({ id, title })),
      },
    };
  }
  return Object.fromEntries(
    Object.entries(defs).map(([key, types]) => [key, { friendlyName: `${PREFIX}_${key}_${hash(types)}`, types }])
  );
}

function createInteractive(client, { logger = console } = {}) {
  const defs = templateDefinitions();
  const sids = {};
  let ready = false;

  async function ensureTemplates() {
    const existing = await client.content.v1.contents.list({ pageSize: 200 });
    const byName = new Map(existing.map((c) => [c.friendlyName, c.sid]));
    for (const [key, def] of Object.entries(defs)) {
      if (byName.has(def.friendlyName)) {
        sids[key] = byName.get(def.friendlyName);
        continue;
      }
      // El SDK envía este objeto tal cual como JSON: la API espera snake_case.
      const created = await client.content.v1.contents.create({
        friendly_name: def.friendlyName,
        language: 'es',
        variables: sampleVariables(def.types),
        types: def.types,
      });
      sids[key] = created.sid;
    }
    ready = true;
    logger.info(`[interactive] plantillas listas (${Object.keys(sids).length})`);
  }

  // Sección del bot -> { contentSid, contentVariables } o null si no aplica.
  function contentFor(ui) {
    if (!ready || !ui) return null;
    if (ui.kind === 'menu') {
      const body = ui.note ? `${ui.body}\n\n_${ui.note}_` : ui.body;
      return { sid: sids.menu, vars: { 1: ui.title, 2: body } };
    }
    if (ui.kind === 'motives') return { sid: sids.motives, vars: { 1: ui.firstName } };
    const navKey = Object.keys(NAV).find((k) => NAV[k] === ui.nav);
    if (navKey && ui.title && ui.body) return { sid: sids[`nav_${navKey}`], vars: { 1: ui.title, 2: ui.body } };
    return null;
  }

  // Envía la sección como mensaje interactivo. Devuelve true si se envió.
  async function send({ from, to, ui }) {
    const content = contentFor(ui);
    if (!content || !content.sid) return false;
    await client.messages.create({
      from,
      to,
      contentSid: content.sid,
      contentVariables: JSON.stringify(content.vars),
    });
    return true;
  }

  return {
    init: () =>
      ensureTemplates().catch((err) => {
        logger.warn(`[interactive] no disponible, se usará texto: ${err && err.status ? `HTTP ${err.status}` : err && err.message}`);
      }),
    isReady: () => ready,
    contentFor,
    send,
  };
}

module.exports = { createInteractive, templateDefinitions };
