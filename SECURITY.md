# SECURITY.md — Precursor

Security guidelines, trust boundaries, and operating constraints for Precursor developers and autonomous agents.

## Off-limits files (never read into context, never edit, never log)

- `.env`, `.env.local`, `.env.production`
- Any private key file or keystore
- Production database credentials or API keys
- Any file listed in `.gitignore` under a `secrets/` or `keys/` path

Use `.env.example` to document required variables with placeholder values.

## The core rule for Autonomous Systems & Funds

Never let an unverified heuristic or advisory agent output move funds, sign a transaction, or change privileged protocol state directly. The required architecture is:

```text
Advisory Engine analyzes / explains
        ↓
Deterministic risk & policy engine validates
        ↓
Simulation & Invariant verification
        ↓
On-chain SecurityController gate
        ↓
Blockchain execution
```

Not:

```text
Advisory Output / Heuristic Guess
        ↓
Signer / Private key
        ↓
Blockchain execution
```

If a change would let unverified advisory output reach a transaction signer without passing through the deterministic policy and invariant verification layer, **stop and flag it**.

## Trust assumptions to keep explicit

1. **Oracle data**: Spot oracle prices can be manipulated atomically via flash liquidity, DEX pool imbalance, or multi-hop swaps. Precursor treats spot oracle prices as an untrusted state signal and correlates them with collateralization invariants.
2. **Behavioral evidence**: In V1, behavioral evidence is submitted alongside the transaction. The smart contract validates that projected debt cannot be lower than the user's actual on-chain debt obligation.
3. **Simulation availability**: If the simulation engine fails or becomes unreachable, the policy engine must **fail closed** (`CRITICAL / BLOCK`) for high-confidence threats rather than silently defaulting to `ALLOW`.
4. **Advisory Forensics layer**: Any diagnostic summaries or classifications are advisory and informational only. They are rendered in the investigation dashboard for human operators, but the smart contract gate only respects the deterministic verdict.
5. **Escape hatches & emergency controls**: Any controller bypass or timeout release mechanism is an attack surface. Admin functions to enable/disable or update controllers must be strictly protected by `onlyOwner` or timelocks.

## Permission tiers

- **Forbidden, always**: Production deploys, private key or secret extraction, destructive commands, disabling security controllers to "just test something."
- **Restricted, ask first**: Modifying contract permissions, changing dependencies, modifying CI/CD pipelines, altering signer logic.
- **Write, no need to ask**: Application code, tests, documentation, local verification scripts.

## Unsafe commands

Never run, suggest, or silently work around:

```bash
npm install --force
npm install --legacy-peer-deps
```

without first understanding and stating the actual dependency conflict.

## Vulnerability reporting

If you discover a vulnerability or security bypass in the smart contracts or defense pipeline, stop and report it immediately with a structured finding before making changes.
