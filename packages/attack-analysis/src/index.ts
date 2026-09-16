/**
 * Attack Path Engine — Reconstructs the likely attack path from
 * behavioral evidence and protocol state changes.
 */

import type {
  BehaviorObservation,
  AttackPath,
  NormalizedEvent,
} from '@precursor/shared';

export class AttackPathEngine {
  /**
   * Reconstruct the attack path from a behavior observation.
   */
  reconstructPath(observation: BehaviorObservation): AttackPath {
    const steps: AttackPath['steps'] = [];
    let stepNumber = 1;

    // Parse the sequence of events from the observation
    const events = observation.sequence;

    for (const evt of events) {
      const component = this.identifyComponent(evt.event);
      const stateChange = this.describeStateChange(evt);

      steps.push({
        step: stepNumber++,
        description: this.describeEvent(evt, observation),
        component,
        stateChange,
      });
    }

    // Build the path summary based on the pattern
    const summary = this.buildSummary(observation);

    return {
      attacker: observation.address,
      steps,
      summary,
      confidence: observation.confidence,
    };
  }

  /**
   * Reconstruct attack path specifically for oracle manipulation.
   */
  reconstructOracleManipulationPath(observation: BehaviorObservation): AttackPath {
    const steps: AttackPath['steps'] = [];

    steps.push({
      step: 1,
      description: 'New wallet funded',
      component: 'Funding',
      stateChange: 'Attacker receives tokens/ETH to begin attack',
    });

    steps.push({
      step: 2,
      description: 'Deposits collateral into lending pool',
      component: 'LendingPool',
      stateChange: 'userCollateral increased',
    });

    steps.push({
      step: 3,
      description: 'Borrows against collateral at fair price',
      component: 'LendingPool',
      stateChange: 'userDebt increased',
    });

    steps.push({
      step: 4,
      description: 'Interacts with oracle to manipulate price',
      component: 'Oracle',
      stateChange: 'oracle.price increased (artificially)',
    });

    steps.push({
      step: 5,
      description: 'Borrows additional capacity at inflated price',
      component: 'LendingPool',
      stateChange: 'userDebt increased (phantom borrowing)',
    });

    steps.push({
      step: 6,
      description: 'Attempts withdrawal of collateral',
      component: 'LendingPool',
      stateChange: 'userCollateral decreased (blocked by defense)',
    });

    return {
      attacker: observation.address,
      steps,
      summary: 'Oracle price was manipulated to inflate collateral valuation, ' +
        'enabling the attacker to borrow beyond legitimate capacity and attempt ' +
        'to withdraw more collateral than was economically deposited.',
      confidence: observation.confidence,
    };
  }

  private identifyComponent(eventName: string): string {
    if (eventName === 'PriceUpdated') return 'Oracle';
    if (eventName === 'CollateralDeposited') return 'LendingPool';
    if (eventName === 'Borrowed') return 'LendingPool';
    if (eventName === 'Withdrawn') return 'LendingPool';
    if (eventName === 'Mint') return 'CollateralToken';
    if (eventName === 'Transaction') return 'Wallet';
    return 'Unknown';
  }

  private describeEvent(evt: any, observation: BehaviorObservation): string {
    switch (evt.event) {
      case 'CollateralDeposited':
        return `Deposited ${this.formatAmount(evt.details)} collateral`;
      case 'Borrowed':
        return `Borrows ${this.formatAmount(evt.details)}`;
      case 'Withdrawn':
        return `Attempts to withdraw ${this.formatAmount(evt.details)}`;
      case 'PriceUpdated':
        return `Oracle price updated to ${this.formatAmount(evt.details)}`;
      case 'Transaction':
        return 'Funding transaction';
      default:
        return evt.event;
    }
  }

  private describeStateChange(evt: any): string {
    const details = evt.details;
    if (!details) return 'No state change recorded';
    if (details.includes('amount')) return `State changed in ${evt.event}`;
    return `Changed at ${evt.event}`;
  }

  private buildSummary(observation: BehaviorObservation): string {
    if (observation.pattern === 'ORACLE_MANIPULATION_SEQUENCE') {
      return 'Oracle price manipulation followed by borrowing against inflated collateral value and withdrawal attempt.';
    }
    return `Detected ${observation.pattern} pattern with ${observation.confidence}% confidence.`;
  }

  private formatAmount(details: string): string {
    try {
      const parsed = JSON.parse(details);
      if (parsed.amount) {
        const num = BigInt(parsed.amount);
        if (num >= 1000000000000000000n) return `${Number(num / 1000000000000000000n)}e18`;
        if (num >= 1000000000000000n) return `${Number(num / 1000000000000000n)}e15`;
        return `${num.toString()}`;
      }
      if (parsed.newPrice) {
        const price = BigInt(parsed.newPrice);
        const dollars = Number(price / 1000000000000000000n);
        const cents = Number((price % 1000000000000000000n) * 100n / 1000000000000000000n);
        return `$${dollars}.${cents.toFixed(2)}`;
      }
    } catch {
      return details;
    }
    return details;
  }
}
