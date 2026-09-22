# TASKS.md — Precursor

Execution state and roadmap tracked by milestones per the Deeen_Plans framework.

## M0 — Spec locked

- [x] Project scope and problem statement defined in `PROJECT.md`
- [x] Architecture topology and trust boundary map recorded in `ARCHITECTURE.md`
- [x] Security constraints and non-negotiables documented in `SECURITY.md`
- [x] Operating manual and AI rules set in `AGENTS.md`
- [x] Architectural decisions recorded in `DECISIONS.md`

## M1 — Foundation

- [x] Monorepo scaffolded with npm workspaces (`packages/*`, `apps/*`)
- [x] Smart contracts deployed on local Anvil chain via `DeployV1.s.sol`
- [x] Ingestion layer (`@precursor/evm`) polling blocks and decoding event logs
- [x] Normalized domain types and schemas in `@precursor/shared`
- [x] Foundry test harness configured

## M2 — Core gate logic

- [x] Deterministic behavior engine (`@precursor/behavior-engine`) detecting manipulation sequences
- [x] Dynamic simulation engine (`@precursor/simulation`) projecting terminal invariant impact
- [x] Deterministic policy engine (`@precursor/policy-engine`) producing `ALLOW`/`REVIEW`/`BLOCK`
- [x] Fail-safe fallback implemented when simulation is unavailable
- [x] On-chain `SecurityController.sol` evaluating invariant threshold ($150\%$ ratio)
- [x] Access control hardening on `LendingPool.sol` (protecting admin functions)

## M3 — Integration

- [x] End-to-end defense loop wired (`run-scenario` endpoint)
- [x] Attack Replay Timeline reconstructing state diffs and forensic evolution (`GET /api/timeline`)
- [x] Attack Economics Calculator computing exact protocol value saved (`GET /api/economics`)
- [x] Real-time WebSocket heartbeat and latency benchmarking (`GET /api/heartbeat`, `/ws`)
- [x] Investigation dashboard serving live forensics and incident analysis

## M4 — Hardening, UI & Audit

- [x] Cross-platform verification script (`scripts/verify.ts`) checking lint, typecheck, tests, and build
- [x] Smart contract access control and parameter validation review
- [x] Complete security audit report generated per `Deeen_Plans/prd.md` (`docs/AUDIT_REPORT.md`)
- [x] Dedicated Next.js 15 Web Application (`apps/web`) with Visitors & SIEM Dark themes
- [x] Overview screen implemented per Plan §27 (`/`)
- [x] Protocol security model screen implemented per Plan §28 (`/protocol`)
- [x] Threats intelligence & evidence screen implemented per Plan §29 (`/threats`)
- [x] 4-stage Investigation screen implemented per Plan §30 (`/investigation`)
- [x] Side-by-side Protected vs Unprotected proof screen implemented per Plan §25 & Milestone 9 (`/comparison`)
- [x] REST endpoints: `GET /api/protocol`, `GET /api/threat`, `POST /api/run-comparison`, `GET /api/comparison`
- [x] Simulation engine unit test suite added (`packages/simulation/tests/index.test.ts`) — 10/10 Vitest tests passing

## M5 — Submission & Verification

- [x] Demo runner script (`scripts/demo.ts`) fully cross-platform with forge auto-detection
- [x] Comprehensive documentation suite complete
- [x] Single-shot verification gate passing all 4 gates (`npm run verify` - 100% green)
- [x] Next.js production build passing (`npm run build --prefix apps/web` - 8/8 routes compiled)

