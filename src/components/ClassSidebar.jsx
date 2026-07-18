import { useEffect, useState } from "react";
import { letterForScore } from "../utils/grading";
import { UNASSIGNED_SEMESTER } from "../utils/storage";

const EXPANDED_SEMESTERS_KEY = "grade-calculator-expanded-semesters";

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

function loadExpanded() {
  try {
    const raw = localStorage.getItem(EXPANDED_SEMESTERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
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
  const [expanded, setExpanded] = useState(loadExpanded);

  // Always keep the semester containing the active class expanded, so
  // switching classes never hides the one you're looking at.
  useEffect(() => {
    const activeProfile = profiles.find((p) => p.id === activeId);
    if (!activeProfile) return;
    const key = activeProfile.semester && activeProfile.semester.trim()
      ? activeProfile.semester.trim()
      : UNASSIGNED_SEMESTER;
    setExpanded((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, [activeId, profiles]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_SEMESTERS_KEY, JSON.stringify([...expanded]));
    } catch {
      // ignore
    }
  }, [expanded]);

  function toggleSemester(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
        groups.map((group) => {
          const isOpen = expanded.has(group.key);
          return (
            <div key={group.key} className="semester-group">
              <button className="semester-group-header" onClick={() => toggleSemester(group.key)}>
                <span className="semester-caret">{isOpen ? "▾" : "▸"}</span>
                <span className="semester-group-label">{group.key}</span>
                <span className="semester-count">{group.items.length}</span>
              </button>

              {isOpen && (
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
                            {grade === null || grade === undefined
                              ? "no grades yet"
                              : `${grade.toFixed(1)}%`}
                          </span>
                          {p.credits !== undefined && p.credits !== "" && (
                            <span className="mini-credits">{p.credits} cr</span>
                          )}
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
              )}
            </div>
          );
        })
      )}

      <button className="add-btn class-sidebar-add" onClick={onCreate}>
        {collapsed ? "+" : "+ New class"}
      </button>
    </aside>
  );
}
