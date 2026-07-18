import { useState } from "react";
import { simulateCategoryScore, neededOnCategory } from "../utils/grading";

function guessFinalCategory(options) {
  return options.find((c) => /final/i.test(c.name)) || options[0];
}

export default function FinalExamCard({ classProfile, onNoFinalExamChange }) {
  const categories = classProfile.categories || [];
  const options = categories.filter((c) => (Number(c.weight) || 0) > 0);
  const [categoryId, setCategoryId] = useState(() => guessFinalCategory(options)?.id || "");
  const [hypothetical, setHypothetical] = useState("");
  const [target, setTarget] = useState("");

  const noFinalExam = !!classProfile.noFinalExam;

  if (noFinalExam) {
    return (
      <div className="card final-exam-card no-final">
        <div className="no-final-row">
          <span>Final exam calculator</span>
          <label className="no-final-toggle">
            <input
              type="checkbox"
              checked={noFinalExam}
              onChange={(e) => onNoFinalExamChange(e.target.checked)}
            />
            No final exam in this class
          </label>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="card final-exam-card">
        <div className="final-exam-header">
          <h2>Final exam calculator</h2>
          <label className="no-final-toggle">
            <input
              type="checkbox"
              checked={noFinalExam}
              onChange={(e) => onNoFinalExamChange(e.target.checked)}
            />
            No final exam
          </label>
        </div>
        <p className="muted">Add a category with a weight to use this.</p>
      </div>
    );
  }

  const category = options.find((c) => c.id === categoryId) || options[0];

  const simulated =
    hypothetical !== "" && !Number.isNaN(Number(hypothetical))
      ? simulateCategoryScore(categories, category.id, Number(hypothetical))
      : null;

  const needed =
    target !== "" && !Number.isNaN(Number(target))
      ? neededOnCategory(categories, category.id, Number(target))
      : null;

  return (
    <div className="card final-exam-card">
      <div className="final-exam-header">
        <h2>Final exam calculator</h2>
        <label className="no-final-toggle">
          <input
            type="checkbox"
            checked={noFinalExam}
            onChange={(e) => onNoFinalExamChange(e.target.checked)}
          />
          No final exam
        </label>
      </div>

      <label className="plan-ahead-select">
        Which category is your final exam?
        <select value={category.id} onChange={(e) => setCategoryId(e.target.value)}>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="plan-ahead-row">
        <label>
          If I score
          <input
            type="number"
            className="plan-ahead-input"
            placeholder="e.g. 85"
            value={hypothetical}
            onChange={(e) => setHypothetical(e.target.value)}
          />
          % on the final, my overall grade would be:
        </label>
        <div className="plan-ahead-result">
          {simulated === null ? "—" : `${simulated.toFixed(2)}%`}
        </div>
      </div>

      <div className="plan-ahead-row">
        <label>
          To end up with
          <input
            type="number"
            className="plan-ahead-input"
            placeholder="e.g. 90"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          % overall, I need this on the final:
        </label>
        <div className="plan-ahead-result">
          {needed === null ? "—" : `${needed.toFixed(2)}%`}
        </div>
      </div>

      <p className="plan-ahead-note">
        Uses full declared category weights; any other ungraded category counts as 0 for now.
      </p>
    </div>
  );
}
