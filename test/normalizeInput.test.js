const test = require('node:test');
const assert = require('node:assert/strict');
const { detectIntent } = require('../src/normalizeInput');

test('saludos', () => {
  for (const t of ['Hola', 'hola!!', 'Buenas tardes', 'buenos días', 'Holaa', 'Quiero información']) {
    assert.equal(detectIntent(t), 'saludo', t);
  }
});

test('números y palabras del menú', () => {
  assert.equal(detectIntent('1'), 'agendar');
  assert.equal(detectIntent(' 2 '), 'valores');
  assert.equal(detectIntent('tres'), 'como_funciona');
  assert.equal(detectIntent('4'), 'licencias');
  assert.equal(detectIntent('5'), 'paciente');
  assert.equal(detectIntent('0'), 'menu');
  assert.equal(detectIntent('menú'), 'menu');
});

test('intenciones por palabras clave', () => {
  assert.equal(detectIntent('hola, quiero agendar una hora'), 'agendar');
  assert.equal(detectIntent('¿Cuánto cuesta con Fonasa?'), 'valores');
  assert.equal(detectIntent('la consulta es online?'), 'como_funciona');
  assert.equal(detectIntent('necesito licencia'), 'licencias');
  assert.equal(detectIntent('dan receta?'), 'documentos');
  assert.equal(detectIntent('quiero reprogramar'), 'paciente');
  assert.equal(detectIntent('tengo un problema con mi reserva'), 'paciente');
  assert.equal(detectIntent('muchas gracias'), 'gracias');
  assert.equal(detectIntent('quiero hablar con una persona'), 'humano');
});

test('"ahora" no se confunde con "hora"', () => {
  assert.equal(detectIntent('ahora no puedo'), null);
});

test('seguridad: crisis, urgencia y contenido clínico', () => {
  assert.equal(detectIntent('pienso en el suicidio'), 'crisis');
  assert.equal(detectIntent('es urgente'), 'urgencia');
  assert.equal(detectIntent('qué medicamento tomo para el dolor'), 'clinico');
});

test('texto vacío o sin sentido', () => {
  assert.equal(detectIntent(''), null);
  assert.equal(detectIntent('asdkjh'), null);
});
