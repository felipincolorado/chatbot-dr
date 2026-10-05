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

test('bienvenida identifica asistente virtual y muestra el menú', async () => {
  const bot = createBot(config);
  const r = await bot.handleMessage(newSession(), 'Hola');
  assert.match(r.text, /Soy el asistente virtual del Dr\. Sebastián Aravena \(respuestas automáticas\)/);
  assert.match(r.text, /No entrego diagnósticos ni indicaciones médicas/);
  // Precio y modalidad ya en el primer mensaje (quien llega por un anuncio pregunta eso primero).
  assert.match(r.text, /videollamada/);
  assert.match(r.text, /Fonasa\/Dipreca \$35\.000 · Isapre \$45\.000/);
  for (const opt of ['1. Agendar hora', '2. Valores y previsión', '3. Cómo funciona la consulta', '4. Licencias médicas', '5. Ya agendé / soy paciente', '0. Volver al menú']) {
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
  assert.ok(r.text.includes('1. Agendar hora'));
  assert.doesNotMatch(r.text, /^No entendí/);
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
  assert.ok(r.text.includes('1. Agendar hora'));
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

test('pedir una persona no entrega el enlace humano sin pasar por "ya soy paciente"', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'quiero hablar con una persona');
  assert.equal(r.intent, 'humano');
  assert.doesNotMatch(r.text, /wa\.me/);
  assert.match(r.text, /responde 5/);
});

test('bienvenida muestra el registro de la Superintendencia solo si está configurado', async () => {
  const sin = await createBot(config).handleMessage(newSession(), 'hola');
  assert.doesNotMatch(sin.text, /Superintendencia/);
  const con = await createBot(testConfig({ DOCTOR_RNPI: '763509' })).handleMessage(newSession(), 'hola');
  assert.match(con.text, /Registro Superintendencia de Salud N° 763509/);
});
