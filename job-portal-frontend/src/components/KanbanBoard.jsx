import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn.jsx';
import KanbanCard from './KanbanCard.jsx';
import KanbanBulkActions from './KanbanBulkActions.jsx';

const COLUMNS = ['Applied', 'Shortlisted', 'Accepted', 'Rejected'];

const KanbanBoard = ({
  jobTitle,
  applications,
  selectedCards,
  isLoading,
  isUpdating,
  isUndoing,
  onDragEnd,
  onCardSelect,
  onBulkAction,
  onClearSelection,
  onDownloadResume,
  onRefresh,
  lastAction,
  onUndo,
  tableViewLink,
}) => {
  const [activeId, setActiveId] = useState(null);
  const [skillFilter, setSkillFilter] = useState('');
  const [minExperience, setMinExperience] = useState('');

  // A small movement threshold before a drag "activates" — otherwise every
  // click on the checkbox/name/download button inside a card would also
  // register as a (zero-distance) drag attempt.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const totalCandidates = COLUMNS.reduce((sum, s) => sum + applications[s].length, 0);

  const filtered = useMemo(() => {
    const skill = skillFilter.trim().toLowerCase();
    const minExp = minExperience === '' ? null : Number(minExperience);

    const filterList = (list) =>
      list.filter((app) => {
        if (skill && !(app.skills || []).some((s) => s.toLowerCase().includes(skill))) return false;
        if (minExp !== null && (app.experience ?? -1) < minExp) return false;
        return true;
      });

    return Object.fromEntries(COLUMNS.map((s) => [s, filterList(applications[s])]));
  }, [applications, skillFilter, minExperience]);

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    for (const status of COLUMNS) {
      const found = applications[status].find((a) => a._id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, applications]);

  const handleDragEnd = (event) => {
    setActiveId(null);
    onDragEnd(event);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{jobTitle}</h1>
          <p className="text-sm text-gray-500">{totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter by skill…"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-40"
          />
          <input
            type="number"
            min={0}
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value)}
            placeholder="Min yrs exp"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-28"
          />
          {lastAction && (
            <button
              onClick={onUndo}
              disabled={isUndoing}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUndoing ? 'Undoing…' : '↩ Undo'}
            </button>
          )}
          <button
            onClick={onRefresh}
            title="Refresh board"
            className="p-1.5 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {tableViewLink && (
            <Link
              to={tableViewLink}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Switch to Table View
            </Link>
          )}
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={filtered[status]}
              selectedCards={selectedCards}
              onCardSelect={onCardSelect}
              onDownloadResume={onDownloadResume}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Ghost card that follows the pointer while dragging */}
        <DragOverlay>
          {activeCard ? (
            <div className="w-[254px] rotate-2 opacity-95">
              <KanbanCard application={activeCard} isSelected={false} onSelect={() => {}} onDownloadResume={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <KanbanBulkActions
        selectedCount={selectedCards.size}
        onAction={onBulkAction}
        onClear={onClearSelection}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default KanbanBoard;
