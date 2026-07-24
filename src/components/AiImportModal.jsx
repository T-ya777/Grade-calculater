import { useState } from "react";
import { AI_IMPORT_SAMPLE, buildAiImportPrompt, parseAiClassJson } from "../utils/aiImport";

// Two-step flow: paste JSON (with a "Copy AI prompt" shortcut for getting
// that JSON in the first place) -> parse it -> once it's valid, ask
// whether to overwrite the class you're currently on or add it as a new
// one. Modeled on the existing "Import from JSON backup" three-dot menu
// item, but for AI-generated data instead of one of this app's own
// backups, and it never silently overwrites — you pick each time.
export default function AiImportModal({ currentClassName, onClose, onImport }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(buildAiImportPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Couldn't copy automatically — you can select and copy the prompt text yourself.");
    }
  }

  function downloadSample() {
    const blob = new Blob([JSON.stringify(AI_IMPORT_SAMPLE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grade-calculator-ai-import-sample.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function handleParse() {
    setError("");
    try {
      const profile = parseAiClassJson(text);
      setParsed(profile);
    } catch (e) {
      setParsed(null);
      setError(e.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ai-import-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Import from AI-generated JSON</h3>

        {!parsed ? (
          <>
            <p className="muted small">
              Send an AI chat a screenshot of your gradebook along with the prompt below, then paste
              its reply here. Only Earned/Possible-style scores come through — nothing else in the
              app changes until you import.
            </p>

            <div className="ai-import-actions-row">
              <button type="button" className="add-btn" onClick={copyPrompt}>
                {copied ? "Copied!" : "Copy AI prompt"}
              </button>
              <button type="button" className="add-btn" onClick={downloadSample}>
                Download sample JSON
              </button>
            </div>

            <textarea
              className="ai-import-textarea"
              placeholder="Paste the AI's JSON reply here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
            />

            {error && <p className="warning">{error}</p>}

            <div className="modal-actions">
              <button className="add-btn" onClick={onClose}>
                Cancel
              </button>
              <button className="add-btn primary" disabled={!text.trim()} onClick={handleParse}>
                Parse JSON
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted small">
              Found <strong>{parsed.name}</strong> — {parsed.categories.length} categor
              {parsed.categories.length === 1 ? "y" : "ies"},{" "}
              {parsed.categories.reduce((s, c) => s + c.assignments.length, 0)} assignment
              {parsed.categories.reduce((s, c) => s + c.assignments.length, 0) === 1 ? "" : "s"}.
              How should this be imported?
            </p>

            <div className="modal-actions ai-import-choice-actions">
              <button className="add-btn" onClick={onClose}>
                Cancel
              </button>
              <button className="add-btn" onClick={() => onImport(parsed, "new")}>
                Add as a new class
              </button>
              <button className="add-btn primary" onClick={() => onImport(parsed, "overwrite")}>
                Overwrite "{currentClassName}"
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
