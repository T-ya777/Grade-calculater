import { useEffect, useState } from "react";
import "./App.css";
import ClassSelector from "./components/ClassSelector";
import CategoryCard from "./components/CategoryCard";
import SummaryPanel from "./components/SummaryPanel";
import { computeOverall } from "./utils/grading";
import { loadProfiles, saveProfiles, newClassProfile, newCategory } from "./utils/storage";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once on mount.
  useEffect(() => {
    const stored = loadProfiles();
    if (stored.length > 0) {
      setProfiles(stored);
      setActiveId(stored[0].id);
    } else {
      const first = newClassProfile("My Class");
      setProfiles([first]);
      setActiveId(first.id);
    }
    setLoaded(true);
  }, []);

  // Persist whenever profiles change (after initial load).
  useEffect(() => {
    if (loaded) saveProfiles(profiles);
  }, [profiles, loaded]);

  const active = profiles.find((p) => p.id === activeId);

  function updateActive(patch) {
    setProfiles((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
  }

  function updateCategory(updatedCat) {
    updateActive({
      categories: active.categories.map((c) => (c.id === updatedCat.id ? updatedCat : c)),
    });
  }

  function addCategory() {
    updateActive({ categories: [...active.categories, newCategory(`Category ${active.categories.length + 1}`)] });
  }

  function deleteCategory(id) {
    updateActive({ categories: active.categories.filter((c) => c.id !== id) });
  }

  function createClass() {
    const p = newClassProfile(`Class ${profiles.length + 1}`);
    setProfiles((prev) => [...prev, p]);
    setActiveId(p.id);
  }

  function renameClass(id, name) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deleteClass(id) {
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    setActiveId(remaining.length > 0 ? remaining[0].id : null);
  }

  if (!loaded || !active) {
    return <div className="app-shell">Loading…</div>;
  }

  const overall = computeOverall(active.categories);

  return (
    <div className="app-shell">
      <header>
        <h1>Grade Calculator</h1>
        <ClassSelector
          profiles={profiles}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={createClass}
          onRename={renameClass}
          onDelete={deleteClass}
        />
      </header>

      <main className="main-grid">
        <div className="categories-column">
          {active.categories.map((cat) => {
            const row = overall.rows.find((r) => r.id === cat.id);
            return (
              <CategoryCard
                key={cat.id}
                category={cat}
                score={row?.score ?? null}
                contribution={row?.contribution ?? null}
                onChange={updateCategory}
                onDelete={() => deleteCategory(cat.id)}
              />
            );
          })}
          <button className="add-btn add-category-btn" onClick={addCategory}>
            + Add category
          </button>

          <div className="card">
            <label className="late-policy-label" htmlFor="late-policy">
              Notes / late policy
            </label>
            <textarea
              id="late-policy"
              className="late-policy-input"
              placeholder="Paste the late policy or any grading notes here for reference..."
              value={active.latePolicy || ""}
              onChange={(e) => updateActive({ latePolicy: e.target.value })}
            />
          </div>
        </div>

        <div className="summary-column">
          <SummaryPanel
            overall={overall}
            scale={active.scale}
            onScaleChange={(scale) => updateActive({ scale })}
          />
        </div>
      </main>
    </div>
  );
}
