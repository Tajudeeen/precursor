/**
 * Policy Engine — Maps behavior observation + simulation result + invariant
 * evaluation into a deterministic ALLOW / REVIEW / BLOCK decision.
 *
 * The policy is purely rule-based. Zero heuristic drift. Deterministic and
 * explainable. The decision is sent to the on-chain SecurityController.
 */

import type {
  BehaviorObservation,
  SimulationResult,
  PolicyDecision,
  DefenseAction,
} from '@precursor/shared';
import { Logger } from '@precursor/shared';

export interface PolicyOptions {
  simulationUnavailable?: boolean;
}

export class PolicyEngine {
  private logger = new Logger('policy-engine');

  /**
   * Map inputs to a policy decision.
   *
   * Rules (V1, single scenario):
   *
   * CRITICAL → BLOCK
   *   - behaviorFlagged AND confidence >= 70
   *   - AND simulation shows invariant violation (or simulation failed - fail-safe)
   *   - AND asset impact is significant
   *
   * HIGH → REVIEW
   *   - behaviorFlagged AND confidence >= 70
   *   - AND simulation shows warning or borderline invariant
   *   - OR confidence >= 90
   *
   * ELEVATED → MONITOR
   *   - behaviorFlagged AND confidence >= 50
   *   - OR simulation shows minor impact
   *
   * NORMAL → ALLOW
   *   - no behavior flag
   *   - AND invariant is PASS
   */
  makeDecision(
    observation?: BehaviorObservation,
    simulation?: SimulationResult,
    options?: PolicyOptions
  ): PolicyDecision {
    const now = Math.floor(Date.now() / 1000);
    const evidence: string[] = [];

    // No observation or simulation → default to allow (no threat)
    if (!observation) {
      return {
        level: 'NORMAL',
        decision: 'ALLOW',
        reason: 'No suspicious behavior detected',
        evidence: [],
        invariantResult: 'PASS',
        timestamp: now,
      };
    }

    evidence.push(...observation.confidenceEvidence);
    evidence.push(`Pattern: ${observation.pattern}`);
    evidence.push(`Confidence: ${observation.confidence}%`);

    // FAIL-SAFE FALLBACK: If simulation is unavailable/failed on high-confidence threat
    if (options?.simulationUnavailable || (!simulation && observation.confidence >= 70)) {
      this.logger.warn('Simulation unavailable with high confidence threat; enforcing fail-safe BLOCK');
      evidence.push('SIMULATION UNAVAILABLE — Fail-safe policy active');
      return {
        level: 'CRITICAL',
        decision: 'BLOCK',
        reason: 'SIMULATION UNAVAILABLE — defaulting to BLOCK per fail-safe security policy',
        evidence,
        invariantResult: 'VIOLATION',
        timestamp: now,
      };
    }

    if (simulation) {
      evidence.push(...simulation.invariantEvidence);
      evidence.push(`Simulation invariant: ${simulation.invariantResult}`);
    }

    // CRITICAL: behavior flagged + high confidence + invariant violation
    if (
      observation.confidence >= 70 &&
      simulation?.invariantResult === 'VIOLATION'
    ) {
      return {
        level: 'CRITICAL',
        decision: 'BLOCK',
        reason: 'Simulation predicts invariant violation from behavior-flagged sequence',
        evidence,
        invariantResult: simulation
          ? simulation.invariantResult
          : 'VIOLATION',
        timestamp: now,
      };
    }

    // HIGH: behavior flagged + high confidence but no clear violation
    if (observation.confidence >= 70) {
      return {
        level: 'HIGH',
        decision: 'REVIEW',
        reason: 'High-confidence suspicious behavior detected',
        evidence,
        invariantResult: simulation
          ? simulation.invariantResult
          : 'WARNING',
        timestamp: now,
      };
    }

    // ELEVATED: moderate confidence
    if (observation.confidence >= 50) {
      return {
        level: 'ELEVATED',
        decision: 'ALLOW',
        reason: 'Moderate confidence suspicious behavior — monitoring',
        evidence,
        invariantResult: simulation
          ? simulation.invariantResult
          : 'PASS',
        timestamp: now,
      };
    }

    // NORMAL: low confidence or not flagged
    return {
      level: 'NORMAL',
      decision: 'ALLOW',
      reason: 'Normal behavior, no threat detected',
      evidence,
      invariantResult: 'PASS',
      timestamp: now,
    };
  }

  /**
   * Convert a PolicyDecision into a DefenseAction: the off-chain verdict, plus
   * the simulation evidence behind it, for the audit trail.
   *
   * This no longer builds a payload for the on-chain controller. The contract's
   * withdraw(uint256) takes only an amount — the SecurityController derives
   * collateral, debt and price from chain state, so there is nothing to send it
   * and nothing a caller could pass to bias the verdict.
   */
  toDefenseAction(decision: PolicyDecision, simulation: SimulationResult): DefenseAction {
    // The TOTAL projected debt. `assetDiff.attacker.borrowableAssets` is the
    // *delta* (projected - current); using it here understated debt and biased
    // the reported ratio toward ALLOW. The total is recorded in the state diff.
    const debtAfter = simulation.stateDiff?.entries.find((e) => e.key === 'debt')?.after;
    const projectedDebt = BigInt(debtAfter ?? '0');
    if (projectedDebt < 0n) {
      throw new Error(`Simulation produced a negative projected debt: ${projectedDebt}`);
    }

    let action: 'ALLOW' | 'REVIEW' | 'BLOCK';
    let reason: string;

    if (decision.decision === 'BLOCK') {
      action = 'BLOCK';
      reason = decision.reason;
    } else if (decision.decision === 'REVIEW') {
      action = 'REVIEW';
      reason = decision.reason;
    } else {
      action = 'ALLOW';
      reason = decision.reason;
    }

    return {
      action,
      reason,
      targetOperation: 'withdraw(uint256)',
      projectedCollateralValue: simulation.simulatedState.collateralValue,
      projectedDebtValue: projectedDebt.toString(),
      behaviorFlagged: decision.level !== 'NORMAL',
      behaviorConfidence: decision.level === 'CRITICAL' ? 90 :
                          decision.level === 'HIGH' ? 75 :
                          decision.level === 'ELEVATED' ? 55 : 0,
    };
  }
}
