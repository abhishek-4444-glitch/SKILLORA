# SKILLORA – Building skill-oriented futures

*Building skill-oriented futures.*

A fully client-side React + Vite app that recommends the best three valid elective combinations per student, explains every one, and never shows an invalid combination.

> **Data notice:** `src/data/electives.csv` and `src/data/students.csv` are **synthetic sample data** created for demonstration. Load your institution's CSVs on the **Data & Tests** page (processed in memory only), or replace these two files.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run test:engine  # engine + every-student test suite in Node
npm run build        # static site in dist/ (Vercel or GitHub Pages)
```

## Engine (src/utils)

- `csvParser.js`: PapaParse, with header detection by alias (case, spaces and underscores ignored)
- `dataValidator.js`: typed records and a validation report (missing slots, duplicate IDs, bad CGPA, missing requirements and so on)
- `prerequisiteChecker.js`, `timetableChecker.js`: hard rules
- `combinationGenerator.js`: depth-first search over category groups that prunes a branch as soon as a slot clashes
- `scoringEngine.js`: five components on a 0–100 scale with configurable weights (35/25/15/15/10)
- `recommendationEngine.js`: ranking, independent re-validation, explanations, gains and trade-offs, diagnostics
- `riskDetector.js`, `academicRisks.js`: hard violations and soft risks with severity levels
- `testRunner.js`: per-student checks, including a brute-force cross-check of valid counts and top scores
- `reportGenerator.js`: jsPDF report

Assumptions are documented in `assumptions.js` and on the How It Works page.
