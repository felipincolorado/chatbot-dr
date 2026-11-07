const test = require('node:test');
const assert = require('node:assert/strict');
const { createBot, parseIdentity } = require('../src/bot');
const { buildHumanLink } = require('../src/messages');
const { testConfig } = require('./helpers');

const config = testConfig();

function newSession() {
  return { isNew: true, state: 'MENU' };
}
function oldSession() {
  return { isNew: false, state: 'MENU' };
}

test('bienvenida corta: secretaria, precios, enlace limpio y cómo ver opciones', async () => {
  const r = await createBot(config).handleMessage(newSession(), 'Hola');
  assert.match(r.text, /^Hola, soy la secretaria virtual del Dr\. Sebastián Aravena\./);
  assert.match(r.text, /videollamada/);
  assert.match(r.text, /Fonasa\/Dipreca \$35\.000 · Isapre \$45\.000/);
  assert.match(r.text, /Agenda aquí: drsebastianaravena\.cl\/agendar\n/);
  assert.doesNotMatch(r.text, /utm_|https?:/);
  assert.match(r.text, /\*0\*/);
  assert.ok(r.text.split('\n').length <= 9, 'cabe en una pantalla');
  assert.doesNotMatch(r.text, /[\u{1F300}-\u{1FAFF}]/u, 'sin emojis');
});

test('opción 1: agendar', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '1');
  assert.match(r.text, /^\*Agendar una hora\*/);
  assert.match(r.text, /drsebastianaravena\.cl\/agendar/);
  assert.match(r.text, /correo/);
});

test('el enlace de la agenda se muestra limpio, sin parámetros de seguimiento', async () => {
  const cfg = testConfig({ AGENDA_URL: 'https://ejemplo.cl/x' });
  const r = await createBot(cfg).handleMessage(oldSession(), '1');
  assert.ok(r.text.includes('ejemplo.cl/x'));
  assert.doesNotMatch(r.text, /utm_/);
});

test('opción 2: valores', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '2');
  assert.match(r.text, /Fonasa\/Dipreca \$35\.000 · Isapre \$45\.000/);
  assert.match(r.text, /sin bono/);
  assert.match(r.text, /\*1\* agendar/);
});

test('opción 3: cómo funciona', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '3');
  assert.match(r.text, /videollamada/);
  assert.match(r.text, /20 minutos/);
  assert.match(r.text, /Si corresponde/);
});

test('opción 4: licencias sujetas a evaluación, con el tope de médico general', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '4');
  assert.match(r.text, /sujeta a evaluación/);
  assert.match(r.text, /hasta 14 días, con un máximo de una renovación/);
  assert.doesNotMatch(r.text, /\b(?!14\b)\d+\s*d[ií]as/);
});

test('primer mensaje con intención directa agrega presentación', async () => {
  const r = await createBot(config).handleMessage(newSession(), 'cuánto cuesta?');
  assert.match(r.text, /secretaria virtual/);
  assert.match(r.text, /\$35\.000/);
});

test('mensaje no comprendido muestra ayuda y menú, no solo "No entendí"', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'xyz qwerty');
  assert.equal(r.intent, 'no_entendido');
  assert.match(r.text, /drsebastianaravena\.cl\/agendar/);
  assert.ok(r.text.includes('1. Agendar una hora'));
  assert.doesNotMatch(r.text, /^No entendí/);
});

test('el saludo de bienvenida ya trae el enlace para agendar', async () => {
  const r = await createBot(config).handleMessage({ isNew: true }, '¡Hola! Quiero más información');
  assert.match(r.text, /Agenda aquí: drsebastianaravena\.cl\/agendar/);
});

test('primer mensaje libre: la IA elige la respuesta y lleva a agendar', async () => {
  const ai = { pickTopic: async () => 'clinico' };
  const r = await createBot(config, { ai }).handleMessage({ isNew: true }, 'necesito que me vea por lo de mi trabajo, ando muy mal');
  assert.equal(r.intent, 'ai:clinico');
  assert.match(r.text, /Agenda aquí: drsebastianaravena\.cl\/agendar/);
  assert.match(r.text, /secretaria virtual/);
});

function linkText(text) {
  const link = text.match(/https:\/\/wa\.me\/\S+/)[0];
  assert.ok(link.startsWith('https://wa.me/56926125661?text='));
  return decodeURIComponent(link.split('?text=')[1]);
}

test('flujo "Ya agendé": pide nombre y RUT en un mensaje, luego motivo, y arma el enlace', async () => {
  const bot = createBot(config);
  const s = oldSession();
  const r1 = await bot.handleMessage(s, '5');
  assert.equal(s.state, 'SUPPORT_ID');
  assert.match(r1.text, /nombre, apellido y RUT/);

  const r2 = await bot.handleMessage(s, 'María González 12.345.678-9');
  assert.equal(r2.intent, 'id_rut_invalido');
  assert.equal(s.state, 'SUPPORT_ID');
  const r2b = await bot.handleMessage(s, '12.345.678-5');
  assert.equal(r2b.intent, 'id_sin_nombre');
  const r2c = await bot.handleMessage(s, 'María González');
  assert.equal(r2c.intent, 'id_sin_rut');

  const r3 = await bot.handleMessage(s, 'maría GONZÁLEZ 12.345.678-5');
  assert.equal(s.state, 'SUPPORT_MOTIVE');
  assert.match(r3.text, /Gracias, María/);
  for (const opt of ['Problema con mi reserva', 'Reprogramar o reembolso', 'Licencia rechazada', 'Problema posterior a la consulta', 'Otro']) {
    assert.ok(r3.text.includes(opt), opt);
  }

  // Texto libre en el paso de motivo no se acepta ni se reenvía.
  const r4 = await bot.handleMessage(s, 'tengo dolor de cabeza');
  assert.equal(r4.intent, 'motivo_invalido');
  assert.equal(s.state, 'SUPPORT_MOTIVE');

  const r5 = await bot.handleMessage(s, '2');
  assert.equal(r5.intent, 'derivacion');
  assert.equal(s.state, 'MENU');
  assert.equal(s.support, undefined);
  assert.equal(linkText(r5.text), 'Hola, soy María González.\nRUT: 12345678-5\nMotivo: Reprogramar o reembolso');
});

test('parseIdentity acepta nombre y RUT en cualquier orden y valida el dígito verificador', () => {
  assert.deepEqual(parseIdentity('12345678-5 juan perez'), { name: 'Juan Perez', rut: '12345678-5' });
  assert.deepEqual(parseIdentity('rut: 9.876.543-3, Ana Rojas'), { name: 'Ana Rojas', rut: '9876543-3' });
  assert.deepEqual(parseIdentity('Ana Rojas 1.111.111-k'), { error: 'rut_invalido' });
});

test('motivo "Otro" pide una frase y la limpia de RUT, correos y teléfonos', async () => {
  const bot = createBot(config);
  const s = oldSession();
  await bot.handleMessage(s, '5');
  await bot.handleMessage(s, 'Juan Pérez 12.345.678-5');
  const r = await bot.handleMessage(s, '5');
  assert.equal(s.state, 'SUPPORT_DETAIL');
  assert.match(r.text, /frase corta/);
  const done = await bot.handleMessage(s, 'necesito boleta, rut 9.876.543-3 correo a@b.cl fono +56 9 1234 5678');
  assert.equal(done.intent, 'derivacion');
  const decoded = linkText(done.text);
  assert.match(decoded, /^Hola, soy Juan Pérez\.\nRUT: 12345678-5\nMotivo: Otro\nDetalle: necesito boleta/);
  assert.doesNotMatch(decoded, /9\.876|9876543|@|1234 5678/);
});

test('cada motivo numerado genera el enlace con nombre, RUT y motivo', async () => {
  for (const n of ['1', '2', '3', '4']) {
    const bot = createBot(config);
    const s = oldSession();
    await bot.handleMessage(s, '5');
    await bot.handleMessage(s, 'Ana Rojas 9.876.543-3');
    const r = await bot.handleMessage(s, n);
    assert.match(linkText(r.text), /^Hola, soy Ana Rojas\.\nRUT: 9876543-3\nMotivo: [^\d]+$/);
  }
});

test('frases como "ya agendé" entran al flujo de pacientes', async () => {
  const s = oldSession();
  const r = await createBot(config).handleMessage(s, 'ya agendé y tengo una duda');
  assert.equal(r.intent, 'paciente');
  assert.equal(s.state, 'SUPPORT_ID');
});

test('buildHumanLink usa HUMAN_WHATSAPP_NUMBER', () => {
  const cfg = testConfig({ HUMAN_WHATSAPP_NUMBER: '+56 9 2612 5661' });
  const link = buildHumanLink(cfg, { name: 'Ana Rojas', rut: '9876543-3', motive: 'Otro', detail: 'boleta' });
  assert.equal(link, 'https://wa.me/56926125661?text=' + encodeURIComponent('Hola, soy Ana Rojas.\nRUT: 9876543-3\nMotivo: Otro\nDetalle: boleta'));
});

test('0 vuelve al menú desde el flujo de soporte', async () => {
  const bot = createBot(config);
  const s = oldSession();
  await bot.handleMessage(s, '5');
  const r = await bot.handleMessage(s, '0');
  assert.equal(s.state, 'MENU');
  assert.ok(r.text.includes('1. Agendar una hora'));
});

test('contenido clínico: no diagnostica ni indica medicamentos', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'tengo ansiedad, qué medicamento tomo?');
  assert.equal(r.intent, 'clinico');
  assert.match(r.text, /no puedo evaluar síntomas ni indicar medicamentos/);
});

test('crisis recibe el mensaje breve de urgencia', async () => {
  const r = await createBot(config).handleMessage(newSession(), 'no quiero vivir');
  assert.match(r.text, /131/);
  assert.doesNotMatch(r.text, /4141/);
});

test('el registro RNPI no se muestra en las respuestas fijas (lo da Claude si preguntan)', async () => {
  const cfg = testConfig({ DOCTOR_RNPI: '123456' });
  for (const t of ['hola', '1', '3']) {
    const r = await createBot(cfg).handleMessage(oldSession(), t);
    assert.doesNotMatch(r.text, /RNPI|Superintendencia/, t);
  }
});

test('AGENDA_URL configurable y sin http inseguro', () => {
  assert.equal(testConfig({ AGENDA_URL: 'http://inseguro.cl' }).agendaUrl, 'https://drsebastianaravena.cl/agendar/');
  assert.equal(testConfig({ AGENDA_URL: 'https://ejemplo.cl/x' }).agendaUrl, 'https://ejemplo.cl/x');
});

test('pedir una persona no entrega el enlace humano sin pasar por "ya soy paciente"', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'quiero hablar con una persona');
  assert.equal(r.intent, 'humano');
  assert.doesNotMatch(r.text, /wa\.me/);
  assert.match(r.text, /Ya soy paciente/);
});


