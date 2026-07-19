import { DEFAULT_SCALE, DEFAULT_GRADE_POINTS } from "./grading";

const STORAGE_KEY = "grade-calculator-profiles-v1";
const SEMESTERS_KEY = "grade-calculator-semesters-v1";

let idCounter = 0;
export function uid() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function newCategory(name = "New Category", opts = {}) {
  return {
    id: uid(),
    name,
    weight: 0,
    mode: "avgPercent", // or "sumPoints"
    dropLowest: 0,
    assignments: [],
    isFinalExam: false,
    ...opts,
  };
}

// `confirmed: false` by default — a freshly entered score is treated as
// hypothetical until you check it off as your actual final grade for that
// assignment. See migrateProfiles() below for how existing (pre-this-
// feature) assignments are handled so old real grades don't suddenly get
// flagged as hypothetical.
export function newAssignment(name = "New Assignment") {
  return { id: uid(), name, earned: "", possible: "", lateDaysUsed: 0, confirmed: false };
}

// Backfills fields added after someone may have already saved data, so old
// saves don't silently break or get mis-flagged. Currently just: any
// assignment saved before the "confirmed" checkbox existed is treated as
// already confirmed (it was real data at the time), not hypothetical.
export function migrateProfiles(profiles) {
  return profiles.map((p) => ({
    ...p,
    categories: (p.categories || []).map((c) => ({
      ...c,
      assignments: (c.assignments || []).map((a) =>
        a.confirmed === undefined ? { ...a, confirmed: true } : a
      ),
    })),
  }));
}

export function newWebsiteLink(label = "", url = "") {
  return { id: uid(), label, url };
}

const SKIP_CATEGORY_DELETE_CONFIRM_KEY = "grade-calculator-skip-category-delete-confirm";

// "Don't ask me again" for the delete-category confirmation. Global across
// the app (not per-class) since it's a one-time "I know what I'm doing"
// preference, not something worth re-deciding per class.
export function getSkipCategoryDeleteConfirm() {
  try {
    return localStorage.getItem(SKIP_CATEGORY_DELETE_CONFIRM_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSkipCategoryDeleteConfirm(skip) {
  try {
    localStorage.setItem(SKIP_CATEGORY_DELETE_CONFIRM_KEY, String(skip));
  } catch {
    // ignore
  }
}

export function loadSemesters() {
  try {
    const raw = localStorage.getItem(SEMESTERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load semesters", e);
    return [];
  }
}

export function saveSemesters(semesters) {
  try {
    localStorage.setItem(SEMESTERS_KEY, JSON.stringify(semesters));
  } catch (e) {
    console.error("Failed to save semesters", e);
  }
}

export const UNASSIGNED_SEMESTER = "Unassigned";

/** Groups classes by semester: one group per explicit semester (in order),
 * plus a trailing "Unassigned" group for anything that doesn't match.
 * Empty groups are dropped. Shared by the Overview page and the Excel
 * export so both use the same grouping logic. */
export function groupProfilesBySemester(profiles, semesters) {
  const bySemester = new Map(semesters.map((name) => [name, []]));
  const leftovers = [];

  profiles.forEach((p) => {
    const key = p.semester && p.semester.trim() ? p.semester.trim() : "";
    if (key && bySemester.has(key)) {
      bySemester.get(key).push(p);
    } else {
      leftovers.push(p);
    }
  });

  const groups = semesters.map((name) => ({ name, profiles: bySemester.get(name) || [] }));
  if (leftovers.length > 0) groups.push({ name: UNASSIGNED_SEMESTER, profiles: leftovers });

  return groups.filter((g) => g.profiles.length > 0);
}

export function newClassProfile(name = "New Class", scale = DEFAULT_SCALE) {
  return {
    id: uid(),
    name,
    semester: "",
    credits: 3,
    categories: [
      newCategory("Homework"),
      newCategory("Exams"),
      newCategory("Final Exam", { isFinalExam: true }),
    ],
    scale,
    latePolicy: "",
    totalLateDays: 0,
    noFinalExam: false,
    websiteLinks: [],
    syllabus: null, // { name, type, size, dataUrl } once uploaded
    includeInGpa: true, // toggled off automatically only when you choose to; see SummaryPanel
  };
}

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to load profiles", e);
    return [];
  }
}

export function saveProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error("Failed to save profiles", e);
  }
}

const SETTINGS_KEY = "grade-calculator-settings-v1";

// Cards that appear below the Summary card (which is always pinned first).
// The order here is the default order for anyone with no saved preference yet.
export const DEFAULT_CARD_ORDER = ["lateDays", "finalExam", "classInfo"];

export function newSettings() {
  return {
    defaultScale: DEFAULT_SCALE,
    cardOrder: [...DEFAULT_CARD_ORDER],
    cardVisibility: { lateDays: true, finalExam: true, classInfo: true },
    gpaDisplay: "both", // "both" | "gpa" | "qpa"
    gradePoints: DEFAULT_GRADE_POINTS.map((g) => ({ ...g })),
  };
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return newSettings();
    const parsed = JSON.parse(raw);
    // Merge onto defaults so older saved settings still get any new fields
    // added later (e.g. a card type introduced after someone already saved).
    const defaults = newSettings();
    return {
      ...defaults,
      ...parsed,
      cardVisibility: { ...defaults.cardVisibility, ...(parsed.cardVisibility || {}) },
    };
  } catch (e) {
    console.error("Failed to load settings", e);
    return newSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

const WHATIF_OVERRIDES_KEY = "grade-calculator-whatif-overrides-v1";

// What-If letter-grade overrides on the Semester page, kept per semester
// name so trying out a hypothetical in one semester doesn't bleed into
// another. Persisted so leaving and reopening What-If mode (or reloading
// the app) shows the same hypothetical setup instead of losing it.
export function loadWhatIfOverrides(semesterName) {
  try {
    const raw = localStorage.getItem(WHATIF_OVERRIDES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[semesterName] || {};
  } catch (e) {
    console.error("Failed to load What-If overrides", e);
    return {};
  }
}

export function saveWhatIfOverrides(semesterName, overrides) {
  try {
    const raw = localStorage.getItem(WHATIF_OVERRIDES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (Object.keys(overrides).length === 0) {
      delete all[semesterName];
    } else {
      all[semesterName] = overrides;
    }
    localStorage.setItem(WHATIF_OVERRIDES_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("Failed to save What-If overrides", e);
  }
}

function slugify(name) {
  return (
    (name || "export")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "export"
  );
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const dateStr = () => new Date().toISOString().slice(0, 10);

// Single-class backup — the JSON version of the three-dot menu's "Export"
// on the class page. Round-trips through parseClassJsonFile below.
export function exportClassJson(profile) {
  const payload = { type: "grade-calculator-class", exportedAt: new Date().toISOString(), profile };
  downloadJson(payload, `${slugify(profile.name)}-backup-${dateStr()}.json`);
}

// Semester backup — export-only from the three-dot menu on the semester
// page (there's no matching import; restoring a whole semester at once
// isn't built, only single classes and the full app backup are).
export function exportSemesterJson(semesterName, profiles) {
  const payload = {
    type: "grade-calculator-semester",
    exportedAt: new Date().toISOString(),
    semesterName,
    profiles,
  };
  downloadJson(payload, `${slugify(semesterName)}-backup-${dateStr()}.json`);
}

// Reads a single-class backup file and resolves with the profile object,
// or rejects with a user-facing message on anything that doesn't look
// right. Doesn't touch app state — the caller decides what to do with it
// (confirm + replace the current class, keeping its id).
export function parseClassJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        reject(new Error("Couldn't read that file — make sure it's a class backup (.json)."));
        return;
      }
      if (data.type !== "grade-calculator-class" || !data.profile || typeof data.profile !== "object") {
        reject(new Error("That file doesn't look like a single-class backup — import cancelled."));
        return;
      }
      resolve(data.profile);
    };
    reader.onerror = () => reject(new Error("Couldn't read that file — try again."));
    reader.readAsText(file);
  });
}
