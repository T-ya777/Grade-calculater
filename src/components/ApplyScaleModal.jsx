import { useState } from "react";

// Lets you pick exactly which existing classes should get the new default
// scale, instead of an all-or-nothing action. The window.confirm on top of
// this modal is a deliberate second confirmation, since this overwrites
// each selected class's grade cutoff table.
export default function ApplyScaleModal({ profiles, onCancel, onConfirm }) {
  const [selected, setSelected] = useState(() => new Set(profiles.map((p) => p.id)));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === profiles.length ? new Set() : new Set(profiles.map((p) => p.id))
    );
  }

  function handleApply() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const label = `${ids.length} class${ids.length === 1 ? "" : "es"}`;
    if (
      window.confirm(
        `This will overwrite the grade cutoff table for ${label}. This can't be undone. Continue?`
      )
    ) {
      onConfirm(ids);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Apply default scale to existing classes</h3>
        <p className="muted small">
          Choose which classes should get the new cutoff table. Grades and categories aren't
          touched — only the scale.
        </p>

        <label className="modal-select-all">
          <input
            type="checkbox"
            checked={selected.size === profiles.length && profiles.length > 0}
            onChange={toggleAll}
          />
          Select all
        </label>

        <div className="modal-class-list">
          {profiles.length === 0 && <p className="muted small">No classes yet.</p>}
          {profiles.map((p) => (
            <label key={p.id} className="modal-class-row">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              {p.name}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="add-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="add-btn primary" disabled={selected.size === 0} onClick={handleApply}>
            Apply to {selected.size} class{selected.size === 1 ? "" : "es"}
          </button>
        </div>
      </div>
    </div>
  );
}
