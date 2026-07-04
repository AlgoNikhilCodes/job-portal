import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Guards every /admin/* route (except /admin/login itself). Mirrors
// RecruiterRoute/SeekerRoute's shape, but redirects to the admin login page
// specifically rather than the general one — a non-admin landing on
// /admin/dashboard shouldn't be routed into the regular seeker/recruiter login.
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.userType !== 'admin') return <Navigate to="/admin/login" replace />;

  return children;
};

export default AdminRoute;
