import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// A true time-bucketed "status changes per week" chart would need the
// backend to track status-transition history, which doesn't exist yet
// (Application only has a single current `status` + updatedAt, not a log of
// past statuses). So this renders the overall current distribution as one
// stacked bar — still answers "where are applications piling up" at a
// glance, just not broken out by week.
const STATUS_COLORS = {
  Applied: '#9ca3af',
  Shortlisted: '#f59e0b',
  Accepted: '#22c55e',
  Rejected: '#ef4444',
};

const ApplicationFlowChart = ({ statusCounts }) => {
  const counts = statusCounts || { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const data = {
    labels: ['All Applications'],
    datasets: Object.entries(counts).map(([status, count]) => ({
      label: status,
      data: [count],
      backgroundColor: STATUS_COLORS[status],
      borderRadius: 4,
    })),
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 10, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
            return ` ${ctx.dataset.label}: ${ctx.raw} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true, beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { stacked: true, ticks: { display: false }, grid: { display: false } },
    },
  };

  return (
    <div className="h-40">
      {total === 0 ? (
        <p className="text-sm text-gray-500 text-center py-14">No applications yet.</p>
      ) : (
        <Bar data={data} options={options} />
      )}
    </div>
  );
};

export default ApplicationFlowChart;
