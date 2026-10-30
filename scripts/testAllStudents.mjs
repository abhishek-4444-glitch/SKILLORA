// Runs the same engine + test suite the browser uses, from the command line.
// Usage: npm run test:engine [-- path/to/electives.csv path/to/students.csv]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDataset } from '../src/utils/dataValidator.js';
import { runAllStudentTests } from '../src/utils/testRunner.js';

const [electivesPath = 'src/data/electives.csv', studentsPath = 'src/data/students.csv'] = process.argv.slice(2);
const dataset = buildDataset({
  electivesText: readFileSync(resolve(electivesPath), 'utf8'),
  studentsText: readFileSync(resolve(studentsPath), 'utf8'),
  source: 'cli',
});

console.log(`Electives: ${dataset.electives.length} rows, students: ${dataset.students.length} rows, data issues: ${dataset.issues.length}`);
for (const issue of dataset.issues.filter((i) => i.severity === 'error')) {
  console.log(`  [${issue.entity} ${issue.id}${issue.row ? ` row ${issue.row}` : ''}] ${issue.message}`);
}

const { summary, results } = runAllStudentTests(dataset);
console.log('\nPer student:');
for (const r of results) {
  const failed = r.checks.filter((c) => !c.pass);
  console.log(`  ${r.passed ? 'PASS' : 'FAIL'} ${r.student.id.padEnd(5)} ${r.student.goalLabel.padEnd(22)} valid=${String(r.validCount).padEnd(4)} returned=${r.returned} top=${r.topScore ?? '-'}  ${r.top[0] ?? r.diagnostics[0]?.title ?? ''}`);
  failed.forEach((c) => console.log(`       ✗ ${c.name}: ${c.detail}`));
}
console.log('\nSummary:', JSON.stringify(summary, null, 2));
process.exit(summary.checksFailed === 0 && summary.invalidCombinations === 0 ? 0 : 1);
