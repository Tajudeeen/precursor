# PROJECT.md — Precursor

Product-level context for engineers and operators working on the Precursor codebase.

## What we're building

**Precursor** is a behavior-first, pre-transaction DeFi defense infrastructure that stops economic and oracle-manipulation attacks before execution. Instead of reacting to bad state after funds are drained or relying on slow post-facto liquidations, Precursor monitors on-chain event sequences, detects predatory behavioral patterns (such as deposit $\to$ borrow $\to$ price manipulation $\to$ phantom borrow), simulates the terminal consequences against mathematical invariants (such as collateral-to-debt solvency ratios), and deterministically blocks malicious withdrawals at the smart contract level via an on-chain `SecurityController`.

## Context

- **Domain**: DeFi Security & Autonomous Defense Infrastructure
- **Chain**: EVM-compatible (Ethereum, Arbitrum, Base, local Anvil)
- **Status**: Precursor v0.2.0 Hardened Production Release
- **Stage**: Hardened Production Architecture with full test coverage

## Target users

1. **DeFi Protocols & Lending Pools**: Protocols that integrate the `SecurityController` hook on sensitive functions (`withdraw`, `borrow`, `liquidate`) to prevent economic exploit drain.
2. **Autonomous Keepers & Defense Relayers**: Automated defense keepers and relayers monitoring the mempool and blocks to simulate transaction outcomes and submit cryptographic defense evidence.
3. **Security Operations & Incident Responders**: Protocols and risk officers who monitor the Investigation UI for live threat intelligence, attack replay timelines, and economic savings metrics.

## Core problem

In standard DeFi architectures, protocols rely on spot oracles without behavioral awareness. An attacker can deposit collateral, borrow legitimate funds, manipulate an oracle in the same transaction or block, borrow against inflated phantom capacity, and withdraw their original collateral before any liquidation can trigger. By the time spot prices snap back, the protocol is left with bad debt.

Precursor solves this by evaluating the **entire transaction behavior sequence** and projecting the invariant impact *before* permitting withdrawal of collateral.

## Goals

1. **Deterministic Defense**: Zero heuristic drift in the execution path. Rule-based behavioral detection + math-grounded simulation + deterministic policy gating.
2. **On-Chain Enforcement**: The smart contract (`SecurityController`) validates the invariant and reverts fraudulent withdrawals (`WithdrawBlocked`).
3. **Forensic Observability**: Replay the attack step-by-step with state diffs, calculate exact value saved, and provide real-time pipeline telemetry.
4. **Advisory Threat Intelligence**: Use forensic analysis engines strictly for intent classification, forensic explanation, and threat summaries, never granting off-chain systems direct signing or fund-moving authority.

## Non-goals

- Not building a retail multi-currency wallet.
- Not replacing decentralized oracle networks (Precursor supplements oracles with behavioral invariant defense).
- Not building an off-chain centralized custody solution.

## Technical stack

- **Smart Contracts**: Solidity `^0.8.20`, Foundry (`forge`, `cast`, `anvil`)
- **Backend / Ingestion**: Node.js, TypeScript, Viem, Express, WebSocket (`ws`)
- **Engines**: Monorepo packages (`@precursor/shared`, `@precursor/evm`, `@precursor/behavior-engine`, `@precursor/attack-analysis`, `@precursor/simulation`, `@precursor/policy-engine`)
- **Frontend**: High-performance Next.js 15 App Router interface with responsive cyber-dark and warm editorial themes

## Important constraints

- Strict adherence to `SECURITY.md`: Advisory engines propose and explain; deterministic code validates; on-chain contracts enforce.
- All scripts must be cross-platform (Windows PowerShell and Unix Bash compatible).
- Continuous verification: `scripts/verify` must pass with zero failures.
