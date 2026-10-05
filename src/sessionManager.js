// src/sessionManager.js
// Sesiones en memoria (sin base de datos). Se pierden al reiniciar el servicio,
// lo que solo implica que el usuario vuelve a ver la bienvenida.

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 5000;

function createSessionStore({ timeoutMs = SESSION_TIMEOUT_MS, maxSessions = MAX_SESSIONS, now = Date.now } = {}) {
  const sessions = new Map();

  function prune() {
    const t = now();
    for (const [key, s] of sessions) {
      if (t - s.lastInteraction > timeoutMs) sessions.delete(key);
    }
    // Si aún hay demasiadas, se descartan las más antiguas (Map conserva orden de inserción).
    while (sessions.size > maxSessions) {
      sessions.delete(sessions.keys().next().value);
    }
  }

  function get(key) {
    const t = now();
    const existing = sessions.get(key);

    if (!existing || t - existing.lastInteraction > timeoutMs) {
      const fresh = { lastInteraction: t, isNew: true, state: 'MENU' };
      sessions.delete(key);
      sessions.set(key, fresh);
      if (sessions.size > maxSessions) prune();
      return fresh;
    }

    existing.lastInteraction = t;
    existing.isNew = false;
    // Reinsertar para mantener orden por actividad reciente.
    sessions.delete(key);
    sessions.set(key, existing);
    return existing;
  }

  const timer = setInterval(prune, 5 * 60 * 1000);
  if (timer.unref) timer.unref();

  return {
    get,
    prune,
    size: () => sessions.size,
    stop: () => clearInterval(timer),
  };
}

module.exports = { createSessionStore, SESSION_TIMEOUT_MS };
