// Shown when trying to mark a category as the final exam while another
// category already holds that flag. Purely informational — no action is
// taken here, the user has to go unmark the other one first.
export default function FinalExamConflictModal({ currentFinalExamName, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Final exam already assigned</h3>
        <p className="muted small">
          "{currentFinalExamName}" is already marked as the final exam. Unmark it first, then come
          back and assign this category instead.
        </p>
        <div className="modal-actions">
          <button className="add-btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
