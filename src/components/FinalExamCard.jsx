import { useState } from "react";
import { simulateCategoryScore, neededOnCategory } from "../utils/grading";

export default function FinalExamCard({ classProfile, onNoFinalExamChange }) {
  const categories = classProfile.categories || [];
  const [hypothetical, setHypothetical] = useState("");
  const [target, setTarget] = useState("");

  const noFinalExam = !!classProfile.noFinalExam;
  const finalCategory = categories.find((c) => c.isFinalExam);

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

  const header = (
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
  );

  if (!finalCategory) {
    return (
      <div className="card final-exam-card">
        {header}
        <p className="muted">
          Check "This is the final exam" on the category that represents your final exam to use
          this calculator.
        </p>
      </div>
    );
  }

  const simulated =
    hypothetical !== "" && !Number.isNaN(Number(hypothetical))
      ? simulateCategoryScore(categories, finalCategory.id, Number(hypothetical))
      : null;

  const needed =
    target !== "" && !Number.isNaN(Number(target))
      ? neededOnCategory(categories, finalCategory.id, Number(target))
      : null;

  return (
    <div className="card final-exam-card">
      {header}

      <p className="final-exam-subtitle">
        Using <strong>{finalCategory.name}</strong> ({finalCategory.weight}% of your grade) as the
        final exam.
      </p>

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
