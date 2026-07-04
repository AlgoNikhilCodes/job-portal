import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import NavigationBar from '../components/NavigationBar.jsx';
import KanbanBoard from '../components/KanbanBoard.jsx';
import { useKanbanBoard } from '../hooks/useKanbanBoard.js';

const KanbanBoardPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [myJobs, setMyJobs] = useState([]);
  const board = useKanbanBoard(jobId);

  useEffect(() => {
    // Used for both the job title in the breadcrumb and the "switch job" selector.
    apiGet('/jobs/recruiter/my-jobs?page=1')
      .then((data) => setMyJobs(data.jobs || []))
      .catch(() => {});
  }, []);

  const currentJob = myJobs.find((j) => j._id === jobId);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb + job selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap">
            <Link to="/my-jobs" className="hover:text-blue-600 transition">Jobs</Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-700 font-medium">{currentJob?.title || 'Kanban Board'}</span>
            <span aria-hidden="true">/</span>
            <span className="text-gray-700 font-medium">Kanban Board</span>
          </nav>

          {myJobs.length > 1 && (
            <select
              value={jobId}
              onChange={(e) => navigate(`/kanban/${e.target.value}`)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {myJobs.map((job) => (
                <option key={job._id} value={job._id}>{job.title}</option>
              ))}
            </select>
          )}
        </div>

        {board.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between gap-3">
            {board.error}
            <button onClick={board.handleRefresh} className="text-red-700 underline font-medium shrink-0">Retry</button>
          </div>
        )}

        <KanbanBoard
          jobTitle={currentJob?.title || 'Hiring Pipeline'}
          applications={board.applications}
          selectedCards={board.selectedCards}
          isLoading={board.isLoading}
          isUpdating={board.isUpdating}
          isUndoing={board.isUndoing}
          onDragEnd={board.handleDragEnd}
          onCardSelect={board.handleCardSelect}
          onBulkAction={board.handleBulkAction}
          onClearSelection={board.clearSelection}
          onDownloadResume={board.handleDownloadResume}
          onRefresh={board.handleRefresh}
          lastAction={board.lastAction}
          onUndo={board.handleUndo}
          tableViewLink={`/job/${jobId}/applications`}
        />
      </main>
    </div>
  );
};

export default KanbanBoardPage;
