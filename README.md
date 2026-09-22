# Precursor

Precursor is a behavior-first, pre-transaction DeFi defense system that detects predatory transaction sequences, simulates invariant impact before withdrawal, and blocks unsafe actions via an on-chain `SecurityController` gate.

## What this project does

Precursor monitors EVM event streams, detects high-confidence attack sequences such as deposit → borrow → oracle manipulation → phantom borrow, simulates the post-transaction state against collateralization invariants, and enforces a deterministic block decision before collateral can be withdrawn.

## Core architecture

- Smart contracts in `packages/contracts`
- Shared types and schemas in `packages/shared`
- EVM ingestion and event decoding in `packages/evm`
- Behavioral sequence detection in `packages/behavior-engine`
- Attack path reconstruction in `packages/attack-analysis`
- Simulation and invariant evaluation in `packages/simulation`
- Policy gating in `packages/policy-engine`
- API and investigation UI in `apps/api` and `apps/web`

## Security model

The system follows a fail-closed pattern:

- advisory engines explain and classify behavior
- deterministic policy logic validates the result
- on-chain contract logic enforces the final decision

Never use unverified heuristic output to move funds or sign transactions directly.

## Required setup

1. Install Node.js and npm.
2. Install Foundry (`forge`, `cast`, `anvil`).
3. Copy `.env.example` to a real env file and fill in deployment values.
4. Start a local chain for testing:

```bash
anvil -p 8555
```

5. Set the environment variables for the API and contract addresses.

## Local development

```bash
npm install
npm run build
npm run verify
npm run dev:api
```

You can also run the contract suite directly:

```bash
cd packages/contracts
forge test
```

## Production deployment checklist

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md).

## Environment variables

A minimal template is in [.env.example](.env.example).

Required production values include:

- `NODE_ENV`
- `PORT`
- `RPC_URL`
- `CHAIN_ID`
- `LENDING_POOL`
- `ORACLE`
- `COLLATERAL`
- `SECURITY_CONTROLLER`
- `PRECURSOR_API_KEY`

## Verification

The project’s release standard is:

```bash
npm run verify
```

This runs:

- TypeScript typecheck
- Vitest unit and integration tests
- Foundry contract tests
- monorepo build

## Operator notes

- Use the API only with a valid `X-Precursor-Key` header.
- Treat all contract addresses as deployment-critical values.
- Do not expose production secrets in source control or logs.
- If the simulation layer is unavailable, the policy gate fails closed.

## Project structure

```text
apps/
  api/
  web/
docs/
packages/
  attack-analysis/
  behavior-engine/
  contracts/
  evm/
  policy-engine/
  shared/
  simulation/
```
