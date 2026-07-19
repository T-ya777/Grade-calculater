// Core grading math. Kept framework-free so it's easy to unit test.

/**
 * Compute a single category's score (0-100) from its assignments.
 * mode:
 *  - "avgPercent": average each assignment's percentage (typical "average of homework" rule)
 *  - "sumPoints": sum(earned) / sum(possible) * 100 (typical for exams/points-based grading)
 * dropLowest: number of lowest-scoring assignments to drop before computing.
 */
export function computeCategoryScore(category) {
  const isValid = (a) =>
    a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null;

  const valid = (category.assignments || []).filter(isValid);
  if (valid.length === 0) return null;

  const withPct = valid.map((a) => ({
    ...a,
    pct: (Number(a.earned) / Number(a.possible)) * 100,
  }));

  withPct.sort((a, b) => a.pct - b.pct);

  const dropCount = Math.min(category.dropLowest || 0, Math.max(withPct.length - 1, 0));
  const kept = withPct.slice(dropCount);

  if (kept.length === 0) return null;

  if (category.mode === "sumPoints") {
    const earnedSum = kept.reduce((s, a) => s + Number(a.earned), 0);
    const possibleSum = kept.reduce((s, a) => s + Number(a.possible), 0);
    return possibleSum > 0 ? (earnedSum / possibleSum) * 100 : null;
  }

  // default: avgPercent
  const sum = kept.reduce((s, a) => s + a.pct, 0);
  return sum / kept.length;
}

/**
 * Mirrors computeCategoryScore's own drop-lowest logic, but returns just
 * the ids of the assignments that get excluded, so the UI can gray them
 * out instead of silently dropping them with no explanation.
 */
export function getDroppedAssignmentIds(category) {
  const isValid = (a) =>
    a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null;

  const valid = (category.assignments || []).filter(isValid);
  if (valid.length === 0) return new Set();

  const withPct = valid.map((a) => ({
    id: a.id,
    pct: (Number(a.earned) / Number(a.possible)) * 100,
  }));

  withPct.sort((a, b) => a.pct - b.pct);

  const dropCount = Math.min(category.dropLowest || 0, Math.max(withPct.length - 1, 0));
  return new Set(withPct.slice(0, dropCount).map((a) => a.id));
}

/**
 * Counts assignments across a class that have a score entered but aren't
 * checked off as "final" yet — i.e. they're counted in the current grade,
 * but they're a guess, not a confirmed grade. Used to show the "some of
 * this grade is hypothetical" banner and to drive the "clear hypothetical
 * scores" button, which only touches assignments this counts.
 */
export function countHypotheticalAssignments(categories) {
  const hasScore = (a) =>
    a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null;

  let count = 0;
  (categories || []).forEach((cat) => {
    (cat.assignments || []).forEach((a) => {
      if (hasScore(a) && !a.confirmed) count += 1;
    });
  });
  return count;
}

/**
 * Compute the overall grade across categories.
 * Only categories that currently have at least one valid assignment contribute,
 * and their weights are re-normalized to 100% so the result reads as
 * "your grade based on everything entered so far."
 */
export function computeOverall(categories) {
  const rows = categories.map((cat) => {
    const score = computeCategoryScore(cat);
    return { id: cat.id, name: cat.name, weight: Number(cat.weight) || 0, score };
  });

  const gradedRows = rows.filter((r) => r.score !== null);
  const gradedWeightSum = gradedRows.reduce((s, r) => s + r.weight, 0);

  const currentGrade =
    gradedWeightSum > 0
      ? gradedRows.reduce((s, r) => s + r.score * r.weight, 0) / gradedWeightSum
      : null;

  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);

  return {
    rows: rows.map((r) => ({
      ...r,
      contribution:
        r.score !== null && gradedWeightSum > 0 ? (r.score * r.weight) / gradedWeightSum : null,
    })),
    currentGrade,
    totalWeight,
    gradedWeightSum,
  };
}

// Common cutoff presets. Schools/professors vary on whether they use
// plus/minus grades at all, and if so whether they use both or just one.
export const SCALE_PRESETS = {
  standard: {
    label: "Standard (plus and minus)",
    scale: [
      { letter: "A", min: 93 },
      { letter: "A-", min: 90 },
      { letter: "B+", min: 87 },
      { letter: "B", min: 83 },
      { letter: "B-", min: 80 },
      { letter: "C+", min: 77 },
      { letter: "C", min: 73 },
      { letter: "C-", min: 70 },
      { letter: "D+", min: 67 },
      { letter: "D", min: 63 },
      { letter: "D-", min: 60 },
      { letter: "F", min: 0 },
    ],
  },
  noPlusMinus: {
    label: "No plus or minus",
    scale: [
      { letter: "A", min: 90 },
      { letter: "B", min: 80 },
      { letter: "C", min: 70 },
      { letter: "D", min: 60 },
      { letter: "F", min: 0 },
    ],
  },
  plusOnly: {
    label: "Plus only (no minus)",
    scale: [
      { letter: "A+", min: 97 },
      { letter: "A", min: 93 },
      { letter: "B+", min: 87 },
      { letter: "B", min: 83 },
      { letter: "C+", min: 77 },
      { letter: "C", min: 73 },
      { letter: "D+", min: 67 },
      { letter: "D", min: 63 },
      { letter: "F", min: 0 },
    ],
  },
  minusOnly: {
    label: "Minus only (no plus)",
    scale: [
      { letter: "A", min: 93 },
      { letter: "A-", min: 90 },
      { letter: "B", min: 83 },
      { letter: "B-", min: 80 },
      { letter: "C", min: 73 },
      { letter: "C-", min: 70 },
      { letter: "D", min: 63 },
      { letter: "D-", min: 60 },
      { letter: "F", min: 0 },
    ],
  },
  passNoPass: {
    label: "Pass / No Pass",
    scale: [
      { letter: "P", min: 60 },
      { letter: "NP", min: 0 },
    ],
  },
};

export const DEFAULT_SCALE = SCALE_PRESETS.standard.scale;

export function letterForScore(score, scale) {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  const found = sorted.find((s) => score >= s.min);
  return found ? found.letter : "—";
}

// Maps a letter grade to a color along a green -> yellow -> orange -> red
// gradient, so the big circle gives an at-a-glance read on standing.
// Works off the base letter (ignoring +/-), so it applies to any of the
// cutoff presets automatically. Pass/No Pass map straight to green/red.
const GRADE_COLORS = {
  A: "#2e7d32", // green
  B: "#c0ca33", // yellow-green
  C: "#f9a825", // amber/yellow
  D: "#ef6c00", // orange
  F: "#c62828", // red
  P: "#2e7d32", // green
  NP: "#c62828", // red
};

export function colorForLetterGrade(letter) {
  if (!letter || letter === "—") return null;
  const base = letter.replace(/[+-]/g, "").trim().toUpperCase();
  return GRADE_COLORS[base] || null;
}

/**
 * Tally late-day usage across every category/assignment in a class.
 * Returns total allowed, total used, remaining, and the list of assignments
 * that used at least one late day (for the "which homeworks used a late day" view).
 */
export function computeLateDays(classProfile) {
  const allowed = Number(classProfile.totalLateDays) || 0;
  const usedList = [];

  (classProfile.categories || []).forEach((cat) => {
    (cat.assignments || []).forEach((a) => {
      const days = Number(a.lateDaysUsed) || 0;
      if (days > 0) {
        usedList.push({
          categoryId: cat.id,
          categoryName: cat.name,
          assignmentId: a.id,
          assignmentName: a.name,
          days,
        });
      }
    });
  });

  const used = usedList.reduce((s, u) => s + u.days, 0);

  return {
    allowed,
    used,
    remaining: allowed - used,
    usedList,
  };
}

/** What score is needed on a remaining category to hit a target overall grade,
 * given all other categories' current scores and full declared weights. */
export function neededOnCategory(categories, targetCategoryId, targetOverall) {
  const rows = categories.map((cat) => ({
    id: cat.id,
    weight: Number(cat.weight) || 0,
    score: computeCategoryScore(cat),
  }));

  const target = rows.find((r) => r.id === targetCategoryId);
  if (!target || target.weight <= 0) return null;

  const others = rows.filter((r) => r.id !== targetCategoryId);
  const knownContribution = others.reduce((s, r) => s + (r.score || 0) * r.weight, 0);
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);

  // targetOverall = (knownContribution + x * target.weight) / totalWeight
  const needed = (targetOverall * totalWeight - knownContribution) / target.weight;
  return needed;
}

/**
 * "What-if" forward simulation: if a chosen category ended up scoring
 * `hypotheticalScore`, what would the overall grade be? Other categories
 * keep their current score (or 0 if ungraded), using full declared weights.
 */
export function simulateCategoryScore(categories, targetCategoryId, hypotheticalScore) {
  const rows = categories.map((cat) => ({
    id: cat.id,
    weight: Number(cat.weight) || 0,
    score: computeCategoryScore(cat),
  }));

  const target = rows.find((r) => r.id === targetCategoryId);
  if (!target) return null;

  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  if (totalWeight <= 0) return null;

  const contribution = rows.reduce((s, r) => {
    const score = r.id === targetCategoryId ? hypotheticalScore : r.score || 0;
    return s + score * r.weight;
  }, 0);

  return contribution / totalWeight;
}

// Default grade-point table for GPA/QPA, the common US 4.0 scale with
// +/-. Editable in Settings. Deliberately has no entry for "P"/"NP" so
// Pass/No Pass classes are excluded from GPA/QPA by default — a class only
// counts if its current letter grade resolves to a point value here.
export const DEFAULT_GRADE_POINTS = [
  { letter: "A+", points: 4.0 },
  { letter: "A", points: 4.0 },
  { letter: "A-", points: 3.7 },
  { letter: "B+", points: 3.3 },
  { letter: "B", points: 3.0 },
  { letter: "B-", points: 2.7 },
  { letter: "C+", points: 2.3 },
  { letter: "C", points: 2.0 },
  { letter: "C-", points: 1.7 },
  { letter: "D+", points: 1.3 },
  { letter: "D", points: 1.0 },
  { letter: "D-", points: 0.7 },
  { letter: "F", points: 0.0 },
];

/** Resolve a letter grade to a grade-point value using the editable
 * gradePoints table. Tries an exact match first (so a custom table can
 * assign "P" its own points), then falls back to the base letter with any
 * +/- stripped. Returns null if there's no match — e.g. Pass/No Pass
 * letters against the default table, or "—" for an ungraded class. */
export function pointsForLetter(letter, gradePoints) {
  if (!letter || letter === "—") return null;
  const exact = gradePoints.find((g) => g.letter === letter);
  if (exact) return exact.points;
  const base = letter.replace(/[+-]/g, "").trim();
  const baseMatch = gradePoints.find((g) => g.letter === base);
  return baseMatch ? baseMatch.points : null;
}

/**
 * GPA (simple average of grade points) and QPA (credit-weighted average)
 * across a set of classes, typically all the classes in one semester.
 * A class only counts if: it hasn't been explicitly excluded via
 * `includeInGpa: false`, and its current letter grade resolves to a point
 * value in `gradePoints` (so Pass/No Pass and ungraded classes are
 * naturally excluded unless the table is customized to cover them).
 */
export function computeSemesterGpa(classProfiles, gradePoints) {
  let simpleSum = 0;
  let simpleCount = 0;
  let creditSum = 0;
  let creditWeightedSum = 0;

  const rows = classProfiles.map((p) => {
    const overall = computeOverall(p.categories);
    const letter = letterForScore(overall.currentGrade, p.scale);
    const excludedByChoice = p.includeInGpa === false;
    const points = excludedByChoice ? null : pointsForLetter(letter, gradePoints);
    const credits = Number(p.credits) || 0;
    const included = points !== null;

    if (included) {
      simpleSum += points;
      simpleCount += 1;
      creditSum += credits;
      creditWeightedSum += points * credits;
    }

    return { id: p.id, name: p.name, letter, points, credits, included };
  });

  return {
    rows,
    gpa: simpleCount > 0 ? simpleSum / simpleCount : null,
    qpa: creditSum > 0 ? creditWeightedSum / creditSum : null,
  };
}
