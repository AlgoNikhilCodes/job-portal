import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    userType: {
      type: String,
      // Admin is just another userType value rather than a separate `role`
      // field — userType is already the single source of truth checked
      // everywhere (RecruiterRoute, SeekerRoute, dashboard/controller
      // guards), so a second parallel "role" field would just create two
      // places that could disagree about what a user is.
      enum: ['seeker', 'recruiter', 'admin'],
      required: [true, 'User type is required'],
    },
    // Suspend/activate (Day 10 admin dashboard). Also doubles as the guard
    // that blocks a suspended user's *existing* JWT from working on any
    // route, not just login — see middleware/auth.js.
    isActive: {
      type: Boolean,
      default: true,
    },
    suspendedReason: {
      type: String,
      trim: true,
      default: null,
    },
    // Free-text note an admin can leave on any user (e.g. "premium client").
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare plain password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
