import { computeOverall, computeSemesterGpa, letterForScore } from "./grading";
import { groupProfilesBySemester } from "./storage";

// Matches the sample workbook: blue bold header rows, plain Arial body,
// light gray borders, italic gray notes.
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
const HEADER_FONT = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
const SEMESTER_FONT = { name: "Arial", bold: true, size: 12 };
const BODY_FONT = { name: "Arial" };
const NOTE_FONT = { name: "Arial", italic: true, size: 10, color: { argb: "FF666666" } };
const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFCCCCCC" } },
  bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
  left: { style: "thin", color: { argb: "FFCCCCCC" } },
  right: { style: "thin", color: { argb: "FFCCCCCC" } },
};

function styleHeaderRow(ws, row, startCol, ncols) {
  for (let c = startCol; c < startCol + ncols; c++) {
    const cell = ws.getRow(row).getCell(c);
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BORDER;
  }
}

function styleBodyRow(ws, row, startCol, ncols) {
  for (let c = startCol; c < startCol + ncols; c++) {
    const cell = ws.getRow(row).getCell(c);
    cell.font = BODY_FONT;
    cell.border = THIN_BORDER;
  }
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Excel sheet names: max 31 chars, no : \ / ? * [ ], and must be unique
 * within the workbook — two classes can share a name across semesters. */
function sanitizeSheetName(name, used) {
  let clean = (name || "Class").replace(/[:\\/?*[\]]/g, " ").trim();
  if (!clean) clean = "Class";
  clean = clean.slice(0, 31);

  let candidate = clean;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = clean.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildOverviewSheet(wb, profiles, semesters, settings) {
  const ws = wb.addWorksheet("Overview");
  [16, 12, 9, 10, 8, 11, 14].forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });

  const groups = groupProfilesBySemester(profiles, semesters);
  let r = 1;

  groups.forEach((group) => {
    const { rows, gpa, qpa } = computeSemesterGpa(group.profiles, settings.gradePoints);

    const semRow = ws.getRow(r);
    semRow.getCell(1).value = group.name;
    semRow.getCell(2).value = `GPA:${gpa === null ? "—" : gpa.toFixed(1)}`;
    semRow.getCell(3).value = `QPA:${qpa === null ? "—" : qpa.toFixed(1)}`;
    [1, 2, 3].forEach((c) => (semRow.getCell(c).font = SEMESTER_FONT));
    r += 1;

    const headers = ["Class", "Credits", "Grade %", "Letter", "GPA Points", "Counted in GPA"];
    headers.forEach((h, i) => (ws.getRow(r).getCell(i + 1).value = h));
    styleHeaderRow(ws, r, 1, headers.length);
    r += 1;

    group.profiles.forEach((p) => {
      const overall = computeOverall(p.categories);
      const row = rows.find((x) => x.id === p.id);
      const dataRow = ws.getRow(r);
      dataRow.getCell(1).value = p.name;
      dataRow.getCell(2).value = Number(p.credits) || 0;
      dataRow.getCell(3).value =
        overall.currentGrade === null ? null : Number(overall.currentGrade.toFixed(1));
      dataRow.getCell(4).value = row ? row.letter : letterForScore(overall.currentGrade, p.scale);
      dataRow.getCell(5).value = row && row.points !== null ? row.points : null;
      dataRow.getCell(6).value = row && row.included ? "Yes" : "No";
      styleBodyRow(ws, r, 1, 6);
      dataRow.getCell(3).numFmt = "0.0";
      r += 1;
    });

    r += 1; // blank row between semesters
  });

  r += 1;
  ws.getRow(r).getCell(1).value =
    "This is a snapshot at the time of export — the app is always the source of truth.";
  ws.getRow(r).getCell(1).font = NOTE_FONT;
  r += 1;
  ws.getRow(r).getCell(1).value = "Overview is a summary only — edits here won't be imported back.";
  ws.getRow(r).getCell(1).font = NOTE_FONT;
}

const BLOCK_WIDTH = 4;
const BLOCK_GAP = 1;
// Exported so excelImport.js can walk the same column layout in reverse
// without the two files silently drifting out of sync.
export const BLOCK_STRIDE = BLOCK_WIDTH + BLOCK_GAP;

function buildClassSheet(wb, profile, usedNames) {
  const sheetName = sanitizeSheetName(profile.name, usedNames);
  const ws = wb.addWorksheet(sheetName);

  let maxAssignmentRows = 0;

  (profile.categories || []).forEach((cat, i) => {
    const col = 1 + i * BLOCK_STRIDE;
    ws.getColumn(col).width = 14;
    ws.getColumn(col + 1).width = 9;
    ws.getColumn(col + 2).width = 12;
    ws.getColumn(col + 3).width = 12;

    let r = 1;
    const catHeaders = ["Category", "Weight", "Mode", "Drop Lowest"];
    catHeaders.forEach((h, idx) => (ws.getRow(r).getCell(col + idx).value = h));
    styleHeaderRow(ws, r, col, catHeaders.length);
    r += 1;

    const valRow = ws.getRow(r);
    valRow.getCell(col).value = cat.name;
    valRow.getCell(col + 1).value = (Number(cat.weight) || 0) / 100;
    valRow.getCell(col + 1).numFmt = "0%";
    valRow.getCell(col + 2).value = cat.mode || "avgPercent";
    valRow.getCell(col + 3).value = Number(cat.dropLowest) || 0;
    styleBodyRow(ws, r, col, 4);
    r += 1;

    const aHeaders = ["Assignment", "Earned", "Possible", "Score %"];
    aHeaders.forEach((h, idx) => (ws.getRow(r).getCell(col + idx).value = h));
    styleHeaderRow(ws, r, col, aHeaders.length);
    r += 1;

    const assignments = cat.assignments || [];
    assignments.forEach((a) => {
      const earnedCol = colLetter(col + 1);
      const possibleCol = colLetter(col + 2);
      const row = ws.getRow(r);
      row.getCell(col).value = a.name;
      row.getCell(col + 1).value =
        a.earned === "" || a.earned === null || a.earned === undefined ? null : Number(a.earned);
      row.getCell(col + 2).value =
        a.possible === "" || a.possible === null || a.possible === undefined
          ? null
          : Number(a.possible);
      row.getCell(col + 3).value = {
        formula: `IF(${possibleCol}${r}=0,"",${earnedCol}${r}/${possibleCol}${r})`,
      };
      row.getCell(col + 3).numFmt = "0.0%";
      styleBodyRow(ws, r, col, 4);
      r += 1;
    });

    maxAssignmentRows = Math.max(maxAssignmentRows, assignments.length);
  });

  let noteRow = 3 + maxAssignmentRows + 2;
  const notes = [
    "Categories are laid out side by side, one block per category: Category/Weight/Mode/Drop Lowest on top, its assignments below.",
    'Mode is either "avgPercent" (average of each assignment\'s %) or "sumPoints" (total earned ÷ total possible).',
    "Score % is calculated here for your reference — only Earned/Possible get imported back.",
  ];
  notes.forEach((note) => {
    ws.getRow(noteRow).getCell(1).value = note;
    ws.getRow(noteRow).getCell(1).font = NOTE_FONT;
    noteRow += 1;
  });
}

/** Builds the workbook (Overview + one sheet per class) and triggers a
 * browser download. Excel-only export for now — no category weight/mode
 * round-trips through import yet, that's a separate, not-yet-built step.
 * exceljs is a large library, so it's only loaded when this actually runs
 * instead of bloating the app's initial bundle. */
export async function exportExcelWorkbook(profiles, semesters, settings, filenameBase = "grade-calculator-export") {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Grade Calculator";
  wb.created = new Date();

  buildOverviewSheet(wb, profiles, semesters, settings);

  // Manual/"past" classes have no categories to lay out — their letter
  // grade and credits already show up on the Overview sheet, so they don't
  // get their own (otherwise empty) sheet here.
  const usedNames = new Set();
  profiles.filter((p) => !p.isManual).forEach((p) => buildClassSheet(wb, p, usedNames));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenameBase}-${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
