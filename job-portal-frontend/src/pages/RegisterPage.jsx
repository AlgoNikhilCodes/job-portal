import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const inputClass = (hasError) =>
  `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
    hasError ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
  }`;

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ name: '', email: '', password: '', userType: 'seeker' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Please enter a valid email address';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    else if (!/\d/.test(form.password)) errs.password = 'Password must contain at least one number';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.userType);
      toast.success('Account created! Check your email for a welcome message.');
      navigate('/dashboard');
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      if (!err.fieldErrors) setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join Job Portal and find your next opportunity</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="reg-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              aria-invalid={!!fieldErrors.name}
              className={inputClass(fieldErrors.name)}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              aria-invalid={!!fieldErrors.email}
              className={inputClass(fieldErrors.email)}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min 6 chars, include a number"
              aria-invalid={!!fieldErrors.password}
              className={inputClass(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">At least 6 characters, including one number</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {['seeker', 'recruiter'].map((type) => (
                <label
                  key={type}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                    form.userType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="userType"
                    value={type}
                    checked={form.userType === type}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {type === 'seeker' ? '🔍 Job Seeker' : '🏢 Recruiter'}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
