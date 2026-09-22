# Security Audit & Risk Register Report

**Standard:** `web3-senior-engineer-auditor`  
**Protocol:** Precursor (DeFi Attack-Behavior Defense Infrastructure)  
**Target Contracts:** `LendingPool.sol`, `SecurityController.sol`, `PriceOracle.sol`, `MockERC20.sol`  
**Off-Chain Engine:** `packages/behavior-engine`, `packages/attack-analysis`, `packages/simulation`, `packages/policy-engine`  
**Date:** 2026-09-20  
**Audit Mode:** Mode A — Security Audit & Deterministic Gate Review  

---

## 1. Risk Register

| Finding ID | Severity | Target / Location | Title | Status |
|---|---|---|---|---|
| **FINDING-01** | **CRIT** | `LendingPool.sol:218` | Missing Access Control on `disableSecurityController()` | **Resolved** |
| **FINDING-02** | **CRIT** | `LendingPool.sol:210` | Missing Access Control on `setSecurityController()` | **Resolved** |
| **FINDING-03** | **HIGH** | `SECURITY.md` / Off-Chain Gateway | Unrestricted Advisory Authority over Funds Barrier | **Resolved** |
| **FINDING-04** | **HIGH** | `LendingPool.sol:110` | Reentrancy Exposure on Collateral Withdrawal | **Resolved** |
| **FINDING-05** | **MED** | `packages/behavior-engine` | Oracle Spot Price Manipulation / Flash Velocity Vulnerability | **Resolved** |
| **FINDING-06** | **MED** | `packages/simulation` | Fail-Open Simulation State Exposure on RPC Outage | **Resolved** |
| **FINDING-07** | **LOW** | `scripts/verify.ts` / Monorepo | Cross-Package Declaration Mismatch in Monorepo CI | **Resolved** |
| **FINDING-08** | **INFO** | Protocol Architecture | Opt-In Security Controller vs Native Enshrinement | **Documented** |
| **FINDING-09** | **HIGH** | `LendingPool.sol` / `SecurityController.sol` | Unverified Caller-Supplied Debt & Simulation Arguments | **Resolved** |
| **FINDING-10** | **MED** | `LendingPool.sol:85, 147` | Total Collateral Valuation Accounting Distortion | **Resolved** |
| **FINDING-11** | **MED** | `LendingPool.sol` / Controller Interface | Unenforced `Decision.Review` Leaves Borderline Attacks Unmitigated | **Resolved** |
| **FINDING-12** | **LOW** | `packages/simulation/src/index.ts` | Simulation Fallback to Hardcoded Constants Outside Event Window | **Resolved** |
| **FINDING-13** | **INFO** | `MockOracle.sol` / `ControlledCollateral.sol` | Permissionless Mock Minting & Spot Price Setting in Test Harness | **Documented** |

---

## 2. Trust Boundary Diagram

```text
[ External Attacker / Arbitrageur ]
        |
        | (1) Submits atomic exploit bundle (Oracle Pump -> Borrow -> Drain)
        v
[ Mempool / RPC Provider (Anvil / Sepolia / Mainnet) ]
        |
        | (2) Emits raw EVM logs & pending transaction calldata
        v
[ Precursor EVM Ingestion Layer ] ──> [ Normalized Event Pipeline ]
        |                                       |
        |                                       v
        |                           [ Behavior Engine ]
        |                             - Flash loan detector
        |                             - Oracle velocity detector
        |                             - Liquidity skew detector
        |                                       |
        |                                       v
        |                           [ Attack Path Reconstruction ]
        |                             - DAG sequence tracking
        |                             - Anomaly score weighting
        |                                       |
        |                                       v
        |                           [ Simulation Sandbox Engine ]
        |                             - Anvil eth_call / state fork
        |                             - Projected debt / collateral
        |                             - Invariant delta evaluation
        |                                       |
        |                                       v
        |                           [ Deterministic Policy Engine ]
        |                             (STRICT GATE: Mathematical Invariants)
        |                             - Invariant breach -> REJECT
        |                             - Fallback on error -> FAIL-CLOSED
        |                                       |
        |        ┌──────────────────────────────┴──────────────────────────────┐
        |        v                                                             v
        |  [ Advisory Threat Analyzer ]                             [ Transaction Signer ]
        |    - Contextual forensics only                               - Deterministic calldata only
        |    - Read-only explanation                                   - NO external override keys
        |    - CANNOT override gate                                            |
        |                                                                      v
        |                                                            [ On-Chain Attestation ]
        |                                                              - Block hash + Reason
        |                                                              - Opt-in controller
        v                                                                      |
[ DeFi Protocol Smart Contracts ] <────────────────────────────────────────────┘
  - LendingPool.sol (Protected by onlyOwner + SecurityController)
  - PriceOracle.sol
  - MockERC20.sol
```

### Trust Boundary Invariants & Threat Model

1. **Boundary: Advisory Engine $\to$ Signer**:  
   *Threat:* Non-deterministic advisory drift or injection attempting to permit draining transactions.  
   *Invariant:* The advisory engine has **zero** signing authority. The deterministic policy engine evaluates boolean invariants (`isViolated`, `confidence >= 80%`, `borrowCapacityDelta`). Only verified deterministic rules can produce an execution payload.
2. **Boundary: RPC Node $\to$ Simulation Engine**:  
   *Threat:* RPC timeout, dropped connection, or provider outage during an active attack.  
   *Invariant:* The simulation engine enforces a strict **fail-closed** policy. If simulation cannot complete or times out, the action defaults to `REJECT_RISK_POLICY_FAIL` and reverts on-chain.
3. **Boundary: Caller $\to$ Smart Contract Admin Functions**:  
   *Threat:* Malicious actor invoking `disableSecurityController()` or `setSecurityController()`.  
   *Invariant:* Protected by `onlyOwner` modifier with two-step transferable ownership. Unauthorized callers revert immediately.

---

## 3. Code-Level Audit Checklist

> ⚠️ FINDING-01 · CRIT
>
> Contract: `packages/contracts/src/LendingPool.sol:218`  
> Title:     Missing access control on `disableSecurityController()`  
> Path:      `disableSecurityController()` was `external` without authorization modifier. An attacker could call `disableSecurityController()` immediately prior to an oracle manipulation sequence to bypass inspection.  
> Impact:    Complete bypass of security guarantees. Attacker can drain 100% of lending pool funds (~10,000 DCC).  
> Fix:       Applied `onlyOwner` modifier to `disableSecurityController()`. Added test `testUnauthorizedCannotDisableSecurityController` in adversarial suite.  
> Status:    Resolved  

> ⚠️ FINDING-02 · CRIT
>
> Contract: `packages/contracts/src/LendingPool.sol:210`  
> Title:     Missing access control on `setSecurityController()`  
> Path:      `setSecurityController(address)` was callable by any address, allowing an attacker to overwrite the security controller with a dummy contract that approves all transactions.  
> Impact:    Protocol takeover; unauthorized contracts can override invariant checks.  
> Fix:       Applied `onlyOwner` modifier and initialized deployer as owner in constructor. Added `transferOwnership(address)` with null-address check.  
> Status:    Resolved  

> ⚠️ FINDING-03 · HIGH
>
> Target:    `packages/policy-engine/src/index.ts` & System Boundary  
> Title:     Unrestricted Advisory Authority over Funds Boundary  
> Path:      Allowing an autonomous or advisory agent to directly sign or broadcast transactions creates non-deterministic exploit vectors.  
> Impact:    Adversarial calldata or unauthorized logic could trick an autonomous component into approving malicious withdrawals.  
> Fix:       Enforced architectural barrier: Advisory systems produce forensic context and threat explanations; deterministic `RiskPolicyEngine` evaluates hard mathematical invariants (`projectedDebt > collateralValue`). External advisory outputs cannot override deterministic policy decisions.  
> Status:    Resolved  

> ⚠️ FINDING-04 · HIGH
>
> Contract: `packages/contracts/src/LendingPool.sol:110`  
> Title:     Reentrancy Exposure on Collateral Withdrawal  
> Path:      `withdraw()` performs ERC20 token transfer to the caller. If the collateral token is an ERC777 or has transfer hooks, a reentrant call back into `borrow()` or `withdraw()` could bypass debt ratio checks.  
> Impact:    Double-withdrawal of collateral before debt invariant validation.  
> Fix:       State variables (`userCollateral[user]`) are decremented *before* the external token transfer (Checks-Effects-Interactions pattern). In addition, `SecurityController` verifies post-state invariants before allowing execution.  
> Status:    Resolved  

> ⚠️ FINDING-05 · MED
>
> Target:    `packages/behavior-engine/src/detectors/OracleVelocityDetector.ts`  
> Title:     Oracle Spot Price Manipulation / Flash Velocity Vulnerability  
> Path:      Spot price queries in the same block can be skewed by flash loans (e.g. inflating price 5x from 100 DCC to 500 DCC).  
> Impact:    Artificially inflated collateral valuation enables undercollateralized borrowing that leaves bad debt in the pool.  
> Fix:       Implemented `OracleVelocityDetector` measuring relative price jump ($\Delta P > 20\%$ within 1 block). Flagged observations trigger simulation of post-borrow health factor.  
> Status:    Resolved  

> ⚠️ FINDING-06 · MED
>
> Target:    `packages/simulation/src/index.ts`  
> Title:     Fail-Open Simulation State Exposure on RPC Outage  
> Path:      Simulation engine encountering an RPC timeout or unhandled exception could erroneously return a non-blocking verdict.  
> Impact:    Attacks slipping through during transient infrastructure degradation.  
> Fix:       Enforced fail-closed behavior: `try/catch` block catches simulation exceptions and emits an explicit `SIMULATION_FAILURE` decision with `level: CRITICAL` and `blocked: true`.  
> Status:    Resolved  

> ⚠️ FINDING-07 · LOW
>
> Target:    `packages/behavior-engine/tsconfig.json`, `packages/policy-engine/tsconfig.json`  
> Title:     Missing TypeScript Declaration Generation in Workspaces  
> Path:      `tsconfig.json` in child packages omitted `"declaration": true`, causing consumer packages to emit implicit `any` errors in strict CI mode.  
> Impact:    Static typechecking in CI fails to verify cross-package contracts.  
> Fix:       Enabled `"declaration": true` across all packages and added single-shot verification runner `scripts/verify.ts`.  
> Status:    Resolved  

> ⚠️ FINDING-08 · INFO
>
> Target:    Protocol Architecture  
> Title:     Opt-In Security Controller vs Native Enshrinement  
> Path:      Lending pool checks `address(securityController) != address(0)`. If unset or disabled, standard lending logic runs unshielded.  
> Impact:    Unprotected pools do not benefit from off-chain simulation or proactive blocking.  
> Fix:       Documented deployment checklist: production deployments must atomically configure `securityController` in deployment script `DeployV1.s.sol`.  
> Status:    Documented  

> ⚠️ FINDING-09 · HIGH
>
> Target:    `packages/contracts/src/LendingPool.sol` & `SecurityController.sol`  
> Title:     Unverified Caller-Supplied Debt & Simulation Arguments Allows Controller Bypass  
> Path:      `withdraw(withdrawAmount, projectedCollateralValue, projectedDebtValue, behaviorFlagged, behaviorConfidence)` accepts all simulation values from `msg.sender`. If an attacker with active debt supplies `projectedDebtValue = 0`, `SecurityController` evaluates "no debt exposure" and returns `Decision.Allow`.  
> Impact:    An attacker interacting directly with `LendingPool` without going through the Precursor gateway can bypass the controller.  
> Fix:       Enforced dual-layer check: `SecurityController` queries `protectedProtocol.userDebt(attacker)` and returns `Decision.Block` if caller submits zero or understated projected debt while holding an active on-chain debt obligation. Validated in `testAttackerWithDebtCannotBypassControllerWithZeroProjectedDebt`.  
> Status:    Resolved  

> ⚠️ FINDING-10 · MED
>
> Target:    `packages/contracts/src/LendingPool.sol:85, 147`  
> Title:     Total Collateral Valuation Accounting Distortion on Subsequent Operations  
> Path:      `deposit()` adds `_collateralValue(msg.sender)` (which evaluates total accumulated collateral) instead of the incremental deposit value. On `withdraw()`, `totalCollateral` is decremented after `userCollateral` is cleared, subtracting 0 on full withdrawals.  
> Impact:    `totalCollateral` diverges from true on-chain valuation, leading to distorted `getInvariant()` reporting.  
> Fix:       Refactored accounting to calculate valuation deltas strictly on `amount` deposited and `withdrawAmount` withdrawn. Validated in `testDepositAndWithdrawAccountingAccuracy`.  
> Status:    Resolved  

> ⚠️ FINDING-11 · MED
>
> Target:    `packages/contracts/src/LendingPool.sol:136` & `SecurityController.sol:114`  
> Title:     Unenforced `Decision.Review` Leaves Borderline Attacks Unmitigated On-Chain  
> Path:      `LendingPool` only blocks if `decision == Decision.Block`. When the collateral ratio is borderline (150% - 170%), `SecurityController` returns `Decision.Review`, which allows the transaction to execute immediately.  
> Impact:    Carefully calibrated attacks engineered to land slightly above the hard block threshold bypass the gate.  
> Fix:       `LendingPool.withdraw` now treats `Decision.Review` with fail-closed security, reverting with `WithdrawBlocked("withdrawal requires manual review...")`. Validated in `testWithdrawalUnderReviewIsBlocked`.  
> Status:    Resolved  

> ⚠️ FINDING-12 · LOW
>
> Target:    `packages/simulation/src/index.ts:159, 189, 218`  
> Title:     Simulation Engine Fallback to Hardcoded Constants Outside Event Window  
> Path:      If prior deposit or borrow events fall outside the sliding event window, `SimulationEngine` defaults to 100 DCC collateral and 135 DCC debt rather than reading state via RPC.  
> Impact:    Simulation precision degrades for multi-block attacks with long dwell times between setup and execution.  
> Fix:       Restricted baseline scenario defaults to run only when input on-chain state and events are completely undefined. Real positions strictly evaluate live balances.  
> Status:    Resolved  

> ⚠️ FINDING-13 · INFO
>
> Target:    `packages/contracts/src/MockOracle.sol` & `ControlledCollateral.sol`  
> Title:     Permissionless Mock Minting & Spot Price Setting in Test Harness  
> Path:      `MockOracle.setPrice` and `ControlledCollateral.mint` have no caller access control.  
> Impact:    Expected for local Anvil sandbox demonstrations; unsuitable for production deployments.  
> Mitigation: Enforce `onlyOwner` or migrate to live Chainlink oracle feeds for public network deployments.  
> Status:    Documented  

---

## 4. Deployment-Readiness Signal

```text
============================================================
              DEPLOYMENT READINESS SIGNAL
============================================================

                         ✓ PASS

  All CRIT (2/2), HIGH (3/3), and MED (4/4) findings have 
  been verified and resolved.
  
  - Smart Contracts: 20/20 Foundry tests passing (11 unit, 9 adversarial)
  - TypeScript Engine: 8/8 Vitest tests passing
  - Access Control: LendingPool owner controls verified
  - Evasion Resistance: Zero-debt exploit blocked on-chain
  - Accounting Integrity: Linear collateral valuation verified
  - Fail-Closed Gates: Review threshold blocked on-chain
  - Deterministic Policy Boundary: Hard math invariants strictly isolated
  - Gate Script: scripts/verify passing all 4 phases

============================================================
```
