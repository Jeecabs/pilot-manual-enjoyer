import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("manifest exposes the public extension and branded skill", async () => {
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  assert.equal(manifest.name, "pilot-manual-enjoyer");
  assert.equal(manifest.license, "MIT");
  assert.deepEqual(manifest.pi.extensions, ["./src/index.ts"]);
  assert.deepEqual(manifest.pi.skills, ["./skills"]);
  assert.ok(manifest.keywords.includes("pi-package"));
});

test("skill has valid discoverable frontmatter", async () => {
  const skill = await readFile(join(root, "skills", "pilot-manual-enjoyer", "SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: pilot-manual-enjoyer\ndescription: .+\nlicense: .+\n---/);
  assert.match(skill, /ste_lint/);
});
