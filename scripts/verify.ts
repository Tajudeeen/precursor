import { execSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Step {
  name: string;
  command: string;
  cwd?: string;
  category: 'TYPECHECK' | 'TEST' | 'CONTRACTS' | 'BUILD';
}

function getForgeBin(): string {
  if (process.env.FORGE_BIN) return process.env.FORGE_BIN;
  const home = homedir();
  const candidate = path.join(home, '.foundry', 'bin', process.platform === 'win32' ? 'forge.exe' : 'forge');
  if (existsSync(candidate)) return `"${candidate}"`;
  return 'forge';
}

const STEPS: Step[] = [
  {
    name: 'TypeScript Static Typecheck',
    command: 'npx tsc --noEmit',
    category: 'TYPECHECK'
  },
  {
    name: 'Unit & Integration Tests (Vitest)',
    command: 'npx vitest run',
    category: 'TEST'
  },
  {
    name: 'Smart Contract Tests (Foundry)',
    command: `${getForgeBin()} test`,
    cwd: path.resolve(__dirname, '../packages/contracts'),
    category: 'CONTRACTS'
  },
  {
    name: 'Monorepo Workspace Build',
    command: 'npm run build',
    category: 'BUILD'
  }
];

function runVerify() {
  console.log('\n============================================================');
  console.log('       PRECURSOR // SINGLE-SHOT VERIFICATION GATE           ');
  console.log('       Standard: web3-senior-engineer-auditor               ');
  console.log('============================================================\n');

  const results: { name: string; category: string; duration: number; status: 'PASS' | 'FAIL'; error?: string }[] = [];
  const startTime = Date.now();
  let hasFailure = false;

  for (const step of STEPS) {
    process.stdout.write(`[*] Running ${step.name}... `);
    const stepStart = Date.now();
    try {
      execSync(step.command, {
        cwd: step.cwd || path.resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });
      const duration = Date.now() - stepStart;
      console.log(`\x1b[32mPASSED\x1b[0m (${duration}ms)`);
      results.push({ name: step.name, category: step.category, duration, status: 'PASS' });
    } catch (err: any) {
      const duration = Date.now() - stepStart;
      hasFailure = true;
      const stderr = err.stderr ? err.stderr.toString() : err.message;
      const stdout = err.stdout ? err.stdout.toString() : '';
      console.log(`\x1b[31mFAILED\x1b[0m (${duration}ms)`);
      results.push({
        name: step.name,
        category: step.category,
        duration,
        status: 'FAIL',
        error: (stdout + '\n' + stderr).trim()
      });
      break; // fail fast
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log('\n------------------------------------------------------------');
  console.log(' VERIFICATION SUMMARY');
  console.log('------------------------------------------------------------');
  for (const r of results) {
    const symbol = r.status === 'PASS' ? '\x1b[32m[✓]\x1b[0m' : '\x1b[31m[✗]\x1b[0m';
    console.log(`${symbol} ${r.name.padEnd(38)} [${r.category}]  ${r.duration}ms`);
    if (r.error) {
      console.log('\n\x1b[31m--- Error Output ---\x1b[0m');
      console.log(r.error.slice(0, 1500));
      console.log('\x1b[31m--------------------\x1b[0m\n');
    }
  }

  console.log('------------------------------------------------------------');
  if (hasFailure) {
    console.log(`\x1b[31mVERIFICATION GATE FAILED\x1b[0m in ${totalDuration}ms`);
    console.log('Action: Fix failing check and rerun scripts/verify before proceeding.');
    process.exit(1);
  } else {
    console.log(`\x1b[32mVERIFICATION GATE PASSED\x1b[0m in ${totalDuration}ms`);
    console.log('All 4 gates (typecheck, tests, contract tests, build) are GREEN.');
    process.exit(0);
  }
}

runVerify();
