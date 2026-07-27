import assert from "node:assert/strict";
import test from "node:test";

import { lintText } from "../src/linter.ts";

const BAD_PROSE = "It is important to note that the file is processed seamlessly; we're leveraging a variety of powerful tools in order to spin up the system — this is making it robust.";

test("linter preserves upstream score and category behavior", () => {
  const report = lintText(BAD_PROSE);

  assert.equal(report.words, 30);
  assert.equal(report.sentences, 1);
  assert.deepEqual(report.violations, {
    "long_sentence(>20w)": 1,
    semicolon: 1,
    contraction: 1,
    passive_voice: 1,
    ing_main_verb: 1,
    nominalization: 0,
    phrasal_verb: 1,
    banned_word: 4,
    marketing_adjective: 3,
    modal_hedge: 1,
    "long_paragraph(>6s)": 0,
  });
  assert.equal(report.total, 14);
  assert.equal(report.totalPer100Words, 46.67);
  assert.equal(report.emDashes, 1);
  assert.equal(report.longestSentenceWords, 30);
  assert.deepEqual(report.sampleMarketing, ["seamlessly", "robust", "powerful"]);
  assert.deepEqual(report.sampleBanned, ["leveraging", "in order to", "a variety of", "it is important to note"]);
});

test("linter gives source locations and marks em dashes as unscored", () => {
  const report = lintText("The file is processed.\nWe use a robust parser — always.");
  const passive = report.findings.find((finding) => finding.category === "passive_voice");
  const marketing = report.findings.find((finding) => finding.category === "marketing_adjective");
  const dash = report.findings.find((finding) => finding.category === "em_dash(slop-marker)");

  assert.deepEqual(passive && { line: passive.line, column: passive.column, text: passive.text }, {
    line: 1,
    column: 10,
    text: "is processed",
  });
  assert.deepEqual(marketing && { line: marketing.line, column: marketing.column, text: marketing.text }, {
    line: 2,
    column: 10,
    text: "robust",
  });
  assert.equal(dash?.line, 2);
  assert.equal(dash?.counted, false);
  assert.equal(report.total, 2);
});

test("linter ignores fenced and inline code", () => {
  const report = lintText([
    "Use `robust; we're` as test data.",
    "",
    "```text",
    "It is important to note that this is processed seamlessly;",
    "```",
    "",
    "The parser reads the file.",
  ].join("\n"));

  assert.equal(report.total, 0);
  assert.equal(report.emDashes, 0);
});

test("linter detects paragraphs longer than six sentences", () => {
  const report = lintText("One. Two. Three. Four. Five. Six. Seven.");

  assert.equal(report.sentences, 7);
  assert.equal(report.violations["long_paragraph(>6s)"], 1);
  assert.equal(report.findings.find((finding) => finding.category === "long_paragraph(>6s)")?.line, 1);
});

test("clean procedural prose returns zero", () => {
  const report = lintText("Open the file. Read the first line. Save the result.");

  assert.equal(report.total, 0);
  assert.equal(report.totalPer100Words, 0);
});
