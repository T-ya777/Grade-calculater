import { useEffect, useMemo, useState } from "react";
import "./App.css";
import ClassSidebar from "./components/ClassSidebar";
import CategoryCard from "./components/CategoryCard";
import SummaryPanel from "./components/SummaryPanel";
import LateDaysCard from "./components/LateDaysCard";
import { computeOverall } from "./utils/grading";
import { loadProfiles, saveProfiles, newClassProfile, newCategory } from "./utils/storage";

const SIDEBAR_COLLAPSED_KEY = "grade-calculator-sidebar-collapsed";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

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

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const active = profiles.find((p) => p.id === activeId);

  // Grade preview for every class, used by the sidebar so all classes are visible at once.
  const gradesByClass = useMemo(() => {
    const map = {};
    profiles.forEach((p) => {
      map[p.id] = computeOverall(p.categories).currentGrade;
    });
    return map;
  }, [profiles]);

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
    <div className="app-shell-outer">
      <div className="app-shell">
        <header>
          <h1>Grade Calculator</h1>
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
            <LateDaysCard
              classProfile={active}
              onTotalChange={(totalLateDays) => updateActive({ totalLateDays })}
            />
          </div>
        </main>
      </div>

      <ClassSidebar
        profiles={profiles}
        grades={gradesByClass}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={setActiveId}
        onCreate={createClass}
        onRename={renameClass}
        onDelete={deleteClass}
      />
    </div>
  );
}
