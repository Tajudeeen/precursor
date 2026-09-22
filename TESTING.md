# TESTING.md — Precursor

Definition of done, self-review protocol, and verification standards for Precursor.

## Definition of done

A feature or bugfix is complete **only** when all seven conditions are met:

1. **Implementation exists**: Code is fully implemented (no stubbed TODOs in the critical path).
2. **Unit tests pass**: All package unit tests pass (`vitest run`).
3. **Integration tests pass**: End-to-end integration tests pass against local Anvil.
4. **Lint passes**: Static syntax and style checks pass.
5. **Typecheck passes**: All TypeScript packages compile without error (`tsc --noEmit`).
6. **Smart contract tests pass**: Foundry test suite passes 100% (`forge test`).
7. **Self-review completed**: A skeptical senior audit review has been performed with zero unresolved CRIT or HIGH findings.

Run the verification gate in one command:

```bash
npm run verify
```

## Defense pipeline verification checklist

When modifying any part of the defense loop:

- [ ] **Behavior Engine**: Correctly detects the oracle manipulation sequence (`deposit` + `borrow` + `priceUpdate` + `borrow`).
- [ ] **Simulation Engine**: Accurately projects inflated collateral value and projected debt; executes within performance targets (<100ms).
- [ ] **Policy Engine**: Blocks when invariant $<15000$ bps; enforces fail-safe fallback (`BLOCK`) when simulation is unavailable.
- [ ] **Smart Contracts**: `SecurityController` and `LendingPool` revert fraudulent withdrawals (`WithdrawBlocked`) with zero state contamination.
- [ ] **Access Control**: Administrative functions (`setSecurityController`, `disableSecurityController`) cannot be called by arbitrary external callers.
- [ ] **Observability**: Defense decisions produce structured logs, update pipeline heartbeat, record benchmark latency, and construct forensic timelines.

## Self-review protocol

Before declaring any change complete, run a separate review pass:

```text
Review this diff as a skeptical Web3 Security Auditor.
Look for:
- Reentrancy and state corruption
- Access control bypasses
- Decimal scaling or integer arithmetic mismatches
- Silent failure modes or unhandled promise rejections
- Trust boundary assumptions violated
- Falsified or unverified claims
```

## Multi-tier verification standard

- **Engineering**: Compiles without warnings, types strictly sound, error cases handled, no memory leaks.
- **Blockchain**: Addresses verified, chain ID matches (31337 for Anvil, L2/testnet for live networks), finality respected.
- **Security**: Caller authentication, state integrity, front-running resistance, atomic exploit prevention.
- **Infrastructure**: Resilience against RPC timeouts, websocket drops, and anvil restarts.
- **Observability**: Clear operator metrics, latency timers, and explainable evidence strings.
