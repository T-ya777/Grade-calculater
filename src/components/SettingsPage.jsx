import { useState } from "react";
import { SCALE_PRESETS } from "../utils/grading";
import ApplyScaleModal from "./ApplyScaleModal";
import ExcelExportModal from "./ExcelExportModal";

const CARD_LABELS = {
  lateDays: "Late Days",
  finalExam: "Final Exam Calculator",
  classInfo: "Class Info",
};

export default function SettingsPage({
  settings,
  onChange,
  profiles,
  semesters,
  onApplyScaleToClasses,
  onExportData,
  onImportData,
  onImportExcel,
  onClearAllData,
  onExportExcel,
}) {
  const [dragKey, setDragKey] = useState(null);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  const FEEDBACK_REPO = "T-ya777/Grade-calculater";

  function sendFeedback() {
    const text = feedbackText.trim();
    if (!text) return;
    const title = text.length > 60 ? `${text.slice(0, 57)}...` : text;
    const url = `https://github.com/${FEEDBACK_REPO}/issues/new?title=${encodeURIComponent(
      title
    )}&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

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

  function updateGradePoints(gradePoints) {
    onChange({ gradePoints });
  }

  return (
    <div className="card settings-page">
      <details className="settings-section" open>
        <summary>Appearance</summary>
        <p className="muted small">
          Purely visual — switching styles never changes your grades, categories, or any other
          data. Applies everywhere in the app right away.
        </p>

        <div className="theme-option-list">
          <label className={`theme-option ${settings.theme !== "editorial" ? "selected" : ""}`}>
            <input
              type="radio"
              name="theme"
              checked={settings.theme !== "editorial"}
              onChange={() => onChange({ theme: "default" })}
            />
            <span className="theme-option-swatch theme-swatch-default" aria-hidden="true" />
            <span className="theme-option-body">
              <span className="theme-option-name">Default</span>
              <span className="muted small">The app's normal look.</span>
            </span>
          </label>

          <label className={`theme-option ${settings.theme === "editorial" ? "selected" : ""}`}>
            <input
              type="radio"
              name="theme"
              checked={settings.theme === "editorial"}
              onChange={() => onChange({ theme: "editorial" })}
            />
            <span className="theme-option-swatch theme-swatch-editorial" aria-hidden="true" />
            <span className="theme-option-body">
              <span className="theme-option-name">Editorial Academic</span>
              <span className="muted small">
                Newsprint paper, ink borders, serif headers, monospace figures — styled like a
                printed transcript.
              </span>
            </span>
          </label>
        </div>
      </details>

      <details className="settings-section">
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
            disabled={profiles.length === 0}
            onClick={() => setScaleModalOpen(true)}
          >
            Apply to existing classes...
          </button>
          <span className="muted small">
            Pick which classes get this scale, then confirm — nothing changes until you do.
          </span>
        </div>

        {scaleModalOpen && (
          <ApplyScaleModal
            profiles={profiles}
            semesters={semesters}
            onCancel={() => setScaleModalOpen(false)}
            onConfirm={(ids) => {
              onApplyScaleToClasses(settings.defaultScale, ids);
              setScaleModalOpen(false);
            }}
          />
        )}
      </details>

      <details className="settings-section">
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
        <summary>GPA / QPA</summary>
        <p className="muted small">
          Shown on each semester's page — click a semester name in the sidebar. Pass/No Pass and
          ungraded classes are excluded automatically; click the mark next to any class there to
          include or exclude it yourself.
        </p>

        <label className="scale-preset-label">
          Show
          <select
            value={settings.gpaDisplay}
            onChange={(e) => onChange({ gpaDisplay: e.target.value })}
          >
            <option value="both">Both GPA and QPA</option>
            <option value="gpa">GPA only (simple average)</option>
            <option value="qpa">QPA only (credit-weighted)</option>
          </select>
        </label>

        <table className="scale-table">
          <thead>
            <tr>
              <th>Letter</th>
              <th>Points</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {settings.gradePoints.map((g, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={g.letter}
                    onChange={(e) => {
                      const next = [...settings.gradePoints];
                      next[i] = { ...next[i], letter: e.target.value };
                      updateGradePoints(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.1"
                    value={g.points}
                    onChange={(e) => {
                      const next = [...settings.gradePoints];
                      next[i] = { ...next[i], points: Number(e.target.value) };
                      updateGradePoints(next);
                    }}
                  />
                </td>
                <td>
                  <button
                    className="icon-btn danger"
                    onClick={() => updateGradePoints(settings.gradePoints.filter((_, idx) => idx !== i))}
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
          onClick={() => updateGradePoints([...settings.gradePoints, { letter: "New", points: 0 }])}
        >
          + Add row
        </button>
      </details>

      <details className="settings-section">
        <summary>Degree progress</summary>
        <p className="muted small">
          Powers the progress bar on the Overview page. Total units needed is whatever your
          program requires to graduate; transfer units are any credit you came in with that isn't
          entered as a class here.
        </p>

        <label className="scale-preset-label">
          Total units needed
          <input
            type="number"
            min="0"
            step="1"
            value={settings.totalUnitsNeeded ?? ""}
            placeholder="e.g. 120"
            onChange={(e) =>
              onChange({
                totalUnitsNeeded: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>

        <label className="scale-preset-label">
          Transfer units
          <input
            type="number"
            min="0"
            step="1"
            value={settings.transferUnits || ""}
            placeholder="0"
            onChange={(e) =>
              onChange({
                transferUnits: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
      </details>

      <details className="settings-section">
        <summary>Data management</summary>
        <p className="muted small">
          Everything lives only in this browser's storage. Export a backup file every so often so
          you don't lose it if you clear your browser or switch computers.
        </p>
        <div className="settings-data-buttons">
          <button className="add-btn" onClick={onExportData}>
            Export backup
          </button>
          <button className="add-btn" disabled={profiles.length === 0} onClick={() => setExcelModalOpen(true)}>
            Export Excel
          </button>
          <label className="add-btn settings-import-label">
            Import backup
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onImportData(file);
              }}
            />
          </label>
          <label className="add-btn settings-import-label">
            Import Excel
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onImportExcel(file);
              }}
            />
          </label>
          <button className="add-btn danger" onClick={onClearAllData}>
            Clear all data
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          "Export backup" is the file to import from for an exact restore — settings, themes, and
          everything else round-trip through it. "Import Excel" only works on a file this app
          exported itself (it re-reads the Overview + per-class sheets); it brings back
          classes/categories/assignments/semesters, but not app settings like your default grade
          scale.
        </p>

        {excelModalOpen && (
          <ExcelExportModal
            profiles={profiles}
            semesters={semesters}
            onCancel={() => setExcelModalOpen(false)}
            onConfirm={(scopedProfiles) => {
              onExportExcel(scopedProfiles);
              setExcelModalOpen(false);
            }}
          />
        )}
      </details>

      <details className="settings-section">
        <summary>Feedback</summary>
        <p className="muted small">
          Found something confusing, broken, or missing? Let us know — this opens a new issue on
          GitHub, pre-filled with what you type below.
        </p>

        <textarea
          className="feedback-textarea"
          placeholder="What happened, or what would you like to see?"
          rows={4}
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
        />

        <div className="settings-apply-row">
          <button className="add-btn" disabled={!feedbackText.trim()} onClick={sendFeedback}>
            Send feedback
          </button>
          <span className="muted small">Opens github.com in a new tab — nothing is sent automatically.</span>
        </div>
      </details>
    </div>
  );
}
