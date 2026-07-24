import { newCategory, newAssignment, newManualClass, newClassProfile, UNASSIGNED_SEMESTER } from "./storage";
import { BLOCK_STRIDE } from "./excelExport";

// Reverses buildOverviewSheet/buildClassSheet from excelExport.js — this is
// specifically an "import what we export" tool, not a general-purpose
// Excel parser. It reads Overview for the semester/class/credits/letter
// list, then matches each class name to its own sheet (by exact name) to
// pull categories and assignments back out. A class row on Overview with
// no matching sheet is exactly how a manual/past class round-trips, since
// exportExcelWorkbook deliberately skips generating a sheet for those.
//
// Score % is intentionally never read back in — only Earned/Possible are,
// same as the note printed on the exported sheet itself.

function cellValue(ws, row, col) {
  const v = ws.getRow(row).getCell(col).value;
  // exceljs can hand back rich-text/formula-result objects for some cells;
  // for everything this importer touches we only ever wrote plain strings
  // or numbers, so unwrap defensively rather than choke on the odd shape.
  if (v && typeof v === "object" && "result" in v) return v.result;
  if (v && typeof v === "object" && "text" in v) return v.text;
  return v;
}

function parseOverviewSheet(ws) {
  const groups = []; // { semesterName, classes: [{name, credits, letter, includeInGpa}] }
  let current = null;

  const rowCount = ws.rowCount || 0;
  for (let r = 1; r <= rowCount; r++) {
    const c1 = cellValue(ws, r, 1);
    const c2 = cellValue(ws, r, 2);

    if (c1 === "Class") continue; // header row, skip
    if (typeof c2 === "string" && c2.startsWith("GPA:")) {
      current = { semesterName: String(c1 ?? "").trim() || UNASSIGNED_SEMESTER, classes: [] };
      groups.push(current);
      continue;
    }
    if (typeof c1 === "string" && c1.trim() && typeof c2 === "number" && current) {
      current.classes.push({
        name: c1.trim(),
        credits: c2,
        letter: cellValue(ws, r, 4) ?? "—",
        includeInGpa: cellValue(ws, r, 6) === "Yes",
      });
    }
    // anything else (blank rows, the closing notes) is skipped
  }

  return groups;
}

function parseClassSheet(ws) {
  const categories = [];
  let col = 1;

  while (cellValue(ws, 1, col) === "Category") {
    const name = cellValue(ws, 2, col) || "Category";
    const weightRaw = cellValue(ws, 2, col + 1);
    const weight = typeof weightRaw === "number" ? Math.round(weightRaw * 100) : 0;
    const modeRaw = cellValue(ws, 2, col + 2);
    const mode = modeRaw === "sumPoints" ? "sumPoints" : "avgPercent";
    const dropLowest = Number(cellValue(ws, 2, col + 3)) || 0;

    const assignments = [];
    let r = 4;
    while (r < 5000) {
      const aName = cellValue(ws, r, col);
      if (aName === undefined || aName === null || aName === "") break;
      const earned = cellValue(ws, r, col + 1);
      const possible = cellValue(ws, r, col + 2);
      const a = newAssignment(String(aName));
      a.earned = typeof earned === "number" ? earned : "";
      a.possible = typeof possible === "number" ? possible : "";
      // Imported scores are treated as already-final, same as any
      // assignment that existed before the "confirmed" checkbox did —
      // this is historical data, not a fresh hypothetical entry.
      a.confirmed = a.earned !== "" && a.possible !== "";
      assignments.push(a);
      r += 1;
    }

    categories.push({ ...newCategory(String(name)), weight, mode, dropLowest, assignments });
    col += BLOCK_STRIDE;
  }

  return categories;
}

/** Parses an exported .xlsx File back into { profiles, semesters, warnings }.
 * Doesn't touch app state — the caller decides what to do with the result
 * (same shape as a full JSON backup's profiles/semesters, so it can go
 * straight into the same replace-everything import flow). */
export async function parseExcelWorkbook(file) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw new Error("Couldn't read that file — make sure it's a Grade Calculator Excel export (.xlsx).");
  }

  const overviewSheet = wb.getWorksheet("Overview");
  if (!overviewSheet) {
    throw new Error(
      'That file doesn\'t look like a Grade Calculator export — no "Overview" sheet found.'
    );
  }

  const groups = parseOverviewSheet(overviewSheet);
  if (groups.length === 0) {
    throw new Error("No classes found on the Overview sheet — nothing to import.");
  }

  const profiles = [];
  const semesters = [];
  const warnings = [];

  groups.forEach((group) => {
    const isUnassigned = group.semesterName === UNASSIGNED_SEMESTER;
    if (!isUnassigned && !semesters.includes(group.semesterName)) {
      semesters.push(group.semesterName);
    }

    group.classes.forEach((cls) => {
      const sheet = wb.getWorksheet(cls.name);
      let profile;
      if (sheet) {
        profile = {
          ...newClassProfile(cls.name),
          semester: isUnassigned ? "" : group.semesterName,
          credits: cls.credits,
          includeInGpa: cls.includeInGpa,
          categories: parseClassSheet(sheet),
        };
      } else {
        // No matching sheet is exactly how a manual/past class looks —
        // exportExcelWorkbook never generates one for those.
        profile = newManualClass(cls.name, isUnassigned ? "" : group.semesterName, cls.credits, cls.letter);
        profile.includeInGpa = cls.includeInGpa;
      }
      profiles.push(profile);
    });
  });

  if (profiles.length === 0) {
    warnings.push("No classes could be matched up — check that the Overview sheet wasn't edited.");
  }

  return { profiles, semesters, warnings };
}
