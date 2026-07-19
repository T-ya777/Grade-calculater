import { groupProfilesBySemester } from "../utils/storage";

// Shared checkbox list for "pick some classes" modals (apply scale, export
// scope). Groups classes by semester with a per-semester select-all
// shortcut, on top of the overall "select all".
export default function ClassPicker({ profiles, semesters, selected, onToggle, onToggleAll, onToggleGroup }) {
  const groups = groupProfilesBySemester(profiles, semesters);

  return (
    <>
      <label className="modal-select-all">
        <input
          type="checkbox"
          checked={selected.size === profiles.length && profiles.length > 0}
          onChange={onToggleAll}
        />
        Select all
      </label>

      <div className="modal-class-list">
        {profiles.length === 0 && <p className="muted small">No classes yet.</p>}
        {groups.map((group) => {
          const groupIds = group.profiles.map((p) => p.id);
          const allSelected = groupIds.every((id) => selected.has(id));
          return (
            <div key={group.name} className="modal-semester-group">
              <label className="modal-semester-row">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleGroup(groupIds, allSelected)}
                />
                <strong>{group.name}</strong>
              </label>
              {group.profiles.map((p) => (
                <label key={p.id} className="modal-class-row modal-class-row-nested">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => onToggle(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
