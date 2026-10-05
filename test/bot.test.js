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
  for (const opt of ['1. Agendar consulta online', '2. Valores y previsión', '3. Cómo funciona la consulta', '4. Información sobre licencias', '5. Ya agendé / soy paciente', '0. Volver al menú']) {
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

function linkText(text) {
  const link = text.match(/https:\/\/wa\.me\/\S+/)[0];
  assert.ok(link.startsWith('https://wa.me/56926125661?text='));
  return decodeURIComponent(link.split('?text=')[1]);
}

test('flujo "Ya agendé": pide nombre, luego motivo, y genera enlace con mensaje armado', async () => {
  const bot = createBot(config);
  const s = oldSession();
  const r1 = await bot.handleMessage(s, '5');
  assert.equal(s.state, 'SUPPORT_NAME');
  assert.match(r1.text, /nombre y apellido/);
  assert.doesNotMatch(r1.text, /envía tu rut|ingresa tu rut/i);

  // Un RUT o texto con números no se acepta como nombre.
  const r2 = await bot.handleMessage(s, '12.345.678-9');
  assert.equal(r2.intent, 'nombre_invalido');
  assert.equal(s.state, 'SUPPORT_NAME');

  const r3 = await bot.handleMessage(s, 'maría GONZÁLEZ');
  assert.equal(s.state, 'SUPPORT_MOTIVE');
  assert.match(r3.text, /Gracias, María/);
  for (const opt of ['Problema con mi reserva', 'Reprogramar o reembolso', 'Licencia rechazada', 'Problema posterior a la consulta', 'Otro']) {
    assert.ok(r3.text.includes(opt), opt);
  }

  // Texto libre en el paso de motivo no se acepta ni se reenvía.
  const r4 = await bot.handleMessage(s, 'mi rut es 12.345.678-9');
  assert.equal(r4.intent, 'motivo_invalido');
  assert.equal(s.state, 'SUPPORT_MOTIVE');

  const r5 = await bot.handleMessage(s, '2');
  assert.equal(r5.intent, 'derivacion');
  assert.equal(s.state, 'MENU');
  assert.equal(linkText(r5.text), 'Hola, soy María González.\nMotivo: Reprogramar o reembolso');
});

test('motivo "Otro" pide una frase y la limpia de RUT, correos y teléfonos', async () => {
  const bot = createBot(config);
  const s = oldSession();
  await bot.handleMessage(s, '5');
  await bot.handleMessage(s, 'Juan Pérez');
  const r = await bot.handleMessage(s, '5');
  assert.equal(s.state, 'SUPPORT_DETAIL');
  assert.match(r.text, /frase corta/);
  const done = await bot.handleMessage(s, 'necesito boleta, rut 12.345.678-9 correo a@b.cl fono +56 9 1234 5678');
  assert.equal(done.intent, 'derivacion');
  const decoded = linkText(done.text);
  assert.match(decoded, /^Hola, soy Juan Pérez\.\nMotivo: Otro\nDetalle: necesito boleta/);
  assert.doesNotMatch(decoded, /\d{6,}|@|12\.345/);
});

test('cada motivo numerado genera el enlace con nombre y motivo', async () => {
  for (const n of ['1', '2', '3', '4']) {
    const bot = createBot(config);
    const s = oldSession();
    await bot.handleMessage(s, '5');
    await bot.handleMessage(s, 'Ana Rojas');
    const r = await bot.handleMessage(s, n);
    assert.match(linkText(r.text), /^Hola, soy Ana Rojas\.\nMotivo: [^\d]+$/);
  }
});

test('frases como "ya agendé" entran al flujo de pacientes', async () => {
  const s = oldSession();
  const r = await createBot(config).handleMessage(s, 'ya agendé y tengo una duda');
  assert.equal(r.intent, 'paciente');
  assert.equal(s.state, 'SUPPORT_NAME');
});

test('buildHumanLink usa HUMAN_WHATSAPP_NUMBER', () => {
  const cfg = testConfig({ HUMAN_WHATSAPP_NUMBER: '+56 9 2612 5661' });
  const link = buildHumanLink(cfg, { name: 'Ana Rojas', motive: 'Otro', detail: 'boleta' });
  assert.equal(link, 'https://wa.me/56926125661?text=' + encodeURIComponent('Hola, soy Ana Rojas.\nMotivo: Otro\nDetalle: boleta'));
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

test('pedir una persona no entrega el enlace humano sin pasar por "ya soy paciente"', async () => {
  const r = await createBot(config).handleMessage(oldSession(), 'quiero hablar con una persona');
  assert.equal(r.intent, 'humano');
  assert.doesNotMatch(r.text, /wa\.me/);
  assert.match(r.text, /responde 5/);
});
