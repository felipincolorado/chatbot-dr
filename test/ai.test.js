const test = require('node:test');
const assert = require('node:assert/strict');
const { createAi, redact } = require('../src/ai');
const { createBot } = require('../src/bot');
const { testConfig } = require('./helpers');

const old = () => ({ isNew: false, state: 'MENU' });

test('AI_ENABLED=false (por defecto): sin IA y el bot responde con el menú', async () => {
  const config = testConfig();
  assert.equal(config.ai.enabled, false);
  assert.equal(createAi(config.ai), null);
  const r = await createBot(config, { ai: null }).handleMessage(old(), 'puedo pagar con transferencia?');
  assert.equal(r.intent, 'no_entendido');
});

test('AI_ENABLED=true sin clave queda desactivada', () => {
  const config = testConfig({ AI_ENABLED: 'true' });
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(createAi(config.ai), null);
  } finally {
    console.warn = origWarn;
  }
});

test('la IA solo puede elegir respuestas aprobadas', async () => {
  const config = testConfig({ AI_ENABLED: 'true' });
  const seen = [];
  const ai = createAi(config.ai, { classifier: async (t) => { seen.push(t); return 'valores'; } });
  const r = await createBot(config, { ai }).handleMessage(old(), 'aceptan pago con débito? mi rut 12.345.678-5 y correo a@b.cl');
  assert.equal(r.intent, 'ai:valores');
  assert.match(r.text, /\$35\.000/);
  assert.doesNotMatch(seen[0], /12\.345\.678|a@b\.cl/);

  const bad = createAi(config.ai, { classifier: async () => 'Tome paracetamol 500mg' });
  const r2 = await createBot(config, { ai: bad }).handleMessage(old(), 'algo raro que no calza');
  assert.equal(r2.intent, 'no_entendido');
});

test('errores o demoras de la IA no rompen el bot', async () => {
  const config = testConfig({ AI_ENABLED: 'true', AI_TIMEOUT_MS: '50' });
  const slow = createAi(config.ai, { classifier: () => new Promise((r) => setTimeout(() => r('valores'), 500)) });
  const r = await createBot(config, { ai: slow }).handleMessage(old(), 'pregunta libre larga');
  assert.equal(r.intent, 'no_entendido');

  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const failing = createAi(config.ai, { classifier: async () => { throw new Error('boom'); } });
    const r2 = await createBot(config, { ai: failing }).handleMessage(old(), 'otra pregunta libre');
    assert.equal(r2.intent, 'no_entendido');
  } finally {
    console.warn = origWarn;
  }
});

test('redact elimina RUT, correos y teléfonos', () => {
  const out = redact('RUT 12.345.678-9, 98765432-k, mail x.y@z.com, fono +56 9 1234 5678');
  assert.doesNotMatch(out, /12\.345|98765432|x\.y@z|1234 5678/);
});
