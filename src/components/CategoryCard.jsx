import { useState } from "react";
import { newAssignment, getSkipCategoryDeleteConfirm, setSkipCategoryDeleteConfirm } from "../utils/storage";
import { getDroppedAssignmentIds } from "../utils/grading";
import ThreeDotMenu from "./ThreeDotMenu";
import ConfirmDeleteCategoryModal from "./ConfirmDeleteCategoryModal";
import FinalExamConflictModal from "./FinalExamConflictModal";

export default function CategoryCard({
  category,
  score,
  contribution,
  onChange,
  onDelete,
  finalExamCategoryId,
  finalExamCategoryName,
}) {
  // "Manage assignments" mode reveals the delete (✕) column so you can
  // remove assignments — hidden in normal use so the table doesn't have a
  // column of trash icons sitting there all the time.
  const [manageMode, setManageMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [finalExamConflictOpen, setFinalExamConflictOpen] = useState(false);

  function update(patch) {
    onChange({ ...category, ...patch });
  }

  function updateAssignment(id, patch) {
    update({
      assignments: category.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  function addAssignment() {
    update({
      assignments: [
        ...category.assignments,
        newAssignment(`${category.name} ${category.assignments.length + 1}`),
      ],
    });
  }

  function removeAssignment(id) {
    update({ assignments: category.assignments.filter((a) => a.id !== id) });
  }

  function handleDeleteCardClick() {
    if (getSkipCategoryDeleteConfirm()) {
      onDelete();
    } else {
      setConfirmDeleteOpen(true);
    }
  }

  function confirmDeleteCard(dontAskAgain) {
    if (dontAskAgain) setSkipCategoryDeleteConfirm(true);
    setConfirmDeleteOpen(false);
    onDelete();
  }

  // Clicking "This is the final exam" while it's already this category
  // unmarks it. Clicking it while another category holds the flag blocks
  // with an explanation instead of silently stealing it — only unmarking
  // the other one first (or clicking it again here) changes who has it.
  function handleFinalExamClick() {
    if (category.isFinalExam) {
      update({ isFinalExam: false });
      return;
    }
    if (finalExamCategoryId && finalExamCategoryId !== category.id) {
      setFinalExamConflictOpen(true);
      return;
    }
    update({ isFinalExam: true });
  }

  const droppedIds = getDroppedAssignmentIds(category);

  return (
    <div className="card">
      <div className="card-header">
        <input
          className="category-name"
          value={category.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        {category.isFinalExam && <span className="final-exam-badge">Final exam</span>}
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
          {manageMode ? (
            <button type="button" className="add-btn manage-finish-btn" onClick={() => setManageMode(false)}>
              Finish
            </button>
          ) : (
            <ThreeDotMenu
              items={[
                {
                  label: category.isFinalExam ? "✓ This is the final exam" : "This is the final exam",
                  onClick: handleFinalExamClick,
                },
                { label: "Manage assignments", onClick: () => setManageMode(true) },
                { label: "Delete this card", onClick: handleDeleteCardClick },
              ]}
            />
          )}
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
      </div>

      <table className="assignments-table">
        <thead>
          <tr>
            <th>Assignment</th>
            <th>Earned</th>
            <th>Possible</th>
            <th>%</th>
            <th title="Late days used on this assignment">Late days</th>
            <th title="Check once this is your actual final grade for this assignment">Final?</th>
            {manageMode && <th></th>}
          </tr>
        </thead>
        <tbody>
          {category.assignments.map((a) => {
            const pct =
              a.earned !== "" && a.possible !== "" && Number(a.possible) > 0
                ? ((Number(a.earned) / Number(a.possible)) * 100).toFixed(1)
                : "—";
            const hasScore = a.earned !== "" && a.possible !== "" && Number(a.possible) > 0;
            const isDropped = droppedIds.has(a.id);

            let rowClass = "";
            if (isDropped) rowClass = "assignment-row-dropped";
            else if (a.confirmed) rowClass = "assignment-row-final";
            else if (hasScore) rowClass = "assignment-row-hypothetical";

            return (
              <tr key={a.id} className={rowClass}>
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
                    disabled={a.confirmed}
                    title={a.confirmed ? "Uncheck Final? to edit" : undefined}
                    onChange={(e) => updateAssignment(a.id, { earned: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="score-input"
                    value={a.possible}
                    disabled={a.confirmed}
                    title={a.confirmed ? "Uncheck Final? to edit" : undefined}
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
                    disabled={a.confirmed}
                    title={a.confirmed ? "Uncheck Final? to edit" : undefined}
                    onChange={(e) =>
                      updateAssignment(a.id, { lateDaysUsed: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="confirmed-cell">
                  <input
                    type="checkbox"
                    checked={!!a.confirmed}
                    disabled={!hasScore}
                    title={hasScore ? "Check when this is your actual final grade" : "Enter a score first"}
                    onChange={(e) => updateAssignment(a.id, { confirmed: e.target.checked })}
                  />
                </td>
                {manageMode && (
                  <td>
                    <button className="icon-btn danger" onClick={() => removeAssignment(a.id)} title="Remove">
                      ✕
                    </button>
                  </td>
                )}
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

      {confirmDeleteOpen && (
        <ConfirmDeleteCategoryModal
          categoryName={category.name}
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={confirmDeleteCard}
        />
      )}

      {finalExamConflictOpen && (
        <FinalExamConflictModal
          currentFinalExamName={finalExamCategoryName}
          onClose={() => setFinalExamConflictOpen(false)}
        />
      )}
    </div>
  );
}
