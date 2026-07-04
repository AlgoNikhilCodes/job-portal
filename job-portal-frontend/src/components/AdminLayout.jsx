import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSystemHealth } from '../services/api.js';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/jobs', label: 'Jobs', icon: '💼' },
  { to: '/admin/applications', label: 'Applications', icon: '📄' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '🕓' },
];

const healthColor = {
  healthy: 'bg-green-500',
  slow: 'bg-yellow-500',
  error: 'bg-red-500',
};

// Shared chrome for every /admin/* page — each page renders its own content
// inside this, matching the rest of the app's convention (every page owns
// its own top-level layout component rather than a nested <Outlet/> route
// tree) instead of introducing a second layout pattern just for /admin.
const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getSystemHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-white font-bold text-lg flex items-center gap-2">🛡️ Admin</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.name}</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-3">
          <div className="flex items-center gap-2 px-3 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${healthColor[health?.databaseStatus] || 'bg-gray-600'}`} />
            System {health ? health.databaseStatus : '—'}
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950 transition"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-6 sm:p-8">{children}</main>
    </div>
  );
};

export default AdminLayout;
