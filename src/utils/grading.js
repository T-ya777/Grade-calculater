// Core grading math. Kept framework-free so it's easy to unit test.

/**
 * Compute a single category's score (0-100) from its assignments.
 * mode:
 *  - "avgPercent": average each assignment's percentage (typical "average of homework" rule)
 *  - "sumPoints": sum(earned) / sum(possible) * 100 (typical for exams/points-based grading)
 * dropLowest: number of lowest-scoring assignments to drop before computing.
 *
 * Assignments flagged extraCredit are treated as bonus: they add to the
 * score but don't dilute the average/denominator the way a normal
 * assignment would. That means extra credit can push a category above 100%.
 */
export function computeCategoryScore(category) {
  const isValid = (a) =>
    a.possible !== "" && a.possible !== null && Number(a.possible) > 0 && a.earned !== "" && a.earned !== null;

  const all = (category.assignments || []).filter(isValid);
  const normal = all.filter((a) => !a.extraCredit);
  const extra = all.filter((a) => a.extraCredit);

  if (normal.length === 0 && extra.length === 0) return null;

  const withPct = normal.map((a) => ({
    ...a,
    pct: (Number(a.earned) / Number(a.possible)) * 100,
  }));

  withPct.sort((a, b) => a.pct - b.pct);

  const dropCount = Math.min(category.dropLowest || 0, Math.max(withPct.length - 1, 0));
  const kept = withPct.slice(dropCount);

  let base = null;
  let earnedSum = 0;
  let possibleSum = 0;

  if (kept.length > 0) {
    if (category.mode === "sumPoints") {
      earnedSum = kept.reduce((s, a) => s + Number(a.earned), 0);
      possibleSum = kept.reduce((s, a) => s + Number(a.possible), 0);
      base = possibleSum > 0 ? (earnedSum / possibleSum) * 100 : null;
    } else {
      // default: avgPercent
      const sum = kept.reduce((s, a) => s + a.pct, 0);
      base = sum / kept.length;
    }
  }

  if (extra.length === 0) return base;

  // Extra credit bonus, expressed in percentage points.
  let bonus;
  if (category.mode === "sumPoints" && possibleSum > 0) {
    // Same denominator as the base calc, so bonus points are true bonus points.
    const extraEarned = extra.reduce((s, a) => s + Number(a.earned), 0);
    bonus = (extraEarned / possibleSum) * 100;
  } else {
    // avgPercent (or sumPoints with no normal assignments yet): each extra
    // credit item contributes its own percentage, scaled as if it were one
    // more item in the average, without growing the divisor.
    const divisor = Math.max(kept.length, 1);
    bonus = extra.reduce((s, a) => s + (Number(a.earned) / Number(a.possible)) * 100, 0) / divisor;
  }

  return (base ?? 0) + bonus;
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
};

export const DEFAULT_SCALE = SCALE_PRESETS.standard.scale;

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

/**
 * "What-if" forward simulation: if a chosen category ended up scoring
 * `hypotheticalScore`, what would the overall grade be? Other categories
 * keep their current score (or 0 if ungraded), using full declared weights
 * — the same convention as computeOverall's worstCaseGrade.
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
