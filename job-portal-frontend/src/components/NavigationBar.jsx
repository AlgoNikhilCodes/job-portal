import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

const NavLink = ({ to, children, onClick }) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-sm font-medium transition ${
        active ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
      }`}
    >
      {children}
    </Link>
  );
};

const NavigationBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef(null);

  // Close the profile dropdown when clicking outside it
  useEffect(() => {
    const onClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMenuOpen(false);
    }
  };

  const close = () => setMenuOpen(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 py-3">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="text-lg font-bold text-blue-600 shrink-0">
            Job Portal
          </Link>

          {/* Search bar — desktop */}
          <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs, skills, companies…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <svg
                className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-5 ml-auto">
            <NavLink to="/jobs">Browse Jobs</NavLink>
            <NavLink to="/search">Search</NavLink>
            {user?.userType === 'seeker' && (
              <>
                <NavLink to="/saved-jobs">Saved</NavLink>
                <NavLink to="/my-applications">Applications</NavLink>
              </>
            )}
            {user?.userType === 'recruiter' && (
              <>
                <NavLink to="/post-job">Post Job</NavLink>
                <NavLink to="/my-jobs">My Jobs</NavLink>
              </>
            )}
            {user && <NotificationBell />}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  aria-label="Open profile menu"
                  className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold hover:bg-blue-700 transition"
                >
                  {user.name?.[0]?.toUpperCase()}
                </button>
                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-[modal-in_0.12s_ease-out]"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.userType}</p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      role="menuitem"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to={user.userType === 'recruiter' ? '/profile/recruiter' : '/profile/seeker'}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      role="menuitem"
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login"
                  className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition font-medium">
                  Login
                </Link>
                <Link to="/register"
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 py-3 space-y-3">
            {/* Mobile search */}
            <form onSubmit={handleSearch} className="px-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <div className="flex flex-col gap-3 px-1">
              <NavLink to="/jobs" onClick={close}>Browse Jobs</NavLink>
              <NavLink to="/search" onClick={close}>Advanced Search</NavLink>
              {user?.userType === 'seeker' && (
                <>
                  <NavLink to="/saved-jobs" onClick={close}>Saved Jobs</NavLink>
                  <NavLink to="/my-applications" onClick={close}>My Applications</NavLink>
                  <NavLink to="/profile/seeker" onClick={close}>My Profile</NavLink>
                </>
              )}
              {user?.userType === 'recruiter' && (
                <>
                  <NavLink to="/post-job" onClick={close}>Post Job</NavLink>
                  <NavLink to="/my-jobs" onClick={close}>My Jobs</NavLink>
                </>
              )}
              {user ? (
                <>
                  <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>
                  <NavLink to="/notifications" onClick={close}>Notifications</NavLink>
                  <button onClick={() => { logout(); close(); }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium text-left">
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Link to="/login" onClick={close}
                    className="flex-1 text-center px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition font-medium">
                    Login
                  </Link>
                  <Link to="/register" onClick={close}
                    className="flex-1 text-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationBar;
