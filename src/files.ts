import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { lintText } from "./linter.ts";
import type { NamedLintReport } from "./report.ts";

export const MAX_FILES = 20;
const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_TEXT_BYTES = 1024 * 1024;

function normalizePathInput(value: string): string {
  return value.startsWith("@") ? value.slice(1) : value;
}

export function lintInputText(text: string, source = "text"): NamedLintReport {
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > MAX_TEXT_BYTES) throw new Error(`Text exceeds ${MAX_TEXT_BYTES} byte limit.`);
  return { source, report: lintText(text) };
}

async function lintFile(cwd: string, input: string): Promise<NamedLintReport> {
  const normalized = normalizePathInput(input.trim());
  if (!normalized) throw new Error("File path cannot be empty.");
  const absolute = resolve(cwd, normalized);
  const metadata = await lstat(absolute);
  if (!metadata.isFile()) throw new Error(`Not a regular file: ${input}`);
  if (metadata.size > MAX_FILE_BYTES) throw new Error(`File exceeds ${MAX_FILE_BYTES} byte limit: ${input}`);
  return lintInputText(await readFile(absolute, "utf8"), normalized);
}

export async function lintFiles(
  cwd: string,
  files: readonly string[],
  signal?: AbortSignal,
): Promise<NamedLintReport[]> {
  if (files.length === 0) throw new Error("Provide at least one file.");
  if (files.length > MAX_FILES) throw new Error(`Provide at most ${MAX_FILES} files.`);

  const reports: NamedLintReport[] = [];
  for (const input of files) {
    if (signal?.aborted) throw signal.reason ?? new Error("Lint cancelled.");
    reports.push(await lintFile(cwd, input));
  }
  return reports;
}
