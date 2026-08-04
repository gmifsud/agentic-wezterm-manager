# agentic-wezterm-manager — AGENTS.md

> Generic agent runner contract. Auto-discovered by Codex CLI, Cursor, Kilo, and other AGENTS.md-aware tools.
> Index, not data dump. Keep <200 lines.

## Project
- **Name:** agentic-wezterm-manager
- **Stack:** <fill in>
- **Owner:** grego
- **Repo root:** `C:\Repos\CLI\agentic-wezterm-manager`
- **Additional Files:** `C:\Users\grego\.wezterm.lua`
- **Bootstrapped:** 2026-05-16 via `agentforge`

## Operating Principles

### 95% Confidence Rule
1. Read the actual files involved — do not assume content.
2. Trace the full call chain from entry point to effect.
3. If confidence <95%, state what's missing and ask. Never guess.

### Determinism
Reproducibility across environments is required. Flag non-determinism explicitly.

### Surgical Changes
Target the specific file/function causing the issue. No cascading defensive refactors.

## Build & Run
```bash
<build>
<test>
<run>
```

## Conventions
- British English where natural.
- No committed build artifacts; no magic strings without constants.
- Review format: **Verdict → Location → Issue → Impact → Remediation → Verification**.

## Skills
Skill library symlinked at `.agents/skills/` (or `.codex/skills/` depending on target). Reference specific skills; do not bulk-load.

## Token Hygiene
- Batch instructions in a single prompt where possible.
- Use surgical file references (`@path/file.ts`), never "search the repo".
- Limit shell output (`head`, `--oneline`, `-n N`).
- Prefer cheaper models for sub-agents and formatting tasks.

## Lessons Learned
<!-- One-line bullets, <15 words, prune weekly -->
- yao-pkg produces non-deterministic exes; replaced with Node SEA (deterministic, build-verified by port probe).
- SEA sentinel string varies per Node build; read it from the binary, don't trust the docs.

## Decisions Log
<!-- Stable architectural decisions. Link ADRs where they exist. -->
- _(empty)_
