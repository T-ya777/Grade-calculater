import { useState } from "react";
import { simulateCategoryScore, neededOnCategory } from "../utils/grading";

export default function PlanAheadCard({ categories }) {
  const options = categories.filter((c) => (Number(c.weight) || 0) > 0);
  const [categoryId, setCategoryId] = useState(options[0]?.id || "");
  const [hypothetical, setHypothetical] = useState("");
  const [target, setTarget] = useState("");

  if (options.length === 0) {
    return (
      <div className="card plan-ahead-card">
        <h2>Plan ahead</h2>
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
    <div className="card plan-ahead-card">
      <h2>Plan ahead</h2>

      <label className="plan-ahead-select">
        Category
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
          % on {category.name}, my overall grade would be:
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
          % overall, I need this on {category.name}:
        </label>
        <div className="plan-ahead-result">
          {needed === null ? "—" : `${needed.toFixed(2)}%`}
        </div>
      </div>

      <p className="plan-ahead-note">
        Both use full declared category weights; any other ungraded category counts as 0 for now.
      </p>
    </div>
  );
}
