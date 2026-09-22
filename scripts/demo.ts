/**
 * Demo: Full defense loop against a local Anvil instance.
 *
 * Cross-platform (Windows + Unix) — no shell dependencies like curl/sleep.
 *
 * 1. Connects to existing Anvil instance (start separately: `anvil -p 8555`)
 * 2. Deploys contracts via DeployV1.s.sol
 * 3. Runs the attacker scenario (oracle manipulation → borrow → withdraw)
 * 4. Starts the defense API
 * 5. Runs the defense loop
 *
 * Usage:
 *   npx tsx scripts/demo.ts
 *
 * Prerequisites:
 *   - Anvil running on port 8555: `anvil -p 8555`
 *   - Foundry installed (forge, cast)
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const ANVIL_RPC = 'http://127.0.0.1:8555';
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function getForgeBin(): string {
  if (process.env.FORGE_BIN) return process.env.FORGE_BIN;
  const home = homedir();
  const candidate = join(home, '.foundry', 'bin', process.platform === 'win32' ? 'forge.exe' : 'forge');
  if (existsSync(candidate)) return `"${candidate}"`;
  return 'forge';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForAnvil(timeout = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(ANVIL_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      });
      if (res.ok) return;
    } catch {
      // Anvil not ready yet
    }
    await sleep(500);
  }
  throw new Error('Anvil did not respond within timeout. Start it with: anvil -p 8555');
}

function run(cmd: string, options?: { cwd?: string; env?: Record<string, string> }): string {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: options?.cwd,
      env: { ...process.env, DEPLOYER_KEY, ...(options?.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: any) {
    console.error(`  Command failed: ${cmd}`);
    console.error(`  ${e.stderr || e.message}`);
    throw e;
  }
}

function parseDeployOutput(output: string): Record<string, string> {
  const addresses: Record<string, string> = {};
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('MockOracle:')) {
      addresses.oracle = line.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? '';
    }
    if (line.includes('ControlledCollateral:')) {
      addresses.collateral = line.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? '';
    }
    if (line.includes('SecurityController:')) {
      addresses.securityController = line.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? '';
    }
    if (line.includes('LendingPool:')) {
      addresses.lendingPool = line.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? '';
    }
  }
  return addresses;
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       PRECURSOR V1 — DEMO RUNNER        ║');
  console.log('║  Behavior-First DeFi Attack Defense      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Step 1: Check Anvil
  console.log('[1/4] Checking Anvil connection...');
  try {
    await waitForAnvil(10000);
    console.log('  ✓ Anvil is running on', ANVIL_RPC);
  } catch {
    console.error('  ✗ Anvil not found. Start it first:');
    console.error('    anvil -p 8555');
    process.exit(1);
  }

  // Step 2: Deploy contracts
  console.log('\n[2/4] Deploying contracts via DeployV1.s.sol...');
  const forgeBin = getForgeBin();
  const deployOutput = run(
    `${forgeBin} script script/DeployV1.s.sol:DeployV1 --rpc-url ${ANVIL_RPC} --broadcast --private-key ${DEPLOYER_KEY}`,
    { cwd: 'packages/contracts' }
  );
  const addresses = parseDeployOutput(deployOutput);

  if (!addresses.lendingPool || !addresses.oracle || !addresses.collateral) {
    console.error('  ✗ Failed to parse deployment addresses from output.');
    console.error('  Raw output:', deployOutput);
    process.exit(1);
  }

  console.log('  ✓ Contracts deployed:');
  console.log(`    MockOracle:          ${addresses.oracle}`);
  console.log(`    ControlledCollateral: ${addresses.collateral}`);
  console.log(`    SecurityController:   ${addresses.securityController}`);
  console.log(`    LendingPool:         ${addresses.lendingPool}`);

  // Step 3: Run attack scenario (steps 1-6, pre-withdraw)
  console.log('\n[3/4] Running attack scenario (steps 1-6)...');
  try {
    run(
      `${forgeBin} script script/AttackScenarioPart1.s.sol:AttackScenarioPart1 --rpc-url ${ANVIL_RPC} --broadcast --private-key ${DEPLOYER_KEY}`,
      {
        cwd: 'packages/contracts',
        env: {
          LENDING_POOL: addresses.lendingPool,
          ORACLE: addresses.oracle,
          COLLATERAL: addresses.collateral,
          SECURITY_CONTROLLER: addresses.securityController,
        },
      }
    );
    console.log('  ✓ Attack scenario executed (oracle manipulated, debt inflated)');
  } catch {
    console.error('  ✗ Attack scenario failed. Check Foundry output above.');
    process.exit(1);
  }

  // Step 4: Instructions for defense API
  console.log('\n[4/4] Setup complete!');
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║           START DEFENSE API              ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Run the API with these environment variables:');
  console.log('');
  console.log(`  $env:RPC_URL="${ANVIL_RPC}"`);
  console.log(`  $env:LENDING_POOL="${addresses.lendingPool}"`);
  console.log(`  $env:ORACLE="${addresses.oracle}"`);
  console.log(`  $env:COLLATERAL="${addresses.collateral}"`);
  console.log(`  $env:SECURITY_CONTROLLER="${addresses.securityController}"`);
  console.log(`  npm run dev:api`);
  console.log('');
  console.log('Then open http://localhost:3001 and click "Run Defense Loop"');
  console.log('');
  console.log('Or run the Foundry tests:');
  console.log('  cd packages/contracts && forge test -vvv');
}

main().catch(e => {
  console.error('\n✗ Demo failed:', e.message);
  process.exit(1);
});
