export default function ClassSelector({ profiles, activeId, onSelect, onCreate, onRename, onDelete }) {
  const active = profiles.find((p) => p.id === activeId);

  return (
    <div className="class-selector">
      <select value={activeId || ""} onChange={(e) => onSelect(e.target.value)}>
        {profiles.length === 0 && <option value="">No classes yet</option>}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {active && (
        <input
          className="class-rename"
          value={active.name}
          onChange={(e) => onRename(active.id, e.target.value)}
        />
      )}
      <button className="add-btn" onClick={onCreate}>
        + New class
      </button>
      {active && (
        <button className="icon-btn danger" onClick={() => onDelete(active.id)} title="Delete class">
          Delete class
        </button>
      )}
    </div>
  );
}
