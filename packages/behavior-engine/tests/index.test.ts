import { describe, it, expect } from 'vitest';
import { BehaviorEngine } from '../src/index';
import type { NormalizedEvent } from '@precursor/shared';

const mockEvents: NormalizedEvent[] = [
  {
    chain: '31337',
    blockNumber: 1,
    blockHash: '0xabc',
    transactionHash: '0xdef',
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1000,
    from: '0xattacker',
    to: '0xattacker',
    contractAddress: '0xdefi',
    eventName: 'Transaction',
    parameters: { function: 'deposit', value: '100' },
    gas: 50000,
    status: 'success',
  },
  {
    chain: '31337',
    blockNumber: 2,
    blockHash: '0xabc2',
    transactionHash: '0xdef2',
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1010,
    from: '0xattacker',
    to: '0xattacker',
    contractAddress: '0xdefi',
    eventName: 'CollateralDeposited',
    parameters: { user: '0xattacker', amount: '100000000000000000000' },
    gas: 50000,
    status: 'success',
  },
  {
    chain: '31337',
    blockNumber: 3,
    blockHash: '0xabc3',
    transactionHash: '0xdef3',
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1020,
    from: '0xattacker',
    to: '0xattacker',
    contractAddress: '0xdefi',
    eventName: 'Borrowed',
    parameters: { user: '0xattacker', amount: '75000000000000000000', collateralValue: '100000000000000000000' },
    gas: 50000,
    status: 'success',
  },
  {
    chain: '31337',
    blockNumber: 4,
    blockHash: '0xabc4',
    transactionHash: '0xdef4',
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1030,
    from: '0xattacker',
    to: '0xattacker',
    contractAddress: '0xoracle',
    eventName: 'PriceUpdated',
    parameters: { token: '0xtoken', newPrice: '1800000000000000000', scale: '1000000000000000000' },
    gas: 50000,
    status: 'success',
  },
  {
    chain: '31337',
    blockNumber: 5,
    blockHash: '0xabc5',
    transactionHash: '0xdef5',
    transactionIndex: 0,
    logIndex: 0,
    timestamp: 1040,
    from: '0xattacker',
    to: '0xattacker',
    contractAddress: '0xdefi',
    eventName: 'Withdrawn',
    parameters: { user: '0xattacker', collateralOut: '100000000000000000000', debtRepaid: '0' },
    gas: 50000,
    status: 'success',
  },
];

describe('BehaviorEngine', () => {
  it('should detect oracle manipulation sequence', () => {
    const engine = new BehaviorEngine();
    const observations = engine.analyze(mockEvents);
    expect(observations.length).toBeGreaterThan(0);
    const obs = observations.find(o => o.pattern.includes('Oracle'));
    expect(obs).toBeDefined();
    expect(obs!.confidence).toBeGreaterThanOrEqual(70);
  });

  it('should not flag normal deposit+borrow as attack', () => {
    const engine = new BehaviorEngine();
    const normalEvents: NormalizedEvent[] = [
      { ...mockEvents[1] },
      { ...mockEvents[2] },
    ];
    const observations = engine.analyze(normalEvents);
    // Normal deposit+borrow without price manipulation should not trigger
    const attackObs = observations.find(o => o.confidence >= 70);
    expect(attackObs).toBeUndefined();
  });
});
