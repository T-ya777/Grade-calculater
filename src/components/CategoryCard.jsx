import { newAssignment } from "../utils/storage";

export default function CategoryCard({ category, score, contribution, onChange, onDelete }) {
  function update(patch) {
    onChange({ ...category, ...patch });
  }

  function updateAssignment(id, patch) {
    update({
      assignments: category.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  function addAssignment() {
    update({ assignments: [...category.assignments, newAssignment(`Assignment ${category.assignments.length + 1}`)] });
  }

  function removeAssignment(id) {
    update({ assignments: category.assignments.filter((a) => a.id !== id) });
  }

  return (
    <div className="card">
      <div className="card-header">
        <input
          className="category-name"
          value={category.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <div className="card-header-controls">
          <label>
            Weight
            <input
              type="number"
              min="0"
              max="100"
              className="weight-input"
              value={category.weight}
              onChange={(e) => update({ weight: e.target.value === "" ? "" : Number(e.target.value) })}
            />
            %
          </label>
          <button className="icon-btn danger" onClick={onDelete} title="Delete category">
            ✕
          </button>
        </div>
      </div>

      <div className="card-options">
        <label>
          Averaging
          <select value={category.mode} onChange={(e) => update({ mode: e.target.value })}>
            <option value="avgPercent">Average of each assignment's %</option>
            <option value="sumPoints">Total points earned ÷ total points possible</option>
          </select>
        </label>
        <label>
          Drop lowest
          <input
            type="number"
            min="0"
            className="drop-input"
            value={category.dropLowest}
            onChange={(e) => update({ dropLowest: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="final-exam-flag" title="Marks this as the final exam category used by the Final Exam Calculator">
          <input
            type="checkbox"
            checked={!!category.isFinalExam}
            onChange={(e) => update({ isFinalExam: e.target.checked })}
          />
          This is the final exam
        </label>
      </div>

      <table className="assignments-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Earned</th>
            <th>Possible</th>
            <th>%</th>
            <th title="Late days used on this assignment">Late days</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {category.assignments.map((a) => {
            const pct =
              a.earned !== "" && a.possible !== "" && Number(a.possible) > 0
                ? ((Number(a.earned) / Number(a.possible)) * 100).toFixed(1)
                : "—";
            return (
              <tr key={a.id}>
                <td>
                  <input
                    value={a.name}
                    onChange={(e) => updateAssignment(a.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="score-input"
                    value={a.earned}
                    onChange={(e) => updateAssignment(a.id, { earned: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="score-input"
                    value={a.possible}
                    onChange={(e) => updateAssignment(a.id, { possible: e.target.value })}
                  />
                </td>
                <td className="pct-cell">{pct === "—" ? pct : `${pct}%`}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="late-days-input"
                    value={a.lateDaysUsed || 0}
                    onChange={(e) =>
                      updateAssignment(a.id, { lateDaysUsed: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <button className="icon-btn danger" onClick={() => removeAssignment(a.id)} title="Remove">
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button className="add-btn" onClick={addAssignment}>
        + Add assignment
      </button>

      <div className="card-footer">
        <span>
          Category score: <strong>{score === null ? "—" : `${score.toFixed(2)}%`}</strong>
        </span>
        <span>
          Contribution to grade:{" "}
          <strong>{contribution === null ? "—" : `${contribution.toFixed(2)} pts`}</strong>
        </span>
      </div>
    </div>
  );
}
