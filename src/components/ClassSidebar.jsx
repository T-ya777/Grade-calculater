import { letterForScore } from "../utils/grading";

export default function ClassSidebar({
  profiles,
  grades, // { [classId]: currentGrade }
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  return (
    <aside className={`class-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="class-sidebar-header">
        {!collapsed && <h2>Classes</h2>}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "«" : "»"}
        </button>
      </div>

      <div className="class-sidebar-list">
        {profiles.map((p) => {
          const grade = grades[p.id];
          const letter = grade === null || grade === undefined ? "—" : letterForScore(grade, p.scale);
          const isActive = p.id === activeId;

          if (collapsed) {
            return (
              <button
                key={p.id}
                className={`class-chip ${isActive ? "active" : ""}`}
                onClick={() => onSelect(p.id)}
                title={p.name}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </button>
            );
          }

          return (
            <div
              key={p.id}
              className={`class-sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => onSelect(p.id)}
            >
              <div className="class-sidebar-item-main">
                <input
                  className="class-sidebar-name"
                  value={p.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onRename(p.id, e.target.value)}
                />
                <button
                  className="icon-btn danger"
                  title="Delete class"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="class-sidebar-grade">
                <span className="mini-letter">{letter}</span>
                <span className="mini-pct">{grade === null || grade === undefined ? "no grades yet" : `${grade.toFixed(1)}%`}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="add-btn class-sidebar-add" onClick={onCreate}>
        {collapsed ? "+" : "+ New class"}
      </button>
    </aside>
  );
}
