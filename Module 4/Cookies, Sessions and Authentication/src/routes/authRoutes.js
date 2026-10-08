const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../db/prisma');
const sessionStore = require('../session/sessionStore');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

const COST_FACTOR = 10;

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

    const normalizedName = name.trim();
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, COST_FACTOR);

    let user;

    try {
      user = await prisma.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          passwordHash,
        },
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

      throw error;
    }

    return res.status(201).json({
      data: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (
      !isNonEmptyString(email) ||
      !isNonEmptyString(password)
    ) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required',
        },
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
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

    const { sid } = sessionStore.create(user.id);

    res.cookie('sid', sid, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: Number(process.env.SESSION_TTL_MS || 3600000),
      secure: process.env.COOKIE_SECURE === 'true',
    });

    return res.status(200).json({
      data: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me
router.get('/me', requireSession, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    return res.status(200).json({
      data: safeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const sid = req.signedCookies.sid;

    if (sid) {
      sessionStore.destroy(sid);
    }

    res.clearCookie('sid', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;