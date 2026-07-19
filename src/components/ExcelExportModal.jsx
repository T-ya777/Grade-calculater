import { useState } from "react";
import ClassPicker from "./ClassPicker";

// Lets you pick which classes (individually or by whole semester) go into
// the Excel export, instead of always exporting everything.
export default function ExcelExportModal({ profiles, semesters, onCancel, onConfirm }) {
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

  function toggleGroup(ids, allSelected) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function handleExport() {
    const ids = new Set(selected);
    if (ids.size === 0) return;
    onConfirm(profiles.filter((p) => ids.has(p.id)));
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Export to Excel</h3>
        <p className="muted small">Choose which classes to include — by class, or by whole semester.</p>

        <ClassPicker
          profiles={profiles}
          semesters={semesters}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onToggleGroup={toggleGroup}
        />

        <div className="modal-actions">
          <button className="add-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="add-btn primary" disabled={selected.size === 0} onClick={handleExport}>
            Export {selected.size} class{selected.size === 1 ? "" : "es"}
          </button>
        </div>
      </div>
    </div>
  );
}
