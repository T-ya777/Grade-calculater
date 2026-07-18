import { useEffect, useMemo, useState } from "react";
import "./App.css";
import ClassSidebar from "./components/ClassSidebar";
import CategoryCard from "./components/CategoryCard";
import SummaryPanel from "./components/SummaryPanel";
import LateDaysCard from "./components/LateDaysCard";
import FinalExamCard from "./components/FinalExamCard";
import ClassInfoCard from "./components/ClassInfoCard";
import { computeOverall } from "./utils/grading";
import {
  loadProfiles,
  saveProfiles,
  loadSemesters,
  saveSemesters,
  newClassProfile,
  newCategory,
} from "./utils/storage";

const SIDEBAR_COLLAPSED_KEY = "grade-calculator-sidebar-collapsed";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [semesters, setSemesters] = useState([]);
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
    const storedProfiles = loadProfiles();
    const storedSemesters = loadSemesters();

    if (storedProfiles.length > 0 || storedSemesters.length > 0) {
      setProfiles(storedProfiles);
      setSemesters(storedSemesters);
      setActiveId(storedProfiles[0]?.id ?? null);
    } else {
      // First run ever: seed one semester with one class so there's
      // somewhere for a new class to belong, per-design no class exists
      // without a semester going forward.
      const semesterName = "Semester 1";
      const first = newClassProfile("My Class");
      first.semester = semesterName;
      setProfiles([first]);
      setSemesters([semesterName]);
      setActiveId(first.id);
    }
    setLoaded(true);
  }, []);

  // Persist whenever profiles/semesters change (after initial load).
  useEffect(() => {
    if (loaded) saveProfiles(profiles);
  }, [profiles, loaded]);

  useEffect(() => {
    if (loaded) saveSemesters(semesters);
  }, [semesters, loaded]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const active = profiles.find((p) => p.id === activeId);

  // Keep the browser tab title in sync with whichever class is open.
  useEffect(() => {
    document.title = active ? `${active.name} — Grade Calculator` : "Grade Calculator";
  }, [active?.name]);

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
    // Only one category per class can be flagged as the final exam.
    const categories = active.categories.map((c) => {
      if (c.id === updatedCat.id) return updatedCat;
      return updatedCat.isFinalExam ? { ...c, isFinalExam: false } : c;
    });
    updateActive({ categories });
  }

  function addCategory() {
    updateActive({ categories: [...active.categories, newCategory(`Category ${active.categories.length + 1}`)] });
  }

  function deleteCategory(id) {
    updateActive({ categories: active.categories.filter((c) => c.id !== id) });
  }

  function createClassInSemester(semesterName) {
    const p = newClassProfile(`Class ${profiles.length + 1}`);
    p.semester = semesterName;
    setProfiles((prev) => [...prev, p]);
    setActiveId(p.id);
  }

  function renameClass(id, name) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function setClassSemester(id, semester) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, semester } : p)));
  }

  function deleteClass(id) {
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    setActiveId(remaining.length > 0 ? remaining[0].id : null);
  }

  function addSemester(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSemesters((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }

  function renameSemester(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setSemesters((prev) => prev.map((s) => (s === oldName ? trimmed : s)));
    setProfiles((prev) => prev.map((p) => (p.semester === oldName ? { ...p, semester: trimmed } : p)));
  }

  function deleteSemester(name) {
    setSemesters((prev) => prev.filter((s) => s !== name));
  }

  if (!loaded || !active) {
    return <div className="app-shell">Loading…</div>;
  }

  const overall = computeOverall(active.categories);

  return (
    <div className="app-shell-outer">
      <ClassSidebar
        profiles={profiles}
        semesters={semesters}
        grades={gradesByClass}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={setActiveId}
        onRename={renameClass}
        onDelete={deleteClass}
        onAddSemester={addSemester}
        onRenameSemester={renameSemester}
        onDeleteSemester={deleteSemester}
        onCreateClassInSemester={createClassInSemester}
      />

      <div className="app-shell">
        <header>
          <h1>{active.name}</h1>
          {semesters.length > 0 && (
            <select
              className="header-semester-select"
              title="Semester"
              value={semesters.includes(active.semester) ? active.semester : ""}
              onChange={(e) => setClassSemester(active.id, e.target.value)}
            >
              {!semesters.includes(active.semester) && (
                <option value="" disabled>
                  Choose a semester...
                </option>
              )}
              {semesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
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
          </div>

          <div className="summary-column">
            <SummaryPanel
              overall={overall}
              scale={active.scale}
              onScaleChange={(scale) => updateActive({ scale })}
              credits={active.credits}
              onCreditsChange={(credits) => updateActive({ credits })}
            />
            <LateDaysCard
              classProfile={active}
              onTotalChange={(totalLateDays) => updateActive({ totalLateDays })}
            />
            <FinalExamCard
              classProfile={active}
              onNoFinalExamChange={(noFinalExam) => updateActive({ noFinalExam })}
            />
            <ClassInfoCard classProfile={active} onChange={updateActive} />
          </div>
        </main>
      </div>
    </div>
  );
}
