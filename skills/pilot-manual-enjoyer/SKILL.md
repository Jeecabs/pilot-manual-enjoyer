---
name: pilot-manual-enjoyer
description: Write or rewrite technical prose with ASD-STE100-inspired Simplified Technical English. Use for documentation, READMEs, PR descriptions, release notes, error messages, procedures, and comments that must be clear and not sound like AI. Never apply it to code or identifiers.
license: MIT; adapted from Ege Çelebi's ste-writing skill. See THIRD_PARTY_NOTICES.md.
---

# Pilot Manual Enjoyer

Write technical prose with ASD-STE100-inspired Simplified Technical English. This skill applies to documentation, READMEs, pull-request text, error messages, release notes, procedures, and comments. It does not apply to code, identifiers, or command syntax. Do not use it for marketing copy or work that needs a strong personal voice. STE removes voice on purpose.

## Rules

### Words

- Use one name for one thing. Do not use different names for the same item.
- Use the short common word: start, use, help, make sure, before, after, about, get, show, and also.
- Give each word one meaning. For example, use “fall” only for movement down, not for a decrease.
- Remove marketing adjectives such as seamless, robust, powerful, cutting-edge, effortless, world-class, next-generation, and revolutionary.
- Use American spelling.

### Verbs

- Use active voice. Write “the parser reads the file,” not “the file is read by the parser.”
- Use a verb for an action. Write “analyze the log,” not “perform an analysis of the log.”
- Remove stacked auxiliary verbs and framing such as “it is important to note that.”
- Do not use an `-ing` main verb when a simple tense works.

### Sentences

- Put one instruction in each sentence.
- Limit instructions to 20 words.
- Limit descriptive sentences to 25 words.
- Do not use contractions.
- Keep articles such as a, an, the, this, and these.

### Punctuation and structure

- Do not use semicolons. Write two sentences.
- Put one topic in each paragraph.
- Limit each paragraph to six sentences.
- Use a numbered vertical list for procedures.
- Put each action in one imperative step.
- Put a condition before its command.

Return only the requested text. Do not add a preamble, summary, or closing remark.

## Modes

- **Strict:** Apply every rule to procedures, runbooks, safety text, and error messages.
- **STE-flavored:** Apply sentence, paragraph, active-voice, and plain-verb rules to general documentation. Keep enough vocabulary for natural prose.

## Self-check

1. Split sentences longer than 20 words.
2. Replace each semicolon with a period.
3. Expand each contraction.
4. Use active voice when the actor is known.
5. Replace nominalizations, phrasal verbs, and unnecessary `-ing` forms.
6. Pick one name for each thing.
7. When `ste_lint` is available, lint substantial prose and fix useful findings before returning it.

The linter checks mechanical rules. It cannot certify ASD-STE100 or make an empty claim true. The official standard is available at <https://asd-ste100.org>.
