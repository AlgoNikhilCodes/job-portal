import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const inputClass = (hasError) =>
  `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition bg-gray-900 text-gray-100 placeholder:text-gray-500 ${
    hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'
  }`;

// Admin login uses the exact same POST /auth/login endpoint as everyone
// else — there's no separate admin auth flow on the backend, since the
// server always re-checks userType/isActive fresh from the DB on every
// request anyway (see middleware/auth.js). This page just refuses to
// proceed past login if the account that comes back isn't an admin.
const AdminLoginPage = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.user.userType !== 'admin') {
        // Valid credentials, but not an admin account — don't leave a
        // regular seeker/recruiter session sitting around on this page.
        logout();
        setError('This account does not have admin access.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Console</h1>
          <p className="text-gray-500 mt-2 text-sm">Admin access only</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-gray-400 mb-1">
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@jobportal.com"
              className={inputClass(false)}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-400 mb-1">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={inputClass(false)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-900 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
