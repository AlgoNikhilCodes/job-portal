import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut, apiPost } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import NavigationBar from '../components/NavigationBar.jsx';
import JobAlertForm from '../components/JobAlertForm.jsx';

const EMPTY_ALERT = {
  isEnabled: true,
  frequency: 'daily',
  emailAddress: '',
  preferences: {
    skills: [],
    locations: [],
    minSalary: undefined,
    maxSalary: undefined,
    jobTypes: [],
    experienceLevel: undefined,
  },
};

const JobAlertsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/job-alerts')
      .then((data) => {
        if (data) {
          setAlert(data);
        } else {
          setAlert({ ...EMPTY_ALERT, emailAddress: user?.email || '' });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async (form, setFieldErrors) => {
    setSaving(true);
    setError('');
    try {
      const saved = await apiPut('/job-alerts', form);
      setAlert(saved);
      toast.success('Job alerts updated!');
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      else setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!alert?._id) return; // nothing saved yet — toggling is meaningless until preferences exist
    const nextEnabled = !alert.isEnabled;
    try {
      const updated = await apiPut('/job-alerts/frequency', {
        frequency: nextEnabled ? (alert.frequency === 'never' ? 'daily' : alert.frequency) : 'never',
      });
      setAlert(updated);
      toast.success(nextEnabled ? 'Job alerts enabled' : 'Job alerts paused');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiPost('/job-alerts/test');
      // A toast alone disappears in a couple seconds — not a strong enough
      // confirmation that the button actually did something (this was the
      // QA complaint: "button exists but unclear if working"). Keep a
      // persistent result panel on the page too.
      setTestResult(result);
      if (result.emailSent) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Job Alerts</h1>
            {alert?._id && (
              <button
                onClick={handleToggleEnabled}
                className={`text-sm font-medium px-3 py-1.5 rounded-full transition ${
                  alert.isEnabled
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {alert.isEnabled ? `${alert.frequency === 'daily' ? 'Daily' : 'Weekly'} alerts active` : 'Alerts paused'}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Tell us what you're looking for and we'll email you matching jobs — no need to check back manually.
          </p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {loading ? (
            <div className="space-y-5 animate-skeleton" aria-label="Loading job alert preferences" role="status">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-10 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <JobAlertForm initialValues={alert} onSubmit={handleSave} saving={saving} />

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={handleTestEmail}
                  disabled={testing || !alert?._id}
                  title={alert?._id ? 'Send a test digest to your email' : 'Save your preferences first'}
                  className="flex-1 border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                >
                  {testing && <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                  {testing ? 'Sending…' : '📧 Send Test Email'}
                </button>
                <Link
                  to="/digest-history"
                  className="flex-1 text-center border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition"
                >
                  View Digest History
                </Link>
              </div>

              {/* Persistent confirmation — stays on screen after the toast fades,
                  so it's unambiguous whether the test actually worked. */}
              {testResult && (
                <div className={`mt-4 p-4 rounded-lg border text-sm ${
                  testResult.emailSent
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  <p className="font-semibold flex items-center gap-1.5">
                    {testResult.emailSent ? '✅' : 'ℹ️'}
                    {testResult.emailSent ? 'Test email sent!' : 'No email sent'}
                  </p>
                  {testResult.recipientEmail && (
                    <p className="mt-1">Sent to: <span className="font-medium">{testResult.recipientEmail}</span></p>
                  )}
                  <p className="mt-1">Jobs found matching your preferences: <span className="font-medium">{testResult.jobsFound}</span></p>
                  {testResult.emailSent && (
                    <p className="mt-1 text-xs text-green-700/80">
                      Check your inbox (and spam folder) — delivery can take a minute or two.
                    </p>
                  )}
                </div>
              )}

              {/* How-to guide — the QA complaint was that it's unclear whether
                  the test button works at all; this spells out what to expect. */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📧 How to Test Job Alerts</h4>
                <ol className="list-decimal list-inside text-xs text-blue-800 space-y-1">
                  <li>Set up your preferences above (skills, locations, salary, job type, frequency) and save.</li>
                  <li>Click "Send Test Email" — this sends a real digest immediately, without waiting for the daily 9 AM schedule.</li>
                  <li>Check the confirmation panel above for how many matching jobs were found.</li>
                  <li>Check your email inbox (may take 1–2 minutes; check spam if it doesn't arrive).</li>
                  <li>Click "View Digest History" below to see every digest ever sent, including this test.</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default JobAlertsPage;
