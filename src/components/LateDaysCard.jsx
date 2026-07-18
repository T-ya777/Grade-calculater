import { computeLateDays } from "../utils/grading";

export default function LateDaysCard({ classProfile, onTotalChange }) {
  const { allowed, used, remaining, usedList } = computeLateDays(classProfile);
  const over = remaining < 0;

  return (
    <div className="card late-days-card">
      <div className="late-days-header">
        <h2>Late days</h2>
        <label className="late-days-total">
          Allowed
          <input
            type="number"
            min="0"
            value={classProfile.totalLateDays || 0}
            onChange={(e) => onTotalChange(Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <div className={`late-days-remaining ${over ? "over" : ""}`}>
        <span className="remaining-number">{remaining}</span>
        <span className="remaining-label">
          {over ? "late days over the limit" : "late days remaining"} ({used} of {allowed} used)
        </span>
      </div>

      {usedList.length > 0 && (
        <ul className="late-days-list">
          {usedList.map((u) => (
            <li key={u.assignmentId}>
              <span>
                {u.assignmentName} <span className="muted">({u.categoryName})</span>
              </span>
              <span className="days-badge">
                {u.days} day{u.days === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
