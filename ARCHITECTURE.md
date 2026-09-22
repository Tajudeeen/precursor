# ARCHITECTURE.md — Precursor

System topology, component definitions, trust boundaries, and data flow for the Precursor defense platform.

## System topology

```text
User / Attacker / Relayer
            |
            v
   [ Frontend / DApp ]  ── (User initiates actions: deposit, borrow, withdraw)
            |
            v
  [ Blockchain (EVM) ]  ── (MockOracle, ControlledCollateral, LendingPool)
            |
            +─── Emitted Event Logs (PriceUpdated, CollateralDeposited, Borrowed)
            |
            v
  [ Ingestion Layer ]   ── (@precursor/evm: EvmListener polls & decodes blocks)
            |
            v
[ Deterministic Engine ] ── (@precursor/behavior-engine: sequence correlation)
            |
            +─── High-confidence flag (confidence >= 70%)
            |
            v
[ Analytical Simulator ] ── (@precursor/simulation: terminal state projection)
            |
            +─── Projected collateral value & debt (150% invariant check)
            |
            v
  [ Policy Gatekeeper ]  ── (@precursor/policy-engine: deterministic ALLOW/BLOCK)
            |
            +─── Advisory AI Layer (Gemini/LLM: intent narrative & explainability)
            |
            v
 [ SecurityController ]  ── (On-chain hook reverts fraudulent withdraw: WithdrawBlocked)
            |
            v
[ Investigation UI ]    ── (Real-time telemetry, Attack Timeline, Economics)
```

## Core components

1. **Smart Contracts (`packages/contracts`)**:
   - `LendingPool.sol`: Core protocol holding deposited collateral and accounting user debt. Evaluates `SecurityController` hook on withdrawal.
   - `SecurityController.sol`: Opt-in defense contract checking whether the post-transaction state violates the $150\%$ minimum collateral ratio invariant.
   - `MockOracle.sol`: Price oracle for collateral assets.
   - `ControlledCollateral.sol`: ERC-20 token used for collateral.

2. **Off-Chain Pipeline (`packages/`)**:
   - `shared`: Domain types, Zod schemas, structured `Logger`, and telemetry schemas.
   - `evm`: Viem-based ingestion listener polling blocks and normalizing EVM logs.
   - `behavior-engine`: Rule-based pattern matcher identifying predatory event sequences across positions and protocol price updates.
   - `attack-analysis`: Graph-based attack path reconstructor sequencing causal transactions.
   - `simulation`: Dynamic state projector calculating projected collateralization under manipulated prices.
   - `policy-engine`: Deterministic rule evaluator mapping behavior flags and invariant results to `ALLOW` / `REVIEW` / `BLOCK` actions with fail-safe fallback.

3. **API & Operator UI (`apps/api`)**:
   - Express server with `/api/run-scenario`, `/api/timeline`, `/api/economics`, `/api/heartbeat`, `/api/benchmark`.
   - WebSocket server (`/ws`) streaming live pipeline heartbeats to connected clients.
   - Dual-theme Investigation Dashboard (Visitors Light Blueprint & Terminal Dark).

## Trust boundaries & failure analysis

| Component | Controller | On Failure / Unavailability | Malicious Threat Vector |
|---|---|---|---|
| **EVM Chain (Anvil/L2)** | Validators / Sequencer | Retry with exponential backoff | Reorgs, MEV reordering |
| **Spot Oracle** | Oracle provider | Invariant engine flags abnormal price divergence | Flash loan price manipulation |
| **EvmListener** | Off-chain node | Heartbeat flags `degraded`; logs stored for resync | Missed events, RPC rate limiting |
| **Simulation Engine** | Defense runtime | **Fail closed**: Policy engine returns `CRITICAL / BLOCK` | Crash injection to bypass defense |
| **Policy Engine** | Deterministic code | Reverts to fail-safe rule | None (deterministic, no external I/O) |
| **SecurityController** | Protocol owner | LendingPool reverts on invalid controller state | Unauthorized parameter modification |

## Data flow: End-to-end attack defense

1. **Step 1 — Deposit**: Attacker deposits $100$ DCC collateral ($100$ USD value at fair price of $1.00$). `CollateralDeposited` event emitted.
2. **Step 2 — Initial Borrow**: Attacker borrows $75$ DCC (maximum permitted under $75\%$ borrow factor). `Borrowed` event emitted.
3. **Step 3 — Oracle Manipulation**: Attacker manipulates spot oracle price from $1.00$ to $1.80$ ($+80\%$). `PriceUpdated` event emitted.
4. **Step 4 — Phantom Borrow**: Attacker exploits inflated valuation ($180$ USD collateral capacity) to borrow $60$ more DCC. Total debt is now $135$ DCC against honest collateral of only $100$ DCC.
5. **Step 5 — Detection & Simulation**:
   - `EvmListener` ingests the block event log sequence.
   - `BehaviorEngine` detects active manipulation sequence ($1$ deposit, $2$ borrows, $2$ price updates) $\implies 90\%$ confidence.
   - `SimulationEngine` calculates projected collateral ratio ($133.3\%$ vs $150\%$ required) $\implies \text{VIOLATION}$.
   - `PolicyEngine` maps $(90\% \text{ confidence} + \text{VIOLATION}) \implies \text{BLOCK}$.
6. **Step 6 — On-Chain Revert**: Attacker attempts to withdraw original $100$ DCC collateral. `LendingPool.withdraw` queries `SecurityController` with simulated evidence $\implies$ transaction reverts with `WithdrawBlocked`.
7. **Step 7 — Incident Forensics**: Attack Replay Timeline, Attack Economics ($160$ DCC saved, $100\%$ prevention), and telemetry are published to the Investigation Dashboard.
