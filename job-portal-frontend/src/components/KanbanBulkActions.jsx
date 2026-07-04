import { useState } from 'react';

const ACTIONS = [
  { status: 'Shortlisted', label: 'Shortlist All', style: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' },
  { status: 'Accepted', label: 'Accept All', style: 'border-green-300 text-green-700 hover:bg-green-50' },
  { status: 'Rejected', label: 'Reject All', style: 'border-red-300 text-red-700 hover:bg-red-50' },
];

/**
 * Floating bulk-action bar that appears once at least one card is selected.
 * Every action goes through a confirmation dialog first — moving several
 * candidates to Rejected/Accepted in one click is exactly the kind of thing
 * you don't want to fat-finger.
 */
const KanbanBulkActions = ({ selectedCount, onAction, onClear, isLoading }) => {
  const [pendingStatus, setPendingStatus] = useState(null);

  if (selectedCount === 0) return null;

  const confirm = () => {
    onAction(pendingStatus);
    setPendingStatus(null);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 shadow-lg rounded-2xl px-5 py-3 flex items-center gap-4 animate-[modal-in_0.15s_ease-out]">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          {selectedCount} candidate{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {ACTIONS.map(({ status, label, style }) => (
            <button
              key={status}
              onClick={() => setPendingStatus(status)}
              disabled={isLoading}
              className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition disabled:opacity-50 ${style}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={onClear}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {pendingStatus && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingStatus(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-[modal-in_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Move {selectedCount} candidate{selectedCount !== 1 ? 's' : ''} to {pendingStatus}?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Each candidate will get an email letting them know their status changed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
              >
                {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isLoading ? 'Updating…' : 'Confirm'}
              </button>
              <button
                onClick={() => setPendingStatus(null)}
                disabled={isLoading}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KanbanBulkActions;
