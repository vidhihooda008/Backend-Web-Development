const sessionStore = require('../session/sessionStore');

module.exports = function requireSession(req, res, next) {
  const sid = req.signedCookies.sid;

  const session = sessionStore.get(sid);

  if (!session) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
  }

  req.userId = session.userId;

  next();
};