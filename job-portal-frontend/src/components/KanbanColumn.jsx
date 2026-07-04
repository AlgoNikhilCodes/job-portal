import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard.jsx';

const COLUMN_STYLES = {
  Applied: { header: 'bg-gray-50 text-gray-700', dot: 'bg-gray-400' },
  Shortlisted: { header: 'bg-yellow-50 text-yellow-800', dot: 'bg-yellow-400' },
  Accepted: { header: 'bg-green-50 text-green-800', dot: 'bg-green-500' },
  Rejected: { header: 'bg-red-50 text-red-700', dot: 'bg-red-400' },
};

/**
 * One column of the board (e.g. "Shortlisted"). Registered as a dnd-kit
 * droppable zone via useDroppable — KanbanBoard's DndContext checks
 * `over.id` against each column's status on drag end to know where a card
 * was dropped.
 */
const KanbanColumn = ({ status, applications, selectedCards, onCardSelect, onDownloadResume, isLoading }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = COLUMN_STYLES[status] || COLUMN_STYLES.Applied;

  return (
    <div className="flex flex-col min-w-[270px] w-[270px] shrink-0 bg-gray-50/50 rounded-xl border border-gray-100">
      <div className={`flex items-center gap-2 px-3.5 py-3 rounded-t-xl ${style.header}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <h3 className="font-semibold text-sm">{status}</h3>
        <span className="text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full ml-auto">
          {applications.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 p-2.5 space-y-2.5 min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto rounded-b-xl transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : ''
        }`}
      >
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-gray-100 rounded-xl animate-skeleton" />
          ))
        ) : applications.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-400">
            {isOver ? 'Drop here' : 'No candidates yet'}
          </div>
        ) : (
          applications.map((app) => (
            <KanbanCard
              key={app._id}
              application={app}
              isSelected={selectedCards.has(app._id)}
              onSelect={onCardSelect}
              onDownloadResume={onDownloadResume}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
