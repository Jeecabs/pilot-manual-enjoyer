# Pilot Manual Enjoyer

Pi package for clear technical writing. It combines an ASD-STE100-inspired writing skill with a deterministic prose linter.

The package adapts the kit from [“The cure for AI slop is a 1986 aircraft manual”](https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop). It ports the linter to TypeScript and adds Pi tools, commands, source locations, compact rendering, and file safeguards.

## What it does

Pilot Manual Enjoyer provides two resources:

- `pilot-manual-enjoyer`: an on-demand skill for writing and rewriting technical prose.
- `ste_lint`: a read-only model tool that checks text or explicit files.

The linter reports:

- sentences longer than 20 words;
- semicolons and contractions;
- likely passive voice and `-ing` main verbs;
- nominalizations and selected phrasal verbs;
- complex words, marketing adjectives, and modal hedges;
- paragraphs longer than six sentences;
- em dashes as unscored slop markers.

Score equals counted violations per 100 words. Lower is cleaner. The score is most useful when you compare a draft before and after revision.

This checker covers mechanical rules only. It cannot certify ASD-STE100 or make an unsupported claim true.

## Install

Install the package globally from GitHub:

```bash
pi install https://github.com/Jeecabs/pilot-manual-enjoyer
```

Restart Pi or run `/reload`.

Remove it with:

```bash
pi remove https://github.com/Jeecabs/pilot-manual-enjoyer
```

## Use

The skill loads when you ask Pi to write or revise technical prose. Invoke it directly when needed:

```text
/skill:pilot-manual-enjoyer rewrite this README introduction
```

The model can call `ste_lint` with inline text or up to 20 explicit file paths. The tool never changes files.

Use the command to inspect your current editor draft or one file:

```text
/ste lint
/ste file README.md
/ste rules
/ste status
```

`/ste lint` reads the editor without changing or submitting it.

## Safety and privacy

- No network calls.
- No model calls from the extension.
- No subprocesses.
- No file mutations.
- No config or persistent state.
- Text and files are limited to 1 MiB each.
- File batches are limited to 20 explicit paths.
- Symlinks and non-regular files are rejected.
- Tool output is limited to 50 KiB and 2,000 lines.

The selected Pi model still receives normal tool arguments and results as part of its conversation.

## Development

```bash
pnpm install
pnpm verify
pi -e ./src/index.ts
```

`pnpm verify` runs strict TypeScript checks, Node tests, and a package dry run.

## Upstream and licensing

Pilot Manual Enjoyer is MIT licensed. Adapted upstream material remains MIT licensed under its original copyright.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`vendor/WOOSAL_BLOG_LICENSE.md`](vendor/WOOSAL_BLOG_LICENSE.md). The official ASD-STE100 specification is copyrighted and is not included. Obtain it from <https://asd-ste100.org>.
