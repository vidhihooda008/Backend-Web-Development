
const sessionStore = require('../session/sessionStore');

module.exports = function requireSession(req, res, next) {
  // Read the signed session cookie
  const sid = req.signedCookies?.sid;

  // Temporary debugging messages
  console.log('Signed cookie exists:', Boolean(sid));

  // Check if the cookie is missing or its signature is invalid
  if (!sid || typeof sid !== 'string') {
    console.log('Cookie missing or signature invalid');

    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  // Find the session in the session store
  const session = sessionStore.get(sid);

  console.log('Session found:', Boolean(session));

  // Reject missing or expired sessions
  if (!session) {
    return res.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  // Save the authenticated user's ID for the next route
  req.userId = session.userId;

  next();
};
