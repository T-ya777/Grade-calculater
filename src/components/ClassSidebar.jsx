import { letterForScore } from "../utils/grading";
import { UNASSIGNED_SEMESTER } from "../utils/storage";

function groupBySemester(profiles) {
  const groups = new Map();
  profiles.forEach((p) => {
    const key = p.semester && p.semester.trim() ? p.semester.trim() : UNASSIGNED_SEMESTER;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  // Named semesters first (alphabetical), "Unassigned" last.
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === UNASSIGNED_SEMESTER) return 1;
    if (b === UNASSIGNED_SEMESTER) return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({ key, items: groups.get(key) }));
}

export default function ClassSidebar({
  profiles,
  grades, // { [classId]: currentGrade }
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onCreate,
  onRename,
  onSemesterChange,
  onDelete,
}) {
  const groups = groupBySemester(profiles);

  return (
    <aside className={`class-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="class-sidebar-header">
        {!collapsed && <h2>Classes</h2>}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {collapsed ? (
        <div className="class-sidebar-list">
          {profiles.map((p) => {
            const isActive = p.id === activeId;
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
          })}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="semester-group">
            <div className="semester-group-label">{group.key}</div>
            <div className="class-sidebar-list">
              {group.items.map((p) => {
                const grade = grades[p.id];
                const letter =
                  grade === null || grade === undefined ? "—" : letterForScore(grade, p.scale);
                const isActive = p.id === activeId;

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
                      <span className="mini-pct">
                        {grade === null || grade === undefined ? "no grades yet" : `${grade.toFixed(1)}%`}
                      </span>
                    </div>
                    <input
                      className="class-sidebar-semester"
                      placeholder="Semester (e.g. Fall 2026)"
                      value={p.semester || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onSemesterChange(p.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <button className="add-btn class-sidebar-add" onClick={onCreate}>
        {collapsed ? "+" : "+ New class"}
      </button>
    </aside>
  );
}
