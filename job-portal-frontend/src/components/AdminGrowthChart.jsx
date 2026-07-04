import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const formatDateLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Line chart: new users / new jobs / new applications per day, over the
// `days` window returned by GET /admin/trends.
const AdminGrowthChart = ({ trends }) => {
  const dates = trends?.dates || [];

  const data = {
    labels: dates.map(formatDateLabel),
    datasets: [
      {
        label: 'New Users',
        data: trends?.newUsers || [],
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'New Jobs',
        data: trends?.newJobs || [],
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'New Applications',
        data: trends?.newApplications || [],
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 10, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280' }, grid: { color: '#1f2937' } },
      x: { ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { display: false } },
    },
  };

  return (
    <div className="h-72">
      {dates.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-20">No activity in this period yet.</p>
      ) : (
        <Line data={data} options={options} />
      )}
    </div>
  );
};

export default AdminGrowthChart;
