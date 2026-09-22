import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/index';
import type { SimulationInput } from '../src/index';

describe('SimulationEngine', () => {
  const dummyConfig = {
    rpcUrl: 'http://127.0.0.1:8555',
    lendingPoolAddress: '0x1111111111111111111111111111111111111111' as const,
    oracleAddress: '0x2222222222222222222222222222222222222222' as const,
    collateralAddress: '0x3333333333333333333333333333333333333333' as const,
  };

  const engine = new SimulationEngine(dummyConfig);

  it('should predict INVARIANT VIOLATION on inflated price and debt expansion', async () => {
    const input: SimulationInput = {
      attackerAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
      currentBlock: 100n,
      currentPrice: '1000000000000000000', // $1.00
      currentCollateralValue: '100000000000000000000', // $100
      currentDebt: '75000000000000000000', // $75
      currentBorrowCapacity: '75000000000000000000', // $75
      events: [
        {
          chain: '31337',
          blockNumber: 1,
          blockHash: '0x' + '0'.repeat(64),
          transactionHash: '0x' + '1'.repeat(64),
          transactionIndex: 0,
          logIndex: 0,
          timestamp: 1000,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          to: dummyConfig.lendingPoolAddress,
          contractAddress: dummyConfig.lendingPoolAddress,
          eventName: 'CollateralDeposited',
          parameters: { user: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', amount: '100000000000000000000' },
          gas: 21000,
          status: 'success',
        },
        {
          chain: '31337',
          blockNumber: 2,
          blockHash: '0x' + '0'.repeat(64),
          transactionHash: '0x' + '2'.repeat(64),
          transactionIndex: 0,
          logIndex: 0,
          timestamp: 1005,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          to: dummyConfig.oracleAddress,
          contractAddress: dummyConfig.oracleAddress,
          eventName: 'PriceUpdated',
          parameters: { token: dummyConfig.collateralAddress, newPrice: '1800000000000000000' }, // $1.80
          gas: 21000,
          status: 'success',
        },
        {
          chain: '31337',
          blockNumber: 3,
          blockHash: '0x' + '0'.repeat(64),
          transactionHash: '0x' + '3'.repeat(64),
          transactionIndex: 0,
          logIndex: 0,
          timestamp: 1010,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          to: dummyConfig.lendingPoolAddress,
          contractAddress: dummyConfig.lendingPoolAddress,
          eventName: 'Borrowed',
          parameters: { user: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', amount: '135000000000000000000' },
          gas: 21000,
          status: 'success',
        },
      ],
      attackPath: {
        attacker: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        steps: [],
        summary: 'Oracle manipulation sequence',
        confidence: 90,
      },
    };

    const result = await engine.simulate(input);
    expect(result.invariantResult).toBe('VIOLATION');
    expect(result.stateDiff).toBeDefined();
    expect(result.stateDiff?.entries.length).toBeGreaterThan(0);
    expect(result.assetDiff).toBeDefined();
    expect(result.invariantEvidence.length).toBeGreaterThan(0);
  });

  it('should return PASS when collateralization ratio is healthy', async () => {
    const input: SimulationInput = {
      attackerAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const,
      currentBlock: 100n,
      currentPrice: '1000000000000000000',
      currentCollateralValue: '200000000000000000000', // $200
      currentDebt: '50000000000000000000', // $50 (ratio = 400% > 150%)
      currentBorrowCapacity: '150000000000000000000',
      events: [
        {
          chain: '31337',
          blockNumber: 1,
          blockHash: '0x' + '0'.repeat(64),
          transactionHash: '0x' + '1'.repeat(64),
          transactionIndex: 0,
          logIndex: 0,
          timestamp: 1000,
          from: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          to: dummyConfig.lendingPoolAddress,
          contractAddress: dummyConfig.lendingPoolAddress,
          eventName: 'CollateralDeposited',
          parameters: { user: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', amount: '200000000000000000000' },
          gas: 21000,
          status: 'success',
        },
      ],
      attackPath: {
        attacker: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        steps: [],
        summary: 'Normal deposit',
        confidence: 10,
      },
    };

    const result = await engine.simulate(input);
    expect(result.invariantAfter).toBe('PASS');
  });
});
