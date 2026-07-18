# Grade Calculator

A local grade calculator for college classes. Every class weights homework, exams,
quizzes, etc. differently, and averages assignments within a category differently
too — this app lets you set that up per class and see your current grade update
live as you enter scores.

## Features (Phase 1 — current)

- Multiple class profiles, saved locally in your browser (no account, no server).
- Custom categories per class (Homework, Quizzes, Exams, ...) with editable weights.
- Two averaging modes per category:
  - **Average of each assignment's %** — typical "average your homework scores" rule.
  - **Total points earned ÷ total points possible** — typical for exam-weighted classes.
- Drop-lowest-N support per category.
- Live "current grade" based on everything entered so far, plus a worst-case
  projection assuming remaining work scores zero.
- Editable letter-grade cutoff table (professors vary on where B+ starts, etc).
- A notes field for pasting in the late policy or other syllabus text for reference.

## Roadmap (not yet built)

- **Phase 2:** "What do I need on the final" solver, what-if hypothetical scores.
- **Phase 3:** Upload a syllabus (PDF/doc) and auto-extract categories, weights,
  and late policy using an LLM, pre-filling the setup.
- **Phase 4:** Upload a Gradescope screenshot and auto-extract scores.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Building for production

```bash
npm run build
```

Output goes to `dist/` — open `dist/index.html` directly, or serve the folder
with any static file server.

## Verifying the grading math

```bash
node scripts/verify-grading.mjs
```

Runs a quick smoke test against a known example (weighted average with a
dropped lowest homework score, mixed with a points-based exam category).
