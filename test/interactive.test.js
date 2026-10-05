const test = require('node:test');
const assert = require('node:assert/strict');
const { createInteractive, templateDefinitions } = require('../src/interactive');
const { createBot } = require('../src/bot');
const { testConfig, startServer, form } = require('./helpers');

const silent = { info() {}, warn() {}, error() {} };

// Cliente Twilio falso: registra plantillas creadas y mensajes enviados.
function fakeClient({ existing = [], failSend = false } = {}) {
  const created = [];
  const sent = [];
  return {
    created,
    sent,
    content: {
      v1: {
        contents: {
          list: async () => existing,
          create: async (params) => {
            created.push(params);
            return { sid: `HX${String(created.length).padStart(32, '0')}`, friendlyName: params.friendly_name };
          },
        },
      },
    },
    messages: {
      create: async (params) => {
        if (failSend) throw Object.assign(new Error('fallo'), { status: 400 });
        sent.push(params);
        return { sid: 'SMfake' };
      },
    },
  };
}

test('plantillas respetan los límites de WhatsApp', () => {
  for (const [key, def] of Object.entries(templateDefinitions())) {
    const [type, spec] = Object.entries(def.types)[0];
    assert.ok(spec.body.length <= 1024, key);
    assert.doesNotMatch(spec.body, /^\{\{|\}\}$/, `${key}: el cuerpo no empieza ni termina con variable`);
    if (type === 'twilio/list-picker') {
      assert.ok(spec.items.length <= 10, key);
      for (const it of spec.items) {
        assert.ok(it.item.length <= 24, `${key}: ${it.item}`);
        assert.ok(it.description.length <= 72, `${key}: ${it.description}`);
      }
    } else {
      assert.ok(spec.actions.length <= 3, key);
      for (const a of spec.actions) assert.ok(a.title.length <= 20, `${key}: ${a.title}`);
    }
  }
});

test('crea solo las plantillas que faltan y reutiliza las existentes', async () => {
  const defs = templateDefinitions();
  const client = fakeClient({ existing: [{ friendlyName: defs.menu.friendlyName, sid: 'HXmenu' }] });
  const ix = createInteractive(client, { logger: silent });
  await ix.init();
  assert.ok(ix.isReady());
  assert.equal(client.created.length, Object.keys(defs).length - 1);
  assert.ok(!client.created.some((c) => c.friendly_name === defs.menu.friendlyName));
  assert.ok(client.created.every((c) => c.friendly_name && c.language === 'es' && c.types));
  const motives = client.created.find((c) => c.friendly_name.startsWith('drbot_motives_'));
  assert.deepEqual(Object.keys(motives.variables), ['1']);
});

test('si Twilio falla al crear plantillas, queda en modo texto', async () => {
  const client = fakeClient();
  client.content.v1.contents.list = async () => {
    throw Object.assign(new Error('no'), { status: 401 });
  };
  const ix = createInteractive(client, { logger: silent });
  await ix.init();
  assert.equal(ix.isReady(), false);
});

test('cada sección del bot se traduce a lista o botones', async () => {
  const ix = createInteractive(fakeClient(), { logger: silent });
  await ix.init();
  const bot = createBot(testConfig({ DOCTOR_RNPI: '763509' }));
  const s = { isNew: false, state: 'MENU' };

  const menu = ix.contentFor((await bot.handleMessage(s, '0')).ui);
  assert.deepEqual(Object.keys(menu.vars), ['1', '2']);
  assert.equal(menu.vars[1], 'Menú principal');

  const agendar = ix.contentFor((await bot.handleMessage(s, '1')).ui);
  assert.equal(agendar.vars[1], 'Agendar una hora');
  assert.match(agendar.vars[2], /drsebastianaravena\.cl\/agendar/);
  assert.doesNotMatch(agendar.vars[2], /\*0\* menú/, 'sin pie de texto: lo reemplazan los botones');

  await bot.handleMessage(s, '5');
  const motives = ix.contentFor((await bot.handleMessage(s, 'Ana Rojas 9.876.543-3')).ui);
  assert.deepEqual(motives.vars, { 1: 'Ana' });

  // El enlace de derivación va como texto simple.
  assert.equal((await bot.handleMessage(s, '1')).ui, null);
});

test('elegir un motivo tocando la lista (llega el título) funciona igual que el número', async () => {
  const bot = createBot(testConfig());
  const s = { isNew: false, state: 'MENU' };
  await bot.handleMessage(s, '5');
  await bot.handleMessage(s, 'Ana Rojas 9.876.543-3');
  const r = await bot.handleMessage(s, 'Licencia rechazada u observada');
  assert.equal(r.intent, 'derivacion');
  assert.match(decodeURIComponent(r.text), /Motivo: Licencia rechazada u observada/);
});

test('webhook con botones: envía por la API y responde TwiML vacío', async () => {
  const client = fakeClient();
  const ix = createInteractive(client, { logger: silent });
  await ix.init();
  const srv = await startServer(testConfig(), { interactive: ix });
  try {
    const xml = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({ From: 'whatsapp:+56911111111', To: 'whatsapp:+56923774755', Body: 'Valores', ButtonPayload: '2', MessageSid: 'SMbtn1' }),
    }).then((r) => r.text());
    assert.doesNotMatch(xml, /<Message>/);
    assert.equal(client.sent.length, 1);
    assert.equal(client.sent[0].from, 'whatsapp:+56923774755');
    assert.equal(client.sent[0].to, 'whatsapp:+56911111111');
    assert.match(client.sent[0].contentVariables, /Valores de la consulta/);
  } finally {
    await srv.close();
  }
});

test('webhook: si el envío con botones falla, responde con texto', async () => {
  const ix = createInteractive(fakeClient({ failSend: true }), { logger: silent });
  await ix.init();
  const srv = await startServer(testConfig(), { interactive: ix });
  try {
    const xml = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form({ From: 'whatsapp:+56922222222', To: 'whatsapp:+56923774755', Body: 'hola', MessageSid: 'SMbtn2' }),
    }).then((r) => r.text());
    assert.match(xml, /<Message>\*Hola, te doy la bienvenida\*/);
  } finally {
    await srv.close();
  }
});

test('motivo elegido con el título corto de la lista', async () => {
  const bot = createBot(testConfig());
  const s = { isNew: false, state: 'MENU' };
  await bot.handleMessage(s, '5');
  await bot.handleMessage(s, 'Ana Rojas 9.876.543-3');
  const r = await bot.handleMessage(s, 'Después de la consulta');
  assert.equal(r.intent, 'derivacion');
  assert.match(decodeURIComponent(r.text), /Motivo: Problema posterior a la consulta/);
});
