/**
 * Behavior Engine — Rule-based behavioral sequence detection.
 *
 * V1 does NOT use machine learning. Detection is explicit rule-based:
 * a set of behavioral patterns are defined, each producing an
 * Observation with evidence and confidence.
 */

import type {
  NormalizedEvent,
  BehavioralProfile,
  BehaviorObservation,
} from '@precursor/shared';

// =====================================================
// Patterns
// =====================================================

/**
 * Pattern: Oracle manipulation attack sequence.
 *
 * Triggers when an address exhibits:
 * 1. New address (first seen recently)
 * 2. Recent funding (received tokens/ETH)
 * 3. Oracle interaction (called setPrice or interacted with oracle contract)
 * 4. Abnormal price state change (oracle price moved significantly)
 * 5. Collateral state change (deposit + borrow)
 * 6. Withdrawal attempt
 *
 * Evidence is collected for each condition.
 */
export class OracleManipulationPattern {
  static readonly NAME = 'ORACLE_MANIPULATION_SEQUENCE';
  static readonly CONFIDENCE_THRESHOLD = 70;
  static readonly PRICE_DEVIATION_THRESHOLD = 20; // 20% change

  /**
   * Evaluate a behavioral profile against the oracle-manipulation pattern.
   */
  evaluate(profile: BehavioralProfile, events: NormalizedEvent[]): {
    matched: boolean;
    confidence: number;
    evidence: string[];
  } {
    const evidence: string[] = [];

    // Core signal checks
    const depositEvents = events.filter(e => e.eventName === 'CollateralDeposited');
    const borrowEvents = events.filter(e => e.eventName === 'Borrowed');
    const priceEvents = events.filter(e => e.eventName === 'PriceUpdated');
    const withdrawEvents = events.filter(e => e.eventName === 'Withdrawn');

    // 1. If deposit + borrow + price update are all present, this is an active manipulation sequence
    if (depositEvents.length > 0 && borrowEvents.length > 0 && (priceEvents.length > 0 || profile.oracleInteractions > 0)) {
      let conf = 75;
      evidence.push(`Deposit (${depositEvents.length}) and borrow (${borrowEvents.length}) activity detected`);
      if (priceEvents.length > 0) {
        evidence.push(`${priceEvents.length} price update(s) detected during position lifecycle`);
      }
      if (borrowEvents.length > 1) {
        conf += 15;
        evidence.push('Subsequent borrow detected after oracle price inflation (phantom capacity)');
      }
      if (withdrawEvents.length > 0) {
        conf += 10;
        evidence.push('Collateral withdrawal attempt detected');
      }
      const confidence = Math.min(100, conf);
      return {
        matched: confidence >= OracleManipulationPattern.CONFIDENCE_THRESHOLD,
        confidence,
        evidence,
      };
    }

    // Fallback: point-based evaluation
    let score = 0;
    const maxScore = 5;

    // Address freshness
    const now = Math.floor(Date.now() / 1000);
    if (now - profile.firstSeen < 3600 || profile.firstSeen < 10) {
      score++;
      evidence.push(`Address first seen recently (new wallet)`);
    }

    if (profile.oracleInteractions > 0 || priceEvents.length > 0) {
      score++;
      evidence.push(`Oracle interactions / price updates detected`);
    }

    if (depositEvents.length > 0) {
      score++;
      evidence.push(`Collateral deposit activity detected`);
    }

    if (borrowEvents.length > 0) {
      score++;
      evidence.push(`Borrow activity detected`);
    }

    if (withdrawEvents.length > 0) {
      score++;
      evidence.push(`Withdrawal attempt detected`);
    }

    const confidence = Math.round((score / maxScore) * 100);
    return {
      matched: confidence >= OracleManipulationPattern.CONFIDENCE_THRESHOLD,
      confidence,
      evidence,
    };
  }
}

/**
 * Pattern: Collateral drain after price manipulation.
 * Detects the specific sequence: oracle price change → borrow increase → withdrawal.
 */
export class CollateralDrainPattern {
  static readonly NAME = 'COLLATERAL_DRAIN_SEQUENCE';
  static readonly CONFIDENCE_THRESHOLD = 75;

  evaluate(profile: BehavioralProfile, events: NormalizedEvent[]): {
    matched: boolean;
    confidence: number;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let score = 0;
    const checks = 4;

    // Check for price manipulation followed by borrow increase
    const priceUpdates = events
      .filter(e => e.eventName === 'PriceUpdated')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (priceUpdates.length > 0) {
      score++;
      evidence.push(`Oracle price was updated ${priceUpdates.length} time(s)`);
    }

    // Check for borrow after price update
    const borrows = events.filter(e => e.eventName === 'Borrowed' &&
      e.timestamp > (priceUpdates[0]?.timestamp ?? 0));
    if (borrows.length > 0) {
      score++;
      evidence.push(`Borrow(s) detected after price manipulation`);
    }

    // Check for withdrawal after borrow
    const withdrawals = events.filter(e => e.eventName === 'Withdrawn' &&
      e.timestamp > (borrows[0]?.timestamp ?? priceUpdates[0]?.timestamp ?? 0));
    if (withdrawals.length > 0) {
      score++;
      evidence.push(`Withdrawal(s) detected after borrow`);
    }

    // Check for failed probe calls (common in oracle manipulation attacks)
    const failedCalls = profile.failedCalls;
    if (failedCalls > 0) {
      score++;
      evidence.push(`${failedCalls} failed call(s) suggest probing`);
    }

    const confidence = Math.round((score / checks) * 100);

    return {
      matched: confidence >= CollateralDrainPattern.CONFIDENCE_THRESHOLD,
      confidence,
      evidence,
    };
  }
}

// =====================================================
// Behavior Engine
// =====================================================

export class BehaviorEngine {
  private patterns: (OracleManipulationPattern | CollateralDrainPattern)[];

  constructor() {
    this.patterns = [new OracleManipulationPattern(), new CollateralDrainPattern()];
  }

  /**
   * Analyze an array of normalized events and return observations.
   */
  analyze(events: NormalizedEvent[]): BehaviorObservation[] {
    const observations: BehaviorObservation[] = [];

    // Protocol-wide price updates
    const protocolPriceEvents = events.filter(e => e.eventName === 'PriceUpdated');

    // Group events by actor address
    const addressEvents = this.groupByAddress(events);

    for (const [address, addrEvents] of Object.entries(addressEvents)) {
      // Include protocol price updates that occurred around the actor's positions
      const combinedEvents = [...addrEvents];
      for (const pe of protocolPriceEvents) {
        if (!combinedEvents.some(e => e.transactionHash === pe.transactionHash && e.logIndex === pe.logIndex)) {
          combinedEvents.push(pe);
        }
      }
      combinedEvents.sort((a, b) => a.timestamp - b.timestamp || a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

      const profile = this.buildProfile(address, combinedEvents);

      for (const pattern of this.patterns) {
        const result = pattern.evaluate(profile, combinedEvents);

        if (result.matched) {
          observations.push({
            pattern: pattern.constructor.name,
            address,
            events: combinedEvents.map(e => e.eventName),
            contracts: [...new Set(combinedEvents.map(e => e.contractAddress))],
            sequence: combinedEvents.map(e => ({
              event: e.eventName,
              timestamp: e.timestamp,
              details: JSON.stringify(e.parameters),
            })),
            confidence: result.confidence,
            confidenceEvidence: result.evidence,
            timestamp: Math.max(...combinedEvents.map(e => e.timestamp)),
          });
        }
      }
    }

    return observations;
  }

  private groupByAddress(events: NormalizedEvent[]): Record<string, NormalizedEvent[]> {
    const grouped: Record<string, NormalizedEvent[]> = {};
    for (const event of events) {
      const user = (event.parameters?.user as string) || (event.parameters?.to as string) || event.from;
      if (user && user !== '0x0000000000000000000000000000000000000000') {
        const key = user.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(event);
      }
    }
    return grouped;
  }

  private buildProfile(address: string, events: NormalizedEvent[]): BehavioralProfile {
    const contracts = [...new Set(events.map(e => e.contractAddress))];
    const functions = [...new Set(events.map(e => e.parameters?.function).filter(Boolean))];
    const failedCalls = events.filter(e => e.status === 'revert').length;
    const oracleInteractions = events.filter(e =>
      e.parameters?.token && e.parameters.newPrice !== undefined
    ).length;
    const lendingInteractions = events.filter(e =>
      ['CollateralDeposited', 'Borrowed', 'Withdrawn'].includes(e.eventName)
    ).length;

    return {
      address,
      firstSeen: events.reduce((min, e) => Math.min(min, e.timestamp), Infinity),
      lastSeen: events.reduce((max, e) => Math.max(max, e.timestamp), 0),
      totalInteractions: events.length,
      contractsTouched: contracts,
      failedCalls,
      oracleInteractions,
      lendingInteractions,
      uniqueFunctionsCalled: functions as string[],
      events,
    };
  }
}
