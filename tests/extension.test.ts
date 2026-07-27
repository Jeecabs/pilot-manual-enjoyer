import assert from "node:assert/strict";
import test from "node:test";

import register from "../src/index.ts";

interface RegisteredTool {
  name: string;
  execute: (...args: any[]) => Promise<any>;
}

interface RegisteredCommand {
  handler: (args: string, ctx: any) => Promise<void>;
}

function harness() {
  let tool: RegisteredTool | undefined;
  let command: RegisteredCommand | undefined;
  register({
    registerTool(value: RegisteredTool) { tool = value; },
    registerCommand(name: string, value: RegisteredCommand) {
      assert.equal(name, "ste");
      command = value;
    },
  } as never);
  return { get tool() { return tool!; }, get command() { return command!; } };
}

test("extension registers one read-only lint tool and command", () => {
  const extension = harness();
  assert.equal(extension.tool.name, "ste_lint");
  assert.ok(extension.command);
});

test("tool requires exactly one input source", async () => {
  const extension = harness();
  const ctx = { cwd: process.cwd() };
  await assert.rejects(
    extension.tool.execute("id", {}, new AbortController().signal, undefined, ctx),
    /exactly one/,
  );
  await assert.rejects(
    extension.tool.execute("id", { text: "Hello.", files: ["README.md"] }, new AbortController().signal, undefined, ctx),
    /exactly one/,
  );
});

test("tool returns deterministic report details", async () => {
  const extension = harness();
  const result = await extension.tool.execute(
    "id",
    { text: "The file is processed." },
    new AbortController().signal,
    undefined,
    { cwd: process.cwd() },
  );

  assert.match(result.content[0].text, /passive voice: 1/);
  assert.equal(result.details.reports[0].report.total, 1);
  assert.equal(result.details.truncated, false);
});

test("command lints editor text without modifying or submitting it", async () => {
  const extension = harness();
  const notifications: Array<[string, string]> = [];
  const editor = "The file is processed.";
  const ctx = {
    cwd: process.cwd(),
    ui: {
      getEditorText: () => editor,
      notify: (text: string, level: string) => notifications.push([text, level]),
    },
  };

  await extension.command.handler("lint", ctx);

  assert.match(notifications[0]?.[0] ?? "", /passive voice: 1/);
  assert.equal(notifications[0]?.[1], "warning");
  assert.equal(ctx.ui.getEditorText(), editor);
});
