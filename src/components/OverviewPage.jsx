import { computeOverall, computeSemesterGpa, letterForScore } from "../utils/grading";
import { groupProfilesBySemester } from "../utils/storage";

export default function OverviewPage({ profiles, semesters, settings, onSelectSemester, onSelectClass }) {
  const showGpa = settings.gpaDisplay !== "qpa";
  const showQpa = settings.gpaDisplay !== "gpa";

  const cumulative = computeSemesterGpa(profiles, settings.gradePoints);
  const groups = groupProfilesBySemester(profiles, semesters);

  return (
    <div className="card overview-page">
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
                    </tr>
                  </thead>
                  <tbody>
                    {group.profiles.map((p) => {
                      const overall = computeOverall(p.categories);
                      const row = rows.find((x) => x.id === p.id);
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
    </div>
  );
}
