import type { SteLintReport, ViolationCategory } from "./linter.ts";
import { VIOLATION_CATEGORIES } from "./linter.ts";

export interface NamedLintReport {
  source: string;
  report: SteLintReport;
}

const LABELS: Record<ViolationCategory, string> = {
  "long_sentence(>20w)": "long sentence",
  semicolon: "semicolon",
  contraction: "contraction",
  passive_voice: "passive voice",
  ing_main_verb: "-ing main verb",
  nominalization: "nominalization",
  phrasal_verb: "phrasal verb",
  banned_word: "complex word",
  marketing_adjective: "marketing adjective",
  modal_hedge: "modal hedge",
  "long_paragraph(>6s)": "long paragraph",
};

function countLabel(label: string, count: number): string {
  return `${count} ${label}${count === 1 || label.endsWith("s") ? "" : "s"}`;
}

export function compactReportSummary(named: NamedLintReport): string {
  const { report, source } = named;
  const categories = VIOLATION_CATEGORIES
    .filter((category) => report.violations[category] > 0)
    .slice(0, 3)
    .map((category) => countLabel(LABELS[category], report.violations[category]));
  const markers = report.emDashes > 0 ? ` · ${countLabel("em dash marker", report.emDashes)}` : "";
  const detail = categories.length > 0 ? ` · ${categories.join(" · ")}` : "";
  return `${source}: ${report.totalPer100Words.toFixed(2)}/100w · ${countLabel("violation", report.total)}${detail}${markers}`;
}

function categoryLines(report: SteLintReport): string[] {
  const categories = VIOLATION_CATEGORIES.filter((category) => report.violations[category] > 0);
  const lines = categories.length > 0
    ? ["", "Categories:", ...categories.map((category) => `- ${LABELS[category]}: ${report.violations[category]}`)]
    : [];
  if (report.emDashes > 0) lines.push(`- em dash marker: ${report.emDashes} (not scored)`);
  return lines;
}

function findingLines(report: SteLintReport, maxFindings: number): string[] {
  const visible = report.findings.slice(0, maxFindings);
  if (visible.length === 0) return ["", "No mechanical STE violations found."];
  const lines = ["", "Findings:"];
  for (const item of visible) {
    const label = item.counted ? LABELS[item.category as ViolationCategory] : "em dash marker";
    lines.push(`- L${item.line}:${item.column} ${label}: “${item.text}”`, `  ${item.message}`);
  }
  const hidden = report.findings.length - visible.length;
  if (hidden > 0) lines.push(`- … ${hidden} more findings`);
  return lines;
}

function formatNamedReport(named: NamedLintReport, maxFindings = 50): string {
  const { source, report } = named;
  return [
    `STE lint: ${source}`,
    `${report.words} words · ${report.sentences} sentences · ${report.total} violations · ${report.totalPer100Words.toFixed(2)}/100w`,
    ...categoryLines(report),
    ...findingLines(report, maxFindings),
    "",
    "Heuristic only. This is not a certified ASD-STE100 check.",
  ].join("\n");
}

export function formatReports(reports: NamedLintReport[], maxFindings = 50): string {
  if (reports.length === 1) return formatNamedReport(reports[0]!, maxFindings);

  const summary = [
    `STE lint: ${reports.length} files`,
    ...reports.map((report) => `- ${compactReportSummary(report)}`),
  ];
  const findings = reports
    .filter((report) => report.report.findings.length > 0)
    .map((report) => formatNamedReport(report, maxFindings));
  return [...summary, ...(findings.length > 0 ? ["", ...findings] : [])].join("\n");
}
