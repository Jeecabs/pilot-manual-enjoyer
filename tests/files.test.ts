import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { lintFiles } from "../src/files.ts";

test("file linter reads project-relative paths and strips leading @", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "pilot-manual-enjoyer-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(join(cwd, "draft.md"), "The file is processed.");

  const reports = await lintFiles(cwd, ["@draft.md"]);

  assert.equal(reports[0]?.source, "draft.md");
  assert.equal(reports[0]?.report.violations.passive_voice, 1);
});

test("file linter rejects symlinks", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "pilot-manual-enjoyer-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(join(cwd, "draft.md"), "Clear prose.");
  await symlink(join(cwd, "draft.md"), join(cwd, "linked.md"));

  await assert.rejects(lintFiles(cwd, ["linked.md"]), /Not a regular file/);
});
