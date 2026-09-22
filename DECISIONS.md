# DECISIONS.md — Precursor

Architectural decision records (ADR) for the Precursor defense platform. Decisions recorded here must not be silently overridden without an explicit entry explaining the change.

---

## 2026-09-15

### Decision
Use a narrow, opt-in `SecurityController` contract hook on `LendingPool.withdraw()` rather than an omnibus contract proxy or global pause.

### Reason
Lending protocols will not accept external contracts having unilateral custody of their deposits or the ability to freeze all protocol operations arbitrarily. Gating individual suspicious withdrawals preserves normal protocol availability for legitimate users while isolating the threat.

### Rejected
1. Full protocol pause (`Pausable`): Freezes the entire protocol, denying service to honest users and inviting griefing attacks.
2. Direct custody proxy: Too intrusive; unacceptably high governance barrier.

### Consequence
The protected protocol explicitly invokes `securityController.evaluateWithdraw(user, amount)` during withdrawal requests. The controller supplies the two things only the caller knows — who is withdrawing and how much — and derives everything the verdict depends on (collateral balance, debt, oracle price) from chain state.

**Revised 2026-09-22:** the original design passed projected collateral/debt values computed off-chain as arguments to `withdraw()`. That made the gate's verdict a function of caller-supplied numbers, so it could be defeated by passing safe-looking values (audit finding C-1). `withdraw(uint256)` now takes only an amount.

---

## 2026-09-16

### Decision
Rule-based, deterministic policy engine instead of an on-chain or off-chain ML classifier for block decisions.

### Reason
DeFi security requires zero false positives and 100% deterministic explainability. Smart contracts cannot verify probabilistic deep neural network outputs on-chain without excessive gas or oracle trust assumptions.

### Rejected
1. On-chain ML inference: Prohibitively gas-intensive and non-deterministic.
2. Off-chain opaque ML: Vulnerable to adversarial evasion, poisoning, and lack of verifiable audit trails.

### Consequence
Policy rules are deterministic math and invariant thresholds: when `confidence >= 70` AND `simulated invariant == VIOLATION`, the outcome is deterministically `BLOCK`.

---

## 2026-09-20

### Decision
Fail-safe fallback policy: If off-chain simulation fails or is unavailable when a high-confidence threat sequence is detected, default to `BLOCK`.

### Reason
Per `SECURITY.md`, the system must fail closed, not open. If an attacker crafts a transaction sequence that crashes the off-chain simulator (e.g. out of memory, RPC timeout), the protocol must not silently allow an exploited withdrawal to drain liquidity.

### Rejected
1. Default to `ALLOW` on simulation error: Directly creates an exploit vector where crashing the simulator bypasses defense.
2. Silent skip: Masks system degradation from operators.

### Consequence
Simulation engine wraps execution in robust try-catch blocks and policy engine returns `CRITICAL / BLOCK` with reason `"SIMULATION UNAVAILABLE — defaulting to BLOCK per fail-safe policy"`.

---

## 2026-09-20

### Decision
Dual-layer defense: Deterministic risk engine operates as the authoritative gate, while the forensic classifier operates strictly as an advisory intent classifier and diagnostic explainer.

### Reason
Adheres to the core rule of `SECURITY.md`: "Never let an unverified heuristic move funds or decide blocks directly. Advisory engines propose/explain, deterministic layer validates, on-chain contracts enforce." Operators need clear threat narratives for incident response, but the gate itself must remain mathematically grounded.

### Rejected
1. Autonomous unverified veto authority: Vulnerable to adversarial manipulation and false positive blocks.
2. Purely manual human investigation: Too slow for fast-moving DeFi exploits.

### Consequence
Diagnostic forensic outputs are consumed by the Investigation UI and Incident Response logs, but do not override the deterministic policy engine.

---

## 2026-09-20

### Decision
On-chain attestation of defense verdicts via `DecisionMade` events and structured evidence hashing.

### Reason
Auditability requires immutable proof on-chain of why a transaction was allowed, reviewed, or blocked. Off-chain logs can be deleted or tampered with; on-chain event logs provide cryptographic proof of defense action.

### Rejected
1. Ephemeral off-chain logging only: Lacks cryptographic tamper resistance.

### Consequence
`SecurityController` and the defense API record deterministic evidence hashes and event parameters permanently on-chain.
