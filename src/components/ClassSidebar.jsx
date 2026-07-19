import { useEffect, useRef, useState } from "react";
import { letterForScore } from "../utils/grading";
import { UNASSIGNED_SEMESTER } from "../utils/storage";

const EXPANDED_SEMESTERS_KEY = "grade-calculator-expanded-semesters";
const REORDER_HOLD_MS = 600;

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
  onReorderSemesters,
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
  // Press and hold a semester header (~2s) to enter reorder mode, then drag
  // to rearrange. Only real (managed) semesters can be dragged — the
  // read-only "Unassigned" bucket stays pinned wherever it lands.
  const [reorderingSemesters, setReorderingSemesters] = useState(false);
  const [dragSemester, setDragSemester] = useState(null);
  // Which group the dragged semester would land next to, and on which side
  // — drives the thin insertion-line indicator so it's obvious where a drop
  // will actually land instead of just highlighting the whole row.
  const [dropIndicator, setDropIndicator] = useState(null);
  const holdTimerRef = useRef(null);

  function startHold(key, managed) {
    if (!managed) return;
    cancelHold();
    holdTimerRef.current = setTimeout(() => {
      setReorderingSemesters(true);
    }, REORDER_HOLD_MS);
  }

  function cancelHold() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearDrag() {
    setDragSemester(null);
    setDropIndicator(null);
  }

  // Hovering over a group while dragging: figure out whether the pointer is
  // in the top or bottom half of that group, so the drop line renders
  // above or below it accordingly (rather than always snapping "before").
  function handleSemesterDragOver(e, key) {
    if (!reorderingSemesters || !dragSemester) return;
    e.preventDefault();
    if (key === dragSemester) {
      setDropIndicator(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    setDropIndicator({ key, position: before ? "before" : "after" });
  }

  function handleSemesterDrop(targetKey) {
    if (!dragSemester || dragSemester === targetKey) {
      clearDrag();
      return;
    }
    const order = [...semesters];
    const from = order.indexOf(dragSemester);
    let to = order.indexOf(targetKey);
    if (from === -1 || to === -1) {
      clearDrag();
      return;
    }
    order.splice(from, 1);
    if (to > from) to -= 1;
    const insertAt = dropIndicator && dropIndicator.position === "after" ? to + 1 : to;
    order.splice(insertAt, 0, dragSemester);
    onReorderSemesters(order);
    clearDrag();
  }

  useEffect(() => cancelHold, []);

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

  // Clicking a semester does two things at once: if it's not the semester
  // you're currently viewing, this opens its GPA/QPA page and expands the
  // class list underneath. If it IS the one you're already viewing,
  // clicking again closes the page and collapses the list — so there's
  // one click target instead of a separate expand toggle and a separate
  // "view GPA/QPA" button.
  function handleSemesterHeaderClick(key) {
    const isActive = activeSemesterView === key;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isActive) next.delete(key);
      else next.add(key);
      return next;
    });
    onSelectSemester(key);
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
  // Manual/"past" classes (entered from the Overview page, see
  // newManualClass) are excluded from the collapsed chip view — there's no
  // assignment detail to open, so a tiny unclickable chip isn't worth the
  // space there. They do still show in the expanded per-semester list
  // further down, just as a non-clickable row.
  const collapsedProfiles = (
    currentSemesterKey
      ? profiles.filter((p) => {
          const key = p.semester && p.semester.trim() ? p.semester.trim() : UNASSIGNED_SEMESTER;
          return key === currentSemesterKey;
        })
      : profiles
  ).filter((p) => !p.isManual);

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
          {reorderingSemesters && (
            <div className="semester-reorder-banner">
              <span>Drag semesters to reorder</span>
              <button
                type="button"
                className="add-btn"
                onClick={() => setReorderingSemesters(false)}
              >
                Done
              </button>
            </div>
          )}

          {groups.map((group) => {
            const isOpen = expanded.has(group.key);
            const isEditing = editingSemester === group.key;

            const isSemesterActive = activeSemesterView === group.key;
            const isDragging = dragSemester === group.key;

            const showLineBefore =
              dropIndicator && dropIndicator.key === group.key && dropIndicator.position === "before";
            const showLineAfter =
              dropIndicator && dropIndicator.key === group.key && dropIndicator.position === "after";

            return (
              <div key={group.key}>
                {showLineBefore && <div className="semester-drop-line" />}
                <div
                  className={`semester-group ${isSemesterActive ? "active" : ""} ${isDragging ? "dragging" : ""}`}
                  onDragOver={(e) => handleSemesterDragOver(e, group.key)}
                  onDrop={() => handleSemesterDrop(group.key)}
                >
                <div
                  className="semester-group-header"
                  onClick={() => {
                    if (!reorderingSemesters) handleSemesterHeaderClick(group.key);
                  }}
                  onMouseDown={() => startHold(group.key, group.managed)}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={() => startHold(group.key, group.managed)}
                  onTouchEnd={cancelHold}
                  onTouchMove={cancelHold}
                  draggable={reorderingSemesters && group.managed}
                  onDragStart={() => setDragSemester(group.key)}
                  onDragEnd={clearDrag}
                  title={
                    reorderingSemesters
                      ? "Drag to reorder"
                      : "Click to view GPA/QPA — press and hold to reorder"
                  }
                >
                  <span className="semester-caret-btn">{isOpen ? "▾" : "▸"}</span>

                  {isEditing ? (
                    <input
                      autoFocus
                      className="semester-name-input"
                      defaultValue={group.key}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => commitRenameSemester(group.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.target.blur();
                        if (e.key === "Escape") setEditingSemester(null);
                      }}
                    />
                  ) : (
                    <span
                      className="semester-group-label"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (group.managed) setEditingSemester(group.key);
                      }}
                      title={group.managed ? "Double-click to rename" : undefined}
                    >
                      {group.key}
                    </span>
                  )}

                  <span className="semester-count">{group.items.length}</span>

                  {group.managed && (
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateClassInSemester(group.key);
                      }}
                      title="Add class to this semester"
                    >
                      +
                    </button>
                  )}
                  {group.managed && group.items.length === 0 && (
                    <button
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSemester(group.key);
                      }}
                      title="Delete empty semester"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="class-sidebar-list">
                    {group.items.map((p) => {
                      if (p.isManual) {
                        // Entered from the Overview page — shown here for
                        // visibility, but not clickable (there's no
                        // assignment detail to open) and no percentage
                        // since there's nothing computed, just the letter
                        // that was typed in.
                        return (
                          <div
                            key={p.id}
                            className="class-sidebar-item class-sidebar-item-manual"
                            title="Entered manually — manage it from the Overview page"
                          >
                            <div className="class-sidebar-item-main">
                              <span className="class-sidebar-name class-sidebar-name-label">
                                {p.name}
                              </span>
                            </div>
                            <div className="class-sidebar-grade">
                              <span className="mini-letter">{p.manualLetter || "—"}</span>
                              <span className="mini-pct">manual entry</span>
                              {p.credits !== undefined && p.credits !== "" && (
                                <span className="mini-credits">{p.credits} cr</span>
                              )}
                            </div>
                          </div>
                        );
                      }

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
                {showLineAfter && <div className="semester-drop-line" />}
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
