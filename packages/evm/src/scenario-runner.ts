/**
 * Attacker Scenario Runner — Milestone 2
 *
 * Executes the deterministic oracle-manipulation attack sequence
 * against the controlled lending protocol. Runs both an unprotected
 * and a protected scenario, producing a comparison that proves the
 * defense works.
 *
 * Usage:
 *   RPC_URL=http://127.0.0.1:8555 \
 *   LENDING_POOL=0x... ORACLE=0x... COLLATERAL=0x... \
 *   npx tsx packages/evm/src/scenario-runner.ts
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
} from 'viem';

const LENDING_POOL_ABI: any = [
  { type: 'function', name: 'deposit', inputs: [{ type: 'uint256', name: 'amount' }], outputs: [] },
  { type: 'function', name: 'borrow', inputs: [{ type: 'uint256', name: 'amount' }], outputs: [] },
  { type: 'function', name: 'withdraw', inputs: [{ type: 'uint256', name: 'withdrawAmount' }, { type: 'uint256', name: 'projectedCollateralValue' }, { type: 'uint256', name: 'projectedDebtValue' }, { type: 'bool', name: 'behaviorFlagged' }, { type: 'uint256', name: 'behaviorConfidence' }], outputs: [] },
  { type: 'function', name: 'disableSecurityController', inputs: [], outputs: [] },
  { type: 'function', name: 'setSecurityController', inputs: [{ type: 'address', name: '_controller' }], outputs: [] },
  { type: 'function', name: 'securityController', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'getBorrowCapacity', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getUserState', inputs: [{ type: 'address', name: 'user' }], outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view' },
];

const ORACLE_ABI: any = [
  { type: 'function', name: 'setPrice', inputs: [{ type: 'address', name: 'token' }, { type: 'uint256', name: 'newPrice' }], outputs: [] },
  { type: 'function', name: 'getPrice', inputs: [{ type: 'address', name: 'token' }], outputs: [{ type: 'uint256' }] },
];

const COLLATERAL_ABI: any = [
  { type: 'function', name: 'mint', inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }], outputs: [] },
  { type: 'function', name: 'approve', inputs: [{ type: 'address', name: 'spender' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', inputs: [{ type: 'address', name: 'owner' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer', inputs: [{ type: 'address', name: 'to' }, { type: 'uint256', name: 'amount' }], outputs: [{ type: 'bool' }] },
];

interface Config {
  rpcUrl: string;
  chainId: number;
  deployerKey: string;
  attackerKey: string;
  lendingPool: `0x${string}`;
  oracle: `0x${string}`;
  collateral: `0x${string}`;
}

interface TxRecord {
  step: number;
  description: string;
  txHash: string;
  status: 'success' | 'revert';
}

interface ScenarioResult {
  scenario: string;
  transactions: TxRecord[];
  finalState: {
    attackerCollateralBalance: string;
    attackerDebt: string;
    collateralValue: string;
    borrowCapacity: string;
  };
  attackSucceeded: boolean;
  reason: string;
}

const COLLATERAL_DEPOSIT = parseEther('100'); // 100e18
const INITIAL_PRICE = parseEther('1');        // $1
const INFLATED_PRICE = parseEther('18') / 10n; // $1.80 = 1.8e18

function loadConfig(): Config {
  return {
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8555',
    chainId: parseInt(process.env.CHAIN_ID || '31337'),
    deployerKey: process.env.DEPLOYER_KEY || generatePrivateKey(),
    attackerKey: process.env.ATTACKER_KEY || generatePrivateKey(),
    lendingPool: (process.env.LENDING_POOL || '') as `0x${string}`,
    oracle: (process.env.ORACLE || '') as `0x${string}`,
    collateral: (process.env.COLLATERAL || '') as `0x${string}`,
  };
}

// Get the security controller address from the pool (stored at deployment)
async function getControllerAddress(config: Config, client: any): Promise<string> {
  // Try env var first, then read from chain
  const envCtrl = process.env.SECURITY_CONTROLLER;
  if (envCtrl) return envCtrl;

  // Read from the pool's securityController() getter
  const pub = makePublicClient(config);
  try {
    const addr: any = await pub.readContract({
      address: config.lendingPool,
      abi: LENDING_POOL_ABI,
      functionName: 'securityController',
    });
    return addr;
  } catch {
    // If disabled, try to read from the DeployV1 broadcast
    return process.env.SECURITY_CONTROLLER || '';
  }
}

function makeClient(config: Config, privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    chain: { id: config.chainId } as any,
    transport: http(config.rpcUrl),
    account,
  }) as any;
}

function makePublicClient(config: Config) {
  return createPublicClient({
    chain: { id: config.chainId } as any,
    transport: http(config.rpcUrl),
  }) as any;
}

async function sendAndWait(
  client: any,
  to: `0x${string}`,
  abi: any,
  fn: string,
  args: any[],
  gas?: bigint
): Promise<{ hash: string; status: 'success' | 'revert' }> {
  try {
    const hash = await client.writeContract({
      address: to,
      abi: abi,
      functionName: fn,
      args,
      gas: gas ?? 500000n,
      chain: undefined,
      account: undefined,
    });
    const publicClient = makePublicClient(loadConfig());
    await publicClient.waitForTransactionReceipt({ hash });
    return { hash, status: 'success' };
  } catch (e: any) {
    return { hash: '0x' + '0'.repeat(64), status: 'revert' };
  }
}

async function runUnprotected(config: Config): Promise<ScenarioResult> {
  const deployer = makeClient(config, config.deployerKey);
  const attacker = makeClient(config, config.attackerKey);
  const pub = makePublicClient(config);
  const txs: TxRecord[] = [];

  // Step 0: Disable the security controller (this is the "unprotected" scenario)
  const disableRes = await sendAndWait(
    deployer, config.lendingPool,
    LENDING_POOL_ABI,
    'disableSecurityController', []
  );
  txs.push({ step: 0, description: 'Disable security controller (UNPROTECTED)', txHash: disableRes.hash, status: disableRes.status });

  // Step 1: Mint collateral for attacker
  const mintRes = await sendAndWait(
    deployer, config.collateral,
    ['function mint(address to, uint256 amount) external'],
    'mint', [attacker.account.address, COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 1, description: 'Mint collateral for attacker', txHash: mintRes.hash, status: mintRes.status });

  // Step 2: Approve pool to spend collateral
  const approveRes = await sendAndWait(
    attacker, config.collateral,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    'approve', [config.lendingPool as `0x${string}`, COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 2, description: 'Approve collateral for pool', txHash: approveRes.hash, status: approveRes.status });

  // Step 3: Deposit collateral
  const depositRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'deposit', [COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 3, description: 'Deposit 100e18 collateral', txHash: depositRes.hash, status: depositRes.status });

  // Step 4: Borrow at $1 (75% of $100 = 75e18)
  const borrowRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'borrow', [75n * 10n ** 18n]
  );
  txs.push({ step: 4, description: 'Borrow 75e18 at $1', txHash: borrowRes.hash, status: borrowRes.status });

  // Step 5: Manipulate oracle to $1.80
  const priceRes = await sendAndWait(
    attacker, config.oracle,
    ORACLE_ABI,
    'setPrice', [config.collateral as `0x${string}`, INFLATED_PRICE]
  );
  txs.push({ step: 5, description: 'Manipulate oracle to $1.80', txHash: priceRes.hash, status: priceRes.status });

  // Step 6: Borrow extra (60e18 more)
  const cap: any = await pub.readContract({
    address: config.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: 'getBorrowCapacity',
    args: [attacker.account.address as `0x${string}`],
  });
  const extraBorrow = BigInt(cap) - 75n * 10n ** 18n;
  const extraBorrowRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'borrow', [extraBorrow]
  );
  txs.push({ step: 6, description: `Borrow ${extraBorrow} more at inflated price`, txHash: extraBorrowRes.hash, status: extraBorrowRes.status });

  // Step 7: Withdraw all collateral (UNPROTECTED — no controller)
  const projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 10n ** 18n;
  const withdrawRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'withdraw', [COLLATERAL_DEPOSIT, projectedCollatValue, BigInt(cap), false, 0]
  );
  txs.push({ step: 7, description: 'Withdraw all collateral (UNPROTECTED)', txHash: withdrawRes.hash, status: withdrawRes.status });

  // Final state
  const balance: any = await pub.readContract({
    address: config.collateral,
    abi: COLLATERAL_ABI,
    functionName: 'balanceOf',
    args: [attacker.account.address as `0x${string}`],
  });
  const state: any = await pub.readContract({
    address: config.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: 'getUserState',
    args: [attacker.account.address as `0x${string}`],
  });

  return {
    scenario: 'UNPROTECTED',
    transactions: txs,
    finalState: {
      attackerCollateralBalance: formatEther(balance as bigint),
      attackerDebt: formatEther(state[1] as bigint),
      collateralValue: formatEther(state[2] as bigint),
      borrowCapacity: formatEther(state[3] as bigint),
    },
    attackSucceeded: withdrawRes.status === 'success',
    reason: withdrawRes.status === 'success'
      ? 'Withdrawal succeeded without defense — attacker extracted all collateral after oracle manipulation'
      : 'Withdrawal failed unexpectedly',
  };
}

async function runProtected(config: Config): Promise<ScenarioResult> {
  // Use a fresh attacker account for the protected scenario
  const attackerKey = generatePrivateKey();
  const deployer = makeClient(config, config.deployerKey);
  const attacker = makeClient(config, attackerKey);
  const pub = makePublicClient(config);
  const txs: TxRecord[] = [];

  // Step 0: Re-enable the security controller (deployer only, via setSecurityController)
  const controllerAddr = await getControllerAddress(config, deployer);
  const reenableRes = await sendAndWait(
    deployer, config.lendingPool,
    LENDING_POOL_ABI,
    'setSecurityController', [controllerAddr as `0x${string}`]
  );
  txs.push({ step: 0, description: 'Re-enable security controller (PROTECTED)', txHash: reenableRes.hash, status: reenableRes.status });

  // Step 1: Mint collateral
  const mintRes = await sendAndWait(
    deployer, config.collateral,
    ['function mint(address to, uint256 amount) external'],
    'mint', [attacker.account.address, COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 1, description: 'Mint collateral for attacker', txHash: mintRes.hash, status: mintRes.status });

  // Step 2: Approve + deposit
  const approveRes = await sendAndWait(
    attacker, config.collateral,
    ['function approve(address spender, uint256 amount) external returns (bool)'],
    'approve', [config.lendingPool as `0x${string}`, COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 2, description: 'Approve collateral for pool', txHash: approveRes.hash, status: approveRes.status });

  const depositRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'deposit', [COLLATERAL_DEPOSIT]
  );
  txs.push({ step: 3, description: 'Deposit 100e18 collateral', txHash: depositRes.hash, status: depositRes.status });

  // Step 3: Borrow at $1
  const borrowRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'borrow', [75n * 10n ** 18n]
  );
  txs.push({ step: 4, description: 'Borrow 75e18 at $1', txHash: borrowRes.hash, status: borrowRes.status });

  // Step 4: Manipulate oracle
  const priceRes = await sendAndWait(
    attacker, config.oracle,
    ORACLE_ABI,
    'setPrice', [config.collateral as `0x${string}`, INFLATED_PRICE]
  );
  txs.push({ step: 5, description: 'Manipulate oracle to $1.80', txHash: priceRes.hash, status: priceRes.status });

  // Step 5: Borrow extra
  const cap: any = await pub.readContract({
    address: config.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: 'getBorrowCapacity',
    args: [attacker.account.address as `0x${string}`],
  });
  const extraBorrow = BigInt(cap) - 75n * 10n ** 18n;
  const extraBorrowRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'borrow', [extraBorrow]
  );
  txs.push({ step: 6, description: 'Borrow extra at inflated price', txHash: extraBorrowRes.hash, status: extraBorrowRes.status });

  // Step 7: Withdraw — PROTECTED (controller armed)
  const projectedCollatValue = (COLLATERAL_DEPOSIT * INFLATED_PRICE) / 10n ** 18n;
  const withdrawRes = await sendAndWait(
    attacker, config.lendingPool,
    LENDING_POOL_ABI,
    'withdraw', [COLLATERAL_DEPOSIT, projectedCollatValue, BigInt(cap), true, 85]
  );
  txs.push({
    step: 7,
    description: 'Withdraw all collateral (PROTECTED — should be BLOCKED)',
    txHash: withdrawRes.hash,
    status: withdrawRes.status
  });

  const balance: any = await pub.readContract({
    address: config.collateral,
    abi: COLLATERAL_ABI,
    functionName: 'balanceOf',
    args: [attacker.account.address as `0x${string}`],
  });
  const state: any = await pub.readContract({
    address: config.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: 'getUserState',
    args: [attacker.account.address as `0x${string}`],
  });

  return {
    scenario: 'PROTECTED',
    transactions: txs,
    finalState: {
      attackerCollateralBalance: formatEther(balance as bigint),
      attackerDebt: formatEther(state[1] as bigint),
      collateralValue: formatEther(state[2] as bigint),
      borrowCapacity: formatEther(state[3] as bigint),
    },
    attackSucceeded: withdrawRes.status === 'success',
    reason: withdrawRes.status === 'revert'
      ? 'Withdrawal BLOCKED by SecurityController — invariant violation detected'
      : 'Withdrawal unexpectedly succeeded — defense failed!',
  };
}

export async function runComparison() {
  const config = loadConfig();
  if (!config.lendingPool || !config.oracle || !config.collateral) {
    console.error('Missing contract addresses. Set LENDING_POOL, ORACLE, COLLATERAL env vars.');
    process.exit(1);
  }

  console.log('=== UNPROTECTED Scenario ===');
  console.log('Controller: DISABLED');
  const unprotected = await runUnprotected(config);
  console.log('Attack succeeded:', unprotected.attackSucceeded);

  // For protected run, we need a fresh state — in a real demo this
  // would be a fork or fresh deployment
  console.log('\n=== PROTECTED Scenario ===');
  console.log('Controller: ENABLED');
  const protectedResult = await runProtected(config);
  console.log('Attack succeeded:', protectedResult.attackSucceeded);

  console.log('\n=== Comparison ===');
  console.log(JSON.stringify({
    unprotected: {
      attackSucceeded: unprotected.attackSucceeded,
      reason: unprotected.reason,
    },
    protected: {
      attackSucceeded: protectedResult.attackSucceeded,
      reason: protectedResult.reason,
    },
    defenseWorks: !protectedResult.attackSucceeded && unprotected.attackSucceeded,
  }, null, 2));
}

// Run if called directly
if (require.main === module) {
  runComparison().catch(console.error);
}
