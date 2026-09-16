# Build Assessment

## Status: Milestones 1-9 Complete

### Repository State

- **Location**: `C:\Users\tajud\desktop\hack\precursor`
- **Structure**: Greenfield — no prior codebase. Repository was empty.
- **Tooling**: Foundry v1.8.3 installed (forge, cast, anvil). Node.js/Python available.

### What Was Built (Milestone 1)

1. **MockOracle** (`src/MockOracle.sol`) — Single-price oracle with no TWAP, no deviation guard. `setPrice()` is unrestricted, simulating an oracle-manipulation attack surface.

2. **ControlledCollateral** (`src/ControlledCollateral.sol`) — ERC20 with mint/burn for test setup. No access control on mint (deliberate — this is test infrastructure).

3. **SecurityController** (`src/SecurityController.sol`) — Opt-in defense gate with a 150% collateralization invariant. Returns Allow/Review/Block decisions with evidence. The `onlyProtected` modifier ensures only the integrated LendingPool can call it.

4. **LendingPool** (`src/LendingPool.sol`) — Minimal lending protocol with deposit/borrow/withdraw. The vulnerability: withdraw trusts the oracle price without guards. When the controller is armed, withdraw delegates to it for a deterministic block decision.

### Vulnerabilities Introduced (Deliberate)

| Contract | Vulnerability | Purpose |
|---|---|---|
| MockOracle | Unrestricted `setPrice` | Oracle manipulation entry point |
| LendingPool | No invariant check on withdraw when unprotected | Demonstrates the attack succeeds without defense |
| LendingPool | `totalCollateral` tracking uses `userCollateral` values | Simulated value can be inflated by oracle manipulation |

### Attack Scenario (Reproducible)

1. Attacker deposits 100e18 collateral ($100 at $1/token)
2. Borrow capacity = $75 (75% factor)
3. Attacker borrows 75e18
4. Attacker manipulates oracle to $1.80
5. Collateral now values $180, capacity = $135
6. Attacker borrows 60e18 more
7. Attacker attempts to withdraw full collateral (100e18)

**Unprotected**: Withdraw succeeds — attacker walks away with 100e18 collateral.

**Protected**: SecurityController receives projected state ($180 collateral / $135 debt = 133% < 150% threshold), behavior flag is high (85), returns Block.

### Test Results

```
17 tests passed, 0 failed, 0 skipped
```

- 11 contract tests (LendingPoolTest.sol)
- 6 adversarial tests (Adversarial.t.sol)

### What Was NOT Built

- Frontend UI (deferred to Milestone 2)
- Off-chain behavior engine (simulation is done by passing projected values to the controller)
- EVM event ingestion (tests call contracts directly)
- Policy engine beyond the SecurityController's built-in rules
- No secrets, no fake metrics, no cross-chain claims

### Dangerous Assumptions Identified

1. **Oracle trust**: The system assumes the defense engine's projected values are accurate. If the simulation is wrong, the block decision may be wrong.
2. **Single price point**: The oracle has no TWAP, making manipulation trivial in the controlled scenario.
3. **Controller access**: In V1, the LendingPool owner can enable/disable the controller freely. Production would require governance.
4. **No gas limits on detection**: The on-chain check is cheap, but the off-chain simulation pipeline must run before the tx is mined — this is the core timing challenge for the full system.

### Next Steps

DONE — End-to-end proof demonstrated:

```
=== UNPROTECTED Scenario ===
Controller: DISABLED
Attack succeeded: true

=== PROTECTED Scenario ===
Controller: ENABLED
Attack succeeded: false

=== Comparison ===
{
  "unprotected": { "attackSucceeded": true },
  "protected": { "attackSucceeded": false },
  "defenseWorks": true
}
```

- Milestone 10: Investigation UI (Next.js — deferred)
