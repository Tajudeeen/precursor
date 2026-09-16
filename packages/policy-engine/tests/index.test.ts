import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/index';
import type { BehaviorObservation, SimulationResult } from '@precursor/shared';

const mockObservation: BehaviorObservation = {
  pattern: 'ORACLE_MANIPULATION_SEQUENCE',
  address: '0xattacker',
  events: ['CollateralDeposited', 'Borrowed', 'PriceUpdated', 'Withdrawn'],
  contracts: ['0xlending', '0xoracle'],
  sequence: [
    { event: 'CollateralDeposited', timestamp: 1000, details: '{}' },
    { event: 'Borrowed', timestamp: 1010, details: '{}' },
    { event: 'PriceUpdated', timestamp: 1020, details: '{}' },
    { event: 'Withdrawn', timestamp: 1030, details: '{}' },
  ],
  confidence: 90,
  confidenceEvidence: ['Price manipulation detected', 'Withdrawal after borrow'],
  timestamp: 1030,
};

const mockSimulation: SimulationResult = {
  blockNumber: 1000,
  txHash: '0xabc',
  invariantResult: 'VIOLATION',
  invariantEvidence: ['collateralValue/debtValue dropped below 150%', 'Current ratio: 85%'],
  assetDiff: {
    before: { collateralDeposited: '100', debt: '0' },
    after: { collateralDeposited: '180', debt: '135' },
  },
  stateDiff: {
    poolCollateralBalance: '-100',
    poolDebt: '+135',
    oraclePrice: '1.0 -> 1.8',
  },
  invariantBefore: {
    minRatioBps: '15000',
    currentRatioBps: '20000',
    healthy: true,
  },
  invariantAfter: {
    minRatioBps: '15000',
    currentRatioBps: '8500',
    healthy: false,
  },
};

describe('PolicyEngine', () => {
  it('should BLOCK when oracle manipulation + invariant violation', () => {
    const engine = new PolicyEngine();
    const decision = engine.makeDecision(mockObservation, mockSimulation);
    expect(decision.decision).toBe('BLOCK');
    expect(decision.level).toBe('CRITICAL');
  });

  it('should ALLOW when no behavior flagged and invariant healthy', () => {
    const engine = new PolicyEngine();
    const safeObs: BehaviorObservation = { ...mockObservation, confidence: 10 };
    const safeSim: SimulationResult = { ...mockSimulation, invariantResult: 'HEALTHY' };
    const decision = engine.makeDecision(safeObs, safeSim);
    expect(decision.decision).toBe('ALLOW');
  });

  it('should REVIEW when behavior flagged but invariant holds', () => {
    const engine = new PolicyEngine();
    const reviewSim: SimulationResult = { ...mockSimulation, invariantResult: 'HEALTHY' };
    const decision = engine.makeDecision(mockObservation, reviewSim);
    expect(decision.decision).toBe('REVIEW');
  });

  it('should BLOCK when behavior flagged + invariant violated', () => {
    const engine = new PolicyEngine();
    // Confidence >= 70 AND invariant VIOLATION → BLOCK
    const highObs: BehaviorObservation = { ...mockObservation, confidence: 85 };
    const decision = engine.makeDecision(highObs, mockSimulation);
    expect(decision.decision).toBe('BLOCK');
  });
});
