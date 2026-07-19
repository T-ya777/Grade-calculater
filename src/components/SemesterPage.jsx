import { useEffect, useMemo, useState } from "react";
import { computeSemesterGpa, pointsForLetter } from "../utils/grading";
import { loadWhatIfOverrides, saveWhatIfOverrides } from "../utils/storage";

export default function SemesterPage({ semesterName, profiles, settings, onSelectClass, onToggleInclude }) {
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

  // What-If recompute: same math as computeSemesterGpa, but a class with an
  // override uses that letter's points instead of its real computed one.
  // A class you've manually excluded from GPA stays excluded even here —
  // What-If only lets you try a different grade, not turn on a class you've
  // chosen to leave out.
  const effective = useMemo(() => {
    if (!whatIf) return real;

    let simpleSum = 0;
    let simpleCount = 0;
    let creditSum = 0;
    let creditWeightedSum = 0;

    const rows = real.rows.map((r) => {
      const override = overrides[r.id];
      const manuallyExcluded = r.points !== null && r.included === false;
      const points = override ? pointsForLetter(override, settings.gradePoints) : r.points;
      const letter = override || r.letter;
      const included = manuallyExcluded ? false : points !== null;

      if (included) {
        simpleSum += points;
        simpleCount += 1;
        creditSum += r.credits;
        creditWeightedSum += points * r.credits;
      }

      return { ...r, letter, points, included, isHypothetical: Boolean(override) };
    });

    return {
      rows,
      gpa: simpleCount > 0 ? simpleSum / simpleCount : null,
      qpa: creditSum > 0 ? creditWeightedSum / creditSum : null,
    };
  }, [whatIf, overrides, real, settings.gradePoints]);

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

  return (
    <div className={`card semester-page ${whatIf ? "what-if-active" : ""}`}>
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
                return (
                  <tr
                    key={r.id}
                    className={r.isManual ? "" : "semester-row-clickable"}
                    onClick={() => !r.isManual && onSelectClass(r.id)}
                    title={r.isManual ? "Entered manually from the Overview page" : undefined}
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
