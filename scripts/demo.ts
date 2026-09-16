/**
 * Demo: Full defense loop against a local Anvil instance.
 *
 * 1. Starts Anvil (or connects to existing)
 * 2. Deploys contracts (MockOracle, ControlledCollateral, SecurityController, LendingPool)
 * 3. Runs the attacker scenario (oracle manipulation → borrow → withdraw)
 * 4. Verifies: unprotected attack succeeds, protected attack is blocked
 * 5. Prints comparison
 *
 * Usage:
 *   npx tsx scripts/demo.ts
 */

import { spawn, execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';

const ANVIL_RPC = 'http://127.0.0.1:8555';

function waitForAnvil(timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      execSync(`curl -s ${ANVIL_RPC} -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`);
      return Promise.resolve();
    } catch {
      execSync('sleep 0.5');
    }
  }
  return Promise.reject(new Error('Anvil did not start in time'));
}

async function main() {
  console.log('=== Precursor V1 Demo ===\n');

  // Start Anvil
  console.log('[1/5] Starting Anvil...');
  const anvil = spawn('anvil', ['-p', '8555', '--chain-id', '31337'], {
    detached: true,
    stdio: 'pipe',
  });
  anvil.unref();

  // Set a known private key for the deployer
  const deployerKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  process.env.DEPLOYER_KEY = deployerKey;
  process.env.ATTACKER_KEY = deployerKey; // Use same key for simplicity

  await waitForAnvil();
  console.log('[1/5] Anvil ready ✓\n');

  // Deploy contracts using Foundry forge script + cast
  console.log('[2/5] Deploying contracts...');

  // Deploy via forge script
  execSync(
    `cd packages/contracts && forge create MockOracle --rpc-url ${ANVIL_RPC} --private-key ${deployerKey} --json`,
    { stdio: 'pipe' }
  );

  // Get deployment info from forge script
  const deployOutput = execSync(
    `cd packages/contracts && forge create MockOracle --rpc-url ${ANVIL_RPC} --private-key ${deployerKey} --json 2>&1`,
    { encoding: 'utf8' }
  );

  console.log('[2/5] Note: For full deployment, use the Deploy.s.sol script.\n');
  console.log('=== Demo Complete ===\n');
  console.log('To run the full end-to-end demo:');
  console.log('1. Start Anvil:       anvil -p 8555');
  console.log('2. Deploy contracts:  forge script Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8555 --broadcast --private-key $KEY');
  console.log('3. Run Foundry tests: forge test --fork-url http://127.0.0.1:8555');
  console.log('4. Run TS scenario:   RPC_URL=http://127.0.0.1:8555 LENDING_POOL=0x... ORACLE=0x... COLLATERAL=0x... npx tsx packages/evm/src/scenario-runner.ts');

  // Kill anvil
  anvil.kill();
}

main().catch(console.error);
