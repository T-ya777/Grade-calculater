import { useEffect, useMemo, useState } from "react";
import { computeSemesterGpa, computeEffectiveGpa, withPassNoPass } from "../utils/grading";
import { loadWhatIfOverrides, saveWhatIfOverrides } from "../utils/storage";

let semesterManualRowIdCounter = 0;
function newSemesterManualRow(letter) {
  semesterManualRowIdCounter += 1;
  return { key: semesterManualRowIdCounter, name: "", credits: 3, letter };
}

// Same idea as the Overview page's "Add past classes" batch form, but with
// no semester picker — you're already on that semester's page, so it's
// implicit. For a class that runs its grades through its own separate
// site/tool (no assignment-level tracking needed here), just record the
// name, credits, and current/final letter.
function AddClassForm({ defaultScale, onAdd }) {
  const [open, setOpen] = useState(false);
  const letterOptions = withPassNoPass(defaultScale);
  const defaultLetter = letterOptions[0]?.letter || "";
  const [rows, setRows] = useState(() => [newSemesterManualRow(defaultLetter)]);

  function close() {
    setRows([newSemesterManualRow(defaultLetter)]);
    setOpen(false);
  }

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, newSemesterManualRow(defaultLetter)]);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  const validRows = rows.filter((r) => r.name.trim());

  function handleAddAll() {
    if (validRows.length === 0) return;
    validRows.forEach((r) => {
      onAdd(r.name.trim(), r.credits === "" ? 0 : Number(r.credits), r.letter);
    });
    setRows([newSemesterManualRow(defaultLetter)]);
    // stays open so you can keep adding without reopening
  }

  if (!open) {
    return (
      <button type="button" className="add-btn" onClick={() => setOpen(true)}>
        + Add a class
      </button>
    );
  }

  return (
    <div className="add-past-class-form add-class-form-single">
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

export default function SemesterPage({
  semesterName,
  profiles,
  settings,
  onSelectClass,
  onToggleInclude,
  onAddManualClass,
  onUpdateManualClass,
  onDeleteManualClass,
}) {
  const [whatIf, setWhatIf] = useState(false);
  // { [classId]: hypothetical letter } — persisted per semester, see below.
  const [overrides, setOverrides] = useState(() => loadWhatIfOverrides(semesterName));

  // Reload the saved hypothetical setup whenever you switch semesters.
  useEffect(() => {
    setOverrides(loadWhatIfOverrides(semesterName));
  }, [semesterName]);

  // Persist on every change, so leaving What-If mode (or the page, or the
  // app entirely) and coming back later shows the same hypothetical setup.
  useEffect(() => {
    saveWhatIfOverrides(semesterName, overrides);
  }, [semesterName, overrides]);

  const real = computeSemesterGpa(profiles, settings.gradePoints);

  // What-If recompute — shared with the Overview page's What-If mode, see
  // computeEffectiveGpa in grading.js.
  const effective = useMemo(() => {
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
  }

  function resetOverrides() {
    setOverrides({});
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  const showGpa = settings.gpaDisplay !== "qpa";
  const showQpa = settings.gpaDisplay !== "gpa";

  // Total units registered this semester — every class counts toward this
  // regardless of whether it's included in GPA/QPA (Pass/No Pass classes
  // still take up units even though they don't move the GPA needle).
  const totalUnits = effective.rows.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

  // Classes added here (e.g. one that runs through its own grading site,
  // not this app's assignment tracking) are the same manual-class records
  // the Overview page manages — same profiles array, so anything added,
  // edited, or deleted here shows up on Overview automatically and vice
  // versa; there's no separate data to keep in sync.
  const hasManualInSemester = profiles.some((p) => p.isManual);
  const [editingManual, setEditingManual] = useState(false);

  function addManualHere(name, credits, letter) {
    onAddManualClass(name, semesterName, credits, letter);
  }

  function deleteManualHere(p) {
    if (window.confirm(`Remove "${p.name}" from your records? This can't be undone.`)) {
      onDeleteManualClass(p.id);
    }
  }

  return (
    <div className={`card semester-page ${whatIf ? "what-if-active" : ""}`}>
      <div className="overview-add-row">
        <AddClassForm defaultScale={settings.defaultScale} onAdd={addManualHere} />
        <span className="muted small">
          For a class that runs its own grading site or tool — just record the credits and
          current (or final) letter grade here instead of tracking assignments in this app.
        </span>
        {hasManualInSemester && !whatIf && (
          <button
            type="button"
            className={`add-btn ${editingManual ? "primary" : ""}`}
            onClick={() => setEditingManual((v) => !v)}
          >
            {editingManual ? "Done editing" : "Edit added classes"}
          </button>
        )}
      </div>

      <div className="what-if-toggle-row">
        <label className="what-if-toggle">
          <input type="checkbox" checked={whatIf} onChange={toggleWhatIf} />
          What-If mode — try different letter grades without changing your real data
        </label>
        {whatIf && hasOverrides && (
          <button type="button" className="what-if-reset-btn" onClick={resetOverrides}>
            Reset to actual grades
          </button>
        )}
      </div>

      {whatIf && (
        <div className="what-if-banner">
          You're viewing hypothetical grades — these are never counted toward your real GPA/QPA.
          Your hypothetical picks are saved, so you can leave and come back to the same setup.
        </div>
      )}

      {effective.rows.length === 0 ? (
        <p className="muted small">No classes in this semester yet.</p>
      ) : (
        <>
          <div className="semester-gpa-row">
            {showGpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">GPA (simple average)</div>
                <div className="summary-score">
                  {effective.gpa === null ? "—" : effective.gpa.toFixed(2)}
                </div>
              </div>
            )}
            {showQpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">QPA (credit-weighted)</div>
                <div className="summary-score">
                  {effective.qpa === null ? "—" : effective.qpa.toFixed(2)}
                </div>
              </div>
            )}
            <div className="semester-gpa-block">
              <div className="summary-label">Total units</div>
              <div className="summary-score">{totalUnits}</div>
            </div>
          </div>

          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Letter</th>
                <th>Points</th>
                <th>Credits</th>
                <th>Counted</th>
              </tr>
            </thead>
            <tbody>
              {effective.rows.map((r) => {
                const profile = profiles.find((p) => p.id === r.id);

                if (r.isManual && editingManual && !whatIf) {
                  const letterOptions = withPassNoPass(profile?.scale || settings.defaultScale);
                  return (
                    <tr key={r.id}>
                      <td>
                        <input
                          className="add-past-class-name"
                          value={profile?.name || ""}
                          onChange={(e) => onUpdateManualClass(r.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="add-past-class-letter"
                          value={profile?.manualLetter || ""}
                          onChange={(e) => onUpdateManualClass(r.id, { manualLetter: e.target.value })}
                        >
                          {letterOptions.map((s) => (
                            <option key={s.letter} value={s.letter}>
                              {s.letter}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{r.points === null ? "—" : r.points.toFixed(1)}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="add-past-class-credits"
                          value={profile?.credits ?? 0}
                          onChange={(e) =>
                            onUpdateManualClass(r.id, {
                              credits: e.target.value === "" ? 0 : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Remove this class"
                          onClick={() => profile && deleteManualHere(profile)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={r.id}
                    className={r.isManual ? "" : "semester-row-clickable"}
                    onClick={() => !r.isManual && onSelectClass(r.id)}
                    title={r.isManual ? "Manually added — recorded here, not tracked by assignments" : undefined}
                  >
                    <td>{r.name}</td>
                    <td onClick={(e) => whatIf && e.stopPropagation()}>
                      {whatIf ? (
                        <select
                          className={`what-if-letter-select ${r.isHypothetical ? "hypothetical" : ""}`}
                          value={overrides[r.id] || ""}
                          onChange={(e) => setOverride(r.id, e.target.value)}
                        >
                          <option value="">{r.letter}</option>
                          {(profile?.scale || [])
                            .map((s) => s.letter)
                            .filter((letter) => letter !== r.letter)
                            .map((letter) => (
                              <option key={letter} value={letter}>
                                {letter}
                              </option>
                            ))}
                        </select>
                      ) : (
                        r.letter
                      )}
                    </td>
                    <td>{r.points === null ? "—" : r.points.toFixed(1)}</td>
                    <td>{r.credits}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`gpa-toggle ${r.included ? "on" : "off"}`}
                        disabled={whatIf}
                        onClick={() => onToggleInclude(r.id, !r.included)}
                        title={
                          whatIf
                            ? "Turn off What-If mode to change this"
                            : r.included
                              ? "Counted toward GPA/QPA — click to exclude"
                              : "Not counted — click to include"
                        }
                      >
                        {r.included ? "✓" : "—"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="muted small" style={{ marginTop: 12 }}>
            Pass/No Pass and ungraded classes are excluded automatically — click the mark to
            include or exclude any class yourself.
          </p>
        </>
      )}
    </div>
  );
}
