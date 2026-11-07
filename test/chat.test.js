const test = require('node:test');
const assert = require('node:assert/strict');
const { createAi } = require('../src/ai');
const { createBot } = require('../src/bot');
const { checkReply } = require('../src/knowledge');
const { testConfig } = require('./helpers');

const config = testConfig({ AI_ENABLED: 'true', AI_MODE: 'chat' });
const old = () => ({ isNew: false, state: 'MENU' });
const quiet = (fn) => async () => {
  const w = console.warn;
  console.warn = () => {};
  try { await fn(); } finally { console.warn = w; }
};

function chatBot(reply, calls = []) {
  const ai = createAi(config.ai, {
    classifier: async () => 'none',
    chatter: async (system, messages) => {
      calls.push({ system, messages });
      return typeof reply === 'function' ? reply(messages) : reply;
    },
  });
  return createBot(config, { ai });
}

test('modo chat: pregunta libre la responde Claude con botones y guarda historial', async () => {
  const calls = [];
  const session = old();
  const bot = chatBot('Sí, por videollamada el doctor puede evaluar si corresponde una licencia. Reserva aquí: https://drsebastianaravena.cl/agendar/', calls);
  const r = await bot.handleMessage(session, '¿atienden por estrés del trabajo y cuánto cuesta con isapre?');
  assert.equal(r.intent, 'ai:chat');
  assert.match(r.text, /Agendar hora|agendar hora/);
  assert.equal(session.history.length, 2);
  assert.match(calls[0].system, /763509/);
  assert.match(calls[0].system, /Nunca aseguras un resultado/);
});

test('modo chat: botones, números y mensajes cortos con intención usan respuesta fija', async () => {
  const calls = [];
  const bot = chatBot('no debería usarse', calls);
  for (const t of ['1', '5', 'Valores y previsión', 'agendar hora', 'ya soy paciente', 'menú principal']) {
    const r = await bot.handleMessage(old(), t);
    assert.notEqual(r.intent, 'ai:chat', t);
  }
  assert.equal(calls.length, 0);
});

test('modo chat: crisis, urgencias y síntomas nunca van a Claude', async () => {
  const calls = [];
  const bot = chatBot('no debería usarse', calls);
  const cases = [
    'ya no quiero vivir, no sé qué hacer con todo esto',
    'es urgente, me duele mucho el pecho y no puedo respirar bien',
    'tengo dolor de espalda hace una semana y soy diabético, qué hago',
  ];
  for (const t of cases) await bot.handleMessage(old(), t);
  assert.equal(calls.length, 0);
});

test('modo chat: si Claude promete algo, se descarta y sale la respuesta fija', quiet(async () => {
  const bot = chatBot('Tranquila, el doctor te va a dar la licencia por 30 días de licencia sin problema.');
  const r = await bot.handleMessage(old(), 'me pueden dar una licencia por estrés laboral de un mes completo');
  assert.equal(r.intent, 'licencias');
  assert.match(r.text, /sujeta a evaluación/);
}));

test('modo chat: si Claude falla o no responde, el bot sigue funcionando', quiet(async () => {
  const ai = createAi(config.ai, { classifier: async () => 'none', chatter: async () => { throw new Error('boom'); } });
  const r = await createBot(config, { ai }).handleMessage(old(), 'puedo pagar con transferencia o solo con tarjeta de crédito');
  assert.equal(r.intent, 'no_entendido');
  assert.match(r.text, /drsebastianaravena\.cl\/agendar/);
}));

test('modo chat: primer mensaje lleva el aviso de secretaria virtual', async () => {
  const bot = chatBot('Con gusto. Atiende mayores de 18 por videollamada.');
  const r = await bot.handleMessage({ isNew: true, state: 'MENU' }, 'hola, atienden a personas de regiones o solo santiago?');
  assert.equal(r.intent, 'ai:chat');
  assert.match(r.text, /Secretaria virtual del doctor/);
});

test('modo chat: el RUT y el teléfono no se envían a Claude', async () => {
  const calls = [];
  const bot = chatBot('Gracias, te cuento cómo funciona.', calls);
  await bot.handleMessage(old(), 'mi rut es 12.345.678-5 y mi fono +56 9 1234 5678, quiero saber cómo funciona todo');
  const sent = calls[0].messages.at(-1).content;
  assert.doesNotMatch(sent, /12\.345\.678|1234 5678/);
});

test('revisión automática: aprueba lo correcto y rechaza promesas, remedios, enlaces y precios inventados', () => {
  assert.equal(checkReply('El valor con Isapre es $45.000 y con Fonasa $35.000. Reserva en https://drsebastianaravena.cl/agendar/'), null);
  assert.equal(checkReply('Eso lo define el doctor al evaluarte.'), null);
  assert.equal(checkReply('Te garantizo la licencia.'), 'promesa');
  assert.equal(checkReply('Te dará reposo sin problema.'), 'promesa');
  assert.equal(checkReply('Normalmente son 7 días de licencia.'), 'dias_licencia');
  assert.equal(checkReply('Puedes tomar paracetamol mientras.'), 'medicamento');
  assert.equal(checkReply('Mira https://otra-clinica.cl'), 'enlace');
  assert.equal(checkReply('Hoy está a $25.000.'), 'precio');
  assert.equal(checkReply('x'.repeat(1000)), 'larga');
});

test('modo chat: tras 15 respuestas de Claude en una conversación, sigue con respuestas fijas', async () => {
  const calls = [];
  const bot = chatBot('Con gusto te cuento.', calls);
  const session = old();
  for (let i = 0; i < 20; i += 1) await bot.handleMessage(session, `pregunta larga número ${i} sobre cómo funciona todo esto`);
  assert.equal(calls.length, 15);
});

test('sin AI_MODE=chat se mantiene el modo clasificador', () => {
  const ai = createAi(testConfig({ AI_ENABLED: 'true' }).ai, { classifier: async () => 'valores' });
  assert.equal(ai.mode, 'classify');
});
