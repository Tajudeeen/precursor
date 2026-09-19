# DeFi Attack-Behavior Defense Infrastructure
## V1 Build Plan

### Core thesis

DeFi security systems often evaluate transactions individually.

Attackers operate in sequences.

The product detects suspicious attack behavior, reconstructs the likely attack path, simulates the consequences against protocol state, and gives a protected protocol a deterministic way to respond before value moves.

The V1 proof is simple:

```text
attacker behavior
      ↓
behavior detection
      ↓
attack sequence
      ↓
state simulation
      ↓
invariant violation
      ↓
defense decision
      ↓
blocked
```

The system should prove this loop end to end.

Everything else is secondary.

---

# 1. Product definition

### Category

DeFi attack-behavior detection and defense infrastructure.

### Primary user

A DeFi protocol security team or smart-contract team.

### V1 promise

> Detect an attack while it is still a sequence of suspicious actions, prove its potential consequence through simulation, and enforce a deterministic defensive decision.

### V1 constraints

The first version deliberately supports:

- one EVM environment
- one protected protocol
- one primary attack scenario
- one secondary scenario if time permits
- deterministic detection
- deterministic simulation
- deterministic policy decisions
- one explicit security-controller integration
- a focused security investigation interface

The system does not need to support multiple chains, multiple real protocols, or a live threat-intelligence network to prove the thesis.

---

# 2. What the product actually does

The protected protocol produces activity.

The defense system observes that activity.

Instead of judging each transaction in isolation, it builds a behavioral sequence.

Example:

```text
new wallet
    ↓
funding
    ↓
oracle interaction
    ↓
failed contract calls
    ↓
abnormal state change
    ↓
collateral manipulation
    ↓
withdrawal attempt
```

The system then asks:

1. Is this sequence suspicious?
2. Which protocol components are involved?
3. What state changed?
4. What would happen if the sequence continued?
5. Which invariant would be violated?
6. What should the security policy do?

The answer must be explainable from evidence.

---

# 3. The primary security scenario

The first scenario should be an oracle-manipulation style attack against a controlled lending protocol.

The controlled protocol contains deliberately vulnerable logic.

The attacker performs a deterministic sequence.

The defense system observes it.

The system simulates the dangerous state transition.

The protocol's invariant is violated in simulation.

The defense controller rejects the dangerous operation.

### Target flow

```text
attacker
   ↓
funded wallet
   ↓
oracle interaction
   ↓
abnormal price state
   ↓
collateral valuation changes
   ↓
borrow capacity increases
   ↓
withdrawal becomes possible
   ↓
simulation predicts bad state
   ↓
invariant violation
   ↓
defense controller
   ↓
BLOCK
```

The scenario must be completely reproducible.

No real-world exploit weaponization is required.

---

# 4. What V1 is not

Do not build:

- generic AI security chat
- generic wallet tracker
- portfolio dashboard
- generic audit report generator
- generic risk-score product
- five-chain support
- Solana/Sui simulation
- browser extension
- mobile application
- token
- public threat network
- fake network participants
- broad security marketplace
- giant analytics dashboard
- unnecessary microservices
- AI-controlled enforcement

These don't strengthen the core proof.

---

# 5. Trust model

The system must be explicit about enforcement.

The platform does not custody user assets.

The platform does not hold private keys.

The platform does not secretly control arbitrary third-party protocols.

Instead, the protected protocol explicitly integrates a narrow security controller.

```text
Protected Protocol
       ↓
Security Hook
       ↓
Defense Controller
       ↓
Defense Engine
       ↓
ALLOW / BLOCK
```

The protocol chooses to trust the defense controller for a specific security operation.

For V1, that operation should be narrow.

For example:

```text
withdrawal
```

or:

```text
borrow
```

The defense system therefore has enforcement authority only because the demo protocol explicitly grants that authority.

This trust assumption must be visible in the architecture and explained to judges.

---

# 6. System architecture

V1 should use five major components.

```text
┌─────────────────────────────┐
│       Security UI           │
│  Protocol / Threat / Attack │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│          API                │
│   Control + Investigation   │
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
Behavior Engine    Attack Analysis
      │                 │
      └────────┬────────┘
               ▼
┌─────────────────────────────┐
│       EVM Simulation        │
│ State Diff + Asset Diff     │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│   Protected Protocol        │
│ + Security Controller       │
└─────────────────────────────┘
```

The architecture should remain modular.

Don't turn each box into a separate deployed service unless there is an actual reason.

---

# 7. Technology stack

Use boring technology.

### Frontend

- Next.js
- TypeScript
- Tailwind
- shadcn/ui or existing project component conventions

### Backend

- TypeScript
- Node.js
- existing repository conventions where appropriate

### Database

- PostgreSQL

### Blockchain

- EVM
- viem or ethers
- one selected testnet/local environment

### Contracts

- Solidity
- Foundry

### Simulation

- Anvil
- controlled EVM fork where appropriate

### Validation

- Zod or repository convention

### Testing

- Vitest/Jest
- Foundry
- Playwright where useful

### Observability

- structured logs
- basic metrics
- clear error handling

Do not introduce Kafka, Kubernetes, GraphQL, or a microservice fleet.

---

# 8. Repository strategy

Follow the existing repository conventions first.

If a modular structure is needed:

```text
apps/
  web/
  api/

packages/
  contracts/
  evm/
  behavior-engine/
  attack-analysis/
  simulation/
  policy-engine/
  shared/

tests/
  integration/
  adversarial/
  fixtures/

docs/
  architecture/
  threat-model/
  attack-scenarios/
```

Don't force this structure if the repository already has a stronger convention.

The architecture should serve the product, not the other way around.

---

# 9. Milestone 0 — Reconnaissance

Before implementation:

1. Read the existing `skill.md`.
2. Inspect the repository.
3. Inspect dependencies.
4. Understand the current architecture.
5. Inspect existing contracts.
6. Inspect deployment configuration.
7. Inspect testing conventions.
8. Identify reusable infrastructure.
9. Identify dangerous assumptions.
10. Create the implementation plan.

### Deliverables

```text
BUILD_ASSESSMENT.md
THREAT_MODEL.md
ARCHITECTURE.md
IMPLEMENTATION_PLAN.md
```

Do not start major frontend work here.

Do not start AI work here.

Do not add dependencies without a reason.

---

# 10. Milestone 1 — Controlled vulnerable protocol

Build the protocol that the defense system will protect.

The protocol should contain one deliberately controlled vulnerability.

The preferred scenario is an oracle/collateral manipulation path.

Potential components:

```text
LendingPool
Oracle
CollateralToken
BorrowAsset
SecurityController
```

The vulnerability must be deterministic.

The purpose is to prove the security system, not to create an unrestricted exploit kit.

### Requirements

- Solidity contracts
- unit tests
- deployment script
- deterministic test accounts
- initial liquidity
- known invariant
- known vulnerable behavior
- known successful attack path

---

# 11. Define the invariant

The invariant is central.

For example:

```text
collateral value / debt value >= required ratio
```

or:

```text
borrow capacity <= valid collateral value
```

The invariant must be measurable.

The system should be able to evaluate:

```text
BEFORE
invariant = PASS

SIMULATED STATE
invariant = VIOLATED
```

This gives the system something concrete to prove.

Avoid vague statements like:

> "The transaction looks dangerous."

Instead:

> "The simulated state violates the protocol's collateralization invariant."

---

# 12. Milestone 2 — Controlled attacker simulator

Build a deterministic scenario runner.

It should execute predefined attacker actions.

Example:

```text
Scenario: ORACLE_MANIPULATION_001

1. Create attacker wallet
2. Fund attacker
3. Interact with oracle
4. Trigger price deviation
5. Interact with lending pool
6. Attempt abnormal withdrawal
```

The simulator should produce:

- transaction hashes
- timestamps
- addresses
- contract interactions
- function calls
- events
- state changes
- final result

### Two required modes

```text
UNPROTECTED
```

and:

```text
PROTECTED
```

The unprotected run establishes the baseline.

The protected run demonstrates the defense.

This comparison is critical.

---

# 13. Milestone 3 — EVM event ingestion

Now build observation.

```text
RPC
 ↓
Block / transaction listener
 ↓
Event decoder
 ↓
Normalizer
 ↓
Storage
```

Normalize the important information:

```text
chain
block
transaction
timestamp
from
to
contract
function
event
parameters
gas
status
```

The rest of the system should never need to understand raw RPC-specific structures.

---

# 14. Milestone 4 — Behavioral engine

This is the central differentiator.

The system should create a behavioral profile around an address.

Example:

```text
Wallet
0xABC...

Interactions: 8
Contracts touched: 4
Failed calls: 2
Oracle interactions: 2
Lending interactions: 3
First seen: 3 minutes ago
```

Then construct sequences.

```text
funding
 ↓
oracle interaction
 ↓
failed probe
 ↓
price change
 ↓
borrow attempt
 ↓
withdrawal attempt
```

The engine should detect meaningful sequences rather than blindly scoring transactions.

---

# 15. Deterministic detection

V1 should not depend on machine learning.

Start with explicit behavioral rules.

For example:

```text
IF

new address
+
recent funding
+
oracle interaction
+
abnormal price movement
+
collateral state change

THEN

create suspicious behavior observation
```

Each detection should contain evidence.

```text
Detection
├── pattern
├── address
├── events
├── contracts
├── sequence
├── confidence
└── timestamp
```

Confidence should be evidence-based.

Avoid meaningless:

```text
Risk Score: 94
```

Prefer:

```text
Confidence: HIGH

Evidence:
- 5 related interactions
- 2 failed probes
- abnormal oracle state
- collateral valuation changed
```

---

# 16. Milestone 5 — Attack-path engine

Take the behavioral evidence and reconstruct the likely attack path.

Example:

```text
Wallet
 ↓
Oracle
 ↓
Price State
 ↓
Collateral
 ↓
Borrow Capacity
 ↓
Withdrawal
```

The system should explain why the path matters.

Example:

> The attacker altered the price state used to value collateral. The simulated valuation increased borrowing capacity beyond the intended collateralization threshold.

The attack-path engine should combine:

- transaction sequence
- protocol components
- state changes
- invariant relationships
- simulation results

It does not need to solve arbitrary attack graphs.

It needs to reconstruct the controlled scenario reliably.

---

# 17. Milestone 6 — Simulation engine

This is the technical centerpiece.

When suspicious behavior appears:

```text
Observed sequence
      ↓
simulation environment
      ↓
execute hypothetical continuation
      ↓
capture state
      ↓
compare state
```

Capture:

- token balance changes
- relevant storage changes
- collateral changes
- debt changes
- oracle changes
- liquidity changes
- invariant results

Produce:

```text
EXPECTED STATE

Collateral: $100,000
Debt capacity: $75,000

SIMULATED STATE

Collateral: $180,000
Debt capacity: $135,000

RESULT

Collateralization invariant: VIOLATED
```

The values must come from the controlled environment.

Never hardcode impressive numbers into the UI.

---

# 18. State diff

The simulation should produce a structured state difference.

```text
StateDiff

oracle.price
  before: 100
  after: 180

collateralValue
  before: 100000
  after: 180000

borrowCapacity
  before: 75000
  after: 135000
```

This is far more useful than a generic risk score.

The operator should be able to understand what changed.

---

# 19. Asset diff

Track meaningful value movement.

```text
AssetDiff

Attacker:
  +$X borrowable assets

Protocol:
  -$X available liquidity
```

Again, derive this from simulation.

Don't invent financial exposure.

If the controlled environment uses test assets, label them accordingly.

---

# 20. Invariant evaluation

After simulation:

```text
state transition
      ↓
invariant engine
      ↓
PASS / WARNING / VIOLATION
```

For V1, support only the invariants needed by the controlled protocol.

Don't build a universal invariant language.

Example:

```text
Invariant:
borrow capacity must not exceed valid collateral capacity

Result:
VIOLATION

Evidence:
simulated collateral valuation changed without corresponding
economic collateral increase
```

---

# 21. Milestone 7 — Policy engine

The policy engine turns evidence into a deterministic decision.

Keep it small.

```text
NORMAL
ELEVATED
HIGH
CRITICAL
```

Example:

```text
NORMAL
→ allow

ELEVATED
→ monitor

HIGH
→ require additional verification

CRITICAL
→ block protected operation
```

The exact policy should depend on the controlled protocol.

Every decision must be explainable.

```text
Decision:
BLOCK

Reason:
simulation predicts invariant violation

Evidence:
attack sequence + state diff + invariant failure
```

---

# 22. AI boundary

AI may be added as an investigation assistant.

It can explain:

- what happened
- why the sequence is suspicious
- which contracts were involved
- what the simulation showed
- what evidence supports the decision

AI must not decide whether funds move.

The enforcement pipeline remains:

```text
events
 ↓
behavior rules
 ↓
attack analysis
 ↓
simulation
 ↓
invariant
 ↓
deterministic policy
 ↓
ALLOW / BLOCK
```

AI sits beside this pipeline.

Not inside the critical decision path.

---

# 23. Milestone 8 — Security controller

The controlled protocol integrates the defense mechanism.

Example:

```solidity
beforeSensitiveAction(...)
```

The controller asks the defense policy for a decision.

```text
ALLOW
REVIEW
BLOCK
```

For V1, use one sensitive operation.

Prefer:

```text
withdraw()
```

or:

```text
borrow()
```

Don't build a universal protocol firewall.

---

# 24. Security controller trust model

The protocol explicitly opts into the controller.

The documentation should state:

```text
The defense platform does not custody assets.

The protected protocol voluntarily grants a narrow
security permission to its defense controller.

The controller can only affect the protected operation
defined by the protocol integration.
```

This makes the trust assumption explicit.

---

# 25. Milestone 9 — Protected vs unprotected proof

This becomes the most important demo.

### Run A

```text
UNPROTECTED

attacker
 ↓
attack sequence
 ↓
protocol state manipulated
 ↓
withdrawal succeeds
```

### Run B

```text
PROTECTED

attacker
 ↓
attack sequence
 ↓
behavior detected
 ↓
simulation
 ↓
invariant violated
 ↓
policy = BLOCK
 ↓
withdrawal rejected
```

The same controlled attack should be used in both runs.

This gives the judges a direct comparison.

---

# 26. Milestone 10 — Investigation UI

Only after the security loop works should the polished frontend be built.

Keep navigation small:

```text
Overview
Protocol
Threats
Investigations
```

That's enough.

---

# 27. Overview

The overview should answer:

- Is the protocol protected?
- Is there an active threat?
- What changed?
- What requires attention?

Example:

```text
PROTECTION STATUS
ACTIVE

ACTIVE THREAT
1

LATEST DETECTION
Oracle manipulation sequence

DEFENSIVE STATE
CRITICAL

ACTION
Withdrawal blocked
```

Avoid decorative charts.

Every element should help investigate or operate the system.

---

# 28. Protocol screen

Show the security model.

```text
Protocol
Chain
Contracts
Assets
Oracle
Security Controller
Invariants
Current defensive state
```

The important thing is understanding what the system is protecting.

Don't build a giant protocol analytics dashboard.

---

# 29. Threat screen

The threat screen should explain the evidence.

```text
ORACLE MANIPULATION SEQUENCE

Confidence: HIGH

Evidence:
5 related interactions
2 failed probes
1 abnormal oracle change
1 collateral state deviation

Potential consequence:
Borrow capacity exceeds valid collateral capacity.

Simulation:
INVARIANT VIOLATED

Policy:
BLOCK
```

The user should understand the threat without reading raw blockchain data.

---

# 30. Investigation screen

This is the most important UI.

The investigation should tell a story:

```text
WHAT HAPPENED
      ↓
WHY IT MATTERS
      ↓
WHAT WOULD HAPPEN
      ↓
WHAT THE SYSTEM DID
```

Include:

### Timeline

```text
12:01:02
Wallet funded

12:01:08
Oracle interaction

12:01:11
Failed probe

12:01:14
Abnormal price state

12:01:17
Withdrawal attempt

12:01:18
Simulation started

12:01:19
Invariant violated

12:01:20
Withdrawal blocked
```

### Attack path

```text
Wallet
 ↓
Oracle
 ↓
Collateral
 ↓
Borrow capacity
 ↓
Withdrawal
```

### Simulation

Show before/after values.

### Decision

Show:

```text
BLOCK
```

and the exact reason.

---

# 31. No fake threat network

Do not build the Scene 9 network from the old plan.

Don't claim:

```text
3 protocols notified
```

unless three actual protocol integrations exist.

For V1, stop at:

```text
Threat pattern generated
```

A future version can distribute that pattern to other protocols.

The data model can be designed with that future use in mind, but the hackathon demo must only show what exists.

---

# 32. No generalized tripwire system

Tripwires are removed from V1.

The behavior engine already gives us:

- funding activity
- contract interactions
- failed calls
- abnormal state changes
- attack sequences

That is enough evidence.

A future version can add defensive canaries as another signal source.

It doesn't belong in the critical path now.

---

# 33. No cross-chain claim

V1 is EVM.

The system can have clean internal interfaces, but it should not claim that the same simulation engine works across Ethereum, Solana, Sui, and other execution environments.

A future architecture may add:

```text
EVMAdapter
SolanaAdapter
SuiAdapter
```

But simulation semantics will be chain-specific.

Don't hide that complexity behind an interface and pretend the hard part disappeared.

---

# 34. Testing strategy

Testing should prove the security loop.

### Contract tests

Test:

- vulnerable behavior
- invariant
- security controller
- blocked operation
- allowed operation

### Behavior tests

Test:

- normal activity
- suspicious sequence
- incomplete sequence
- duplicate events
- failed calls
- unrelated transactions

### Simulation tests

Test:

- expected state
- simulated state
- state diff
- asset diff
- invariant violation

### Policy tests

Test:

```text
NORMAL → ALLOW
ELEVATED → MONITOR
HIGH → REVIEW
CRITICAL → BLOCK
```

### Integration test

The complete path:

```text
attacker
→ transaction
→ ingestion
→ behavior detection
→ attack path
→ simulation
→ invariant
→ policy
→ protocol controller
→ blocked operation
```

This test should exist before the polished UI.

---

# 35. Adversarial testing

Try to break the defense.

Test:

- duplicate events
- missing events
- stale RPC responses
- simulation failure
- malformed data
- alert flooding
- legitimate large transactions
- legitimate oracle updates
- repeated attacker attempts
- false positives
- false negatives
- policy misconfiguration
- controller failure

The system should fail safely.

If simulation fails, it should not silently claim:

```text
SAFE
```

The operator should see:

```text
SIMULATION UNAVAILABLE
```

and the policy should follow an explicitly defined fallback.

---

# 36. Benchmarking

Measure only things that the controlled environment can prove.

Required metrics:

### Detection latency

```text
first relevant event
→ detection
```

### Simulation latency

```text
detection
→ simulation result
```

### Defense latency

```text
detection
→ policy decision
```

### Attack outcome

```text
unprotected:
attack succeeds

protected:
attack blocked
```

### False positives

Run legitimate transactions and measure unnecessary intervention.

Do not invent impressive numbers.

Every number shown in the pitch should come from an actual test run.

---

# 37. Demo sequence

The final demo should take the judge through one story.

### Scene 1 — Protection

```text
PROTOCOL
Protected

Security Controller
Active

Invariant
Healthy
```

### Scene 2 — Attack begins

The controlled attacker starts executing the scenario.

The system initially collects evidence.

### Scene 3 — Behavior detected

```text
SUSPICIOUS BEHAVIOR

Oracle interaction
+
abnormal state transition
+
collateral change
+
withdrawal attempt
```

### Scene 4 — Attack path

```text
WALLET
 ↓
ORACLE
 ↓
PRICE STATE
 ↓
COLLATERAL
 ↓
BORROW CAPACITY
 ↓
WITHDRAWAL
```

### Scene 5 — Simulation

```text
SIMULATION RESULT

Expected state
$100K collateral

Simulated state
$180K collateral

Invariant
VIOLATED

Potential consequence
Abnormal borrowing capacity
```

### Scene 6 — Policy

```text
DEFENSIVE STATE
CRITICAL

DECISION
BLOCK

REASON
Invariant violation predicted
```

### Scene 7 — Protocol response

The withdrawal fails.

### Scene 8 — Comparison

Run the same scenario against the unprotected protocol.

Show that it succeeds.

Then show the protected run again.

That is the payoff.

---

# 38. What makes the project different

The differentiation should not be:

> AI-powered DeFi security.

That is too broad.

The differentiation is:

> **Behavior-first defense.**

The system treats an attack as a sequence.

The sequence is connected to protocol state.

The protocol state is simulated.

The consequence is measured against invariants.

The policy responds to evidence.

The core loop is:

```text
BEHAVIOR
   ↓
ATTACK PATH
   ↓
STATE CONSEQUENCE
   ↓
INVARIANT
   ↓
DEFENSE
```

That's the product.

---

# 39. Future roadmap

The old broader architecture should become the future roadmap rather than the V1 requirement.

### V1

```text
1 EVM
1 protocol
1 primary attack
behavior detection
attack path
simulation
invariants
policy
security controller
control room
```

### V2

```text
more attack scenarios
more protocol types
more invariants
better behavioral models
```

### V3

```text
multiple protocol integrations
threat pattern sharing
cross-protocol intelligence
```

### V4

```text
additional execution environments
chain-specific adapters
chain-specific simulation
```

### V5

```text
large-scale attack behavior intelligence network
```

The network effect becomes something earned through real integrations.

---

# 40. Startup thesis

The long-term startup story remains bigger than V1.

Every protected protocol produces security telemetry.

Security telemetry creates behavioral patterns.

Behavioral patterns become reusable intelligence.

Reusable intelligence can eventually protect other protocols.

```text
Protocol
   ↓
Security telemetry
   ↓
Behavior pattern
   ↓
Attack intelligence
   ↓
Detection
   ↓
Simulation
   ↓
Defense
```

But V1 only needs to prove the first complete loop.

---

# 41. Definition of done

The project is ready when all of these are true.

### Core

- [ ] Controlled vulnerable protocol exists
- [ ] Primary attack scenario is deterministic
- [ ] Attack succeeds against the unprotected protocol
- [ ] EVM activity is ingested
- [ ] Behavioral sequence is reconstructed
- [ ] Suspicious behavior is detected
- [ ] Attack path is generated
- [ ] Simulation executes
- [ ] State diff is produced
- [ ] Asset impact is produced
- [ ] Invariant violation is detected
- [ ] Deterministic policy is generated
- [ ] Security controller receives the decision
- [ ] Protected operation is blocked
- [ ] Same attack succeeds without defense
- [ ] Same attack is blocked with defense

### Engineering

- [ ] Contract tests pass
- [ ] Backend tests pass
- [ ] Integration test passes
- [ ] Failure states are handled
- [ ] No secrets in frontend
- [ ] No fake security results
- [ ] No hardcoded benchmark claims
- [ ] Logs are structured
- [ ] Build passes
- [ ] Deployment works

### Product

- [ ] Overview works
- [ ] Protocol view works
- [ ] Threat view works
- [ ] Investigation view works
- [ ] Attack path is understandable
- [ ] Simulation result is understandable
- [ ] Policy decision is understandable
- [ ] Protected vs unprotected demo works

### Pitch integrity

- [ ] No fake users
- [ ] No fake protocol integrations
- [ ] No fake threat network
- [ ] No unsupported cross-chain claims
- [ ] No AI-controlled enforcement claims
- [ ] No invented security statistics
- [ ] Trust assumptions are explicit

---

# 42. Hard scope rule

At every implementation decision, ask:

> Does this make the attack detection → simulation → defense loop more convincing?

If yes, consider building it.

If no, defer it.

This applies even when the feature sounds impressive.

A beautiful dashboard cannot compensate for a weak detection pipeline.

A second blockchain cannot compensate for a broken simulation.

An AI agent cannot compensate for an unproven security decision.

A threat network cannot compensate for having no real participants.

---

# 43. Final architecture

The complete V1 should be small enough to understand in one diagram:

```text
                     ┌─────────────────────┐
                     │    SECURITY UI      │
                     │                     │
                     │ Overview            │
                     │ Protocol            │
                     │ Threat              │
                     │ Investigation       │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │        API          │
                     └──────────┬──────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
        ┌─────────────────┐          ┌─────────────────┐
        │ Behavior Engine │          │ Attack Analysis │
        └────────┬────────┘          └────────┬────────┘
                 │                            │
                 └─────────────┬──────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  EVM SIMULATION     │
                    │                     │
                    │ State Diff          │
                    │ Asset Diff          │
                    │ Invariants          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   POLICY ENGINE     │
                    │                     │
                    │ ALLOW / REVIEW      │
                    │ BLOCK               │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ SECURITY CONTROLLER │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ PROTECTED PROTOCOL  │
                    └─────────────────────┘
```

---

# 44. The one sentence to remember

> **We detect attacks as behavior sequences, simulate where those sequences lead, and stop the protocol before the predicted state becomes reality.**

That's the V1.

Everything else is the future.