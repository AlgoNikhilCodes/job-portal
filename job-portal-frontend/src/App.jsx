import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RecruiterRoute from './components/RecruiterRoute.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';

// Auth pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

// Job pages
import JobListingPage from './pages/JobListingPage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';
import PostJobPage from './pages/PostJobPage.jsx';
import MyJobsPage from './pages/MyJobsPage.jsx';

// Application pages
import MyApplicationsPage from './pages/MyApplicationsPage.jsx';
import ApplicationsForJobPage from './pages/ApplicationsForJobPage.jsx';

// Day 4 pages
import SavedJobsPage from './pages/SavedJobsPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

// Day 5 pages
import SeekerDashboardPage from './pages/SeekerDashboardPage.jsx';
import RecruiterDashboardPage from './pages/RecruiterDashboardPage.jsx';
import RecommendedJobsPage from './pages/RecommendedJobsPage.jsx';

// Profile pages
import SeekerProfilePage from './pages/SeekerProfilePage.jsx';
import RecruiterProfilePage from './pages/RecruiterProfilePage.jsx';
import ViewSeekerProfilePage from './pages/ViewSeekerProfilePage.jsx';
import ViewRecruiterProfilePage from './pages/ViewRecruiterProfilePage.jsx';

// Day 7 pages — job alerts / digest emails
import JobAlertsPage from './pages/JobAlertsPage.jsx';
import DigestHistoryPage from './pages/DigestHistoryPage.jsx';
import DigestPreviewPage from './pages/DigestPreviewPage.jsx';

// Day 8 pages — resume upload/parsing
import ResumeUploadPage from './pages/ResumeUploadPage.jsx';
import ResumeViewPage from './pages/ResumeViewPage.jsx';

// Day 9 page — Kanban hiring pipeline
import KanbanBoardPage from './pages/KanbanBoardPage.jsx';

// Day 10 pages — admin dashboard & analytics
import AdminRoute from './components/AdminRoute.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminUserDetailsPage from './pages/AdminUserDetailsPage.jsx';
import AdminJobsPage from './pages/AdminJobsPage.jsx';
import AdminApplicationsPage from './pages/AdminApplicationsPage.jsx';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage.jsx';

// Seeker-only guard: must be logged in AND have userType === 'seeker'
const SeekerRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.userType !== 'seeker') return <Navigate to="/my-jobs" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
    <ToastProvider>
    <NotificationProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/jobs" element={<JobListingPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/profile/seeker/:userId" element={<ViewSeekerProfilePage />} />
        <Route path="/profile/recruiter/:userId" element={<ViewRecruiterProfilePage />} />

        {/* ── Any logged-in user (recruiters view applicant resumes; seekers can preview their own) ── */}
        <Route path="/resume/view/:seekerId" element={<ProtectedRoute><ResumeViewPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* ── Recruiter only ── */}
        <Route path="/post-job"            element={<RecruiterRoute><PostJobPage /></RecruiterRoute>} />
        <Route path="/my-jobs"             element={<RecruiterRoute><MyJobsPage /></RecruiterRoute>} />
        <Route path="/profile/recruiter"   element={<RecruiterRoute><RecruiterProfilePage /></RecruiterRoute>} />
        <Route path="/job/:jobId/applications" element={<RecruiterRoute><ApplicationsForJobPage /></RecruiterRoute>} />
        <Route path="/kanban/:jobId" element={<RecruiterRoute><KanbanBoardPage /></RecruiterRoute>} />
        <Route path="/kanban" element={<Navigate to="/dashboard/recruiter" replace />} />

        {/* ── Seeker only ── */}
        <Route path="/dashboard/seeker"  element={<SeekerRoute><SeekerDashboardPage /></SeekerRoute>} />
        <Route path="/my-applications"   element={<SeekerRoute><MyApplicationsPage /></SeekerRoute>} />
        <Route path="/profile/seeker"    element={<SeekerRoute><SeekerProfilePage /></SeekerRoute>} />
        <Route path="/saved-jobs"        element={<SeekerRoute><SavedJobsPage /></SeekerRoute>} />
        <Route path="/recommendations"   element={<SeekerRoute><RecommendedJobsPage /></SeekerRoute>} />
        <Route path="/job-alerts"        element={<SeekerRoute><JobAlertsPage /></SeekerRoute>} />
        <Route path="/digest-history"    element={<SeekerRoute><DigestHistoryPage /></SeekerRoute>} />
        <Route path="/digest-preview/:digestId" element={<SeekerRoute><DigestPreviewPage /></SeekerRoute>} />
        <Route path="/resume"            element={<SeekerRoute><ResumeUploadPage /></SeekerRoute>} />

        {/* ── Recruiter only (dashboard) ── */}
        <Route path="/dashboard/recruiter" element={<RecruiterRoute><RecruiterDashboardPage /></RecruiterRoute>} />

        {/* ── Public (search) ── */}
        <Route path="/search" element={<SearchPage />} />

        {/* ── Admin (Day 10) ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetailsPage /></AdminRoute>} />
        <Route path="/admin/jobs" element={<AdminRoute><AdminJobsPage /></AdminRoute>} />
        <Route path="/admin/applications" element={<AdminRoute><AdminApplicationsPage /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </NotificationProvider>
    </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
