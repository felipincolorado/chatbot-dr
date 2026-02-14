// sessions/sessionManager.js
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

function now() {
  return Date.now();
}

function getSession(from) {
  const store = global.__USER_SESSIONS__ || (global.__USER_SESSIONS__ = {});
  const s = store[from];

  const isNew = !s || now() - s.lastInteraction > SESSION_TIMEOUT;

  if (isNew) {
    store[from] = {
      lastInteraction: now(),
      state: "MENU", // MENU | SUPPORT_RUT | SUPPORT_MOTIVE | SUPPORT_DETAIL
      isNew: true,
      support: { rut: "", motive: "", detail: "" },
    };
    return store[from];
  }

  s.lastInteraction = now();
  s.isNew = false;
  return s;
}

function resetSupport(session) {
  session.state = "MENU";
  session.support = { rut: "", motive: "", detail: "" };
}

function resetSession(session) {
  session.state = "MENU";
  session.support = { rut: "", motive: "", detail: "" };
  session.isNew = false;
}

module.exports = { getSession, resetSession, resetSupport };
