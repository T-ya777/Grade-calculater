import { useState } from "react";
import { computeOverall, computeSemesterGpa, letterForScore } from "../utils/grading";
import { groupProfilesBySemester } from "../utils/storage";

const NEW_SEMESTER_OPTION = "__new_semester__";
const LAST_MANUAL_SEMESTER_KEY = "grade-calculator-last-manual-semester";

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

// A quick "add a class you already finished" form — name, semester,
// credits, and the final letter grade, no assignment detail needed. Kept
// closed by default so it doesn't clutter the page for anyone who doesn't
// need it. The semester dropdown includes a "+ New semester..." option so
// you're not forced to go create one in the sidebar first — a semester is
// just a name either way, and can hold a mix of fully-detailed classes and
// quick past-class entries like this one.
function AddPastClassForm({ semesters, defaultScale, onAdd, onAddSemester }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  // Defaults to whichever semester you used last time, so adding several
  // past classes from the same old semester in a row doesn't mean
  // re-picking it every time.
  const [semester, setSemester] = useState(() => {
    const last = loadLastManualSemester();
    return last && semesters.includes(last) ? last : semesters[0] || "";
  });
  const [creatingSemester, setCreatingSemester] = useState(semesters.length === 0);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [credits, setCredits] = useState(3);
  const [letter, setLetter] = useState(defaultScale[0]?.letter || "");

  function reset() {
    setName("");
    setCreatingSemester(false);
    setNewSemesterName("");
    setCredits(3);
    setLetter(defaultScale[0]?.letter || "");
    setOpen(false);
    // semester intentionally left as-is, so the next add defaults to it
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

  function handleAdd() {
    const targetSemester = creatingSemester ? newSemesterName.trim() : semester;
    if (!name.trim() || !targetSemester || !letter) return;
    if (creatingSemester) onAddSemester(targetSemester);
    onAdd(name.trim(), targetSemester, credits === "" ? 0 : Number(credits), letter);
    saveLastManualSemester(targetSemester);
    setSemester(targetSemester);
    reset();
  }

  if (!open) {
    return (
      <button type="button" className="add-btn" onClick={() => setOpen(true)}>
        + Add a past class
      </button>
    );
  }

  return (
    <div className="add-past-class-form">
      <input
        className="add-past-class-name"
        placeholder="Class name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      {creatingSemester ? (
        <input
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

      <input
        type="number"
        min="0"
        step="0.5"
        className="add-past-class-credits"
        value={credits}
        onChange={(e) => setCredits(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <select value={letter} onChange={(e) => setLetter(e.target.value)}>
        {defaultScale.map((s) => (
          <option key={s.letter} value={s.letter}>
            {s.letter}
          </option>
        ))}
      </select>
      <button type="button" className="add-btn primary" disabled={!name.trim()} onClick={handleAdd}>
        Add
      </button>
      <button type="button" className="add-btn" onClick={reset}>
        Cancel
      </button>
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

  const cumulative = computeSemesterGpa(profiles, settings.gradePoints);
  const groups = groupProfilesBySemester(profiles, semesters);
  const hasManualClasses = profiles.some((p) => p.isManual);
  // Manual classes aren't editable by default — there's rarely a reason to
  // touch one again once it's entered. This toggle switches every manual
  // row across every semester into an editable state (name/credits/letter
  // inputs + delete) at once, instead of always showing input chrome for
  // something that's usually set-and-forget.
  const [editingManual, setEditingManual] = useState(false);
  const [noteProfile, setNoteProfile] = useState(null);

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
        {hasManualClasses && (
          <button
            type="button"
            className={`add-btn ${editingManual ? "primary" : ""}`}
            onClick={() => setEditingManual((v) => !v)}
          >
            {editingManual ? "Done editing" : "Edit past classes"}
          </button>
        )}
      </div>

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
          </div>

          {groups.map((group) => {
            const { rows, gpa, qpa } = computeSemesterGpa(group.profiles, settings.gradePoints);
            return (
              <div key={group.name} className="overview-semester-block">
                <button
                  type="button"
                  className="overview-semester-header"
                  onClick={() => onSelectSemester(group.name)}
                  title="Open this semester's page"
                >
                  <span className="overview-semester-name">{group.name}</span>
                  <span className="overview-semester-gpa">
                    {showGpa && `GPA ${gpa === null ? "—" : gpa.toFixed(2)}`}
                    {showGpa && showQpa && "  ·  "}
                    {showQpa && `QPA ${qpa === null ? "—" : qpa.toFixed(2)}`}
                  </span>
                </button>

                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Credits</th>
                      <th>Grade %</th>
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
                                {(p.scale || settings.defaultScale).map((s) => (
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
