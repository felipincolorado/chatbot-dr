const test = require('node:test');
const assert = require('node:assert/strict');
const { createBot } = require('../src/bot');
const { buildHumanLink } = require('../src/messages');
const { testConfig } = require('./helpers');

const config = testConfig();

function newSession() {
  return { isNew: true, state: 'MENU' };
}
function oldSession() {
  return { isNew: false, state: 'MENU' };
}

test('bienvenida identifica asistente virtual y muestra el menú', async () => {
  const bot = createBot(config);
  const r = await bot.handleMessage(newSession(), 'Hola');
  assert.match(r.text, /Miriam, la asistente virtual de agendamiento del Dr\. Sebastián Aravena/);
  assert.match(r.text, /No realizo diagnósticos ni indicaciones médicas/);
  for (const opt of ['1. Agendar consulta online', '2. Valores y previsión', '3. Cómo funciona la consulta', '4. Información sobre licencias', '5. Ya soy paciente', '0. Volver al menú']) {
    assert.ok(r.text.includes(opt), opt);
  }
});

test('opción 1: agendar', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '1');
  assert.match(r.text, /videollamada/);
  assert.match(r.text, /paga en el sitio oficial/);
  assert.match(r.text, /correo/);
  assert.ok(r.text.includes('https://drsebastianaravena.cl/agendar/'));
  assert.match(r.text, /pregunta antes de reservar/);
});

test('opción 2: valores', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '2');
  assert.match(r.text, /Fonasa \/ Dipreca: \$35\.000/);
  assert.match(r.text, /Isapre: \$45\.000/);
  assert.match(r.text, /precio único/i);
  assert.match(r.text, /solo si el médico determina/);
  assert.match(r.text, /Revisamos horarios/);
});

test('opción 3: cómo funciona', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '3');
  assert.match(r.text, /Agendas y pagas/);
  assert.match(r.text, /confirmación/);
  assert.match(r.text, /videollamada/);
  assert.match(r.text, /evaluación/);
  assert.match(r.text, /clínicamente corresponde/);
});

test('opción 4: licencias sin promesas ni plazos', async () => {
  const r = await createBot(config).handleMessage(oldSession(), '4');
  assert.match(r.text, /no se venden ni se garantizan/);
  assert.match(r.text, /durante la evaluación/);
  assert.doesNotMatch(r.text, /\d+\s*d[ií]as/);
});

test('primer mensaje con intención directa agrega presentación', async () => {
  const r = await createBot(config).handleMessage(newSession(), 'cuánto cuesta?');
  assert.match(r.text, /asistente virtual/);
  assert.match(r.text, /\$35\.000/);
});

test('mensaje no comprendido muestra ayuda y menú, no solo "No entendí"', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'xyz qwerty');
  assert.equal(r.intent, 'no_entendido');
  assert.match(r.text, /agenda, los valores, cómo funciona la consulta y soporte/);
  assert.ok(r.text.includes('1. Agendar consulta online'));
  assert.doesNotMatch(r.text, /^No entendí/);
});

test('flujo "Ya soy paciente" sin RUT ni datos clínicos', async () => {
  const bot = createBot(config);
  const s = oldSession();
  const r1 = await bot.handleMessage(s, '5');
  assert.equal(s.state, 'SUPPORT_MOTIVE');
  assert.doesNotMatch(r1.text, /envía tu rut|ingresa tu rut/i);
  for (const opt of ['Problema con reserva', 'Reprogramación o reembolso', 'Problema posterior a la consulta', 'Otro']) {
    assert.ok(r1.text.includes(opt), opt);
  }

  // Texto libre durante el flujo no se acepta ni se reenvía.
  const r2 = await bot.handleMessage(s, 'mi rut es 12.345.678-9');
  assert.equal(s.state, 'SUPPORT_MOTIVE');
  assert.equal(r2.intent, 'motivo_invalido');

  const r3 = await bot.handleMessage(s, '2');
  assert.equal(r3.intent, 'derivacion');
  assert.equal(s.state, 'MENU');
  const link = r3.text.match(/https:\/\/wa\.me\/\S+/)[0];
  assert.ok(link.startsWith('https://wa.me/56926125661?text='));
  const decoded = decodeURIComponent(link.split('?text=')[1]);
  assert.equal(decoded, 'Hola, escribo desde el asistente virtual. Motivo: Reprogramación o reembolso.');
  assert.doesNotMatch(decoded, /\d{6,}|rut/i);
});

test('cada motivo genera un enlace solo con el motivo general', async () => {
  for (const n of ['1', '2', '3', '4']) {
    const bot = createBot(config);
    const s = oldSession();
    await bot.handleMessage(s, '5');
    const r = await bot.handleMessage(s, n);
    const link = r.text.match(/https:\/\/wa\.me\/\S+/)[0];
    const decoded = decodeURIComponent(link.split('?text=')[1]);
    assert.match(decoded, /^Hola, escribo desde el asistente virtual\. Motivo: [^\d]+\.$/);
  }
});

test('buildHumanLink usa HUMAN_WHATSAPP_NUMBER y no incluye datos sensibles', () => {
  const cfg = testConfig({ HUMAN_WHATSAPP_NUMBER: '+56 9 2612 5661' });
  const link = buildHumanLink(cfg, 'Otro tema');
  assert.equal(link, 'https://wa.me/56926125661?text=' + encodeURIComponent('Hola, escribo desde el asistente virtual. Motivo: Otro tema.'));
});

test('0 vuelve al menú desde el flujo de soporte', async () => {
  const bot = createBot(config);
  const s = oldSession();
  await bot.handleMessage(s, '5');
  const r = await bot.handleMessage(s, '0');
  assert.equal(s.state, 'MENU');
  assert.ok(r.text.includes('1. Agendar consulta online'));
});

test('contenido clínico: no diagnostica y pide no enviar antecedentes', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'tengo ansiedad, qué medicamento tomo?');
  assert.equal(r.intent, 'clinico');
  assert.match(r.text, /no puedo evaluar síntomas, diagnosticar ni indicar medicamentos/);
});

test('crisis recibe el mensaje breve de urgencia', async () => {
  const r = await createBot(config).handleMessage(newSession(), 'no quiero vivir');
  assert.match(r.text, /131/);
  assert.doesNotMatch(r.text, /4141/);
});

test('RNPI se omite si no está configurado y se muestra si lo está', async () => {
  const sin = await createBot(config).handleMessage(oldSession(), '1');
  assert.doesNotMatch(sin.text, /RNPI/);
  const cfg = testConfig({ DOCTOR_RNPI: '123456', DOCTOR_RNPI_URL: 'https://rnpi.superdesalud.gob.cl/' });
  const con = await createBot(cfg).handleMessage(oldSession(), '3');
  assert.match(con.text, /RNPI\) con el N° 123456/);
  assert.match(con.text, /https:\/\/rnpi\.superdesalud\.gob\.cl\//);
});

test('AGENDA_URL configurable y sin http inseguro', () => {
  assert.equal(testConfig({ AGENDA_URL: 'http://inseguro.cl' }).agendaUrl, 'https://drsebastianaravena.cl/agendar/');
  assert.equal(testConfig({ AGENDA_URL: 'https://ejemplo.cl/x' }).agendaUrl, 'https://ejemplo.cl/x');
});
