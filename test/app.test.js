const test = require('node:test');
const assert = require('node:assert/strict');
const twilio = require('twilio');
const { testConfig, startServer, form } = require('./helpers');

const FAKE_TOKEN = 'test_auth_token_not_real';
const FROM = 'whatsapp:+56911111111';
const TO = 'whatsapp:+56922222222';

function msg(body, extra = {}) {
  return { From: FROM, To: TO, Body: body, MessageSid: `SM${Math.random().toString(16).slice(2)}`, NumMedia: '0', ...extra };
}

test('GET /health responde 200 sin secretos', async () => {
  const srv = await startServer(testConfig({ TWILIO_AUTH_TOKEN: FAKE_TOKEN, TWILIO_ACCOUNT_SID: 'ACfake' }));
  try {
    const res = await fetch(`${srv.base}/health`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ['status', 'version']);
    assert.ok(!text.includes(FAKE_TOKEN));
    assert.ok(!text.includes('ACfake'));
  } finally {
    await srv.close();
  }
});

test('webhook sin validación (desarrollo) responde TwiML', async () => {
  const srv = await startServer(testConfig());
  try {
    const res = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(msg('hola')),
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/xml/);
    const xml = await res.text();
    assert.match(xml, /<Response><Message>Hola, soy Miriam/);
  } finally {
    await srv.close();
  }
});

test('webhook con firma válida (producción) responde 200', async () => {
  const config = testConfig({ NODE_ENV: 'production', TWILIO_AUTH_TOKEN: FAKE_TOKEN });
  assert.equal(config.twilio.validateSignature, true);
  const srv = await startServer(config);
  try {
    const params = msg('2');
    // Simula Railway: TLS termina en el proxy y llega X-Forwarded-Proto=https.
    const publicUrl = 'https://bot.example.up.railway.app/webhook';
    const signature = twilio.getExpectedTwilioSignature(FAKE_TOKEN, publicUrl, params);
    const res = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': signature,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'bot.example.up.railway.app',
      },
      body: form(params),
    });
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Isapre/);
  } finally {
    await srv.close();
  }
});

test('webhook con PUBLIC_BASE_URL valida contra esa URL', async () => {
  const config = testConfig({ NODE_ENV: 'production', TWILIO_AUTH_TOKEN: FAKE_TOKEN, PUBLIC_BASE_URL: 'https://bot.example.cl/' });
  const srv = await startServer(config);
  try {
    const params = msg('1');
    const signature = twilio.getExpectedTwilioSignature(FAKE_TOKEN, 'https://bot.example.cl/webhook', params);
    const res = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': signature },
      body: form(params),
    });
    assert.equal(res.status, 200);
  } finally {
    await srv.close();
  }
});

test('webhook con firma inválida o ausente responde 403', async () => {
  const srv = await startServer(testConfig({ NODE_ENV: 'production', TWILIO_AUTH_TOKEN: FAKE_TOKEN }));
  try {
    const params = msg('hola');
    const bad = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': 'invalida', 'x-forwarded-proto': 'https' },
      body: form(params),
    });
    assert.equal(bad.status, 403);
    assert.doesNotMatch(await bad.text(), /Miriam/);

    const missing = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(params),
    });
    assert.equal(missing.status, 403);

    // Firma calculada con otro token
    const forged = twilio.getExpectedTwilioSignature('otro_token', 'https://127.0.0.1/webhook', params);
    const res3 = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': forged, 'x-forwarded-proto': 'https' },
      body: form(params),
    });
    assert.equal(res3.status, 403);
  } finally {
    await srv.close();
  }
});

test('producción sin TWILIO_AUTH_TOKEN rechaza (no procesa sin validar)', async () => {
  const srv = await startServer(testConfig({ NODE_ENV: 'production' }));
  try {
    const res = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(msg('hola')),
    });
    assert.equal(res.status, 500);
  } finally {
    await srv.close();
  }
});

test('duplicados por MessageSid y mensajes propios no generan respuesta', async () => {
  const srv = await startServer(testConfig());
  try {
    const params = msg('hola', { MessageSid: 'SMduplicado' });
    const post = (p) => fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(p),
    }).then((r) => r.text());
    assert.match(await post(params), /<Message>/);
    assert.doesNotMatch(await post(params), /<Message>/);
    assert.doesNotMatch(await post(msg('hola', { From: TO })), /<Message>/);
  } finally {
    await srv.close();
  }
});

test('flujo completo por webhook: soporte entrega enlace sin datos sensibles en la misma respuesta TwiML', async () => {
  const srv = await startServer(testConfig());
  try {
    const post = (body) => fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(msg(body, { From: 'whatsapp:+56933333333' })),
    }).then((r) => r.text());
    await post('hola');
    assert.match(await post('5'), /motivo general/);
    const xml = await post('1');
    assert.match(xml, /https:\/\/wa\.me\/56926125661\?text=/);
    assert.match(xml, /Problema con mi reserva/);
  } finally {
    await srv.close();
  }
});

test('cuerpo demasiado grande se rechaza sin exponer detalles', async () => {
  const srv = await startServer(testConfig());
  try {
    const res = await fetch(`${srv.base}/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form(msg('x'.repeat(50 * 1024))),
    });
    assert.equal(res.status, 413);
    assert.equal(await res.text(), 'Payload too large');
  } finally {
    await srv.close();
  }
});
