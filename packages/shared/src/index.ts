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

// =====================================================
// Structured Logging
// =====================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export const StructuredLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
  component: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().optional(),
});

export type StructuredLog = z.infer<typeof StructuredLogSchema>;

// =====================================================
// Attack Replay Timeline (Forensic Diff)
// =====================================================

export const TimelineSnapshotSchema = z.object({
  oraclePrice: z.string(),
  collateralValue: z.string(),
  borrowCapacity: z.string(),
  debt: z.string(),
  invariantRatioBps: z.string(),
  invariantHealthy: z.boolean(),
});

export type TimelineSnapshot = z.infer<typeof TimelineSnapshotSchema>;

export const TimelineStepSchema = z.object({
  stepIndex: z.number(),
  timestamp: z.number(),
  action: z.string(),
  description: z.string(),
  component: z.string(),
  stateSnapshot: TimelineSnapshotSchema,
  txHash: z.string().optional(),
  eventName: z.string().optional(),
  parameters: z.record(z.string(), z.string()).optional(),
  delta: z.object({
    priceChange: z.string().optional(),
    collateralChange: z.string().optional(),
    debtChange: z.string().optional(),
    capacityChange: z.string().optional(),
  }).optional(),
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;

export const AttackTimelineSchema = z.object({
  attacker: z.string(),
  steps: z.array(TimelineStepSchema),
  protectedOutcome: z.object({
    blocked: z.boolean(),
    atStep: z.number(),
    reason: z.string(),
  }),
  unprotectedOutcome: z.object({
    succeeded: z.boolean(),
    extractedValue: z.string(),
  }),
});

export type AttackTimeline = z.infer<typeof AttackTimelineSchema>;

// =====================================================
// Attack Economics Calculator
// =====================================================

export const AttackEconomicsSchema = z.object({
  projectedAttackerGain: z.string(),
  projectedProtocolLoss: z.string(),
  projectedLiquidityDrain: z.string(),
  actualAttackerGain: z.string(),
  actualProtocolLoss: z.string(),
  valueSaved: z.string(),
  percentageSaved: z.string(),
  defenseROI: z.string(),
});

export type AttackEconomics = z.infer<typeof AttackEconomicsSchema>;

// =====================================================
// Pipeline Health / Heartbeat
// =====================================================

export const PipelineStageHealthSchema = z.object({
  stage: z.string(),
  status: z.enum(['healthy', 'degraded', 'down']),
  lastRunMs: z.number(),
  lastRunAt: z.number(),
  errorCount: z.number(),
  lastError: z.string().optional(),
});

export type PipelineStageHealth = z.infer<typeof PipelineStageHealthSchema>;

export const PipelineHealthSchema = z.object({
  overall: z.enum(['operational', 'degraded', 'down']),
  stages: z.array(PipelineStageHealthSchema),
  uptime: z.number(),
  startedAt: z.number(),
  lastCheck: z.number(),
});

export type PipelineHealth = z.infer<typeof PipelineHealthSchema>;

export const BenchmarkMetricsSchema = z.object({
  ingestionLatencyMs: z.number(),
  detectionLatencyMs: z.number(),
  simulationLatencyMs: z.number(),
  decisionLatencyMs: z.number(),
  totalLatencyMs: z.number(),
  eventsProcessed: z.number(),
  timestamp: z.number(),
});

export type BenchmarkMetrics = z.infer<typeof BenchmarkMetricsSchema>;

// =====================================================
// Structured Logger Utility
// =====================================================

export class Logger {
  private component: string;
  private logs: StructuredLog[] = [];

  constructor(component: string) {
    this.component = component;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, durationMs?: number): void {
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
      durationMs,
    };
    this.logs.push(entry);
    const prefix = `[${entry.timestamp}] [${level}] [${this.component}]`;
    const suffix = durationMs !== undefined ? ` (${durationMs}ms)` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}${suffix}${dataStr}`);
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}${suffix}${dataStr}`);
    } else {
      console.log(`${prefix} ${message}${suffix}${dataStr}`);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: Record<string, unknown>, durationMs?: number): void {
    this.log('INFO', message, data, durationMs);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', message, data);
  }

  time(label: string): () => number {
    const start = performance.now();
    return () => {
      const elapsed = Math.round(performance.now() - start);
      this.info(`${label} completed`, undefined, elapsed);
      return elapsed;
    };
  }

  getLogs(): StructuredLog[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

