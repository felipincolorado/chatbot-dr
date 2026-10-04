const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');

const silentLogger = { info() {}, warn() {}, error() {} };

function testConfig(env = {}) {
  return loadConfig({ NODE_ENV: 'test', ...env });
}

async function startServer(config, opts = {}) {
  const app = createApp(config, { logger: silentLogger, ...opts });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

function form(params) {
  return new URLSearchParams(params).toString();
}

module.exports = { testConfig, startServer, form, silentLogger };
