import { useEffect, useMemo, useState } from "react";
import "./App.css";
import ClassSidebar from "./components/ClassSidebar";
import CategoryCard from "./components/CategoryCard";
import SummaryPanel from "./components/SummaryPanel";
import LateDaysCard from "./components/LateDaysCard";
import FinalExamCard from "./components/FinalExamCard";
import ClassInfoCard from "./components/ClassInfoCard";
import SettingsPage from "./components/SettingsPage";
import SemesterPage from "./components/SemesterPage";
import { computeOverall } from "./utils/grading";
import {
  loadProfiles,
  saveProfiles,
  loadSemesters,
  saveSemesters,
  loadSettings,
  saveSettings,
  newSettings,
  newClassProfile,
  newCategory,
  UNASSIGNED_SEMESTER,
} from "./utils/storage";

const SIDEBAR_COLLAPSED_KEY = "grade-calculator-sidebar-collapsed";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [semesterView, setSemesterView] = useState(null);
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
    const storedSettings = loadSettings();
    setSettings(storedSettings);

    if (storedProfiles.length > 0 || storedSemesters.length > 0) {
      setProfiles(storedProfiles);
      setSemesters(storedSemesters);
      setActiveId(storedProfiles[0]?.id ?? null);
    } else {
      // First run ever: seed one semester with one class so there's
      // somewhere for a new class to belong, per-design no class exists
      // without a semester going forward.
      const semesterName = "Semester 1";
      const first = newClassProfile("My Class", storedSettings.defaultScale);
      first.semester = semesterName;
      setProfiles([first]);
      setSemesters([semesterName]);
      setActiveId(first.id);
    }
    setLoaded(true);
  }, []);

  // Persist whenever profiles/semesters/settings change (after initial load).
  useEffect(() => {
    if (loaded) saveProfiles(profiles);
  }, [profiles, loaded]);

  useEffect(() => {
    if (loaded) saveSemesters(semesters);
  }, [semesters, loaded]);

  useEffect(() => {
    if (loaded && settings) saveSettings(settings);
  }, [settings, loaded]);

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
    const p = newClassProfile(`Class ${profiles.length + 1}`, settings.defaultScale);
    p.semester = semesterName;
    setProfiles((prev) => [...prev, p]);
    selectClass(p.id);
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

  // Selecting a class from the sidebar always leaves Settings/Semester view,
  // so you land straight back on the class page instead of some other panel
  // staying up.
  function selectClass(id) {
    setSettingsOpen(false);
    setSemesterView(null);
    setActiveId(id);
  }

  // No separate "back" button — clicking the gear again (or the same
  // semester name again) closes that view and drops you back on whichever
  // class was active, same as clicking a class in the sidebar does.
  function openSettings() {
    setSemesterView(null);
    setSettingsOpen((prev) => !prev);
  }

  function openSemesterView(name) {
    setSettingsOpen(false);
    setSemesterView((prev) => (prev === name ? null : name));
  }

  function updateSettings(patch) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function applyScaleToClasses(scale, ids) {
    const idSet = new Set(ids);
    setProfiles((prev) => prev.map((p) => (idSet.has(p.id) ? { ...p, scale } : p)));
  }

  function toggleIncludeInGpa(id, next) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, includeInGpa: next } : p)));
  }

  // Everything lives only in localStorage, so this is the only way to back
  // it up or move it to a different browser/computer. One JSON file with
  // everything the app knows — not meant to be hand-edited, just a save
  // file to download and load back in later.
  function exportAllData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profiles,
      semesters,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `grade-calculator-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // Import always replaces everything currently in the app — simplest
  // mental model for "restore a backup." Merging with existing data is
  // logged as a future idea, not built here.
  function importAllData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        alert("Couldn't read that file — make sure it's a Grade Calculator backup (.json).");
        return;
      }

      if (!Array.isArray(data.profiles) || !Array.isArray(data.semesters) || typeof data.settings !== "object") {
        alert("That file doesn't look like a Grade Calculator backup — import cancelled.");
        return;
      }

      const count = data.profiles.length;
      const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "an unknown date";
      const proceed = window.confirm(
        `This will replace everything currently in the app with this backup ` +
          `(${count} class${count === 1 ? "" : "es"}, exported ${when}). This can't be undone. Continue?`
      );
      if (!proceed) return;

      setProfiles(data.profiles);
      setSemesters(data.semesters);
      setSettings({ ...newSettings(), ...data.settings });
      setActiveId(data.profiles[0]?.id ?? null);
      setSettingsOpen(false);
      setSemesterView(null);
    };
    reader.onerror = () => alert("Couldn't read that file — try again.");
    reader.readAsText(file);
  }

  function clearAllData() {
    const proceed = window.confirm(
      "This permanently deletes every class, semester, and setting in this browser. " +
        "If you haven't exported a backup yet, cancel and do that first — this can't be undone. Continue?"
    );
    if (!proceed) return;

    const freshSettings = newSettings();
    const semesterName = "Semester 1";
    const first = newClassProfile("My Class", freshSettings.defaultScale);
    first.semester = semesterName;
    setSettings(freshSettings);
    setProfiles([first]);
    setSemesters([semesterName]);
    setActiveId(first.id);
    setSettingsOpen(false);
    setSemesterView(null);
  }

  if (!loaded || !settings || (!active && !settingsOpen && !semesterView)) {
    return <div className="app-shell">Loading…</div>;
  }

  const semesterProfiles = semesterView
    ? profiles.filter((p) => {
        const key = p.semester && p.semester.trim() ? p.semester.trim() : UNASSIGNED_SEMESTER;
        return key === semesterView;
      })
    : [];

  const overall = active ? computeOverall(active.categories) : null;

  const cardRenderers = {
    lateDays: () => (
      <LateDaysCard
        key="lateDays"
        classProfile={active}
        onTotalChange={(totalLateDays) => updateActive({ totalLateDays })}
      />
    ),
    finalExam: () => (
      <FinalExamCard
        key="finalExam"
        classProfile={active}
        onNoFinalExamChange={(noFinalExam) => updateActive({ noFinalExam })}
      />
    ),
    classInfo: () => <ClassInfoCard key="classInfo" classProfile={active} onChange={updateActive} />,
  };

  return (
    <div className="app-shell-outer">
      <ClassSidebar
        profiles={profiles}
        semesters={semesters}
        grades={gradesByClass}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={selectClass}
        onRename={renameClass}
        onDelete={deleteClass}
        onAddSemester={addSemester}
        onRenameSemester={renameSemester}
        onDeleteSemester={deleteSemester}
        onCreateClassInSemester={createClassInSemester}
        settingsOpen={settingsOpen}
        onOpenSettings={openSettings}
        activeSemesterView={semesterView}
        onSelectSemester={openSemesterView}
      />

      <div className="app-shell">
        {settingsOpen ? (
          <>
            <header>
              <h1>Settings</h1>
            </header>
            <main className="settings-main">
              <SettingsPage
                settings={settings}
                onChange={updateSettings}
                profiles={profiles}
                onApplyScaleToClasses={applyScaleToClasses}
                onExportData={exportAllData}
                onImportData={importAllData}
                onClearAllData={clearAllData}
              />
            </main>
          </>
        ) : semesterView ? (
          <>
            <header>
              <h1>{semesterView}</h1>
            </header>
            <main className="settings-main">
              <SemesterPage
                semesterName={semesterView}
                profiles={semesterProfiles}
                settings={settings}
                onSelectClass={selectClass}
                onToggleInclude={toggleIncludeInGpa}
              />
            </main>
          </>
        ) : (
          <>
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
                {settings.cardOrder
                  .filter((key) => settings.cardVisibility[key] !== false && cardRenderers[key])
                  .map((key) => cardRenderers[key]())}
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
