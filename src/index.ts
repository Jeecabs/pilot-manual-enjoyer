import {
  keyHint,
  truncateHead,
  type AgentToolResult,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type Theme,
  type ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

import { lintFiles, lintInputText, MAX_FILES, MAX_TEXT_BYTES } from "./files.ts";
import { compactReportSummary, formatReports, type NamedLintReport } from "./report.ts";

const VERSION = "0.1.0";
const UPSTREAM_REVISION = "b912d5fa59f368253683af2ebfac64ad6d08312d";
const MAX_FINDINGS = 200;

export interface SteLintToolDetails {
  reports: NamedLintReport[];
  truncated: boolean;
}

function textContent(result: AgentToolResult<unknown>): string {
  const item = result.content.find((part) => part.type === "text");
  return item?.type === "text" ? item.text : "";
}

function expandHint(): string {
  try {
    return keyHint("app.tools.expand", "expand");
  } catch {
    return "Ctrl+O to expand";
  }
}

function collapsedResultText(reports: NamedLintReport[], theme: Theme): string {
  if (reports.length === 0) return theme.fg("success", "No findings");
  const total = reports.reduce((sum, item) => sum + item.report.total, 0);
  const visible = reports.slice(0, 3).map(compactReportSummary);
  const hidden = reports.length - visible.length;
  if (hidden > 0) visible.push(`… ${hidden} more files`);
  const summary = theme.fg(total > 0 ? "warning" : "success", visible.join("\n"));
  return `${summary}\n${theme.fg("dim", `(${expandHint()})`)}`;
}

function renderLintResult(
  result: AgentToolResult<SteLintToolDetails>,
  { expanded, isPartial }: ToolRenderResultOptions,
  theme: Theme,
  context: { isError: boolean },
): Text {
  if (isPartial) return new Text(theme.fg("warning", "Checking prose…"), 0, 0);
  if (expanded || context.isError) {
    const color = context.isError ? "error" : "toolOutput";
    return new Text(theme.fg(color, textContent(result)), 0, 0);
  }
  return new Text(collapsedResultText(result.details?.reports ?? [], theme), 0, 0);
}

function trimReportFindings(report: NamedLintReport, limit: number): NamedLintReport {
  return {
    source: report.source,
    report: { ...report.report, findings: report.report.findings.slice(0, limit) },
  };
}

function boundedOutput(reports: NamedLintReport[], maxFindings: number): {
  text: string;
  details: SteLintToolDetails;
} {
  const text = formatReports(reports, maxFindings);
  const truncation = truncateHead(text, { maxBytes: 50 * 1024, maxLines: 2_000 });
  const suffix = truncation.truncated
    ? `\n\n[Output truncated: ${truncation.outputLines}/${truncation.totalLines} lines. Reduce files or maxFindings for focused output.]`
    : "";
  return {
    text: `${truncation.content}${suffix}`,
    details: {
      reports: reports.map((report) => trimReportFindings(report, maxFindings)),
      truncated: truncation.truncated,
    },
  };
}

function parseMaxFindings(value: number | undefined): number {
  return value ?? 50;
}

const RULES_TEXT = [
  "Pilot Manual Enjoyer checks these mechanical STE rules:",
  "- sentences longer than 20 words",
  "- semicolons and contractions",
  "- likely passive voice and -ing main verbs",
  "- nominalizations and selected phrasal verbs",
  "- complex words, marketing adjectives, and modal hedges",
  "- paragraphs longer than six sentences",
  "- em dashes as unscored slop markers",
  "",
  "Score = counted violations per 100 words. Lower is cleaner.",
  "The checker is heuristic. It cannot certify ASD-STE100.",
].join("\n");

async function lintEditor(ctx: ExtensionCommandContext): Promise<void> {
  const text = ctx.ui.getEditorText();
  if (!text.trim()) {
    ctx.ui.notify("Editor is empty. Add prose, then run /ste lint.", "warning");
    return;
  }
  const report = lintInputText(text, "editor");
  ctx.ui.notify(formatReports([report], 30), report.report.total > 0 ? "warning" : "info");
}

async function lintCommandFile(path: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!path) {
    ctx.ui.notify("Usage: /ste file <path>", "warning");
    return;
  }
  const reports = await lintFiles(ctx.cwd, [path]);
  ctx.ui.notify(formatReports(reports, 30), reports[0]!.report.total > 0 ? "warning" : "info");
}

const COMMAND_ACTIONS: Record<string, (rest: string, ctx: ExtensionCommandContext) => void | Promise<void>> = {
  lint: (_rest, ctx) => lintEditor(ctx),
  file: (rest, ctx) => lintCommandFile(rest, ctx),
  rules: (_rest, ctx) => ctx.ui.notify(RULES_TEXT, "info"),
  status: (_rest, ctx) => ctx.ui.notify(
    `Pilot Manual Enjoyer ${VERSION}\nengine: native TypeScript\nnetwork: none\nmutation: none\nupstream: woosal1337/blog@${UPSTREAM_REVISION.slice(0, 12)}\ncertified ASD-STE100: no`,
    "info",
  ),
};

async function runSteCommand(args: string, ctx: ExtensionCommandContext): Promise<void> {
  const trimmed = args.trim();
  const split = trimmed.search(/\s/);
  const action = (split < 0 ? trimmed : trimmed.slice(0, split)) || "lint";
  const rest = split < 0 ? "" : trimmed.slice(split).trim();
  const handler = COMMAND_ACTIONS[action];
  if (!handler) {
    ctx.ui.notify("Usage: /ste [lint|file <path>|rules|status]", "warning");
    return;
  }
  await handler(rest, ctx);
}

export default function pilotManualEnjoyer(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "ste_lint",
    label: "STE Lint",
    description: `Lint technical prose with the deterministic Pilot Manual Enjoyer checker. Provide text or up to ${MAX_FILES} explicit file paths, but not both. Reports mechanical ASD-STE100-inspired findings with source locations. Read-only. Heuristic, not a certified STE check.`,
    promptSnippet: "Lint technical prose for mechanical Simplified Technical English violations",
    promptGuidelines: [
      "Use ste_lint after writing or revising substantial technical prose when Pilot Manual Enjoyer is active.",
      "Use ste_lint only for prose, not code, identifiers, command syntax, or generated data.",
      "Treat ste_lint findings as editing signals, not proof of ASD-STE100 compliance.",
    ],
    parameters: Type.Object({
      text: Type.Optional(Type.String({ description: `Prose to lint. Maximum ${MAX_TEXT_BYTES} UTF-8 bytes.` })),
      files: Type.Optional(Type.Array(Type.String(), {
        description: "Project-relative or absolute text-file paths to lint. A leading @ is ignored.",
        maxItems: MAX_FILES,
      })),
      maxFindings: Type.Optional(Type.Integer({
        description: "Maximum findings shown and retained per input. Default 50.",
        minimum: 0,
        maximum: MAX_FINDINGS,
      })),
    }),
    async execute(_id, params, signal, _onUpdate, ctx) {
      const hasText = params.text !== undefined;
      const hasFiles = params.files !== undefined;
      if (hasText === hasFiles) throw new Error("Provide exactly one of text or files.");

      let reports: NamedLintReport[];
      if (hasText) {
        if (!params.text?.trim()) throw new Error("Text cannot be empty.");
        reports = [lintInputText(params.text)];
      } else {
        reports = await lintFiles(ctx.cwd, params.files ?? [], signal);
      }

      const output = boundedOutput(reports, parseMaxFindings(params.maxFindings));
      return {
        content: [{ type: "text", text: output.text }],
        details: output.details,
      };
    },
    renderResult: renderLintResult,
  });

  pi.registerCommand("ste", {
    description: "Pilot Manual Enjoyer: lint editor text or a file, inspect rules, or show status",
    getArgumentCompletions(prefix) {
      const actions = ["lint", "file ", "rules", "status"];
      const matches = actions.filter((action) => action.startsWith(prefix.toLowerCase()));
      return matches.length > 0 ? matches.map((value) => ({ value, label: value.trim() })) : null;
    },
    handler: async (args, ctx) => {
      try {
        await runSteCommand(args, ctx);
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
      }
    },
  });
}
