
const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../db/prisma');
const sessionStore = require('../session/sessionStore');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

const COST_FACTOR = 10;
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 3600000);

function cookieOptions() {
  return {
    signed: true,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function invalidCredentials(res) {
  return res.status(401).json({
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    },
  });
}

function authenticationRequired(res) {
  return res.status(401).json({
    error: {
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    },
  });
}

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password)
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Name, email, and password are required',
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizeEmail(email),
        passwordHash: await bcrypt.hash(password, COST_FACTOR),
      },
    });

    return res.status(201).json({
      data: safeUser(user),
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    return next(error);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });

    if (!user) {
      return invalidCredentials(res);
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return invalidCredentials(res);
    }

    // The session store generates and stores the session ID.
    const { sid } = sessionStore.create(user.id);

    res.cookie('sid', sid, cookieOptions());

    return res.status(200).json({
      data: safeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

// GET /auth/me
router.get('/me', requireSession, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      sessionStore.destroy(req.signedCookies?.sid);
      return authenticationRequired(res);
    }

    return res.status(200).json({
      data: safeUser(user),
    });
  } catch (error) {
    return next(error);
  }
});

// POST /auth/logout
router.post('/logout', (req, res, next) => {
  try {
    const sid = req.signedCookies?.sid;

    if (typeof sid === 'string') {
      sessionStore.destroy(sid);
    }

    const options = cookieOptions();
    delete options.maxAge;

    res.clearCookie('sid', options);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
