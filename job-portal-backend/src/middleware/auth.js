import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Only JWT verification failures (bad signature/expired) are real auth failures
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }

  try {
    // Attach user (without password) to every protected request
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Block suspended accounts on EVERY protected route, not just login —
    // a user suspended mid-session still holds a valid 7-day JWT, so this
    // check (re-reading isActive fresh from the DB on every request, since
    // the token itself carries no role/status claims) is what actually
    // revokes access the moment an admin flips isActive to false.
    if (!req.user.isActive) {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    next();
  } catch (error) {
    // A DB/network hiccup here is NOT an auth failure — don't force-logout the client for it
    console.error('Auth middleware DB error:', error);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

// Mounted AFTER `protect` on /api/admin/* — protect already guarantees
// req.user exists and is active, so this only needs to gate on role.
export const adminOnly = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
};

export default protect;
