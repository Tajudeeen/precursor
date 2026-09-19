/**
 * Precursor Defense API — Control + Investigation Layer
 *
 * Orchestrates the defense loop:
 *   events → behavior engine → attack path → simulation → invariant → policy → defense action
 *
 * Endpoints:
 *   GET  /health         - health check
 *   GET  /overview       - protection status, active threats, latest detection
 *   GET  /latest         - full latest defense result
 *   GET  /investigation  - investigation view (story: what happened → why it matters → what would happen → what system did)
 *   POST /run-scenario   - execute the full defense loop
 */

import path from 'path';
import express, { Request, Response } from 'express';
import { EvmListener } from '@precursor/evm';
import { BehaviorEngine } from '@precursor/behavior-engine';
import { AttackPathEngine } from '@precursor/attack-analysis';
import { SimulationEngine } from '@precursor/simulation';
import { PolicyEngine } from '@precursor/policy-engine';

import type { DefenseResult, EvmConfig } from '@precursor/shared';

const app = express();
app.use(express.json());

// Serve the investigation UI
app.use(express.static(path.join(process.cwd(), 'apps/api/public')));

// =====================================================
// Configuration
// =====================================================

const config: EvmConfig = {
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8555',
  chainId: parseInt(process.env.CHAIN_ID || '31337'),
  contractAddresses: {
    lendingPool: (process.env.LENDING_POOL || '0x0000000000000000000000000000000000000001') as `0x${string}`,
    oracle: (process.env.ORACLE || '0x0000000000000000000000000000000000000002') as `0x${string}`,
    collateral: (process.env.COLLATERAL || '0x0000000000000000000000000000000000000003') as `0x${string}`,
    securityController: (process.env.SECURITY_CONTROLLER || '0x0000000000000000000000000000000000000004') as `0x${string}`,
  },
};

// =====================================================
// Services
// =====================================================

const evm = new EvmListener(config);
const behaviorEngine = new BehaviorEngine();
const attackPathEngine = new AttackPathEngine();
const simulationEngine = new SimulationEngine({
  rpcUrl: config.rpcUrl,
  lendingPoolAddress: config.contractAddresses.lendingPool,
  oracleAddress: config.contractAddresses.oracle,
  collateralAddress: config.contractAddresses.collateral,
});
const policyEngine = new PolicyEngine();

// Latest defense result (in-memory for V1)
let latestResult: DefenseResult | null = null;

// =====================================================
// Routes
// =====================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req: Request, res: Response) => {
  res.sendFile('index.html', { root: path.join(process.cwd(), 'apps/api/public') });
});

app.get('/overview', (_req: Request, res: Response) => {
  if (!latestResult) {
    return res.json({
      protectionStatus: 'ACTIVE',
      activeThreats: 0,
      latestDetection: null,
      defensiveState: 'NORMAL',
      action: 'NONE',
    });
  }

  res.json({
    protectionStatus: latestResult.unprotected ? 'INACTIVE' : 'ACTIVE',
    activeThreats: latestResult.behaviorObservation ? 1 : 0,
    latestDetection: latestResult.behaviorObservation?.pattern ?? null,
    defensiveState: latestResult.policyDecision?.level ?? 'NORMAL',
    action: latestResult.defenseAction?.action ?? 'NONE',
  });
});

app.get('/latest', (_req: Request, res: Response) => {
  if (!latestResult) {
    return res.status(404).json({ error: 'No defense results yet' });
  }
  res.json(latestResult);
});

app.get('/investigation', (_req: Request, res: Response) => {
  if (!latestResult) {
    return res.status(404).json({ error: 'No investigation results yet' });
  }

  // The investigation tells a story:
  // WHAT HAPPENED → WHY IT MATTERS → WHAT WOULD HAPPEN → WHAT THE SYSTEM DID
  res.json({
    whatHappened: {
      pattern: latestResult.behaviorObservation?.pattern,
      sequence: latestResult.behaviorObservation?.sequence,
      confidence: latestResult.behaviorObservation?.confidence,
      evidence: latestResult.behaviorObservation?.confidenceEvidence,
    },
    whyItMatters: {
      summary: latestResult.attackPath?.summary,
      steps: latestResult.attackPath?.steps,
    },
    whatWouldHappen: {
      invariantBefore: latestResult.simulation?.invariantBefore,
      invariantAfter: latestResult.simulation?.invariantAfter,
      invariantResult: latestResult.simulation?.invariantResult,
      evidence: latestResult.simulation?.invariantEvidence,
      stateDiff: latestResult.simulation?.stateDiff,
      assetDiff: latestResult.simulation?.assetDiff,
    },
    whatSystemDid: {
      decision: latestResult.policyDecision?.decision,
      level: latestResult.policyDecision?.level,
      reason: latestResult.policyDecision?.reason,
      blocked: latestResult.blocked,
    },
  });
});

app.post('/run-scenario', async (req: Request, res: Response) => {
  try {
    const result = await runDefenseLoop();
    latestResult = result;
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =====================================================
// Defense Loop
// =====================================================

async function runDefenseLoop(): Promise<DefenseResult> {
  const now = Math.floor(Date.now() / 1000);

  // 1. Ingest events from the EVM
  const events = await evm.pollNewEvents();
  console.log(`[defense-loop] ingested ${events.length} events`);

  if (events.length === 0) {
    return {
      attacker: '0x0000000000000000000000000000000000000000',
      unprotected: false,
      blocked: false,
      timestamp: now,
    };
  }

  // 2. Behavior engine: detect suspicious sequences
  const observations = behaviorEngine.analyze(events);
  console.log(`[defense-loop] observations: ${observations.length}`);
  if (observations.length === 0 && events.length > 0) {
    console.log('[defense-loop] debug: event names:', events.map(e => e.eventName).join(','));
    console.log('[defense-loop] debug: addresses:', [...new Set(events.map(e => e.from || e.contractAddress))].join(','));
  }

  if (observations.length === 0) {
    return {
      attacker: events[0].from || 'unknown',
      unprotected: false,
      blocked: false,
      timestamp: now,
    };
  }

  // Use the highest confidence observation
  const observation = observations.reduce((best, curr) =>
    curr.confidence > best.confidence ? curr : best
  );

  // 3. Attack path engine: reconstruct the attack path
  const attackPath = attackPathEngine.reconstructPath(observation);

  // 4. Simulation engine: simulate consequences
  const block = await evm.getCurrentBlock();
  const price = await evm.getOraclePrice(config.contractAddresses.collateral);
  const userState = await evm.getUserStateBefore(observation.address as `0x${string}`);

  const simulation = await simulationEngine.simulate({
    attackerAddress: observation.address as `0x${string}`,
    currentBlock: block,
    currentPrice: price,
    currentCollateralValue: userState.collateralValue,
    currentDebt: userState.debt,
    events,
    attackPath,
  });

  // 5. Policy engine: deterministic decision
  const decision = policyEngine.makeDecision(observation, simulation);
  const defenseAction = policyEngine.toDefenseAction(decision, simulation);

  // 6. Result
  return {
    attacker: observation.address,
    unprotected: false,
    behaviorObservation: observation,
    attackPath,
    simulation,
    invariant: {
      name: 'collateralization',
      description: 'collateralValue / debtValue >= 150%',
      threshold: '15000 BPS',
      formula: 'collateralValue / debtValue >= 150%',
      isViolated: simulation.invariantResult === 'VIOLATION',
    },
    policyDecision: decision,
    defenseAction,
    blocked: decision.decision === 'BLOCK',
    timestamp: now,
  };
}

// =====================================================
// Server
// =====================================================

const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, () => {
  console.log(`[precursor] Defense API listening on port ${PORT}`);
  console.log(`[precursor] RPC: ${config.rpcUrl}`);
});
