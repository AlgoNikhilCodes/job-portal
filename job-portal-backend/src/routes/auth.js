import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { sendWelcomeEmail } from '../services/emailService.js';

const router = express.Router();

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Generate a signed JWT token valid for 7 days
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Brute-force protection — stricter than the app-wide limiter in server.js.
// Both give a precise `retryAfter` (seconds) alongside the message, same
// contract as the app-wide limiter in server.js, so the frontend's 429
// handling works identically no matter which limiter tripped.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      message: 'Too many accounts created from this device. Please try again in an hour.',
      isRateLimit: true,
      retryAfter,
    });
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      message: `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) !== 1 ? 's' : ''} and try again.`,
      isRateLimit: true,
      retryAfter,
    });
  },
});

// POST /api/auth/register
router.post('/register', registerLimiter, validateRegister, async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'This email is already registered. Try logging in instead.',
      });
    }

    const user = await User.create({ name, email, password, userType });
    const token = generateToken(user._id);

    // Send welcome email (fire-and-forget, don't block response)
    sendWelcomeEmail(user.email, user.name, user.userType).catch((err) =>
      console.error(`[${new Date().toISOString()}] [Auth] Welcome email failed for ${user.email}:`, err.message)
    );

    log(`New ${user.userType} registered: ${user.email} (id=${user._id})`);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Registration error:`, error);
    res.status(500).json({
      message: 'Something went wrong while creating your account. Please try again in a moment.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Suspended accounts can't log in at all (a fresh token would be
    // pointless anyway — the `protect` middleware would reject it on the
    // very next request since it re-checks isActive from the DB every time).
    if (!user.isActive) {
      log(`Blocked login attempt for suspended account: ${user.email} (id=${user._id})`);
      return res.status(401).json({
        message: 'This account has been suspended. Please contact support for more information.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    log(`User logged in: ${user.email} (id=${user._id})`);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Login error:`, error);
    res.status(500).json({
      message: 'Something went wrong while signing you in. Please try again in a moment.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    });
  }
});

export default router;