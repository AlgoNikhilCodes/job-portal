import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPut } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { applyOptimisticUpdate, revertOptimisticUpdate } from '../utils/optimisticUpdates.js';

const EMPTY_BOARD = { Applied: [], Shortlisted: [], Accepted: [], Rejected: [] };

/**
 * All the state + logic behind the Kanban board, kept out of the page/board
 * components so KanbanBoardPage stays a thin layout shell.
 */
export const useKanbanBoard = (jobId) => {
  const { socket } = useAuth();
  const toast = useToast();

  const [applications, setApplications] = useState(EMPTY_BOARD);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [error, setError] = useState('');
  // for undo: { previousState, applicationIds } — applicationIds is who
  // moved, previousState is the full pre-move snapshot we use to figure out
  // which column each of them needs to go back to.
  const [lastAction, setLastAction] = useState(null);

  // Kept in a ref (not state) so socket callbacks registered once can still
  // read the latest board without re-subscribing on every state change.
  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;

  // Bug #2 fix: 429s used to fall through to the same toast.error(...) as
  // any other failure, showing whatever generic message the interceptor
  // produced. Route rate-limit errors (flagged by api.js as `isRateLimit`)
  // to the live-countdown toast instead, everywhere in this hook that hits
  // the API and shows a failure toast.
  const notifyError = useCallback(
    (err, fallback) => {
      if (err?.isRateLimit) {
        // Let the toast's own template add the live "Please try again in
        // Xs" countdown rather than reusing err.message, which already has
        // its own static wait-time sentence baked in from the interceptor.
        toast.rateLimit(err.retryAfter);
      } else {
        toast.error(err?.message || fallback);
      }
    },
    [toast]
  );

  const fetchBoard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiGet(`/applications/job/${jobId}?grouped=true`);
      setApplications({ ...EMPTY_BOARD, ...data });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // ─── Real-time sync ────────────────────────────────────────────────────
  // Another tab/recruiter moved a card (or a bulk action touched several) —
  // re-fetch rather than hand-rolling a local merge. The board is small
  // enough per job that a full re-fetch is cheap, and it guarantees we never
  // drift from the backend's version of the truth (simple "last write wins"
  // conflict handling, as called out in the spec).
  useEffect(() => {
    if (!socket) return;

    const handleCardMoved = (payload) => {
      if (payload.jobId?.toString() !== jobId?.toString()) return; // not this board
      fetchBoard();
    };
    const handleBulkMoved = (payload) => {
      if (payload.jobId?.toString() !== jobId?.toString()) return;
      fetchBoard();
    };

    socket.on('kanban:card_moved', handleCardMoved);
    socket.on('application:status_changed_bulk', handleBulkMoved);
    return () => {
      socket.off('kanban:card_moved', handleCardMoved);
      socket.off('application:status_changed_bulk', handleBulkMoved);
    };
  }, [socket, jobId, fetchBoard]);

  // ─── Drag-and-drop ─────────────────────────────────────────────────────
  const moveCard = useCallback(
    async (applicationId, newStatus) => {
      const previousState = applicationsRef.current;
      const currentStatus = Object.keys(previousState).find((s) =>
        previousState[s].some((a) => a._id === applicationId)
      );
      if (!currentStatus || currentStatus === newStatus) return; // no-op

      // Optimistic move — instant UI feedback, before the network round-trip.
      setApplications(applyOptimisticUpdate(previousState, [applicationId], newStatus));
      setLastAction({ previousState, applicationIds: [applicationId] });

      try {
        await apiPut(`/applications/${applicationId}`, { status: newStatus });
      } catch (err) {
        // Revert on failure — the card snaps back to where it was.
        setApplications(revertOptimisticUpdate(previousState));
        setLastAction(null);
        notifyError(err, 'Failed to update. Reverted.');
      }
    },
    [notifyError]
  );

  // dnd-kit's onDragEnd handler — resolves which column the card was
  // dropped on, then delegates to moveCard.
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) return; // dropped outside any droppable — nothing to do, card stays put

      const newStatus = over.id; // columns are droppable with id = status name
      moveCard(active.id, newStatus);
    },
    [moveCard]
  );

  // ─── Selection ─────────────────────────────────────────────────────────
  const handleCardSelect = useCallback((applicationId) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedCards(new Set()), []);

  // ─── Bulk actions ──────────────────────────────────────────────────────
  const handleBulkAction = useCallback(
    async (newStatus) => {
      const applicationIds = Array.from(selectedCards);
      if (applicationIds.length === 0) return;

      const previousState = applicationsRef.current;
      setIsUpdating(true);
      setApplications(applyOptimisticUpdate(previousState, applicationIds, newStatus));
      setLastAction({ previousState, applicationIds });

      try {
        const result = await apiPut('/applications/bulk/status', { applicationIds, newStatus });
        toast.success(`Moved ${result.updated} candidate${result.updated !== 1 ? 's' : ''} to ${newStatus}`);
        clearSelection();
      } catch (err) {
        // The optimistic move never made it to the DB — revert locally and
        // drop the pending undo, since there's nothing real to undo.
        setApplications(revertOptimisticUpdate(previousState));
        setLastAction(null);
        notifyError(err, 'Failed to update selected candidates. Reverted.');
      } finally {
        setIsUpdating(false);
      }
    },
    [selectedCards, notifyError, clearSelection]
  );

  // ─── Undo ──────────────────────────────────────────────────────────────
  // Bug fix: this used to only call setApplications(lastAction.previousState)
  // — a purely local, in-memory revert. It never told the backend, so the
  // database kept whatever status the drag/bulk-action had just set, while
  // the UI silently showed the old (undone) status. Any refresh, re-fetch,
  // or the recruiter's own Applications table then revealed the "ghost"
  // status the DB actually had. This version awaits a real API call before
  // treating the undo as done, and puts the UI back in sync with the DB if
  // that call fails.
  const handleUndo = useCallback(async () => {
    if (!lastAction) return;
    const { previousState, applicationIds } = lastAction;

    // Figure out, from the pre-action snapshot, which column each moved
    // card actually came from — a bulk action can in principle pull cards
    // from more than one column, so group by origin status.
    const originalStatusById = {};
    for (const status of Object.keys(previousState)) {
      for (const app of previousState[status]) {
        if (applicationIds.includes(app._id)) originalStatusById[app._id] = status;
      }
    }
    const groups = {};
    for (const id of applicationIds) {
      const status = originalStatusById[id];
      if (!status) continue;
      (groups[status] = groups[status] || []).push(id);
    }

    const stateBeforeUndo = applicationsRef.current;
    setIsUndoing(true);
    // Optimistic — snap the UI back immediately, but keep `lastAction`
    // around until we know the persist actually succeeded.
    setApplications(previousState);

    try {
      await Promise.all(
        Object.entries(groups).map(([status, ids]) =>
          apiPut('/applications/bulk/status', { applicationIds: ids, newStatus: status })
        )
      );
      setLastAction(null);
      toast.success('Undo saved — the database has been updated.');
    } catch (err) {
      // The DB still has the post-action status. Put the UI back to what
      // it was showing before this undo attempt, and keep the Undo button
      // around so the recruiter can retry instead of silently losing it.
      setApplications(stateBeforeUndo);
      notifyError(err, 'Undo failed to save. Please try again.');
    } finally {
      setIsUndoing(false);
    }
  }, [lastAction, toast, notifyError]);

  const handleDownloadResume = useCallback((seekerId) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/resumes/download/${seekerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Resume not available for download');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => toast.error(err.message));
  }, [toast]);

  return {
    applications,
    selectedCards,
    isLoading,
    isUpdating,
    isUndoing,
    error,
    lastAction,
    handleDragEnd,
    handleCardSelect,
    clearSelection,
    handleBulkAction,
    handleUndo,
    handleRefresh: fetchBoard,
    handleDownloadResume,
  };
};

export default useKanbanBoard;
