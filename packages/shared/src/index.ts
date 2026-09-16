/**
 * Shared types for the precursor defense infrastructure.
 * These mirror the Solidity contracts and provide the glue between
 * the EVM ingestion layer, the behavior engine, the simulation engine,
 * and the policy engine.
 */

import { z } from 'zod';

// =====================================================
// Core Domain Types
// =====================================================

/**
 * Normalized EVM event/transaction record.
 * The rest of the system never deals with raw RPC structures.
 */
export const NormalizedEventSchema = z.object({
  chain: z.string(),
  blockNumber: z.number(),
  blockHash: z.string().length(66),
  transactionHash: z.string().length(66),
  transactionIndex: z.number(),
  logIndex: z.number(),
  timestamp: z.number(),
  from: z.string().length(42),
  to: z.string().length(42),
  contractAddress: z.string().length(42),
  eventName: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  gas: z.number(),
  gasUsed: z.number().optional(),
  status: z.enum(['success', 'revert']),
  functionName: z.string().optional(),
});

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

/**
 * Behavioral profile for an address.
 * Built from normalized events over a time window.
 */
export const BehavioralProfileSchema = z.object({
  address: z.string().length(42),
  firstSeen: z.number(),
  lastSeen: z.number(),
  totalInteractions: z.number(),
  contractsTouched: z.array(z.string()),
  failedCalls: z.number(),
  oracleInteractions: z.number(),
  lendingInteractions: z.number(),
  uniqueFunctionsCalled: z.array(z.string()),
  events: z.array(NormalizedEventSchema),
});

export type BehavioralProfile = z.infer<typeof BehavioralProfileSchema>;

/**
 * A detected suspicious behavior observation.
 */
export const BehaviorObservationSchema = z.object({
  pattern: z.string(),
  address: z.string().length(42),
  events: z.array(z.string()), // event names or tx hashes
  contracts: z.array(z.string()),
  sequence: z.array(z.object({
    event: z.string(),
    timestamp: z.number(),
    details: z.string(),
  })),
  confidence: z.number().min(0).max(100),
  confidenceEvidence: z.array(z.string()),
  timestamp: z.number(),
});

export type BehaviorObservation = z.infer<typeof BehaviorObservationSchema>;

/**
 * Reconstructed attack path from behavior evidence.
 */
export const AttackPathSchema = z.object({
  attacker: z.string().length(42),
  steps: z.array(z.object({
    step: z.number(),
    description: z.string(),
    component: z.string(),
    stateChange: z.string().optional(),
  })),
  summary: z.string(),
  confidence: z.number().min(0).max(100),
});

export type AttackPath = z.infer<typeof AttackPathSchema>;

/**
 * State diff from simulation.
 */
export const StateDiffEntrySchema = z.object({
  key: z.string(),
  before: z.string(),
  after: z.string(),
});

export type StateDiffEntry = z.infer<typeof StateDiffEntrySchema>;

export const StateDiffSchema = z.object({
  entries: z.array(StateDiffEntrySchema),
});

export type StateDiff = z.infer<typeof StateDiffSchema>;

/**
 * Asset/value diff from simulation.
 */
export const AssetDiffSchema = z.object({
  attacker: z.object({
    borrowableAssets: z.string(), // could be negative
  }),
  protocol: z.object({
    availableLiquidity: z.string(),
  }),
});

export type AssetDiff = z.infer<typeof AssetDiffSchema>;

/**
 * Simulation result.
 */
export const SimulationResultSchema = z.object({
  scenario: z.string(),
  expectedState: z.object({
    collateralValue: z.string(),
    borrowCapacity: z.string(),
  }),
  simulatedState: z.object({
    collateralValue: z.string(),
    borrowCapacity: z.string(),
  }),
  stateDiff: StateDiffSchema.optional(),
  assetDiff: AssetDiffSchema.optional(),
  invariantBefore: z.enum(['PASS', 'VIOLATION']),
  invariantAfter: z.enum(['PASS', 'VIOLATION']),
  invariantResult: z.enum(['PASS', 'WARNING', 'VIOLATION']),
  invariantEvidence: z.array(z.string()),
  timestamp: z.number(),
});

export type SimulationResult = z.infer<typeof SimulationResultSchema>;

/**
 * Invariant definition.
 */
export const InvariantSchema = z.object({
  name: z.string(),
  description: z.string(),
  threshold: z.string(),
  formula: z.string(),
  currentValue: z.string().optional(),
  isViolated: z.boolean().optional(),
});

export type Invariant = z.infer<typeof InvariantSchema>;

/**
 * Policy decision.
 */
export const PolicyDecisionSchema = z.object({
  level: z.enum(['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL']),
  decision: z.enum(['ALLOW', 'REVIEW', 'BLOCK']),
  reason: z.string(),
  evidence: z.array(z.string()),
  invariantResult: z.enum(['PASS', 'WARNING', 'VIOLATION']),
  timestamp: z.number(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

/**
 * Defense action sent to the on-chain controller.
 */
export const DefenseActionSchema = z.object({
  action: z.enum(['ALLOW', 'REVIEW', 'BLOCK']),
  reason: z.string(),
  projectedCollateralValue: z.string(),
  projectedDebtValue: z.string(),
  behaviorFlagged: z.boolean(),
  behaviorConfidence: z.number(),
});

export type DefenseAction = z.infer<typeof DefenseActionSchema>;

/**
 * Complete defense loop result.
 */
export const DefenseResultSchema = z.object({
  attacker: z.string().length(42),
  unprotected: z.boolean(), // false = controller active
  behaviorObservation: BehaviorObservationSchema.optional(),
  attackPath: AttackPathSchema.optional(),
  simulation: SimulationResultSchema.optional(),
  invariant: InvariantSchema.optional(),
  policyDecision: PolicyDecisionSchema.optional(),
  defenseAction: DefenseActionSchema.optional(),
  blocked: z.boolean(),
  timestamp: z.number(),
});

export type DefenseResult = z.infer<typeof DefenseResultSchema>;
