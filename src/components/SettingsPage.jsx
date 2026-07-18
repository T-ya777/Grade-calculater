import { useState } from "react";
import { SCALE_PRESETS } from "../utils/grading";

const CARD_LABELS = {
  lateDays: "Late Days",
  finalExam: "Final Exam Calculator",
  classInfo: "Class Info",
};

export default function SettingsPage({ settings, onChange, profileCount, onApplyScaleToAll }) {
  const [dragKey, setDragKey] = useState(null);

  function updateDefaultScale(scale) {
    onChange({ defaultScale: scale });
  }

  function toggleVisible(key) {
    onChange({
      cardVisibility: { ...settings.cardVisibility, [key]: !settings.cardVisibility[key] },
    });
  }

  function handleDrop(targetKey) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    const order = [...settings.cardOrder];
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from === -1 || to === -1) {
      setDragKey(null);
      return;
    }
    order.splice(from, 1);
    order.splice(to, 0, dragKey);
    onChange({ cardOrder: order });
    setDragKey(null);
  }

  return (
    <div className="card settings-page">
      <h2>Settings</h2>

      <details className="settings-section" open>
        <summary>Default grade scale</summary>
        <p className="muted small">
          New classes start with this scale. It won't touch classes you already have unless you
          apply it below.
        </p>

        <label className="scale-preset-label">
          Preset
          <select
            defaultValue=""
            onChange={(e) => {
              const key = e.target.value;
              if (key && SCALE_PRESETS[key]) updateDefaultScale(SCALE_PRESETS[key].scale);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Choose a preset...
            </option>
            {Object.entries(SCALE_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <table className="scale-table">
          <thead>
            <tr>
              <th>Letter</th>
              <th>Min %</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {settings.defaultScale.map((s, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={s.letter}
                    onChange={(e) => {
                      const next = [...settings.defaultScale];
                      next[i] = { ...next[i], letter: e.target.value };
                      updateDefaultScale(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={s.min}
                    onChange={(e) => {
                      const next = [...settings.defaultScale];
                      next[i] = { ...next[i], min: Number(e.target.value) };
                      updateDefaultScale(next);
                    }}
                  />
                </td>
                <td>
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      updateDefaultScale(settings.defaultScale.filter((_, idx) => idx !== i))
                    }
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
          onClick={() => updateDefaultScale([...settings.defaultScale, { letter: "New", min: 0 }])}
        >
          + Add row
        </button>

        <div className="settings-apply-row">
          <button
            className="add-btn"
            disabled={profileCount === 0}
            onClick={() => {
              const label = `${profileCount} existing class${profileCount === 1 ? "" : "es"}`;
              if (
                window.confirm(
                  `Apply this scale to all ${label}? This overwrites their current cutoff tables.`
                )
              ) {
                onApplyScaleToAll(settings.defaultScale);
              }
            }}
          >
            Apply to all {profileCount} existing class{profileCount === 1 ? "" : "es"}
          </button>
          <span className="muted small">Only affects grade cutoffs — grades/categories are untouched.</span>
        </div>
      </details>

      <details className="settings-section" open>
        <summary>Card layout</summary>
        <p className="muted small">
          Drag to reorder, uncheck to hide. Summary always stays first. Changes apply to every
          class right away.
        </p>

        <div className="card-order-list">
          <div className="card-order-row pinned">
            <span className="drag-handle">☰</span>
            <span className="card-order-label">Summary</span>
            <span className="muted small">always shown</span>
          </div>
          {settings.cardOrder.map((key) => (
            <div
              key={key}
              className={`card-order-row ${dragKey === key ? "dragging" : ""}`}
              draggable
              onDragStart={() => setDragKey(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(key)}
            >
              <span className="drag-handle">☰</span>
              <span className="card-order-label">{CARD_LABELS[key] || key}</span>
              <label className="card-order-visible">
                <input
                  type="checkbox"
                  checked={settings.cardVisibility[key] !== false}
                  onChange={() => toggleVisible(key)}
                />
                show
              </label>
            </div>
          ))}
        </div>
      </details>

      <details className="settings-section">
        <summary>Data management</summary>
        <p className="muted small">
          Coming soon — export a backup file, import one elsewhere, or clear everything and start
          fresh. Everything currently lives only in this browser's storage.
        </p>
        <div className="settings-data-buttons">
          <button className="add-btn" disabled title="Coming soon">
            Export all data
          </button>
          <button className="add-btn" disabled title="Coming soon">
            Import data
          </button>
          <button className="add-btn danger" disabled title="Coming soon">
            Clear all data
          </button>
        </div>
      </details>
    </div>
  );
}
