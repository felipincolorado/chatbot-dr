// sessions/sessionManager.js

// Sesión en memoria (simple). Si se reinicia el servidor, se reinician las sesiones.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

const userSessions = {};

function getSession(from) {
  const key = from || 'unknown';
  const now = Date.now();
  const prev = userSessions[key];

  const isNew = !prev || now - prev.lastInteraction > SESSION_TIMEOUT_MS;

  if (isNew) {
    userSessions[key] = {
      lastInteraction: now,
      isNew: true,
      state: 'MENU', // MENU | SUPPORT_NAME | SUPPORT_RUT | SUPPORT_MOTIVE | SUPPORT_DETAIL
      support: { name: '', rut: '', motive: '', detail: '' },
    };
    return userSessions[key];
  }

  prev.lastInteraction = now;
  prev.isNew = false;
  return prev;
}

function resetSupport(session) {
  if (!session) return;
  session.state = 'MENU';
  session.support = { name: '', rut: '', motive: '', detail: '' };
}

module.exports = { getSession, resetSupport };
