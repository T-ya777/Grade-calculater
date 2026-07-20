# Grade Calculator

A local, browser-based grade calculator built to replace tracking class grades by hand in
Excel. Everything runs client-side (React + Vite) and saves to the browser's `localStorage` —
there's no server and no account.

live sample: https://t-ya777.github.io/Grade-calculater/

## Features

**Per-class grade tracking**
- Categories with editable weights, two averaging modes (average of each assignment's %, or
  total points earned ÷ possible), and drop-lowest-N — the assignment(s) that get dropped are
  grayed out in the table instead of silently disappearing from the math
- Live current grade and per-category breakdown, based on whatever's been entered so far
- Editable letter grade cutoff table, with quick-switch presets (standard +/-, no plus/minus,
  plus only, minus only, Pass/No Pass)
- Late day tracking: allowed days, days used per assignment, days remaining
- "What do I need" solver and what-if score simulation for planning ahead
- Final Exam Calculator, driven by whichever category is flagged as the final exam
- Assignment-level hypothetical scores: a "Final?" checkbox on each assignment. A freshly
  entered score counts toward your grade right away but starts as a guess; checking "Final?"
  locks the score in (and locks the Earned/Possible/Late days fields on that row) once you
  actually have the real grade. The class header flags how many scores are still unconfirmed,
  with a one-click "clear hypothetical scores" button.
- Class Info card: notes, multiple class website/Canvas links, syllabus file upload

**Organizing multiple classes**
- Multiple class profiles, grouped into real semesters (not just a text field) in a
  collapsible sidebar
- Semester page: GPA (simple average) and QPA (credit-weighted) for one semester, with a
  scoped What-If mode to try out hypothetical letter grades without touching real data
- Overview page: cumulative GPA/QPA pooled across every class in every semester, plus each
  semester as its own clickable summary block

**Settings**
- Default grade cutoff scale for new classes, with a button to push it onto existing classes
  (with confirmation, and the option to pick specific classes or whole semesters)
- Card layout: reorder and show/hide the Late Days, Final Exam, and Class Info cards
- GPA/QPA point table, editable per letter grade

**Backup and export**
- Full app backup/restore as a JSON file, or a full reset
- Excel export (Settings, or the ⋮ menu on any class/semester page) — a readable spreadsheet
  snapshot, scoped to whatever classes or semesters you choose
- Per-class export/import from the ⋮ menu next to the semester selector: export a class as
  JSON or Excel, or import a JSON backup to restore that one class in place
- Per-semester export from the ⋮ menu on the semester page (JSON or Excel; export only)

## Project structure

```
src/
  App.jsx                  Top-level state, routing between class/semester/settings/overview
  App.css                  All styling
  components/               UI components (one file per card/page/modal)
  utils/
    grading.js              Grade math — category scores, GPA/QPA, drop-lowest, simulations
    storage.js               localStorage persistence, data model factories, import/export
    excelExport.js           Excel workbook generation (exceljs)
```

`grading.js` is framework-free on purpose, so the math can be tested independently of React.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL. To build a static production bundle:

```bash
npm run build
```

The Excel export feature depends on [`exceljs`](https://www.npmjs.com/package/exceljs). If it's
not already in `package.json`, install it with:

```bash
npm install exceljs
```

It's loaded lazily (only when you actually export to Excel), so it doesn't add to the initial
page load.

## Data & privacy

Everything — every class, every score, settings — lives only in your browser's `localStorage`.
Nothing is sent anywhere. That also means: clearing your browser data deletes everything, and
data doesn't follow you to a different browser or computer unless you export a JSON backup
(Settings → Data management) and import it there.

## Roadmap

See `grade-calculator-ideas.md` for what's built, what's planned, and open design questions.
