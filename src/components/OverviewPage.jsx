import { useEffect, useMemo, useState } from "react";
import {
  computeOverall,
  computeSemesterGpa,
  computeEffectiveGpa,
  letterForScore,
  withPassNoPass,
} from "../utils/grading";
import { groupProfilesBySemester, loadWhatIfOverrides, saveWhatIfOverrides } from "../utils/storage";

const NEW_SEMESTER_OPTION = "__new_semester__";
const LAST_MANUAL_SEMESTER_KEY = "grade-calculator-last-manual-semester";
// Reserved key for the Overview page's own What-If overrides, stored
// alongside the per-semester ones in the same localStorage blob (see
// loadWhatIfOverrides/saveWhatIfOverrides in storage.js) — safe as long as
// no real semester is ever literally named this, same trick as
// NEW_SEMESTER_OPTION above.
const OVERVIEW_WHATIF_KEY = "__overview__";
const COLLAPSED_SEMESTERS_KEY = "grade-calculator-overview-collapsed-semesters";

function loadCollapsedSemesters() {
  try {
    const raw = localStorage.getItem(COLLAPSED_SEMESTERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function loadLastManualSemester() {
  try {
    return localStorage.getItem(LAST_MANUAL_SEMESTER_KEY) || "";
  } catch {
    return "";
  }
}

function saveLastManualSemester(name) {
  try {
    localStorage.setItem(LAST_MANUAL_SEMESTER_KEY, name);
  } catch {
    // ignore
  }
}

let manualRowIdCounter = 0;
function newManualRow(letter) {
  manualRowIdCounter += 1;
  return { key: manualRowIdCounter, name: "", credits: 3, letter };
}

// A quick "add classes you already finished" form. Semester is picked once,
// on the left — since it's rare to backfill classes from more than one
// semester in the same sitting — and every class row on the right shares
// it, so you can queue up a whole semester's transcript (name/credits/
// letter per row) and submit all of them in one click instead of reopening
// this form per class. The semester dropdown includes a "+ New
// semester..." option so you're not forced to go create one in the sidebar
// first — a semester is just a name either way, and can hold a mix of
// fully-detailed classes and quick past-class entries like these.
function AddPastClassForm({ semesters, defaultScale, onAdd, onAddSemester }) {
  const [open, setOpen] = useState(false);
  const letterOptions = withPassNoPass(defaultScale);
  const defaultLetter = letterOptions[0]?.letter || "";
  // Defaults to whichever semester you used last time, so batches from the
  // same old semester in a row don't mean re-picking it every time.
  const [semester, setSemester] = useState(() => {
    const last = loadLastManualSemester();
    return last && semesters.includes(last) ? last : semesters[0] || "";
  });
  const [creatingSemester, setCreatingSemester] = useState(semesters.length === 0);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [rows, setRows] = useState(() => [newManualRow(defaultLetter)]);

  function close() {
    setRows([newManualRow(defaultLetter)]);
    setCreatingSemester(semesters.length === 0);
    setNewSemesterName("");
    setOpen(false);
    // semester intentionally left as-is, so the next batch defaults to it
  }

  function handleSemesterSelect(value) {
    if (value === NEW_SEMESTER_OPTION) {
      setCreatingSemester(true);
    } else {
      setSemester(value);
    }
  }

  function commitNewSemester() {
    const trimmed = newSemesterName.trim();
    if (!trimmed) return;
    onAddSemester(trimmed);
    setSemester(trimmed);
    setCreatingSemester(false);
    setNewSemesterName("");
  }

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newManualRow(defaultLetter)]);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  const validRows = rows.filter((r) => r.name.trim());

  function handleAddAll() {
    const targetSemester = creatingSemester ? newSemesterName.trim() : semester;
    if (!targetSemester || validRows.length === 0) return;
    if (creatingSemester) onAddSemester(targetSemester);
    validRows.forEach((r) => {
      onAdd(r.name.trim(), targetSemester, r.credits === "" ? 0 : Number(r.credits), r.letter);
    });
    saveLastManualSemester(targetSemester);
    setSemester(targetSemester);
    setCreatingSemester(false);
    setNewSemesterName("");
    setRows([newManualRow(defaultLetter)]);
    // stays open — batching several semesters in a row shouldn't mean
    // reopening the form each time
  }

  if (!open) {
    return (
      <button type="button" className="add-btn" onClick={() => setOpen(true)}>
        + Add past classes
      </button>
    );
  }

  return (
    <div className="add-past-class-form">
      <div className="add-past-class-semester-col">
        <span className="add-past-class-semester-label">Semester</span>
        {creatingSemester ? (
          <input
            autoFocus
            className="add-past-class-name"
            placeholder="New semester name"
            value={newSemesterName}
            onChange={(e) => setNewSemesterName(e.target.value)}
            onBlur={commitNewSemester}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNewSemester();
              if (e.key === "Escape" && semesters.length > 0) {
                setCreatingSemester(false);
                setNewSemesterName("");
              }
            }}
          />
        ) : (
          <select value={semester} onChange={(e) => handleSemesterSelect(e.target.value)}>
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={NEW_SEMESTER_OPTION}>+ New semester...</option>
          </select>
        )}
      </div>

      <div className="add-past-class-rows-col">
        <div className="add-past-class-row-header">
          <span className="add-past-class-semester-label add-past-class-name-label">Class</span>
          <span className="add-past-class-semester-label add-past-class-credits">Credits</span>
          <span className="add-past-class-semester-label add-past-class-letter-label">Letter</span>
          <span className="add-past-class-row-header-spacer" />
        </div>
        {rows.map((row, i) => (
          <div className="add-past-class-row" key={row.key}>
            <input
              className="add-past-class-name"
              placeholder="Class name"
              value={row.name}
              onChange={(e) => updateRow(row.key, { name: e.target.value })}
              autoFocus={i === rows.length - 1}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              className="add-past-class-credits"
              value={row.credits}
              onChange={(e) =>
                updateRow(row.key, { credits: e.target.value === "" ? "" : Number(e.target.value) })
              }
            />
            <select
              className="add-past-class-letter"
              value={row.letter}
              onChange={(e) => updateRow(row.key, { letter: e.target.value })}
            >
              {letterOptions.map((s) => (
                <option key={s.letter} value={s.letter}>
                  {s.letter}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn danger"
              title="Remove this row"
              disabled={rows.length === 1}
              onClick={() => removeRow(row.key)}
            >
              ✕
            </button>
          </div>
        ))}

        <div className="add-past-class-actions">
          <button type="button" className="add-btn" onClick={addRow}>
            + Add another class
          </button>
          <button
            type="button"
            className="add-btn primary"
            disabled={validRows.length === 0}
            onClick={handleAddAll}
          >
            Add {validRows.length || ""} class{validRows.length === 1 ? "" : "es"}
          </button>
          <button type="button" className="add-btn" onClick={close}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Popup for reading/writing one class's notes. Kept as its own small modal
// (reusing the existing .modal-overlay/.modal-box styles from the apply-
// scale modal) rather than an inline textarea in the table, since notes can
// run long and the breakdown table is already fairly dense.
function NoteModal({ profile, onSave, onClose }) {
  const [value, setValue] = useState(profile.overviewNote || "");

  function handleSave() {
    onSave(profile.id, value);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Notes — {profile.name}</h3>
        <textarea
          autoFocus
          className="overview-note-textarea"
          placeholder="Ideas, reminders, anything worth remembering about this class..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="modal-actions">
          <button type="button" className="add-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="add-btn primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage({
  profiles,
  semesters,
  settings,
  onSelectSemester,
  onSelectClass,
  onAddManualClass,
  onUpdateManualClass,
  onDeleteManualClass,
  onAddSemester,
  onUpdateNote,
}) {
  const showGpa = settings.gpaDisplay !== "qpa";
  const showQpa = settings.gpaDisplay !== "gpa";

  const real = computeSemesterGpa(profiles, settings.gradePoints);
  const groups = groupProfilesBySemester(profiles, semesters);
  const hasManualClasses = profiles.some((p) => p.isManual);
  // Manual classes aren't editable by default — there's rarely a reason to
  // touch one again once it's entered. This toggle switches every manual
  // row across every semester into an editable state (name/credits/letter
  // inputs + delete) at once, instead of always showing input chrome for
  // something that's usually set-and-forget.
  const [editingManual, setEditingManual] = useState(false);
  const [noteProfile, setNoteProfile] = useState(null);

  // Each semester block can be minimized independently — collapses the
  // breakdown table underneath while keeping the GPA/QPA/units summary
  // line visible in the header. Persisted so it stays collapsed on reload,
  // same pattern as the sidebar's expanded-semesters state.
  const [collapsedSemesters, setCollapsedSemesters] = useState(loadCollapsedSemesters);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_SEMESTERS_KEY, JSON.stringify([...collapsedSemesters]));
    } catch {
      // ignore
    }
  }, [collapsedSemesters]);

  function toggleSemesterCollapsed(name) {
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // What-If mode, app-wide version of the one on the Semester page: pick a
  // hypothetical letter for any class (real or manual, from any semester)
  // and see cumulative GPA/QPA recompute live, without touching real data.
  // Shares the math (computeEffectiveGpa) and the persistence pattern
  // (loadWhatIfOverrides/saveWhatIfOverrides) with the Semester page.
  const [whatIf, setWhatIf] = useState(false);
  const [overrides, setOverrides] = useState(() => loadWhatIfOverrides(OVERVIEW_WHATIF_KEY));

  useEffect(() => {
    saveWhatIfOverrides(OVERVIEW_WHATIF_KEY, overrides);
  }, [overrides]);

  const cumulative = useMemo(() => {
    if (!whatIf) return real;
    return computeEffectiveGpa(profiles, settings.gradePoints, overrides);
  }, [whatIf, overrides, real, profiles, settings.gradePoints]);

  function setOverride(id, letter) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!letter) delete next[id];
      else next[id] = letter;
      return next;
    });
  }

  function toggleWhatIf() {
    setWhatIf((prev) => !prev);
    setEditingManual(false); // don't allow editing and hypothetical-picking at the same time
  }

  function resetOverrides() {
    setOverrides({});
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  // Total units across every semester, plus whatever transfer credit was
  // entered in Settings. Feeds the degree-progress bar below — units count
  // regardless of GPA inclusion, same reasoning as the semester page.
  // Units themselves aren't affected by What-If (only grades are), so this
  // always reads off the real numbers even while What-If is active.
  const totalUnitsEarned = real.rows.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
  const transferUnits = Number(settings.transferUnits) || 0;
  const unitsTowardDegree = totalUnitsEarned + transferUnits;
  const unitsNeeded = settings.totalUnitsNeeded;
  const hasProgressGoal = unitsNeeded !== null && unitsNeeded !== undefined && unitsNeeded > 0;
  const progressPct = hasProgressGoal
    ? Math.min(100, Math.round((unitsTowardDegree / unitsNeeded) * 100))
    : 0;

  function deleteManual(p) {
    if (window.confirm(`Remove "${p.name}" from your records? This can't be undone.`)) {
      onDeleteManualClass(p.id);
    }
  }

  return (
    <div className="card overview-page">
      <div className="overview-add-row">
        <AddPastClassForm
          semesters={semesters}
          defaultScale={settings.defaultScale}
          onAdd={onAddManualClass}
          onAddSemester={onAddSemester}
        />
        <span className="muted small">
          Already finished a semester and don't want to enter every assignment? Just record the
          credits and final letter grade here instead.
        </span>
        {hasManualClasses && !whatIf && (
          <button
            type="button"
            className={`add-btn ${editingManual ? "primary" : ""}`}
            onClick={() => setEditingManual((v) => !v)}
          >
            {editingManual ? "Done editing" : "Edit past classes"}
          </button>
        )}
      </div>

      {profiles.length > 0 && (
        <div className="what-if-toggle-row">
          <label className="what-if-toggle">
            <input type="checkbox" checked={whatIf} onChange={toggleWhatIf} />
            What-If mode — try different letter grades, for any class in any semester, without
            changing your real data
          </label>
          {whatIf && hasOverrides && (
            <button type="button" className="what-if-reset-btn" onClick={resetOverrides}>
              Reset to actual grades
            </button>
          )}
        </div>
      )}

      {whatIf && (
        <div className="what-if-banner">
          You're viewing hypothetical grades — these are never counted toward your real GPA/QPA.
          Your hypothetical picks are saved, so you can leave and come back to the same setup.
        </div>
      )}

      {profiles.length === 0 ? (
        <p className="muted small">No classes yet.</p>
      ) : (
        <>
          <div className="summary-label">Cumulative, across every semester</div>
          <div className="semester-gpa-row">
            {showGpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">GPA (simple average)</div>
                <div className="summary-score">
                  {cumulative.gpa === null ? "—" : cumulative.gpa.toFixed(2)}
                </div>
              </div>
            )}
            {showQpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">QPA (credit-weighted)</div>
                <div className="summary-score">
                  {cumulative.qpa === null ? "—" : cumulative.qpa.toFixed(2)}
                </div>
              </div>
            )}
            <div className="semester-gpa-block">
              <div className="summary-label">Total units{transferUnits > 0 ? " (+ transfer)" : ""}</div>
              <div className="summary-score">{unitsTowardDegree}</div>
            </div>
          </div>

          {hasProgressGoal && (
            <div className="degree-progress">
              <div className="degree-progress-label">
                <span>
                  {unitsTowardDegree} / {unitsNeeded} units toward your degree
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="degree-progress-track">
                <div className="degree-progress-fill" style={{ "--progress": progressPct / 100 }} />
              </div>
            </div>
          )}

          {groups.map((group) => {
            const { rows, gpa, qpa } = whatIf
              ? computeEffectiveGpa(group.profiles, settings.gradePoints, overrides)
              : computeSemesterGpa(group.profiles, settings.gradePoints);
            const semesterUnits = rows.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
            const isCollapsed = collapsedSemesters.has(group.name);
            return (
              <div className={`overview-semester-block ${isCollapsed ? "collapsed" : ""}`} key={group.name}>
                <div
                  className="overview-semester-header"
                  onClick={() => onSelectSemester(group.name)}
                  title="Open this semester's page"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelectSemester(group.name);
                  }}
                >
                  <span className="overview-semester-title">
                    <span
                      className="overview-semester-caret"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSemesterCollapsed(group.name);
                      }}
                      title={isCollapsed ? "Expand" : "Minimize"}
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </span>
                    <span className="overview-semester-name">{group.name}</span>
                  </span>
                  <span className="overview-semester-gpa">
                    {showGpa && `GPA ${gpa === null ? "—" : gpa.toFixed(2)}`}
                    {showGpa && showQpa && "  ·  "}
                    {showQpa && `QPA ${qpa === null ? "—" : qpa.toFixed(2)}`}
                    {(showGpa || showQpa) && "  ·  "}
                    {semesterUnits} units
                  </span>
                </div>

                {!isCollapsed && (
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Credits</th>
                      {!whatIf && <th>Grade %</th>}
                      <th>Letter</th>
                      <th>GPA Points</th>
                      <th>Counted</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.profiles.map((p) => {
                      const row = rows.find((x) => x.id === p.id);
                      const hasNote = (p.overviewNote || "").trim().length > 0;
                      const noteCell = (
                        <td>
                          <button
                            type="button"
                            className={`icon-btn overview-note-btn ${hasNote ? "has-note" : ""}`}
                            title={hasNote ? "View/edit notes" : "Add notes"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteProfile(p);
                            }}
                          >
                            📝
                          </button>
                        </td>
                      );

                      // What-If mode: one unified row shape for every class
                      // (manual or real) — no percentage column (there's
                      // nothing meaningful to show while previewing a
                      // hypothetical letter), and the letter itself becomes
                      // a picker. Editing name/credits/manualLetter for
                      // real is turned off while What-If is on (see
                      // toggleWhatIf), so this is the only manual-row shape
                      // that applies here.
                      if (whatIf) {
                        const scale = withPassNoPass(p.scale || settings.defaultScale);
                        return (
                          <tr
                            key={p.id}
                            className={p.isManual ? "overview-manual-row" : "semester-row-clickable"}
                            onClick={() => !p.isManual && onSelectClass(p.id)}
                          >
                            <td>{p.name}</td>
                            <td>{p.credits === undefined || p.credits === "" ? "—" : p.credits}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <select
                                className={`what-if-letter-select ${row?.isHypothetical ? "hypothetical" : ""}`}
                                value={overrides[p.id] || ""}
                                onChange={(e) => setOverride(p.id, e.target.value)}
                              >
                                <option value="">{row ? row.letter : "—"}</option>
                                {scale
                                  .map((s) => s.letter)
                                  .filter((letter) => letter !== (row ? row.letter : null))
                                  .map((letter) => (
                                    <option key={letter} value={letter}>
                                      {letter}
                                    </option>
                                  ))}
                              </select>
                            </td>
                            <td>{row && row.points !== null ? row.points.toFixed(1) : "—"}</td>
                            <td>{row && row.included ? "Yes" : "No"}</td>
                            {noteCell}
                            <td></td>
                          </tr>
                        );
                      }

                      if (p.isManual) {
                        if (!editingManual) {
                          return (
                            <tr key={p.id} className="overview-manual-row">
                              <td>{p.name}</td>
                              <td>{p.credits === undefined || p.credits === "" ? "—" : p.credits}</td>
                              <td className="muted">—</td>
                              <td>{p.manualLetter || "—"}</td>
                              <td>{row && row.points !== null ? row.points.toFixed(1) : "—"}</td>
                              <td>{row && row.included ? "Yes" : "No"}</td>
                              {noteCell}
                              <td></td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={p.id} className="overview-manual-row">
                            <td>
                              <input
                                className="overview-manual-input"
                                value={p.name}
                                onChange={(e) => onUpdateManualClass(p.id, { name: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                className="overview-manual-input overview-manual-credits"
                                value={p.credits}
                                onChange={(e) =>
                                  onUpdateManualClass(p.id, {
                                    credits: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="muted">—</td>
                            <td>
                              <select
                                className="overview-manual-select"
                                value={p.manualLetter || ""}
                                onChange={(e) =>
                                  onUpdateManualClass(p.id, { manualLetter: e.target.value })
                                }
                              >
                                {withPassNoPass(p.scale || settings.defaultScale).map((s) => (
                                  <option key={s.letter} value={s.letter}>
                                    {s.letter}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>{row && row.points !== null ? row.points.toFixed(1) : "—"}</td>
                            <td>{row && row.included ? "Yes" : "No"}</td>
                            {noteCell}
                            <td>
                              <button
                                className="icon-btn danger"
                                title="Remove this class"
                                onClick={() => deleteManual(p)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const overall = computeOverall(p.categories);
                      const letter = row ? row.letter : letterForScore(overall.currentGrade, p.scale);
                      return (
                        <tr
                          key={p.id}
                          className="semester-row-clickable"
                          onClick={() => onSelectClass(p.id)}
                        >
                          <td>{p.name}</td>
                          <td>{p.credits === undefined || p.credits === "" ? "—" : p.credits}</td>
                          <td>{overall.currentGrade === null ? "—" : `${overall.currentGrade.toFixed(1)}%`}</td>
                          <td>{letter}</td>
                          <td>{row && row.points !== null ? row.points.toFixed(1) : "—"}</td>
                          <td>{row && row.included ? "Yes" : "No"}</td>
                          {noteCell}
                          <td></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}
              </div>
            );
          })}
        </>
      )}

      {noteProfile && (
        <NoteModal
          profile={noteProfile}
          onSave={onUpdateNote}
          onClose={() => setNoteProfile(null)}
        />
      )}
    </div>
  );
}
