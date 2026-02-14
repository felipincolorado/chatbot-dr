// sessions/sessionManager.js
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
const userSessions = {};

function getSession(from) {
  const now = Date.now();
  const session = userSessions[from];

  if (!session || (now - session.lastInteraction > SESSION_TIMEOUT)) {
    userSessions[from] = {
      lastInteraction: now,
      isNew: true,
      state: 'MENU', // MENU | SUPPORT_RUT | SUPPORT_MOTIVE | SUPPORT_DETAIL
      support: { rut: '', motive: '', detail: '' },
    };
    return userSessions[from];
  }

  session.lastInteraction = now;
  session.isNew = false;
  return session;
}

function resetSupport(session) {
  session.state = 'MENU';
  session.support = { rut: '', motive: '', detail: '' };
}

module.exports = { getSession, resetSupport };
