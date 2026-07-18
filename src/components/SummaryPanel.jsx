import { letterForScore } from "../utils/grading";

export default function SummaryPanel({ overall, scale, onScaleChange }) {
  const { currentGrade, worstCaseGrade, rows, gradedWeightSum, totalWeight } = overall;

  return (
    <div className="card summary-card">
      <h2>Summary</h2>

      <div className="summary-grade">
        <div>
          <div className="summary-label">Current grade (based on entered work)</div>
          <div className="summary-score">
            {currentGrade === null ? "—" : `${currentGrade.toFixed(2)}%`}{" "}
            <span className="letter">{letterForScore(currentGrade, scale)}</span>
          </div>
          <div className="summary-sub">
            {gradedWeightSum.toFixed(1)}% of the {totalWeight.toFixed(1)}% weight has grades entered
          </div>
        </div>

        {totalWeight > gradedWeightSum && (
          <div>
            <div className="summary-label">Worst case if remaining work scores 0</div>
            <div className="summary-score muted">
              {worstCaseGrade === null ? "—" : `${worstCaseGrade.toFixed(2)}%`}
            </div>
          </div>
        )}
      </div>

      <table className="breakdown-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Weight</th>
            <th>Score</th>
            <th>% of final grade so far</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.weight}%</td>
              <td>{r.score === null ? "—" : `${r.score.toFixed(1)}%`}</td>
              <td>{r.contribution === null ? "—" : `${r.contribution.toFixed(2)} pts`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalWeight !== 100 && (
        <p className="warning">
          Heads up: category weights add up to {totalWeight}%, not 100%.
        </p>
      )}

      <details className="scale-editor">
        <summary>Edit letter grade cutoffs</summary>
        <table className="scale-table">
          <thead>
            <tr>
              <th>Letter</th>
              <th>Min %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scale.map((s, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={s.letter}
                    onChange={(e) => {
                      const next = [...scale];
                      next[i] = { ...next[i], letter: e.target.value };
                      onScaleChange(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={s.min}
                    onChange={(e) => {
                      const next = [...scale];
                      next[i] = { ...next[i], min: Number(e.target.value) };
                      onScaleChange(next);
                    }}
                  />
                </td>
                <td>
                  <button
                    className="icon-btn danger"
                    onClick={() => onScaleChange(scale.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="add-btn"
          onClick={() => onScaleChange([...scale, { letter: "New", min: 0 }])}
        >
          + Add row
        </button>
      </details>
    </div>
  );
}
