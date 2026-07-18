import { DEFAULT_SCALE } from "./grading";

const STORAGE_KEY = "grade-calculator-profiles-v1";

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
  return { id: uid(), name, earned: "", possible: "", lateDaysUsed: 0, extraCredit: false };
}

export const UNASSIGNED_SEMESTER = "Unassigned";

export function newClassProfile(name = "New Class") {
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
    scale: DEFAULT_SCALE,
    latePolicy: "",
    totalLateDays: 0,
    noFinalExam: false,
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
