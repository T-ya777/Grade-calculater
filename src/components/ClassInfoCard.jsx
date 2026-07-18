import { newWebsiteLink } from "../utils/storage";

const MAX_SYLLABUS_BYTES = 4 * 1024 * 1024; // ~4MB, keeps localStorage happy

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ClassInfoCard({ classProfile, onChange }) {
  const links = classProfile.websiteLinks || [];
  const syllabus = classProfile.syllabus || null;

  function updateLinks(next) {
    onChange({ websiteLinks: next });
  }

  function addLink() {
    updateLinks([...links, newWebsiteLink()]);
  }

  function updateLink(id, patch) {
    updateLinks(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLink(id) {
    updateLinks(links.filter((l) => l.id !== id));
  }

  async function handleSyllabusUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same filename later
    if (!file) return;

    if (file.size > MAX_SYLLABUS_BYTES) {
      alert(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Since files are saved in your ` +
          `browser's local storage, please keep it under ${MAX_SYLLABUS_BYTES / 1024 / 1024}MB.`
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      onChange({ syllabus: { name: file.name, type: file.type, size: file.size, dataUrl } });
    } catch {
      alert("Couldn't read that file — try again.");
    }
  }

  function removeSyllabus() {
    onChange({ syllabus: null });
  }

  // Browsers block navigating a whole tab straight to a data: URL (security
  // restriction — Chrome's console literally says "use a blob: URL
  // instead"). So convert to a blob URL just before opening it.
  async function openSyllabus() {
    if (!syllabus?.dataUrl) return;
    try {
      const res = await fetch(syllabus.dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      alert("Couldn't open that file — try re-uploading it.");
    }
  }

  return (
    <div className="card class-info-card">
      <h2>Class info</h2>

      <label className="notes-label" htmlFor="class-notes">
        Notes — paste anything important from the syllabus here (late policy, grading quirks, etc.)
      </label>
      <textarea
        id="class-notes"
        className="late-policy-input"
        placeholder="Paste the late policy or any other important syllabus notes here..."
        value={classProfile.latePolicy || ""}
        onChange={(e) => onChange({ latePolicy: e.target.value })}
      />

      <div className="class-info-section">
        <div className="class-info-section-label">Class website / Canvas links</div>
        {links.length === 0 && <p className="muted small">No links added yet.</p>}
        {links.map((link) => (
          <div key={link.id} className="website-link-row">
            <input
              className="website-link-label"
              placeholder="Label (e.g. Canvas)"
              value={link.label}
              onChange={(e) => updateLink(link.id, { label: e.target.value })}
            />
            <input
              className="website-link-url"
              placeholder="https://..."
              value={link.url}
              onChange={(e) => updateLink(link.id, { url: e.target.value })}
            />
            {link.url && (
              <a
                className="website-link-open"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open link"
              >
                ↗
              </a>
            )}
            <button className="icon-btn danger" onClick={() => removeLink(link.id)} title="Remove">
              ✕
            </button>
          </div>
        ))}
        <button className="add-btn" onClick={addLink}>
          + Add link
        </button>
      </div>

      <div className="class-info-section">
        <div className="class-info-section-label">Syllabus</div>
        {syllabus ? (
          <div className="syllabus-row">
            <button type="button" className="syllabus-name" onClick={openSyllabus}>
              📄 {syllabus.name}
            </button>
            <span className="muted small">{(syllabus.size / 1024).toFixed(0)} KB</span>
            <button className="icon-btn danger" onClick={removeSyllabus} title="Remove">
              ✕
            </button>
          </div>
        ) : (
          <label className="syllabus-upload">
            <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleSyllabusUpload} />
            Drop or choose a file to upload your syllabus
          </label>
        )}
      </div>
    </div>
  );
}
