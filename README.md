# Precursor — DeFi Attack-Behavior Defense Infrastructure

V1: Behavior-first defense against oracle-manipulation attacks on a controlled lending protocol.

## What Is Actually Real

### On-Chain (Solidity + Foundry)
- `MockOracle.sol` — price feed with owner-gated `setDecimals` and unrestricted `setPrice` (the vulnerability)
- `ControlledCollateral.sol` — ERC20 collateral token with `mint`
- `SecurityController.sol` — defense decision engine, on-chain invariant evaluation (150% collateral ratio), `evaluateDefenseExternal` public entry point
- `LendingPool.sol` — vulnerable lending protocol with deposit/borrow/withdraw, `getInvariant()`, `getUserState()`
- `LendingPool.t.sol` — 11 Foundry unit tests: invariant health, unprotected attack succeeds, protected attack blocked
- `Adversarial.t.sol` — 6 Foundry adversarial tests: sybil, false positive, repeated attempts, controller disable
- **17/17 tests passing** on Foundry v1.8.3, Solidity 0.8.20

### Off-Chain (TypeScript)
- `@precursor/shared` — shared types (zod-validated schemas)
- `@precursor/evm` — EVM event ingestion + attacker scenario runner (viem)
- `@precursor/behavior-engine` — rule-based behavior detection (6 behavioral signals)
- `@precursor/attack-analysis` — attack path reconstruction from behavior evidence
- `@precursor/simulation` — Anvil fork simulation + state diff
- `@precursor/policy-engine` — deterministic ALLOW/REVIEW/BLOCK decisions (3 rules)
- `apps/api` — Express.js control + investigation API (4 endpoints)

## Defense Loop

```
EVM Events → Behavior Engine → Attack Path → Simulation → Invariant → Policy → Defense Action
```

1. **Ingest**: EVM listener polls blocks/logs, decodes events into normalized format
2. **Detect**: Behavior engine matches events against oracle-manipulation pattern (6 signals, 70% threshold)
3. **Reconstruct**: Attack path engine builds the narrative sequence from evidence
4. **Simulate**: Simulation engine forks chain at current block, runs attack, computes state/asset diffs
5. **Evaluate**: Invariant engine checks collateralization ratio (150% threshold)
6. **Decide**: Policy engine maps observation + simulation → BLOCK/REVIEW/ALLOW
7. **Act**: API sends decision to on-chain SecurityController

## Quick Start

```bash
# Terminal 1: Start local chain
anvil -p 8555

# Terminal 2: Deploy contracts
forge script Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8555 --broadcast --private-key $KEY

# Terminal 3: Run Foundry tests
forge test -vvv

# Terminal 4: Build + run API
npm run build
npm run dev:api
```

## Test Coverage

### Solidity (Foundry)
```
LendingPoolTest:     11 tests, 0 failures
AdversarialTest:     6 tests, 0 failures
Total:              17 tests, 0 failures
```

### TypeScript (Vitest)
```
behavior-engine:  2 tests, 0 failures
policy-engine:   4 tests, 0 failures
Total:           6 tests, 0 failures
```

## Key Design Decisions

1. **V1 scope**: Single attack vector (oracle manipulation → borrow → withdraw)
2. **No ML/AI**: Behavior detection is pure rule-based (6 signals, threshold-based)
3. **Deterministic**: Policy engine is fully deterministic — same inputs → same decision
4. **On-chain enforcement**: SecurityController evaluates defense on-chain, not off-chain

## Files

```
packages/contracts/       Solidity contracts + Foundry tests
packages/shared/          Shared TypeScript types
packages/evm/             EVM ingestion + attacker scenario runner
packages/behavior-engine/ Rule-based behavior detection
packages/attack-analysis/ Attack path reconstruction
packages/simulation/      Anvil fork simulation
packages/policy-engine/   Deterministic policy decisions
apps/api/                 Express.js investigation API
docs/                     Architecture, threat model, build assessment
```
