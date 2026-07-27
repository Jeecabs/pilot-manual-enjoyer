// Adapted from ste-lint.py in woosal1337/blog at revision
// b912d5fa59f368253683af2ebfac64ad6d08312d. See THIRD_PARTY_NOTICES.md.

const MARKETING_TERMS = [
  "seamless", "seamlessly", "robust", "powerful", "cutting-edge", "effortless", "effortlessly",
  "world-class", "next-generation", "revolutionary", "blazing", "lightning-fast", "elegant", "delightful",
  "turnkey", "best-in-class", "state-of-the-art", "game-changing", "first-class", "battle-tested",
  "enterprise-grade", "supercharge", "unlock", "unleash", "empower", "empowers",
] as const;

const BANNED_TERMS = [
  "begin", "begins", "commence", "commences", "initiate", "initiates", "originate",
  "utilize", "utilizes", "utilizing", "leverage", "leverages", "leveraging", "facilitate", "facilitates",
  "ensure", "ensures", "ensuring", "prior to", "subsequent to", "obtain", "obtains", "acquire", "acquires",
  "demonstrate", "demonstrates", "additionally", "furthermore", "moreover", "comprehensive", "comprehensively",
  "utilization", "aforementioned", "henceforth", "therein", "whilst", "amongst", "numerous", "myriad", "plethora",
  "in order to", "a variety of", "in the event that", "due to the fact that", "it is important to note",
] as const;

const PHRASAL_VERBS = [
  "spin up", "spin down", "reach out", "dive into", "dives into", "diving into", "kick off", "kicks off",
  "roll out", "rolls out", "tear down", "ramp up", "circle back", "drill down", "spun up", "reaching out",
] as const;

const MODAL_HEDGES = [
  "it is important to note", "it should be noted", "it is worth noting", "please note that",
  "as mentioned", "as noted above",
] as const;

export const VIOLATION_CATEGORIES = [
  "long_sentence(>20w)",
  "semicolon",
  "contraction",
  "passive_voice",
  "ing_main_verb",
  "nominalization",
  "phrasal_verb",
  "banned_word",
  "marketing_adjective",
  "modal_hedge",
  "long_paragraph(>6s)",
] as const;

export type ViolationCategory = (typeof VIOLATION_CATEGORIES)[number];
export type MarkerCategory = "em_dash(slop-marker)";

export interface LintFinding {
  category: ViolationCategory | MarkerCategory;
  line: number;
  column: number;
  text: string;
  message: string;
  counted: boolean;
}

export interface SteLintReport {
  words: number;
  sentences: number;
  violations: Record<ViolationCategory, number>;
  total: number;
  totalPer100Words: number;
  emDashes: number;
  longestSentenceWords: number;
  sampleMarketing: string[];
  sampleBanned: string[];
  findings: LintFinding[];
}

interface SentenceSpan {
  text: string;
  start: number;
  words: number;
}

const BE = "(?:am|is|are|was|were|be|been|being)";
const IRREGULAR_PARTICIPLE = "(?:done|made|sent|read|built|kept|held|set|put|run|written|shown|given|taken|found|got|gotten|seen|known|thrown|drawn)";

const CATEGORY_MESSAGES: Record<ViolationCategory | MarkerCategory, string> = {
  "long_sentence(>20w)": "Split this sentence. STE instructions must contain at most 20 words.",
  semicolon: "Replace the semicolon with a period.",
  contraction: "Expand the contraction.",
  passive_voice: "Use active voice when the actor is known.",
  ing_main_verb: "Use a simple verb tense when it states the main action.",
  nominalization: "Use a direct verb instead of a noun phrase or generic action verb.",
  phrasal_verb: "Replace the phrasal verb with one plain verb.",
  banned_word: "Use a shorter common word.",
  marketing_adjective: "Remove the marketing claim or replace it with a specific fact.",
  modal_hedge: "Remove the framing and state the point directly.",
  "long_paragraph(>6s)": "Split this paragraph. STE permits at most six sentences per paragraph.",
  "em_dash(slop-marker)": "Review the em dash. It is a slop marker, not a scored STE violation.",
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordCount(value: string): number {
  return value.match(/[A-Za-z0-9][A-Za-z0-9'\-/]*/g)?.length ?? 0;
}

function spacesPreservingLines(value: string): string {
  return value.replace(/[^\n]/g, " ");
}

/** Hide fenced and inline code while preserving source offsets for findings. */
function maskCode(source: string): string {
  let masked = source.replace(/```[\s\S]*?```/g, spacesPreservingLines);
  masked = masked.replace(/`[^`]*`/g, spacesPreservingLines);
  return masked;
}

function makeSentenceSpan(text: string, start: number): SentenceSpan {
  return { text, start, words: wordCount(text) };
}

function splitLineSentences(text: string, start: number): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const separator = /(?<=[.!?:])\s+(?=[A-Z0-9"'\-])/g;
  let segmentStart = 0;

  for (const match of text.matchAll(separator)) {
    const sentence = text.slice(segmentStart, match.index).trim();
    if (sentence) spans.push(makeSentenceSpan(sentence, start + segmentStart));
    segmentStart = match.index + match[0].length;
  }

  const sentence = text.slice(segmentStart).trim();
  if (sentence) spans.push(makeSentenceSpan(sentence, start + segmentStart));
  return spans;
}

function lineSentenceSpans(line: string, lineStart: number): SentenceSpan[] {
  const heading = line.match(/^\s*#{1,6}\s*/)?.[0].length ?? 0;
  const listPrefix = line.slice(heading).match(/^\s*(?:[-*+]|\d+[.)])\s+/)?.[0].length ?? 0;
  const prefixLength = heading + listPrefix;
  const body = line.slice(prefixLength);
  const leading = body.match(/^\s*/)?.[0].length ?? 0;
  const trimmed = body.trim();
  return trimmed ? splitLineSentences(trimmed, lineStart + prefixLength + leading) : [];
}

function sentenceSpans(source: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  let lineStart = 0;
  for (const line of maskCode(source).split("\n")) {
    spans.push(...lineSentenceSpans(line, lineStart));
    lineStart += line.length + 1;
  }
  return spans;
}

function sourcePosition(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, Math.max(0, index));
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function displayText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 119).trimEnd()}…`;
}

function finding(
  source: string,
  category: ViolationCategory | MarkerCategory,
  index: number,
  text: string,
  counted = true,
): LintFinding {
  const position = sourcePosition(source, index);
  return {
    category,
    line: position.line,
    column: position.column,
    text: displayText(text),
    message: CATEGORY_MESSAGES[category],
    counted,
  };
}

function regexFindings(
  source: string,
  masked: string,
  category: ViolationCategory,
  regex: RegExp,
): LintFinding[] {
  return [...masked.matchAll(regex)].map((match) => finding(source, category, match.index, source.slice(match.index, match.index + match[0].length)));
}

function phraseRegex(phrase: string): RegExp {
  return new RegExp(`(?<![a-z])${escapeRegex(phrase)}(?![a-z])`, "gi");
}

function phraseFindings(
  source: string,
  masked: string,
  category: ViolationCategory,
  phrases: readonly string[],
): { findings: LintFinding[]; hits: string[] } {
  const findings: LintFinding[] = [];
  const hits: string[] = [];
  for (const phrase of phrases) {
    for (const match of masked.matchAll(phraseRegex(phrase))) {
      findings.push(finding(source, category, match.index, source.slice(match.index, match.index + match[0].length)));
      hits.push(phrase);
    }
  }
  return { findings, hits };
}

function paragraphFindings(source: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const separator = /\n\s*\n/g;
  let start = 0;

  const inspect = (end: number): void => {
    const paragraph = source.slice(start, end);
    if (paragraph.trim() && sentenceSpans(paragraph).length > 6) {
      const first = paragraph.search(/\S/);
      findings.push(finding(source, "long_paragraph(>6s)", start + Math.max(0, first), paragraph));
    }
  };

  for (const match of source.matchAll(separator)) {
    inspect(match.index);
    start = match.index + match[0].length;
  }
  inspect(source.length);
  return findings;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function lintText(source: string): SteLintReport {
  const masked = maskCode(source);
  const sentences = sentenceSpans(source);
  const findings: LintFinding[] = [];

  for (const sentence of sentences) {
    if (sentence.words > 20) {
      findings.push(finding(source, "long_sentence(>20w)", sentence.start, sentence.text));
    }
  }

  findings.push(...regexFindings(source, masked, "semicolon", /;/g));
  findings.push(...regexFindings(source, masked, "contraction", /\b\w+['’](?:t|re|ve|ll|d|s|m)\b/gi));
  findings.push(...regexFindings(source, masked, "passive_voice", new RegExp(`\\b${BE}\\s+(?:\\w+ed|${IRREGULAR_PARTICIPLE})\\b`, "gi")));
  findings.push(...regexFindings(source, masked, "ing_main_verb", new RegExp(`\\b${BE}\\s+\\w+ing\\b`, "gi")));
  findings.push(...regexFindings(source, masked, "nominalization", /\b(?:perform(?:s|ed)?|conduct(?:s|ed)?|provide(?:s|d)?|carry out|carries out|make use of|makes use of)\b/gi));
  findings.push(...regexFindings(source, masked, "nominalization", /\b\w{4,}(?:tion|ment|ance|ence)\s+of\b/gi));

  const phrasal = phraseFindings(source, masked, "phrasal_verb", PHRASAL_VERBS);
  const banned = phraseFindings(source, masked, "banned_word", BANNED_TERMS);
  const marketing = phraseFindings(source, masked, "marketing_adjective", MARKETING_TERMS);
  const hedges = phraseFindings(source, masked, "modal_hedge", MODAL_HEDGES);
  findings.push(...phrasal.findings, ...banned.findings, ...marketing.findings, ...hedges.findings);
  findings.push(...paragraphFindings(source));

  for (const match of source.matchAll(/[—–]/g)) {
    findings.push(finding(source, "em_dash(slop-marker)", match.index, match[0], false));
  }

  findings.sort((left, right) => left.line - right.line || left.column - right.column || left.category.localeCompare(right.category));

  const violations = Object.fromEntries(
    VIOLATION_CATEGORIES.map((category) => [category, findings.filter((item) => item.counted && item.category === category).length]),
  ) as Record<ViolationCategory, number>;
  const words = sentences.reduce((total, sentence) => total + sentence.words, 0) || 1;
  const total = Object.values(violations).reduce((sum, count) => sum + count, 0);

  return {
    words,
    sentences: sentences.length,
    violations,
    total,
    totalPer100Words: round2((total * 100) / words),
    emDashes: findings.filter((item) => item.category === "em_dash(slop-marker)").length,
    longestSentenceWords: Math.max(0, ...sentences.map((sentence) => sentence.words)),
    sampleMarketing: unique(marketing.hits).slice(0, 6),
    sampleBanned: unique(banned.hits).slice(0, 6),
    findings,
  };
}
