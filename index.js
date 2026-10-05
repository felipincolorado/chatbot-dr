// index.js - punto de entrada (npm start)
const { loadConfig } = require('./src/config');
const { createApp } = require('./src/app');

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.port, () => {
  console.log(
    `Bot v${config.version} escuchando en puerto ${config.port} ` +
      `(firma Twilio: ${config.twilio.validateSignature ? 'activa' : 'desactivada'}, ` +
      `IA: ${config.ai.enabled ? 'activada' : 'desactivada'}, ` +
      `RNPI: ${config.doctorRnpi ? 'configurado' : 'no configurado'})`
  );
});

function shutdown(signal) {
  console.log(`Recibido ${signal}, cerrando servidor...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
