# Threat Model

## Scope

V1 of the DeFi Attack-Behavior Defense Infrastructure protects a single controlled lending protocol on a single EVM environment against a single primary attack scenario: oracle-manipulation leading to collateral-valuation inflation and unauthorized withdrawal.

## Assets

| Asset | Description |
|---|---|
| **Collateral tokens** (ControlledCollateral/DCC) | Deposited by users as collateral in the lending pool. |
| **Borrowing capacity** | Derived from collateral value * oracle price * borrow factor. |
| **Protocol solvency** | The pool must remain solvent: total collateral value >= total debt * min ratio. |
| **Defense integrity** | The SecurityController must accurately predict whether a withdraw would violate the invariant. |

## Threat Actors

### 1. Attacker (Primary)
- **Goal**: Drain more collateral than deposited by manipulating the oracle price.
- **Capability**: Full control of an EVM wallet, can call any public function on the oracle and lending pool.
- **Tactics**: Fund wallet → deposit collateral → borrow at fair price → manipulate oracle → borrow against phantom value → withdraw.
- **Mitigation**: SecurityController blocks the withdrawal when behavior is flagged and simulation predicts invariant violation.

### 2. Attacker (Sybil)
- **Goal**: Use multiple wallets to distribute activity and evade detection.
- **Capability**: Multiple funded wallets.
- **Mitigation**: Behavior engine detects the same oracle manipulation pattern regardless of wallet count. Each withdraw is independently evaluated.

### 3. Controller Disable Attacker
- **Goal**: If the protocol owner is compromised, disable the SecurityController and execute the attack.
- **Capability**: Control of the deployer/owner key.
- **Mitigation**: In V1 this is an accepted trust assumption (documented). The deployer is a test account. Production requires governance.

## Attack Surfaces

### Surface 1: Oracle Manipulation
- **Description**: MockOracle permits any address to call `setPrice()`.
- **Severity**: Critical (in the controlled scenario)
- **Mitigation**: In production, replace with a real TWAP oracle. In V1, the manipulation is the deliberate vulnerability being defended against.

### Surface 2: Invariant Bypass (Unprotected)
- **Description**: When SecurityController is disabled, `withdraw()` sends collateral without any invariant check.
- **Severity**: Critical
- **Mitigation**: The protocol should never disable the controller in production. The off-chain defense engine monitors for controller-disable events.

### Surface 3: Simulation Failure
- **Description**: If the off-chain simulation engine fails or produces incorrect projected values, the controller may make wrong decisions.
- **Severity**: High
- **Mitigation**: The system must fail safe. If simulation is unavailable, the policy should default to BLOCK (conservative). This is not yet implemented in V1 (the controller receives projected values from the caller) — a noted gap.

### Surface 4: False Positives
- **Description**: Legitimate large withdrawals may be blocked if behavior patterns match attack signatures.
- **Severity**: Medium
- **Mitigation**: The policy includes REVIEW (not just BLOCK) for borderline cases. Legitimate users with healthy invariants and no behavior flags are allowed.

### Surface 5: False Negatives
- **Description**: An attack that doesn't follow the known pattern may not be flagged.
- **Severity**: High
- **Mitigation**: V1 only protects against the known oracle-manipulation scenario. Future versions add more scenarios. This is an accepted V1 limitation.

## Trust Boundaries

```
Attacker (external)
    │
    ├── Oracle (unrestricted price setting) ← Trust Boundary 1
    │       (V1: deliberately vulnerable)
    │
    ├── LendingPool (deposit/borrow/withdraw)
    │
    └── SecurityController (evaluates invariant) ← Trust Boundary 2
            Only callable by LendingPool (onlyProtected modifier)
            Decision is deterministic on-chain
            Inputs come from off-chain simulation engine

Off-chain Defense Engine (simulated in tests)
    │
    ├── Behavior Engine → flags sequences
    ├── Simulation Engine → projected state values
    └── Policy Engine → maps to ALLOW/REVIEW/BLOCK

The defense engine is trusted to provide accurate projected values.
If it provides false safe values, the defense fails silently.
```

## Invariant

**Primary invariant**: `collateralValue / debtValue >= 150%` (or `>= MIN_COLLATERAL_RATIO_BPS` = 15000)

This must hold after any state transition. The SecurityController enforces it against the *simulated* (projected) state.

## Acceptance Criteria for V1 Security

1. The known attack scenario is blocked when the controller is enabled.
2. The same attack succeeds when the controller is disabled (proving the attack is real).
3. Legitimate user activity is not blocked (false positive rate = 0 for normal flows).
4. The controller only accepts calls from the protected protocol.
5. All decisions are explainable from on-chain evidence.
6. No fake protocol integrations, no fake threat network, no invented statistics.
