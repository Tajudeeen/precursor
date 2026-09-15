# Architecture

## V1: Controlled Vulnerable Protocol + Defense Loop

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY UI (Milestone 10)             │
│  Overview / Protocol / Threat / Investigation            │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│                    API / Control Layer                   │
│  Control decision + investigation endpoints              │
└───────────────┬───────────────────┬─────────────────────┘
                │                   │
                ▼                   ▼
┌─────────────────────────┐ ┌──────────────────────────┐
│   Behavior Engine       │ │  Attack-Analysis Engine  │
│  (Milestone 4)          │ │  (Milestone 5)            │
│  - Profile addresses    │ │  - Reconstruct attack path│
│  - Detect sequences     │ │  - Map to protocol comps  │
│  - Flag suspicious      │ │  - Combine evidence       │
└─────────────┬───────────┘ └─────────────┬────────────┘
              │                           │
              └──────────────┬────────────┘
                             ▼
┌───────────────────────────────────────────────────────────┐
│              EVM Simulation Engine (Milestone 6)           │
│  - Anvil fork at current state                             │
│  - Execute hypothetical continuation of attacker sequence  │
│  - Capture state diff (collateral, debt, oracle, liquidity)│
│  - Evaluate invariant against projected state              │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│              Policy Engine (Milestone 7)                   │
│  Map: behavior + simulation + invariant → ALLOW/REVIEW/BLOCK │
│  Deterministic, explainable, no AI in the critical path     │
└───────────────┬───────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────┐
│          Security Controller (Milestone 8)                 │
│  On-chain gate integrated into the LendingPool              │
│  - Receives Allow/Review/Block from policy                 │
│  - Only callable by the protected protocol (onlyProtected)  │
│  - No custody of assets                                    │
└───────────────┬───────────────────────────────────────────┘
                │ ALLOW / BLOCK decision
                ▼
┌───────────────────────────────────────────────────────────┐
│          Protected Protocol (Milestones 1, 9)              │
│  - LendingPool (deposit/borrow/withdraw)                   │
│  - MockOracle (deliberately vulnerable)                     │
│  - ControlledCollateral (ERC20)                             │
└───────────────────────────────────────────────────────────┘
```

## Repository Structure

```
precursor/
├── packages/
│   └── contracts/          # Foundry project
│       ├── src/
│       │   ├── MockOracle.sol
│       │   ├── ControlledCollateral.sol
│       │   ├── SecurityController.sol
│       │   └── LendingPool.sol
│       ├── test/
│       │   ├── LendingPool.t.sol    # Unit + scenario tests
│       │   └── Adversarial.t.sol    # Adversarial / fail-safe tests
│       ├── script/        # Deployment scripts (to be added)
│       ├── foundry.toml
│       └── lib/
│           └── forge-std/
├── apps/
│   ├── web/              # Next.js frontend (Milestone 10)
│   └── api/              # Node.js API (Milestone 11-12)
├── packages/
│   ├── evm/             # EVM client / event ingestion
│   ├── behavior-engine/  # Rule-based behavior detection
│   ├── attack-analysis/  # Attack path reconstruction
│   ├── simulation/       # Anvil-based state simulation
│   ├── policy-engine/    # Deterministic ALLOW/REVIEW/BLOCK
│   └── shared/           # Common types, Zod schemas
├── tests/
│   ├── integration/
│   ├── adversarial/
│   └── fixtures/
├── docs/
│   ├── BUILD_ASSESSMENT.md
│   ├── THREAT_MODEL.md
│   └── architecture/
└── foundry.toml
```

## Data Flow

### Unprotected Run (Baseline)
```
Attacker wallet
    → deposit()           [tx 1: 100e18 collateral → pool]
    → borrow()            [tx 2: 75e18 debt at $1]
    → oracle.setPrice()   [tx 3: price → $1.80]
    → borrow()            [tx 4: 60e18 more at inflated price]
    → withdraw()          [tx 5: 100e18 collateral out]

Result: Attacker has 100e18 collateral + 135e18 debt.
Pool is undercollateralized. Attack succeeds.
```

### Protected Run (Defense)
```
Attacker wallet
    → deposit()           [tx 1]
    → borrow()            [tx 2]
    → oracle.setPrice()   [tx 3]

Off-chain behavior engine detects:
  - new wallet
  - oracle interaction
  - abnormal price movement
  - collateral state change
  - borrow + withdrawal attempt sequence

Behavior detection → HIGH confidence (85%)

Off-chain simulation (Anvil fork):
  - Execute hypothetical withdraw
  - Projected collateral value: $180 (inflated by manipulation)
  - Projected debt: $135
  - Ratio: 133% < 150% threshold
  - Invariant: VIOLATED

Policy engine:
  - behaviorFlagged = true, confidence = 85 > 70
  - Invariant violated
  - Decision: BLOCK

On-chain:
  → withdraw() → SecurityController.evaluateDefenseWithBehaviorEvidence()
    → returns Block("behavior-flagged sequence + invariant violation")
    → withdraw reverts

Result: Attacker's collateral remains in the pool. Attack blocked.
```

## Key Design Decisions

1. **Simulation is off-chain, decision is on-chain.** The Anvil fork runs the simulation and returns projected state values. The SecurityController makes the final BLOCK decision on-chain, where it's verifiable and deterministic.

2. **Oracle manipulation is the vulnerability.** The MockOracle has no TWAP or guards. This is the deliberate attack surface for V1.

3. **The controller is opt-in.** The LendingPool must explicitly call `setSecurityController()`. This makes the trust assumption visible and auditable.

4. **The invariant is narrow.** `collateralValue / debtValue >= 150%`. This is the only invariant in V1. It's specific to the collateralized lending scenario.

5. **Behavior flags amplify but don't replace.** The behavior engine can flag sequences, but the final decision is on the invariant check. This avoids false blocks from behavior false positives.

## Trust Model

- The defense engine (off-chain) is trusted to provide accurate projected state values.
- The SecurityController (on-chain) is the enforcement point. Only the LendingPool can call it.
- The LendingPool owner can disable the controller — this is an accepted V1 trust assumption, documented in THREAT_MODEL.md.
- No custody of assets. The controller cannot move funds; it only returns ALLOW/BLOCK.
