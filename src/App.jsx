import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./editorial-theme.css";
import ClassSidebar from "./components/ClassSidebar";
import CategoryCard from "./components/CategoryCard";
import SummaryPanel from "./components/SummaryPanel";
import LateDaysCard from "./components/LateDaysCard";
import FinalExamCard from "./components/FinalExamCard";
import ClassInfoCard from "./components/ClassInfoCard";
import SettingsPage from "./components/SettingsPage";
import SemesterPage from "./components/SemesterPage";
import OverviewPage from "./components/OverviewPage";
import ThreeDotMenu from "./components/ThreeDotMenu";
import { computeOverall, countHypotheticalAssignments } from "./utils/grading";
import { distributeIntoColumns } from "./utils/layout";
import { exportExcelWorkbook } from "./utils/excelExport";
import { parseExcelWorkbook } from "./utils/excelImport";
import AiImportModal from "./components/AiImportModal";
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
  newManualClass,
  UNASSIGNED_SEMESTER,
  exportClassJson,
  exportSemesterJson,
  parseClassJsonFile,
  migrateProfiles,
} from "./utils/storage";

const SIDEBAR_COLLAPSED_KEY = "grade-calculator-sidebar-collapsed";

export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [settings, setSettings] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [semesterView, setSemesterView] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);
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
      setProfiles(migrateProfiles(storedProfiles));
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

  // Applies the chosen visual theme by setting a data attribute on <html>,
  // which editorial-theme.css keys off of. Pure presentation — set on the
  // document root (not just the app shell) so it also reaches things like
  // the modal overlay, which portals aren't used for here but keeps this
  // robust either way.
  useEffect(() => {
    if (settings) document.documentElement.dataset.theme = settings.theme || "default";
  }, [settings?.theme]);

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

  // Wipes out every assignment score that's still hypothetical (has a
  // score entered, but the "Final?" checkbox isn't checked) for the active
  // class, across all categories in one go. Confirmed scores are untouched.
  // Only clears "earned" — "possible" stays, since that's the assignment's
  // point value, not a guess.
  function clearHypotheticalScores() {
    const hasScore = (a) =>
      a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null;
    const proceed = window.confirm(
      "This clears every not-yet-final score entered for this class (keeping each assignment's point value). Confirmed final grades are left alone. Continue?"
    );
    if (!proceed) return;
    const categories = active.categories.map((c) => ({
      ...c,
      assignments: c.assignments.map((a) => (hasScore(a) && !a.confirmed ? { ...a, earned: "" } : a)),
    }));
    updateActive({ categories });
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

  // Sidebar long-press-to-reorder. Overview page reads the same `semesters`
  // array to order its per-semester blocks, so reordering here reorders
  // there automatically — no separate state to keep in sync.
  function reorderSemesters(newOrder) {
    setSemesters(newOrder);
  }

  function deleteSemester(name) {
    setSemesters((prev) => prev.filter((s) => s !== name));
  }

  // Selecting a class from the sidebar always leaves Settings/Semester/
  // Overview, so you land straight back on the class page instead of some
  // other panel staying up.
  function selectClass(id) {
    setSettingsOpen(false);
    setSemesterView(null);
    setOverviewOpen(false);
    setActiveId(id);
  }

  // No separate "back" button — clicking the icon again (or the same
  // semester name again) closes that view and drops you back on whichever
  // class was active, same as clicking a class in the sidebar does.
  function openSettings() {
    setSemesterView(null);
    setOverviewOpen(false);
    setSettingsOpen((prev) => !prev);
  }

  function openSemesterView(name) {
    setSettingsOpen(false);
    setOverviewOpen(false);
    setSemesterView((prev) => (prev === name ? null : name));
  }

  function openOverview() {
    setSettingsOpen(false);
    setSemesterView(null);
    setOverviewOpen((prev) => !prev);
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

  // Manual/"past" classes — added and managed entirely from the Overview
  // page (see newManualClass in storage.js). They never become the active
  // class, so unlike deleteClass this never touches activeId.
  function addManualClass(name, semester, credits, letter) {
    const p = newManualClass(name, semester, credits, letter);
    setProfiles((prev) => [...prev, p]);
  }

  function updateManualClass(id, patch) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function deleteManualClass(id) {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }

  // Overview page's per-class Notes popup — works for any class, manual or
  // regular, since it's just a free-text field on the profile.
  function updateOverviewNote(id, note) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, overviewNote: note } : p)));
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

      setProfiles(migrateProfiles(data.profiles));
      setSemesters(data.semesters);
      setSettings({ ...newSettings(), ...data.settings });
      setActiveId(data.profiles[0]?.id ?? null);
      setSettingsOpen(false);
      setSemesterView(null);
      setOverviewOpen(false);
    };
    reader.onerror = () => alert("Couldn't read that file — try again.");
    reader.readAsText(file);
  }

  // Excel import only works on a file this app exported itself (it re-reads
  // the Overview + per-class sheets built by exportExcelWorkbook) — it's a
  // round-trip tool, not a general Excel importer. Also replaces everything,
  // same as the JSON backup import, but settings (default scale, GPA point
  // table, theme, etc.) aren't touched since Excel never carries those.
  async function importExcelAllData(file) {
    let result;
    try {
      result = await parseExcelWorkbook(file);
    } catch (e) {
      alert(e.message);
      return;
    }

    const count = result.profiles.length;
    const proceed = window.confirm(
      `This will replace everything currently in the app with this Excel file ` +
        `(${count} class${count === 1 ? "" : "es"}). App settings (default scale, GPA points, ` +
        `theme) won't change — Excel doesn't carry those. This can't be undone. Continue?`
    );
    if (!proceed) return;

    setProfiles(migrateProfiles(result.profiles));
    setSemesters(result.semesters);
    setActiveId(result.profiles[0]?.id ?? null);
    setSettingsOpen(false);
    setSemesterView(null);
    setOverviewOpen(false);

    if (result.warnings.length > 0) {
      alert(`Imported with some issues:\n\n${result.warnings.join("\n")}`);
    }
  }

  // Secondary export, alongside the JSON backup — a human-readable/editable
  // spreadsheet snapshot (Overview + one sheet per class). Excel-only for
  // now; importing it back in is a separate, not-yet-built step.
  // scopedProfiles defaults to everything, but the Settings page lets you
  // narrow it down to specific classes/semesters first.
  async function exportExcelData(scopedProfiles = profiles) {
    try {
      await exportExcelWorkbook(scopedProfiles, semesters, settings);
    } catch (e) {
      console.error("Failed to export Excel file", e);
      alert("Couldn't build the Excel file — try again.");
    }
  }

  // Per-class export/import, from the three-dot menu next to the semester
  // selector on the class page. Import replaces this class's data in place
  // (keeps the same id, so it stays the same sidebar entry) — it's meant
  // for restoring an earlier backup of this specific class, not adding a
  // new one.
  function exportClassJsonData(profile) {
    exportClassJson(profile);
  }

  async function exportClassExcelData(profile) {
    try {
      await exportExcelWorkbook([profile], semesters, settings, `${profile.name || "class"}-export`);
    } catch (e) {
      console.error("Failed to export Excel file", e);
      alert("Couldn't build the Excel file — try again.");
    }
  }

  async function importClassJsonData(id, file) {
    let imported;
    try {
      imported = await parseClassJsonFile(file);
    } catch (e) {
      alert(e.message);
      return;
    }
    const proceed = window.confirm(
      `This will replace all data for this class with the imported backup ("${imported.name}"). ` +
        `This can't be undone. Continue?`
    );
    if (!proceed) return;
    const [migratedImport] = migrateProfiles([imported]);
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...migratedImport, id } : p)));
  }

  // AI-generated JSON import (see AiImportModal + utils/aiImport.js) — the
  // schema has no id/scale/semester baked in the way a real backup does, so
  // "overwrite" keeps the current class's id/scale/semester and only swaps
  // in the parsed name/credits/categories; "new" just adds it as a fresh
  // class (no semester assigned yet, same as creating one from scratch).
  function handleAiImport(parsedProfile, mode) {
    const [migrated] = migrateProfiles([parsedProfile]);
    if (mode === "overwrite" && active) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === active.id
            ? { ...migrated, id: active.id, scale: p.scale, semester: p.semester, isManual: false }
            : p
        )
      );
    } else {
      setProfiles((prev) => [...prev, migrated]);
      setActiveId(migrated.id);
      setSettingsOpen(false);
      setSemesterView(null);
      setOverviewOpen(false);
    }
    setAiImportOpen(false);
  }

  // Semester export, from the three-dot menu on the semester page — export
  // only, no matching import for a whole semester at once.
  function exportSemesterJsonData(name, semesterProfilesToExport) {
    exportSemesterJson(name, semesterProfilesToExport);
  }

  async function exportSemesterExcelData(name, semesterProfilesToExport) {
    try {
      await exportExcelWorkbook(semesterProfilesToExport, semesters, settings, `${name}-export`);
    } catch (e) {
      console.error("Failed to export Excel file", e);
      alert("Couldn't build the Excel file — try again.");
    }
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
    setOverviewOpen(false);
  }

  if (!loaded || !settings || (!active && !settingsOpen && !semesterView && !overviewOpen)) {
    return <div className="app-shell">Loading…</div>;
  }

  const semesterProfiles = semesterView
    ? profiles.filter((p) => {
        const key = p.semester && p.semester.trim() ? p.semester.trim() : UNASSIGNED_SEMESTER;
        return key === semesterView;
      })
    : [];

  const overall = active ? computeOverall(active.categories) : null;
  const hypotheticalCount = active ? countHypotheticalAssignments(active.categories) : 0;
  // Compact layout's category grid: 3 columns, next card always goes under
  // whichever column is currently shortest — see utils/layout.js for why
  // this uses assignment counts instead of measuring real DOM heights.
  const categoryColumns = active ? distributeIntoColumns(active.categories, 3) : [[], [], []];

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

  // Shared by both compact-layout branches (regular and calculator mode) —
  // renders the category cards grouped into categoryColumns (see above)
  // instead of one flat list, so cards land in the shortest column rather
  // than strictly left-to-right/top-to-bottom.
  function renderCompactCategoriesGrid() {
    return (
      <div className="compact-categories-grid">
        {categoryColumns.map((col, ci) => (
          <div className="compact-categories-column" key={ci}>
            {col.map((cat) => {
              const row = overall.rows.find((r) => r.id === cat.id);
              const finalExamCategory = active.categories.find((c) => c.isFinalExam);
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  score={row?.score ?? null}
                  contribution={row?.contribution ?? null}
                  onChange={updateCategory}
                  onDelete={() => deleteCategory(cat.id)}
                  finalExamCategoryId={finalExamCategory?.id ?? null}
                  finalExamCategoryName={finalExamCategory?.name ?? null}
                  compact
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

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
        onReorderSemesters={reorderSemesters}
        onCreateClassInSemester={createClassInSemester}
        settingsOpen={settingsOpen}
        onOpenSettings={openSettings}
        activeSemesterView={semesterView}
        onSelectSemester={openSemesterView}
        overviewOpen={overviewOpen}
        onOpenOverview={openOverview}
      />

      <div className="app-shell">
        {overviewOpen ? (
          <>
            <header>
              <h1>Overview</h1>
            </header>
            <main className="settings-main">
              <OverviewPage
                profiles={profiles}
                semesters={semesters}
                settings={settings}
                onSelectSemester={openSemesterView}
                onSelectClass={selectClass}
                onAddManualClass={addManualClass}
                onUpdateManualClass={updateManualClass}
                onDeleteManualClass={deleteManualClass}
                onAddSemester={addSemester}
                onUpdateNote={updateOverviewNote}
              />
            </main>
          </>
        ) : settingsOpen ? (
          <>
            <header>
              <h1>Settings</h1>
            </header>
            <main className="settings-main">
              <SettingsPage
                settings={settings}
                onChange={updateSettings}
                profiles={profiles}
                semesters={semesters}
                onApplyScaleToClasses={applyScaleToClasses}
                onExportData={exportAllData}
                onImportData={importAllData}
                onImportExcel={importExcelAllData}
                onClearAllData={clearAllData}
                onExportExcel={exportExcelData}
              />
            </main>
          </>
        ) : semesterView ? (
          <>
            <header>
              <div className="header-row">
                <h1>{semesterView}</h1>
                <div className="header-actions">
                  <ThreeDotMenu
                    items={[
                      {
                        label: "Export as JSON backup",
                        onClick: () => exportSemesterJsonData(semesterView, semesterProfiles),
                      },
                      {
                        label: "Export as Excel",
                        onClick: () => exportSemesterExcelData(semesterView, semesterProfiles),
                      },
                    ]}
                  />
                </div>
              </div>
            </header>
            <main className="settings-main">
              <SemesterPage
                semesterName={semesterView}
                profiles={semesterProfiles}
                settings={settings}
                onSelectClass={selectClass}
                onToggleInclude={toggleIncludeInGpa}
                onAddManualClass={addManualClass}
                onUpdateManualClass={updateManualClass}
                onDeleteManualClass={deleteManualClass}
              />
            </main>
          </>
        ) : (
          <>
            <header>
              <div className="header-row">
                <h1>{active.name}</h1>
                <div className="header-actions">
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
                  <ThreeDotMenu
                    items={[
                      {
                        label: active.compactLayout ? "✓ Compact layout" : "Compact layout",
                        onClick: () => updateActive({ compactLayout: !active.compactLayout }),
                      },
                      { label: "Export as JSON backup", onClick: () => exportClassJsonData(active) },
                      { label: "Export as Excel", onClick: () => exportClassExcelData(active) },
                      {
                        label: "Import from JSON backup",
                        fileAccept: ".json,application/json",
                        onFile: (file) => importClassJsonData(active.id, file),
                      },
                      {
                        label: "Import from AI-generated JSON...",
                        onClick: () => setAiImportOpen(true),
                      },
                    ]}
                  />
                </div>
              </div>

              {aiImportOpen && (
                <AiImportModal
                  currentClassName={active.name}
                  onClose={() => setAiImportOpen(false)}
                  onImport={handleAiImport}
                />
              )}

              {active.compactLayout && (
                <div className="compact-mode-toggle" role="group" aria-label="Class page view">
                  <button
                    type="button"
                    className={!active.calculatorMode ? "active" : ""}
                    onClick={() => updateActive({ calculatorMode: false })}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    className={active.calculatorMode ? "active" : ""}
                    onClick={() => updateActive({ calculatorMode: true })}
                  >
                    Calculator mode
                  </button>
                </div>
              )}

              {hypotheticalCount > 0 && (
                <div className="hypothetical-banner">
                  <span>
                    {hypotheticalCount} assignment score{hypotheticalCount === 1 ? "" : "s"} not yet
                    checked off as final — your current grade includes {hypotheticalCount === 1 ? "it" : "them"}.
                  </span>
                  <button type="button" className="hypothetical-clear-btn" onClick={clearHypotheticalScores}>
                    Clear hypothetical scores
                  </button>
                </div>
              )}
            </header>

            {active.compactLayout && active.calculatorMode ? (
              <main className="calculator-page">
                <SummaryPanel overall={overall} scale={active.scale} calculatorMode />

                {renderCompactCategoriesGrid()}
                <button className="add-btn add-category-btn" onClick={addCategory}>
                  + Add category
                </button>
              </main>
            ) : active.compactLayout ? (
              <main className="compact-page">
                <div className="compact-top-strip">
                  <SummaryPanel
                    overall={overall}
                    scale={active.scale}
                    onScaleChange={(scale) => updateActive({ scale })}
                    credits={active.credits}
                    onCreditsChange={(credits) => updateActive({ credits })}
                    compact
                  />
                  {/* Late days + Final exam calculator share the middle column,
                      stacked, so the strip reads as 3 columns rather than
                      spreading every card out into its own slot. */}
                  {(settings.cardVisibility.lateDays !== false ||
                    settings.cardVisibility.finalExam !== false) && (
                    <div className="compact-top-strip-stack">
                      {settings.cardVisibility.lateDays !== false && cardRenderers.lateDays()}
                      {settings.cardVisibility.finalExam !== false && cardRenderers.finalExam()}
                    </div>
                  )}
                  {settings.cardVisibility.classInfo !== false && cardRenderers.classInfo()}
                </div>

                {renderCompactCategoriesGrid()}
                <button className="add-btn add-category-btn" onClick={addCategory}>
                  + Add category
                </button>
              </main>
            ) : (
              <main className="main-grid">
                <div className="categories-column">
                  {active.categories.map((cat) => {
                    const row = overall.rows.find((r) => r.id === cat.id);
                    const finalExamCategory = active.categories.find((c) => c.isFinalExam);
                    return (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        score={row?.score ?? null}
                        contribution={row?.contribution ?? null}
                        onChange={updateCategory}
                        onDelete={() => deleteCategory(cat.id)}
                        finalExamCategoryId={finalExamCategory?.id ?? null}
                        finalExamCategoryName={finalExamCategory?.name ?? null}
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
