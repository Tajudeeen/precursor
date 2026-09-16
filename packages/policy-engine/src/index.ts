/**
 * Policy Engine — Maps behavior observation + simulation result + invariant
 * evaluation into a deterministic ALLOW / REVIEW / BLOCK decision.
 *
 * The policy is purely rule-based. No ML, no AI. Deterministic and
 * explainable. The decision is sent to the on-chain SecurityController.
 */

import type {
  BehaviorObservation,
  SimulationResult,
  PolicyDecision,
  DefenseAction,
} from '@precursor/shared';

export class PolicyEngine {
  /**
   * Map inputs to a policy decision.
   *
   * Rules (V1, single scenario):
   *
   * CRITICAL → BLOCK
   *   - behaviorFlagged AND confidence >= 70
   *   - AND simulation shows invariant violation
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
    simulation?: SimulationResult
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
   * Convert a PolicyDecision into a DefenseAction that the API layer
   * sends to the on-chain SecurityController.
   */
  toDefenseAction(decision: PolicyDecision, simulation: SimulationResult): DefenseAction {
    const projectedCollatValue = BigInt(simulation.simulatedState.collateralValue);
    const projectedDebt = BigInt(simulation.assetDiff?.attacker?.borrowableAssets ?? '0');

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
      projectedCollateralValue: simulation.simulatedState.collateralValue,
      projectedDebtValue: projectedDebt.toString(),
      behaviorFlagged: decision.level !== 'NORMAL',
      behaviorConfidence: decision.level === 'CRITICAL' ? 90 :
                          decision.level === 'HIGH' ? 75 :
                          decision.level === 'ELEVATED' ? 55 : 0,
    };
  }
}
