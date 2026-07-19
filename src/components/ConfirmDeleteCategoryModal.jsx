import { useState } from "react";

// Confirmation before deleting a whole category (and every assignment in
// it). Has a "don't ask me again" checkbox, unlike a plain window.confirm —
// once checked, the preference is saved (see storage.js) and future
// deletes skip this modal entirely.
export default function ConfirmDeleteCategoryModal({ categoryName, onCancel, onConfirm }) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Delete "{categoryName}"?</h3>
        <p className="muted small">
          This removes the category and every assignment in it. This can't be undone.
        </p>

        <label className="modal-select-all">
          <input
            type="checkbox"
            checked={dontAskAgain}
            onChange={(e) => setDontAskAgain(e.target.checked)}
          />
          Don't ask me again
        </label>

        <div className="modal-actions">
          <button className="add-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="add-btn danger" onClick={() => onConfirm(dontAskAgain)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
