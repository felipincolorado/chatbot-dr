const SESSION_TIMEOUT = 15 * 60 * 1000;
const userSessions = {};

function isNewSession(from) {
  const now = Date.now();
  const session = userSessions[from];

  if (!session || (now - session.lastInteraction > SESSION_TIMEOUT)) {
    userSessions[from] = { lastInteraction: now };
    return true;
  }

  userSessions[from].lastInteraction = now;
  return false;
}

module.exports = { isNewSession };
