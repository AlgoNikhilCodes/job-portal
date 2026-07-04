// One-off seed script — creates the first admin user.
//
// Run with:  node src/scripts/createAdmin.js
// Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env, or accepts
// command-line overrides: node src/scripts/createAdmin.js you@x.com pass123 "Your Name"
//
// Deliberately a script (Option A from the spec) rather than a public
// POST /api/auth/create-first-admin endpoint (Option B) — a script that
// only runs on someone's machine with DB access is safer than any endpoint
// left in the codebase, "disabled after first use" or not.
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const ts = () => new Date().toISOString();

const run = async () => {
  const [, , argEmail, argPassword, argName] = process.argv;
  const email = (argEmail || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = argPassword || process.env.ADMIN_PASSWORD;
  const name = argName || process.env.ADMIN_NAME || 'Platform Admin';

  if (!email || !password) {
    console.error(
      `[${ts()}] Missing admin email/password. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, ` +
      `or run: node src/scripts/createAdmin.js you@example.com yourPassword123 "Your Name"`
    );
    process.exit(1);
  }
  if (password.length < 6) {
    console.error(`[${ts()}] Password must be at least 6 characters.`);
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.userType === 'admin') {
      console.log(`[${ts()}] Admin already exists for ${email} — nothing to do.`);
    } else {
      console.error(
        `[${ts()}] A non-admin user already has this email (${existing.userType}). ` +
        `Choose a different email or update that user's userType directly in the DB.`
      );
      process.exit(1);
    }
  } else {
    // Password gets hashed automatically by User's pre('save') hook.
    const admin = await User.create({ name, email, password, userType: 'admin' });
    console.log(`[${ts()}] Admin user created: ${admin.email} (id=${admin._id})`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(`[${ts()}] createAdmin script failed:`, err);
  process.exit(1);
});
