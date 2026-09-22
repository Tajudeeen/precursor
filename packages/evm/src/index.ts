/** EVM Event Ingestion Module — Listens to EVM blocks/transactions, decodes events/logs,
 * and normalizes them into the shared NormalizedEvent format.
 * The rest of the system never needs to understand raw RPC structures.
 */
import type { Address } from 'viem';
import {
  createPublicClient,
  http,
  parseAbi,
  decodeEventLog,
  type TransactionReceipt,
} from 'viem';
import type { NormalizedEvent } from '@precursor/shared';

const EVENT_ABI = parseAbi([
  'event CollateralDeposited(address indexed user, uint256 amount)',
  'event Borrowed(address indexed user, uint256 amount, uint256 collateralValue)',
  'event Withdrawn(address indexed user, uint256 collateralOut, uint256 debtRepaid)',
  'event SecurityControllerSet(address controller)',
  'event PriceUpdated(address indexed token, uint256 newPrice, uint256 scale)',
  'event Mint(address to, uint256 amount)',
  'event Burn(address from, uint256 amount)',
]);

export interface EvmConfig {
  rpcUrl: string;
  chainId: number;
  contractAddresses: {
    lendingPool: Address;
    oracle: Address;
    collateral: Address;
    securityController: Address;
  };
}

export class EvmListener {
  private client;
  private config: EvmConfig;
  private fromBlock: bigint;
  private readonly contractAddrs: Set<string>;

  constructor(config: EvmConfig, fromBlock: bigint = 0n) {
    this.config = config;
    this.fromBlock = fromBlock;
    this.contractAddrs = new Set(
      Object.values(config.contractAddresses).map(a => a.toLowerCase())
    );

    this.client = createPublicClient({
      chain: { id: config.chainId, name: `chain-${config.chainId}` } as any,
      transport: http(config.rpcUrl),
    });
  }

  /** Poll for new blocks and return normalized events.
   * Queries logs per-block to work around viem+anvil range query issues. */
  async pollNewEvents(sinceBlock?: bigint): Promise<NormalizedEvent[]> {
    const fromBlock = sinceBlock ?? this.fromBlock;
    const toBlock = await this.client.getBlockNumber();
    if (toBlock <= fromBlock) return [];

    const normalized: NormalizedEvent[] = [];

    for (let block = fromBlock; block <= toBlock; block++) {
      // Per-block log query — avoids the viem/anvil large-range bug
      const logs: any[] = await this.client.getLogs({
        fromBlock: block,
        toBlock: block,
        address: Object.values(this.config.contractAddresses),
        topics: [],
      } as any);

      const blockData = await this.client.getBlock({ blockNumber: block, includeTransactions: true });
      const blockTs = Number(blockData.timestamp);

      // Decode event logs
      for (const log of logs) {
        if (!this.isWatchedContract(log.address)) continue;
        try {
          const decoded: any = decodeEventLog({ abi: EVENT_ABI, data: log.data, topics: log.topics });
          if (!decoded.eventName || !decoded.args) continue;

          let txFrom = '';
          try {
            const tx = await this.client.getTransaction({ hash: log.transactionHash as `0x${string}` });
            txFrom = (tx?.from ?? '').toLowerCase();
          } catch {}

          normalized.push({
            chain: this.config.chainId.toString(),
            blockNumber: Number(log.blockNumber),
            blockHash: log.blockHash ?? '',
            transactionHash: log.transactionHash ?? '',
            transactionIndex: log.transactionIndex ?? 0,
            logIndex: Number(log.logIndex),
            timestamp: blockTs,
            from: txFrom,
            to: log.address.toLowerCase(),
            contractAddress: log.address.toLowerCase() as Address,
            eventName: decoded.eventName,
            parameters: this.extractArgs(decoded.args),
            gas: 0,
            status: 'success',
          });
        } catch {
          // Not a recognized event, skip
        }
      }

      // Detect function calls (oracle.setPrice, etc.) via transaction calldata
      const txs = (blockData.transactions || []) as any[];
      for (const tx of txs) {
        if (!tx.to || !this.isWatchedContract(tx.to)) continue;
        normalized.push({
          chain: this.config.chainId.toString(),
          blockNumber: Number(tx.blockNumber),
          blockHash: tx.blockHash ?? '',
          transactionHash: tx.hash ?? '',
          transactionIndex: tx.transactionIndex ?? 0,
          logIndex: 0,
          timestamp: blockTs,
          from: (tx.from ?? '').toLowerCase(),
          to: (tx.to ?? '').toLowerCase(),
          contractAddress: tx.to.toLowerCase() as Address,
          eventName: 'Transaction',
          parameters: {
            function: this.identifyFunction(tx),
            input: tx.input,
            value: tx.value?.toString() ?? '0',
          },
          gas: Number(tx.gas ?? 0),
          status: 'success',
        });
      }
    }

    this.fromBlock = toBlock + 1n;
    return normalized;
  }

  /** Block until the next block, then poll events. */
  async waitForEvents(timeoutMs: number = 30000): Promise<NormalizedEvent[]> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const events = await this.pollNewEvents();
      if (events.length > 0) return events;
      await new Promise(r => setTimeout(r, 500));
    }
    return [];
  }

  private isWatchedContract(address: string): boolean {
    return this.contractAddrs.has(address.toLowerCase());
  }

  private extractArgs(args: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'bigint') result[key] = value.toString();
      else if (typeof value === 'string') result[key] = value;
      else if (typeof value === 'object' && value !== null && 'toString' in value) result[key] = value.toString();
      else result[key] = String(value);
    }
    return result;
  }

  private identifyFunction(tx: any): string {
    if (!tx.input || tx.input === '0x') return 'transfer';
    const selector = tx.input.slice(0, 10);
    const selectors: Record<string, string> = {
      '0xa5df5779': 'deposit',
      '0xf6c1113b': 'borrow',
      '0x0b9b062d': 'withdraw',
      '0x3dc4d7c2': 'setPrice',
      '0x5b9091d7': 'setSecurityController',
      '0xdcec3523': 'disableSecurityController',
      '0xa9059cbb': 'transfer',
      '0x095ea7b5': 'approve',
    };
    return selectors[selector] ?? `unknown(${selector})`;
  }

  async getCurrentBlock(): Promise<bigint> {
    return this.client.getBlockNumber();
  }

  async getTxReceipt(txHash: string): Promise<TransactionReceipt | null> {
    return this.client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  }

  async getUserStateBefore(address: Address): Promise<{ collateralDeposited: string; debt: string; collateralValue: string; borrowCapacity: string }> {
    const result: any = await this.client.readContract({
      address: this.config.contractAddresses.lendingPool,
      abi: parseAbi(['function getUserState(address) view returns (uint256,uint256,uint256,uint256)']),
      functionName: 'getUserState',
      args: [address],
    } as any);
    return {
      collateralDeposited: result[0].toString(),
      debt: result[1].toString(),
      collateralValue: result[2].toString(),
      borrowCapacity: result[3].toString(),
    };
  }

  async getOraclePrice(token: Address): Promise<string> {
    const price: any = await this.client.readContract({
      address: this.config.contractAddresses.oracle,
      abi: parseAbi(['function getPrice(address) view returns (uint256)']),
      functionName: 'getPrice',
      args: [token],
    } as any);
    return price.toString();
  }

  async getInvariant(): Promise<{ minRatioBps: string; currentRatioBps: string; healthy: boolean }> {
    const result: any = await this.client.readContract({
      address: this.config.contractAddresses.lendingPool,
      abi: parseAbi(['function getInvariant() view returns (uint256,uint256,bool)']),
      functionName: 'getInvariant',
    });
    return { minRatioBps: result[0].toString(), currentRatioBps: result[1].toString(), healthy: result[2] };
  }

  async isSecurityControllerEnabled(): Promise<boolean> {
    try {
      const result = await this.client.readContract({
        address: this.config.contractAddresses.lendingPool,
        abi: parseAbi(['function securityControllerEnabled() view returns (bool)']),
        functionName: 'securityControllerEnabled',
      });
      return Boolean(result);
    } catch {
      return false;
    }
  }

  async getSecurityController(): Promise<string> {
    try {
      const result = await this.client.readContract({
        address: this.config.contractAddresses.lendingPool,
        abi: parseAbi(['function securityController() view returns (address)']),
        functionName: 'securityController',
      });
      return String(result);
    } catch {
      return this.config.contractAddresses.securityController;
    }
  }

  async getPoolOwner(): Promise<string> {
    try {
      const result = await this.client.readContract({
        address: this.config.contractAddresses.lendingPool,
        abi: parseAbi(['function owner() view returns (address)']),
        functionName: 'owner',
      });
      return String(result);
    } catch {
      return '0x0000000000000000000000000000000000000000';
    }
  }
}

export * from './scenario-runner';

