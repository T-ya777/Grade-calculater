import { computeSemesterGpa } from "../utils/grading";

export default function SemesterPage({ semesterName, profiles, settings, onSelectClass, onToggleInclude }) {
  const { rows, gpa, qpa } = computeSemesterGpa(profiles, settings.gradePoints);
  const showGpa = settings.gpaDisplay !== "qpa";
  const showQpa = settings.gpaDisplay !== "gpa";

  return (
    <div className="card semester-page">
      <h2>{semesterName}</h2>

      {rows.length === 0 ? (
        <p className="muted small">No classes in this semester yet.</p>
      ) : (
        <>
          <div className="semester-gpa-row">
            {showGpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">GPA (simple average)</div>
                <div className="summary-score">{gpa === null ? "—" : gpa.toFixed(2)}</div>
              </div>
            )}
            {showQpa && (
              <div className="semester-gpa-block">
                <div className="summary-label">QPA (credit-weighted)</div>
                <div className="summary-score">{qpa === null ? "—" : qpa.toFixed(2)}</div>
              </div>
            )}
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
              {rows.map((r) => (
                <tr key={r.id} className="semester-row-clickable" onClick={() => onSelectClass(r.id)}>
                  <td>{r.name}</td>
                  <td>{r.letter}</td>
                  <td>{r.points === null ? "—" : r.points.toFixed(1)}</td>
                  <td>{r.credits}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`gpa-toggle ${r.included ? "on" : "off"}`}
                      onClick={() => onToggleInclude(r.id, !r.included)}
                      title={
                        r.included
                          ? "Counted toward GPA/QPA — click to exclude"
                          : "Not counted — click to include"
                      }
                    >
                      {r.included ? "✓" : "—"}
                    </button>
                  </td>
                </tr>
              ))}
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
