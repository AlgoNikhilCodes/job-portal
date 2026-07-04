// Shared helpers for the Kanban board's optimistic-update flow: move a card
// (or several) between status columns in local state immediately, before
// the backend confirms — and revert cleanly if the API call fails.

/**
 * Moves one or more applications to a new status column in local state.
 * `state` is the grouped shape: { Applied: [...], Shortlisted: [...], ... }.
 * Returns a NEW object (never mutates `state`) so React re-renders correctly.
 */
export const applyOptimisticUpdate = (state, applicationIds, newStatus) => {
  const idSet = new Set(applicationIds);
  const next = {};
  let movedCards = [];

  // Pull the moving cards out of whichever column they're currently in.
  for (const status of Object.keys(state)) {
    const remaining = [];
    for (const app of state[status]) {
      if (idSet.has(app._id)) {
        movedCards.push({ ...app, status: newStatus });
      } else {
        remaining.push(app);
      }
    }
    next[status] = remaining;
  }

  // Newest-moved-first so the change is easy to spot in the destination column.
  next[newStatus] = [...movedCards, ...(next[newStatus] || [])];

  return next;
};

/**
 * Simple revert — just hand back the snapshot taken before the optimistic
 * update was applied. Kept as a named function (rather than inlining
 * `setApplications(previousState)` everywhere) so every rollback path reads
 * the same and is easy to grep for.
 */
export const revertOptimisticUpdate = (previousState) => previousState;

export default { applyOptimisticUpdate, revertOptimisticUpdate };
