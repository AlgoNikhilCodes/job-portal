import { useDraggable } from '@dnd-kit/core';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/formatTime.js';

const formatExperience = (years) => {
  if (years === null || years === undefined) return null;
  return years === 0 ? 'Fresher' : `${years} yr${years !== 1 ? 's' : ''} exp`;
};

/**
 * A single candidate card. Draggable via @dnd-kit's useDraggable — the
 * actual drop/column logic lives in KanbanBoard's DndContext, this
 * component just needs to expose itself as a drag source.
 */
const KanbanCard = ({ application, isSelected, onSelect, onDownloadResume }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application._id,
    data: { status: application.status },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? '2deg' : '0deg'})`,
        zIndex: isDragging ? 50 : 'auto',
      }
    : undefined;

  const seeker = application.seekerId;
  const experience = formatExperience(application.experience);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-xl p-3.5 transition-shadow ${
        isDragging ? 'shadow-lg opacity-90' : 'hover:shadow-md'
      } ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
    >
      {/* Header: checkbox + name + drag handle */}
      <div className="flex items-start gap-2 mb-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onSelect(application._id); }}
          onPointerDown={(e) => e.stopPropagation()} // don't let dnd-kit swallow the click
          className="mt-1 shrink-0"
          aria-label={`Select ${seeker?.name}`}
        />
        <button
          onClick={() => navigate(`/profile/seeker/${seeker?._id}`)}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-semibold text-gray-900 text-sm text-left hover:text-blue-600 transition truncate flex-1"
        >
          {seeker?.name || 'Unknown candidate'}
        </button>
        {/* Drag handle — the rest of the card can still be clicked normally */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 px-1 touch-none"
          title="Drag to move"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 10a1 1 0 11-2 0 1 1 0 012 0zM7 16a1 1 0 11-2 0 1 1 0 012 0zM15 4a1 1 0 11-2 0 1 1 0 012 0zM15 10a1 1 0 11-2 0 1 1 0 012 0zM15 16a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </span>
      </div>

      {/* Skills */}
      {application.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {application.skills.slice(0, 4).map((s) => (
            <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded">
              {s}
            </span>
          ))}
          {application.skills.length > 4 && (
            <span className="px-1.5 py-0.5 text-[11px] text-gray-400">+{application.skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
        {experience && <span>{experience}</span>}
        {experience && <span aria-hidden="true">·</span>}
        <span>Applied {formatRelativeTime(application.createdAt)}</span>
      </div>

      {application.recruiterNotes && (
        <p className="text-[11px] text-gray-500 italic mb-2 line-clamp-2 border-l-2 border-gray-200 pl-1.5">
          {application.recruiterNotes}
        </p>
      )}

      {/* Footer: contact + actions */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
        <p className="text-[11px] text-gray-400 truncate">{seeker?.email}</p>
        <div className="flex items-center gap-1 shrink-0">
          {/* Bug #4 fix: this used to render whenever hasResume was true,
              regardless of the seeker's public/private setting — clicking
              it for a private resume just hit the server's 403 with no
              warning up front. Now it's gated on resumeIsPublic too, with
              a disabled lock icon standing in for a private resume. */}
          {application.hasResume && application.resumeIsPublic && (
            <button
              onClick={() => onDownloadResume(seeker?._id)}
              onPointerDown={(e) => e.stopPropagation()}
              title="Download resume"
              className="p-1 text-gray-400 hover:text-blue-600 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
          )}
          {application.hasResume && !application.resumeIsPublic && (
            <span
              title="This candidate has kept their resume private"
              className="p-1 text-gray-300 cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
