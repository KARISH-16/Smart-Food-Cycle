const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { User } = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/auth.config');
const { requireAuth } = require('../middleware/auth.middleware');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function toPublicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are all required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.'
      });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash
    });

    await user.save();

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: `Welcome to Smart Food Cycle, ${user.name}.`,
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create account.',
      error: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are both required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account matches that email and password.'
      });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'No account matches that email and password.'
      });
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}.`,
      token,
      user: toPublicUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sign in.',
      error: error.message
    });
  }
});

// POST /api/auth/logout
// JWTs are stateless, so logging out is primarily a client-side action
// (discarding the token). This endpoint exists so the client has a clean
// network call to make and a confirmation message to show.
router.post('/logout', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You have been signed out.'
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    res.status(200).json({
      success: true,
      user: toPublicUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load account.',
      error: error.message
    });
  }
});

module.exports = router;
