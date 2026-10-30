import { jsPDF } from 'jspdf';
import { COMPONENTS } from './scoringEngine.js';
import { collectAcademicRisks } from './academicRisks.js';
import { ASSUMPTIONS, LIMITATIONS, MANDATORY_RULES } from './assumptions.js';

const NAVY = [11, 18, 32];
const EMERALD = [16, 185, 129];
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const LINE = [229, 232, 238];

// jsPDF's built-in Helvetica only covers Latin-1; replace characters it cannot draw.
function safe(text) {
  return String(text ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/↔/g, '<->')
    .replace(/×/g, 'x')
    .replace(/±/g, '+/-')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');
}

/** Builds the academic report PDF entirely in the browser. Returns the jsPDF document. */
export function buildReport({ student, result, dataset }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = W - 2 * M;
  let y = 0;

  const ensure = (h) => {
    if (y + h > H - 56) {
      doc.addPage();
      y = 56;
    }
  };
  const text = (str, { size = 10, color = INK, bold = false, indent = 0, gap = 4, width } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe(str), (width || CW) - indent);
    const lh = size * 1.35;
    lines.forEach((line) => {
      ensure(lh);
      doc.text(line, M + indent, y + size);
      y += lh;
    });
    y += gap;
  };
  const bullet = (str, opts = {}) => {
    const size = opts.size || 9.5;
    ensure(size * 1.4);
    doc.setFillColor(...(opts.dot || MUTED));
    doc.circle(M + 4, y + size * 0.62, 1.6, 'F');
    text(str, { size, indent: 14, gap: 2, color: opts.color || INK });
  };
  const heading = (str) => {
    ensure(48);
    y += 10;
    doc.setDrawColor(...LINE);
    doc.line(M, y, W - M, y);
    y += 14;
    text(str.toUpperCase(), { size: 9, bold: true, color: EMERALD, gap: 6 });
  };
  const keyValues = (pairs, cols = 3) => {
    const colW = CW / cols;
    for (let i = 0; i < pairs.length; i += cols) {
      ensure(34);
      pairs.slice(i, i + cols).forEach(([k, v], j) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(safe(k).toUpperCase(), M + j * colW, y + 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...INK);
        doc.text(doc.splitTextToSize(safe(v), colW - 10)[0] || '-', M + j * colW, y + 23);
      });
      y += 34;
    }
  };

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 96, 'F');
  doc.setFillColor(...EMERALD);
  doc.roundedRect(M, 30, 22, 22, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('SKILLORA', M + 32, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('Academic Elective Report', M + 32, 60);
  doc.text(safe(`Generated ${new Date().toLocaleString()}`), W - M, 46, { align: 'right' });
  doc.text(safe(`Data: ${dataset.source.label}`), W - M, 60, { align: 'right' });
  y = 120;

  if (dataset.source.kind !== 'uploaded') {
    text(`Note: ${dataset.source.note}`, { size: 8.5, color: [146, 64, 14], gap: 8 });
  }

  heading('Student profile');
  keyValues([
    ['Student', `${student.name}${student.custom ? '' : ` (${student.id})`}`],
    ['Career goal', student.goalLabel || 'Not set'],
    ['CGPA', student.cgpa ?? 'Not available'],
    ['Workload preference', student.workload || 'Medium (assumed)'],
    ['Required electives', result.student.requirements.map((r) => `${r.count} ${r.type}`).join(', ') || 'Not set'],
    ['Valid combinations', String(result.validCount)],
  ]);
  text(`Subjects cleared: ${student.cleared.join(', ') || 'None listed'}`, { size: 9 });
  text(`Weak subjects: ${student.weak.join(', ') || 'None listed'}`, { size: 9 });
  if (student.editedFields?.length) text(`Edited from the CSV record: ${student.editedFields.join(', ')}.`, { size: 8.5, color: MUTED });

  heading('Recommended combinations');
  if (!result.recommendations.length) text('No valid combination satisfies all mandatory rules for this profile.', { bold: true });
  result.recommendations.forEach((rec) => {
    ensure(120);
    doc.setFillColor(247, 248, 250);
    doc.roundedRect(M, y, CW, 26, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(safe(`Option ${rec.rank}`), M + 10, y + 17);
    doc.setTextColor(...EMERALD);
    doc.text(safe(`Score ${rec.score.total} / 100`), W - M - 10, y + 17, { align: 'right' });
    y += 34;
    rec.electives.forEach((e, i) => {
      text(`${e.name} (${e.id}) - ${e.type} - slot ${e.slots.join(', ')} - ${e.difficultyLabel} - ${e.hours} h/week - career: ${rec.score.facts[i].relation === 'exact' ? 'direct match' : rec.score.facts[i].relation === 'adjacent' ? 'related' : 'not aligned'}`, { size: 9, indent: 10, gap: 1 });
    });
    y += 4;
    text(`Score breakdown: ${COMPONENTS.map((c) => `${c.short} ${Math.round(rec.score.components[c.key])}`).join(' | ')}`, { size: 8.5, color: MUTED });
    text(`Validation: prerequisites met, no timetable clash, category counts met, all electives offered.`, { size: 8.5, color: [4, 120, 87] });
    text(`Why: ${rec.explanation.why}`, { size: 9 });
    text(`Career alignment: ${rec.explanation.career}`, { size: 9 });
    text(`Weekly workload: ${rec.explanation.workload}`, { size: 9 });
    text('Gains', { size: 9, bold: true, gap: 2 });
    rec.explanation.gains.forEach((g) => bullet(g, { dot: EMERALD }));
    text('Trade-offs', { size: 9, bold: true, gap: 2 });
    rec.explanation.sacrifices.forEach((g) => bullet(g, { dot: [234, 88, 12] }));
    if (rec.risks.length) {
      text('Risks', { size: 9, bold: true, gap: 2 });
      rec.risks.forEach((r) => bullet(`[${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`));
    }
    y += 8;
  });

  if (result.status !== 'ok') {
    heading('Unmet requirements');
    result.diagnostics.forEach((d) => bullet(`${d.title}. ${d.detail}`, { dot: [220, 38, 38] }));
    if (result.alternatives.length) {
      text('Possible ways forward (not valid options today):', { size: 9, bold: true, gap: 2 });
      result.alternatives.forEach((a) => bullet(`${a.title}. ${a.detail}`));
    }
  }

  heading('Academic risk summary');
  const risks = collectAcademicRisks(result);
  text(`Critical ${risks.counts.critical} | High ${risks.counts.high} | Medium ${risks.counts.medium} | Low ${risks.counts.low}`, { size: 9, bold: true });
  risks.groups.forEach((g) => {
    text(`${g.title} (${g.items.length})`, { size: 9, bold: true, gap: 2 });
    if (!g.items.length) text(g.emptyText, { size: 8.5, color: MUTED, indent: 14 });
    g.items.slice(0, 6).forEach((r) => bullet(`[${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`, { size: 8.5 }));
    if (g.items.length > 6) text(`...and ${g.items.length - 6} more.`, { size: 8.5, color: MUTED, indent: 14 });
  });

  heading('Validation rules applied');
  MANDATORY_RULES.forEach((r) => bullet(`${r.title}: ${r.body}`, { size: 8.5 }));
  heading('Assumptions and limitations');
  const w = result.recommendations[0]?.score.weightsUsed;
  if (w) text(`Weights used: ${COMPONENTS.map((c) => `${c.label} ${Math.round(w[c.key] * 100)}%`).join(', ')}.`, { size: 8.5 });
  ASSUMPTIONS.forEach((a) => bullet(a, { size: 8.5 }));
  LIMITATIONS.forEach((l) => bullet(l, { size: 8.5 }));

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('SKILLORA - advisory only. Processed locally in the browser. Not an official registration record.', M, H - 28);
    doc.text(`${p} / ${pages}`, W - M, H - 28, { align: 'right' });
  }
  return doc;
}

export function reportFileName(student) {
  const slug = `${student.custom ? 'custom' : student.id}-${student.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `skillora-report-${slug}.pdf`;
}
