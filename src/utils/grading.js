// Core grading math. Kept framework-free so it's easy to unit test.

/**
 * Compute a single category's score (0-100) from its assignments.
 * mode:
 *  - "avgPercent": average each assignment's percentage (typical "average of homework" rule)
 *  - "sumPoints": sum(earned) / sum(possible) * 100 (typical for exams/points-based grading)
 * dropLowest: number of lowest-scoring assignments to drop before computing.
 */
export function computeCategoryScore(category) {
  const valid = (category.assignments || []).filter(
    (a) => a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null
  );

  if (valid.length === 0) return null;

  const withPct = valid.map((a) => ({
    ...a,
    pct: (Number(a.earned) / Number(a.possible)) * 100,
  }));

  withPct.sort((a, b) => a.pct - b.pct);

  const dropCount = Math.min(category.dropLowest || 0, withPct.length - 1);
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
 * Compute the overall grade across categories.
 * Only categories that currently have at least one valid assignment contribute,
 * and their weights are re-normalized to 100% so the result reads as
 * "your grade based on everything entered so far."
 * Also returns the "final" projection assuming ungraded categories stay at 0,
 * using the full declared weights (useful as a floor / worst-case number).
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
  const worstCaseGrade =
    totalWeight > 0
      ? gradedRows.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight
      : null;

  return {
    rows: rows.map((r) => ({
      ...r,
      contribution:
        r.score !== null && gradedWeightSum > 0 ? (r.score * r.weight) / gradedWeightSum : null,
    })),
    currentGrade,
    worstCaseGrade,
    totalWeight,
    gradedWeightSum,
  };
}

export const DEFAULT_SCALE = [
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
];

export function letterForScore(score, scale) {
  if (score === null || score === undefined || Number.isNaN(score)) return "—";
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  const found = sorted.find((s) => score >= s.min);
  return found ? found.letter : "—";
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
