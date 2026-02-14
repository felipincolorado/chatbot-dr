const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 min
const userSessions = {};

function getSession(from) {
  const now = Date.now();
  const prev = userSessions[from];

  const isNew = !prev || (now - prev.lastInteraction > SESSION_TIMEOUT);

  if (isNew) {
    userSessions[from] = {
      lastInteraction: now,
      state: 'MENU', // MENU | SUPPORT_RUT | SUPPORT_MOTIVE | SUPPORT_DETAIL
      support: { rut: '', motive: '', detail: '' },
      isNew: true
    };
    return userSessions[from];
  }

  prev.lastInteraction = now;
  prev.isNew = false;
  return prev;
}

function resetSupport(session) {
  session.state = 'MENU';
  session.support = { rut: '', motive: '', detail: '' };
}

module.exports = { getSession, resetSupport };
