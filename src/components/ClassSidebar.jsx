import { useEffect, useState } from "react";
import { letterForScore } from "../utils/grading";
import { UNASSIGNED_SEMESTER } from "../utils/storage";

const EXPANDED_SEMESTERS_KEY = "grade-calculator-expanded-semesters";

function loadExpanded() {
  try {
    const raw = localStorage.getItem(EXPANDED_SEMESTERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/** Build the display groups: one per explicit semester (in creation order),
 * plus a trailing read-only "Unassigned" group for any legacy classes whose
 * semester doesn't match one of the explicit semester names. */
function buildGroups(profiles, semesters) {
  const bySemester = new Map(semesters.map((name) => [name, []]));
  const leftovers = [];

  profiles.forEach((p) => {
    const key = p.semester && p.semester.trim() ? p.semester.trim() : "";
    if (key && bySemester.has(key)) {
      bySemester.get(key).push(p);
    } else {
      leftovers.push(p);
    }
  });

  const groups = semesters.map((name) => ({
    key: name,
    items: bySemester.get(name) || [],
    managed: true,
  }));

  if (leftovers.length > 0) {
    groups.push({ key: UNASSIGNED_SEMESTER, items: leftovers, managed: false });
  }

  return groups;
}

export default function ClassSidebar({
  profiles,
  semesters,
  grades, // { [classId]: currentGrade }
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onRename,
  onDelete,
  onAddSemester,
  onRenameSemester,
  onDeleteSemester,
  onCreateClassInSemester,
  settingsOpen,
  onOpenSettings,
  activeSemesterView,
  onSelectSemester,
  overviewOpen,
  onOpenOverview,
}) {
  const groups = buildGroups(profiles, semesters);
  const [expanded, setExpanded] = useState(loadExpanded);
  const [editingSemester, setEditingSemester] = useState(null);
  const [addingSemester, setAddingSemester] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [editingClassId, setEditingClassId] = useState(null);

  function commitRenameClass(id, value) {
    if (value.trim()) onRename(id, value.trim());
    setEditingClassId(null);
  }

  // Always keep the semester containing the active class expanded, so
  // switching classes never hides the one you're looking at.
  useEffect(() => {
    const activeProfile = profiles.find((p) => p.id === activeId);
    if (!activeProfile) return;
    const key =
      activeProfile.semester && activeProfile.semester.trim()
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

  function commitAddSemester() {
    if (newSemesterName.trim()) {
      onAddSemester(newSemesterName);
      setExpanded((prev) => new Set(prev).add(newSemesterName.trim()));
    }
    setNewSemesterName("");
    setAddingSemester(false);
  }

  function commitRenameSemester(oldName, value) {
    if (value.trim() && value.trim() !== oldName) {
      onRenameSemester(oldName, value);
      setExpanded((prev) => {
        if (!prev.has(oldName)) return prev;
        const next = new Set(prev);
        next.delete(oldName);
        next.add(value.trim());
        return next;
      });
    }
    setEditingSemester(null);
  }

  // "Current semester" = whichever semester the active class belongs to.
  // Used to trim the collapsed view down to just the relevant classes
  // instead of every class from every semester.
  const activeProfile = profiles.find((p) => p.id === activeId);
  const currentSemesterKey = activeProfile
    ? activeProfile.semester && activeProfile.semester.trim()
      ? activeProfile.semester.trim()
      : UNASSIGNED_SEMESTER
    : null;
  const collapsedProfiles = currentSemesterKey
    ? profiles.filter((p) => {
        const key = p.semester && p.semester.trim() ? p.semester.trim() : UNASSIGNED_SEMESTER;
        return key === currentSemesterKey;
      })
    : profiles;

  return (
    <aside className={`class-sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className={`sidebar-overview-btn ${overviewOpen ? "active" : ""}`}
        onClick={onOpenOverview}
        title="Overview"
      >
        <span className="sidebar-overview-icon">▦</span>
        {!collapsed && <span>Overview</span>}
      </button>

      <div className="class-sidebar-scroll">
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
          {currentSemesterKey && (
            <div className="semester-caret-label" title={currentSemesterKey}>
              {currentSemesterKey === UNASSIGNED_SEMESTER ? "—" : currentSemesterKey.slice(0, 3)}
            </div>
          )}
          {collapsedProfiles.map((p) => {
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
        <>
          {groups.map((group) => {
            const isOpen = expanded.has(group.key);
            const isEditing = editingSemester === group.key;

            const isSemesterActive = activeSemesterView === group.key;

            return (
              <div key={group.key} className={`semester-group ${isSemesterActive ? "active" : ""}`}>
                <div className="semester-group-header">
                  <button className="semester-caret-btn" onClick={() => toggleSemester(group.key)}>
                    {isOpen ? "▾" : "▸"}
                  </button>

                  {isEditing ? (
                    <input
                      autoFocus
                      className="semester-name-input"
                      defaultValue={group.key}
                      onBlur={(e) => commitRenameSemester(group.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                        if (e.key === "Escape") setEditingSemester(null);
                      }}
                    />
                  ) : (
                    <span
                      className="semester-group-label"
                      onClick={() => onSelectSemester(group.key)}
                      onDoubleClick={() => group.managed && setEditingSemester(group.key)}
                      title={
                        group.managed ? "Click for GPA/QPA, double-click to rename" : "Click for GPA/QPA"
                      }
                    >
                      {group.key}
                    </span>
                  )}

                  <span className="semester-count">{group.items.length}</span>

                  {group.managed && (
                    <button
                      className="icon-btn"
                      onClick={() => onCreateClassInSemester(group.key)}
                      title="Add class to this semester"
                    >
                      +
                    </button>
                  )}
                  {group.managed && group.items.length === 0 && (
                    <button
                      className="icon-btn danger"
                      onClick={() => onDeleteSemester(group.key)}
                      title="Delete empty semester"
                    >
                      ✕
                    </button>
                  )}
                </div>

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
                            {editingClassId === p.id ? (
                              <input
                                autoFocus
                                className="class-sidebar-name"
                                defaultValue={p.name}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => commitRenameClass(p.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") e.target.blur();
                                  if (e.key === "Escape") setEditingClassId(null);
                                }}
                              />
                            ) : (
                              <span
                                className="class-sidebar-name class-sidebar-name-label"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClassId(p.id);
                                }}
                                title="Double-click to rename"
                              >
                                {p.name}
                              </span>
                            )}
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {addingSemester ? (
            <div className="add-semester-row">
              <input
                autoFocus
                className="add-semester-input"
                placeholder="e.g. Fall 2026"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAddSemester();
                  if (e.key === "Escape") {
                    setAddingSemester(false);
                    setNewSemesterName("");
                  }
                }}
                onBlur={commitAddSemester}
              />
            </div>
          ) : (
            <button className="add-btn class-sidebar-add" onClick={() => setAddingSemester(true)}>
              + Add semester
            </button>
          )}
        </>
      )}

      {collapsed && (
        <button className="add-btn class-sidebar-add" onClick={onToggleCollapsed} title="Expand to add">
          +
        </button>
      )}
      </div>

      <button
        className={`sidebar-settings-btn ${settingsOpen ? "active" : ""}`}
        onClick={onOpenSettings}
        title="Settings"
      >
        <span className="sidebar-settings-icon">⚙</span>
        {!collapsed && <span>Settings</span>}
      </button>
    </aside>
  );
}
