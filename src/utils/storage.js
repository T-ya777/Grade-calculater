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

export function newAssignment(name = "New Assignment") {
  return { id: uid(), name, earned: "", possible: "", lateDaysUsed: 0 };
}

export function newWebsiteLink(label = "", url = "") {
  return { id: uid(), label, url };
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
