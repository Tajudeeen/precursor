# AGENTS.md — Precursor

This file is the operating manual for any AI coding agent working in this repository: Gemini, Claude, GPT, DeepSeek, or subagents. Read this file before touching any code.

## 0. Read order

Before making any changes, read in this exact order:

1. `AGENTS.md` (this file) — operational discipline
2. `PROJECT.md` — what Precursor builds and for whom
3. `ARCHITECTURE.md` — system topology, trust boundaries, and data flow
4. `DECISIONS.md` — architectural decisions log (do not silently revert deliberate choices)
5. `TASKS.md` — current milestone status and active tasks
6. `SECURITY.md` — trust boundaries, off-limits items, and invariant rules
7. `TESTING.md` — definition of done and verification standards

If a user request conflicts with something recorded in `DECISIONS.md` or `SECURITY.md`, stop and flag the conflict instead of resolving it silently.

## 1. What this project is

Precursor is a behavior-first, pre-transaction DeFi defense infrastructure that monitors on-chain event streams, detects predatory multi-step sequences, simulates hypothetical withdrawal outcomes against collateralization invariants, and enforces an on-chain block via `SecurityController`.

## 2. Standing rules

- **Never let an LLM move funds or sign transactions directly**: The model proposes/explains; deterministic code validates; on-chain contracts enforce.
- **Never invent hashes, addresses, or test results**: If an action was not executed, state it clearly.
- **Never edit or read off-limits secrets**: Follow `SECURITY.md`.
- **Never modify decisions in `DECISIONS.md` without explicit notation**: Document what changed, why, and what was rejected.
- **Prefer minimal, correct diffs**: Do not refactor working modules when fixing targeted bugs.
- **Cross-platform compatibility**: Scripts and commands must run reliably on Windows PowerShell and Linux/macOS.

## 3. Verification command

Always run the full verification gate before declaring any task complete:

```bash
npm run verify
```

This runs:
1. Static analysis & linting
2. TypeScript type-checking across all monorepo packages
3. Vitest unit and integration test suites
4. Foundry smart contract test suite (`forge test`)
5. Monorepo build compilation

## 4. Workflow stages

```text
SPEC → PLAN → IMPLEMENT → TEST → REVIEW → FIX → VERIFY
```

1. **Spec**: Understand inputs, outputs, invariants, and edge cases.
2. **Plan**: Formulate the minimal change set and identify trust boundary implications.
3. **Implement**: Code the smallest correct version.
4. **Test**: Run unit and integration tests.
5. **Review**: Perform a skeptical self-review against `TESTING.md`.
6. **Fix**: Address any findings.
7. **Verify**: Run `npm run verify` and confirm all checks pass.

## 5. Deterministic vs. Model judgment

| Deterministic Scripts | AI Model Judgment |
|---|---|
| Invariant calculation | Attack intent classification |
| Solvency ratio evaluation | Natural language forensics |
| Bytecode execution | Anomaly hypothesis generation |
| Unit and integration testing | Threat explanation for operators |
