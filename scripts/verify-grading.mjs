// Quick smoke test for the grading math. Run with: node scripts/verify-grading.mjs
import { computeOverall, letterForScore, DEFAULT_SCALE } from "../src/utils/grading.js";

const categories = [
  {
    id: "hw",
    name: "Homework",
    weight: 30,
    mode: "avgPercent",
    dropLowest: 1,
    assignments: [
      { earned: 8, possible: 10 },
      { earned: 5, possible: 10 }, // lowest, should be dropped
      { earned: 9, possible: 10 },
      { earned: 10, possible: 10 },
    ],
  },
  {
    id: "exam",
    name: "Exams",
    weight: 70,
    mode: "sumPoints",
    dropLowest: 0,
    assignments: [
      { earned: 85, possible: 100 },
      { earned: 90, possible: 100 },
    ],
  },
];

const result = computeOverall(categories);
const letter = letterForScore(result.currentGrade, DEFAULT_SCALE);

// Expected: HW drops 50%, averages (80,90,100) = 90 -> contributes 27
// Exams: (85+90)/200 = 87.5 -> contributes 61.25
// Overall: 88.25% -> B+
const expected = { currentGrade: 88.25, letter: "B+" };

const pass =
  Math.abs(result.currentGrade - expected.currentGrade) < 0.001 && letter === expected.letter;

console.log(`Overall: ${result.currentGrade}% (${letter})`);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
