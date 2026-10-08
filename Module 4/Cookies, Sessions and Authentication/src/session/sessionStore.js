const crypto = require('crypto');

const sessions = new Map();

const SESSION_TTL_MS = Number(
  process.env.SESSION_TTL_MS || 3600000
);

function create(userId) {
  const sid = crypto.randomBytes(32).toString('hex');

  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(sid, {
    userId,
    expiresAt,
  });

  return {
    sid,
    expiresAt,
  };
}

function get(sid) {
  if (!sid) {
    return null;
  }

  const session = sessions.get(sid);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }

  return session;
}

function destroy(sid) {
  if (!sid) {
    return;
  }

  sessions.delete(sid);
}

module.exports = {
  create,
  get,
  destroy,
};