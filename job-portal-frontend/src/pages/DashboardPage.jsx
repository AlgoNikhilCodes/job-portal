import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Redirect to role-specific dashboard
const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.userType === 'recruiter') return <Navigate to="/dashboard/recruiter" replace />;
  return <Navigate to="/dashboard/seeker" replace />;
};

export default DashboardPage;
