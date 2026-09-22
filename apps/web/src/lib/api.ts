/**
 * Precursor Defense API Client
 * Connects to the Express defense engine backend.
 */

export interface OverviewData {
  protectionStatus: 'ACTIVE' | 'INACTIVE';
  activeThreats: number;
  latestDetection: string | null;
  defensiveState: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  action: 'ALLOW' | 'REVIEW' | 'BLOCK' | 'NONE';
}

export interface ProtocolData {
  chain: {
    id: number;
    name: string;
    rpcUrl: string;
    blockNumber: number;
  };
  protocol: {
    name: string;
    description: string;
    owner: string;
    securityControllerEnabled: boolean;
    activeController: string;
    protectedOperation: string;
    borrowFactor: string;
    liquidationThreshold: string;
  };
  contracts: {
    lendingPool: string;
    oracle: string;
    collateral: string;
    securityController: string;
  };
  assets: Array<{
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    role: string;
  }>;
  oracle: {
    type: string;
    currentPrice: string;
    rawPrice: string;
    scale: string;
    vulnerability: string;
  };
  invariants: Array<{
    name: string;
    threshold: string;
    formula: string;
    minRatioBps: number;
    currentRatioBps: number;
    healthy: boolean;
  }>;
  defensiveState: {
    status: string;
    mode: string;
    controllerEnforced: boolean;
    lastDecision: string;
  };
}

export interface ThreatItem {
  id: string;
  pattern: string;
  name: string;
  confidence: number;
  confidenceEvidence: string[];
  attacker: string;
  contractsInvolved: string[];
  potentialConsequence: string;
  sequenceSummary?: string;
  steps?: Array<{
    step: number;
    description: string;
    component: string;
    stateChange?: string;
  }>;
  simulationVerdict: string;
  simulationEvidence: string[];
  policyDecision: string;
  defensiveLevel: string;
  status: string;
  timestamp?: number;
}

export interface ThreatsData {
  activeThreatsCount: number;
  threats: ThreatItem[];
  catalog: Array<{
    pattern: string;
    description: string;
    sensitivityThreshold: number;
    severity: string;
  }>;
}

export interface InvestigationData {
  whatHappened: {
    pattern?: string;
    sequence?: Array<{ event: string; timestamp: number; details: string }>;
    confidence?: number;
    evidence?: string[];
  };
  whyItMatters: {
    summary?: string;
    steps?: Array<{ step: number; description: string; component: string; stateChange?: string }>;
  };
  whatWouldHappen: {
    invariantBefore?: string;
    invariantAfter?: string;
    invariantResult?: string;
    evidence?: string[];
    stateDiff?: { entries: Array<{ key: string; before: string; after: string }> };
    assetDiff?: {
      attacker: { borrowableAssets: string };
      protocol: { availableLiquidity: string };
    };
  };
  whatSystemDid: {
    decision?: 'ALLOW' | 'REVIEW' | 'BLOCK';
    level?: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
    reason?: string;
    blocked?: boolean;
  };
}

export interface TimelineData {
  attacker: string;
  steps: Array<{
    stepIndex: number;
    timestamp: number;
    action: string;
    description: string;
    component: string;
    stateSnapshot: {
      oraclePrice: string;
      collateralValue: string;
      borrowCapacity: string;
      debt: string;
      invariantRatioBps: string;
      invariantHealthy: boolean;
    };
    eventName?: string;
    delta?: {
      priceChange?: string;
      collateralChange?: string;
      debtChange?: string;
      capacityChange?: string;
    };
  }>;
  protectedOutcome: {
    blocked: boolean;
    atStep: number;
    reason: string;
  };
  unprotectedOutcome: {
    succeeded: boolean;
    extractedValue: string;
  };
}

export interface EconomicsData {
  projectedAttackerGain: string;
  projectedProtocolLoss: string;
  projectedLiquidityDrain: string;
  actualAttackerGain: string;
  actualProtocolLoss: string;
  valueSaved: string;
  percentageSaved: string;
  defenseROI: string;
}

export interface BenchmarkData {
  ingestionLatencyMs: number;
  detectionLatencyMs: number;
  simulationLatencyMs: number;
  decisionLatencyMs: number;
  totalLatencyMs: number;
  eventsProcessed: number;
  timestamp: number;
}

export interface PipelineHealthData {
  overall: 'operational' | 'degraded' | 'down';
  stages: Array<{
    stage: string;
    status: 'healthy' | 'degraded' | 'down';
    lastRunMs: number;
    lastRunAt: number;
    errorCount: number;
    lastError?: string;
  }>;
  uptime: number;
  startedAt: number;
  lastCheck: number;
}

export interface ComparisonData {
  timestamp: number;
  unprotected: {
    scenario: string;
    transactions: Array<{
      step: number;
      description: string;
      txHash: string;
      status: 'success' | 'revert';
    }>;
    finalState: {
      attackerCollateralBalance: string;
      attackerDebt: string;
      collateralValue: string;
      borrowCapacity: string;
    };
    attackSucceeded: boolean;
    reason: string;
  };
  protected: {
    scenario: string;
    transactions: Array<{
      step: number;
      description: string;
      txHash: string;
      status: 'success' | 'revert';
    }>;
    finalState: {
      attackerCollateralBalance: string;
      attackerDebt: string;
      collateralValue: string;
      borrowCapacity: string;
    };
    attackSucceeded: boolean;
    reason: string;
  };
  defenseWorks: boolean;
  summary: {
    unprotectedOutcome: string;
    protectedOutcome: string;
    defenseEfficacy: string;
    proofVerdict: string;
  };
}

const API_BASE = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${errText}`);
  }
  return res.json();
}

export interface ProofData {
  verifiedAt: number;
  chain: {
    id: number;
    name: string;
    blockNumber: number;
    blockHash: string;
    rpcLatencyMs: number;
    rpcEndpoint: string;
  };
  contracts: {
    lendingPool: string;
    oracle: string;
    collateral: string;
    securityController: string;
  };
  onChainState: {
    oracleSpotPrice: string;
    vaultCollateralReserves: string;
    securityControllerArmed: boolean;
    minCollateralRatioBps: number;
    minCollateralRatioFormatted: string;
  };
  negativeProofs: Array<{
    id: string;
    title: string;
    targetContract: string;
    description: string;
    expectedError: string;
    actualResult: string;
    status: string;
    revertReason: string;
  }>;
  knownLimitations: Array<{
    area: string;
    disclosure: string;
    riskLevel: string;
  }>;
  proofHash: string;
}

export interface SandboxState {
  blockNumber: number;
  oraclePrice: string;
  oraclePriceRaw: string;
  poolCollateral: string;
  attackerCollateral: string;
  attackerDebt: string;
  borrowCapacity: string;
  securityControllerArmed: boolean;
  minCollateralRatioFormatted: string;
  currentCollateralRatioFormatted: string;
  isSolvent: boolean;
}

export interface SandboxStepResult {
  step: string;
  status: 'success' | 'revert';
  txHash: string;
  description: string;
  revertReason?: string;
  state: SandboxState;
}

export const api = {
  getOverview: () => fetchJson<OverviewData>('/api/overview'),
  getProtocol: () => fetchJson<ProtocolData>('/api/protocol'),
  getThreats: () => fetchJson<ThreatsData>('/api/threat'),
  getInvestigation: () => fetchJson<InvestigationData>('/api/investigation'),
  getTimeline: () => fetchJson<TimelineData>('/api/timeline'),
  getEconomics: () => fetchJson<EconomicsData>('/api/economics'),
  getBenchmark: () => fetchJson<BenchmarkData>('/api/benchmark'),
  getHeartbeat: () => fetchJson<PipelineHealthData>('/api/heartbeat'),
  getComparison: () => fetchJson<ComparisonData>('/api/comparison'),
  getProof: () => fetchJson<ProofData>('/api/proof'),
  getSandboxState: () => fetchJson<SandboxState>('/api/sandbox/state'),
  executeSandboxStep: (step: string, mode: 'protected' | 'unprotected' = 'protected', customPrice?: string) =>
    fetchJson<SandboxStepResult>('/api/sandbox/step', {
      method: 'POST',
      body: JSON.stringify({ step, mode, customPrice }),
    }),
  resetSandbox: () => fetchJson<SandboxStepResult>('/api/sandbox/reset', { method: 'POST' }),
  runScenario: () => fetchJson<any>('/api/run-scenario', { method: 'POST' }),
  runComparison: () => fetchJson<ComparisonData>('/api/run-comparison', { method: 'POST' }),
};
