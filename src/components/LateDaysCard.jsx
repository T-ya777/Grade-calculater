import { useEffect, useState } from "react";
import { computeLateDays } from "../utils/grading";

export default function LateDaysCard({ classProfile, onTotalChange }) {
  const [forceExpanded, setForceExpanded] = useState(false);
  const { allowed, used, remaining, usedList } = computeLateDays(classProfile);
  const over = remaining < 0;

  // forceExpanded is only meant to bridge the gap between clicking "+" and
  // the card having something real to show. Once remaining is actually
  // above 0, clear it — otherwise a class that later burns through its
  // days again (or gets reset to 0) would never re-minimize.
  useEffect(() => {
    if (remaining > 0 && forceExpanded) setForceExpanded(false);
  }, [remaining, forceExpanded]);

  const shouldMinimize = remaining === 0 && !forceExpanded;

  if (shouldMinimize) {
    const message = allowed === 0 ? "No late days" : "All late days used";
    return (
      <div className="card late-days-card minimized">
        <div className="late-days-minimized-row">
          <span>{message}</span>
          <span className="muted small">
            {used} of {allowed} late days used
          </span>
          <button
            className="icon-btn"
            onClick={() => setForceExpanded(true)}
            title="Set number of late days"
          >
            +
          </button>
        </div>
      </div>
    );
  }

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
