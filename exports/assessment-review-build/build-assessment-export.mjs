import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const projectRoot = '/Users/johnpaine/Dropbox (Personal)/aiproject/Production';
const outputDir = path.join(projectRoot, 'exports', 'assessment-review');
const sourcePath = path.join(projectRoot, 'api', 'contact.js');
const source = await fs.readFile(sourcePath, 'utf8');
const match = source.match(/const DEFAULT_ASSESSMENT_FORM = ([\s\S]*?);\n\nfunction sanitizeAssessmentFormConfig/);

if (!match) {
  throw new Error('Could not locate DEFAULT_ASSESSMENT_FORM in api/contact.js');
}

const form = Function(`return ${match[1]}`)();
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const rows = [
  ['Question #', 'Question ID', 'Question Text', 'Option #', 'Answer Option', 'Scores Toward'],
];

form.questions.forEach((question, questionIndex) => {
  question.options.forEach((option, optionIndex) => {
    rows.push([
      questionIndex + 1,
      question.id,
      question.title,
      optionIndex + 1,
      option.text,
      option.center,
    ]);
  });
});

await fs.mkdir(outputDir, { recursive: true });
const csvText = rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
await fs.writeFile(path.join(outputDir, 'hidden-ceiling-assessment-questions.csv'), csvText, 'utf8');

const workbook = await Workbook.fromCSV(csvText, { sheetName: 'Assessment Review' });
const inspect = await workbook.inspect({
  kind: 'table',
  range: 'Assessment Review!A1:F5',
  include: 'values',
  tableMaxRows: 5,
  tableMaxCols: 6,
});
console.log(inspect.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(path.join(outputDir, 'hidden-ceiling-assessment-questions.xlsx'));
