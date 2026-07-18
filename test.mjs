import { computeOverall, letterForScore, DEFAULT_SCALE } from './src/utils/grading.js';

const categories = [
  {
    id: 'hw', name: 'Homework', weight: 30, mode: 'avgPercent', dropLowest: 1,
    assignments: [
      { earned: 8, possible: 10 },
      { earned: 5, possible: 10 }, // lowest, should be dropped
      { earned: 9, possible: 10 },
      { earned: 10, possible: 10 },
    ],
  },
  {
    id: 'exam', name: 'Exams', weight: 70, mode: 'sumPoints', dropLowest: 0,
    assignments: [
      { earned: 85, possible: 100 },
      { earned: 90, possible: 100 },
    ],
  },
];

const result = computeOverall(categories);
console.log(JSON.stringify(result, null, 2));
console.log('Letter:', letterForScore(result.currentGrade, DEFAULT_SCALE));

// expected HW: drop 50%, avg of (80,90,100) = 90
// expected Exam: (85+90)/(200) = 87.5
// overall = 90*0.3 + 87.5*0.7 = 27 + 61.25 = 88.25 -> B+
