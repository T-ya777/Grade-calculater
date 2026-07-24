import { newClassProfile, newCategory, newAssignment } from "./storage";

// A deliberately minimal schema — an AI reading a gradebook screenshot has
// to fill this in correctly with no back-and-forth, so every field it's
// asked for is either obvious from a screenshot or has a safe default here
// on our side (see parseAiClassJson). No ids, no scale objects, no app
// internals — just what a human could read off a syllabus/gradebook.
export const AI_IMPORT_SAMPLE = {
  className: "CS 15-150 Functional Programming",
  credits: 12,
  categories: [
    {
      name: "Homework",
      weight: 40,
      mode: "avgPercent",
      dropLowest: 1,
      assignments: [
        { name: "HW1", earned: 42.5, possible: 43 },
        { name: "HW2", earned: null, possible: null },
      ],
    },
    {
      name: "Exams",
      weight: 60,
      mode: "sumPoints",
      dropLowest: 0,
      assignments: [{ name: "Midterm", earned: 85, possible: 100 }],
    },
  ],
};

/** The text you copy and hand to an AI chat (alongside a screenshot of
 * your gradebook) to get back JSON this app can import for one class. */
export function buildAiImportPrompt() {
  return `I'm using a grade-tracking app that can import class data as JSON. I'll share a screenshot (or the raw text) of my gradebook — please read it and reply with ONLY a JSON object, no other text and no markdown code fences, matching this exact schema:

${JSON.stringify(AI_IMPORT_SAMPLE, null, 2)}

Rules:
- "mode" must be exactly "avgPercent" (average of each assignment's %) or "sumPoints" (total points earned ÷ total points possible) — use whichever matches how this category is actually calculated, or "avgPercent" if you can't tell.
- "weight" is a whole-number percent (40, not 0.4).
- If an assignment doesn't have a score yet, set both earned and possible to null.
- Include every category and every assignment you can see.
- Reply with the JSON only.`;
}

function toScoreValue(v) {
  return typeof v === "number" && !Number.isNaN(v) ? v : "";
}

/** Parses (and sanitizes) the JSON an AI hands back into a full class
 * profile, ready to either overwrite an existing class or be added as a
 * new one. Lenient on purpose — missing/malformed fields fall back to safe
 * defaults instead of rejecting the whole import, since this is meant to
 * survive an AI getting some details wrong rather than demanding a
 * perfect match. Only throws for input that isn't usable at all. */
export function parseAiClassJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Couldn't read that as JSON — make sure you pasted the AI's reply exactly, with nothing else around it."
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("That JSON doesn't look like a class (expected an object, not a list or plain value).");
  }

  const className =
    typeof data.className === "string" && data.className.trim() ? data.className.trim() : "Imported Class";

  const profile = newClassProfile(className);
  profile.credits = typeof data.credits === "number" && !Number.isNaN(data.credits) ? data.credits : profile.credits;
  if (typeof data.semester === "string") profile.semester = data.semester.trim();

  const rawCategories = Array.isArray(data.categories) ? data.categories : [];
  profile.categories = rawCategories.map((c) => {
    const name = typeof c?.name === "string" && c.name.trim() ? c.name.trim() : "Category";
    const weight = typeof c?.weight === "number" && !Number.isNaN(c.weight) ? c.weight : 0;
    const mode = c?.mode === "sumPoints" ? "sumPoints" : "avgPercent";
    const dropLowest = typeof c?.dropLowest === "number" && !Number.isNaN(c.dropLowest) ? c.dropLowest : 0;
    const rawAssignments = Array.isArray(c?.assignments) ? c.assignments : [];

    const assignments = rawAssignments.map((a) => {
      const assignment = newAssignment(typeof a?.name === "string" && a.name.trim() ? a.name.trim() : "Assignment");
      assignment.earned = toScoreValue(a?.earned);
      assignment.possible = toScoreValue(a?.possible);
      // Screenshot-sourced scores are historical/real, not a fresh
      // hypothetical entry — same treatment as Excel import.
      assignment.confirmed = assignment.earned !== "" && assignment.possible !== "";
      return assignment;
    });

    return { ...newCategory(name), weight, mode, dropLowest, assignments };
  });

  if (profile.categories.length === 0) {
    throw new Error('No categories found under "categories" — nothing to import.');
  }

  return profile;
}
