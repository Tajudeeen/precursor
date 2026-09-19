import { describe, it, expect, beforeAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';

interface ContractAddresses {
  ORACLE: string;
  COLLATERAL: string;
  LENDING_POOL: string;
  SECURITY_CONTROLLER: string;
  DEPLOYER_KEY: string;
}

function httpGet(url: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body: any = data;
        try { body = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode ?? 200, body });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpPost(url: string, body: Record<string, unknown>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body: any = data;
        try { body = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode ?? 200, body });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function getBroadcastAddresses(): Promise<ContractAddresses> {
  const b = JSON.parse(
    fs.readFileSync('packages/contracts/broadcast/DeployV1.s.sol/31337/run-latest.json', 'utf8')
  );
  const txs = b.transactions;
  let oracle = '', collateral = '', pool = '', controller = '';
  for (let i = 0; i < txs.length; i++) {
    const a = txs[i].contractAddress || '';
    if (!a || (oracle && collateral && pool && controller)) continue;
    switch (i) {
      case 0: oracle = a; break;
      case 1: collateral = a; break;
      case 2: pool = a; break;
      case 3: controller = a; break;
    }
  }
  return {
    ORACLE: oracle,
    COLLATERAL: collateral,
    LENDING_POOL: pool,
    SECURITY_CONTROLLER: controller,
    DEPLOYER_KEY: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  };
}

describe('Integration: Defense Loop End-to-End', () => {
  const API_BASE = process.env.API_URL || 'http://localhost:8000';
  let testAddr: ContractAddresses;

  beforeAll(async () => {
    testAddr = await getBroadcastAddresses();
  });

  it('POST /run-scenario blocks an oracle manipulation attack', async () => {
    const res = await httpPost(`${API_BASE}/run-scenario`, {});
    expect(res.status).toBe(200);

    const data = res.body;
    expect(data.blocked).toBe(true);
    expect(data.behaviorObservation).toBeDefined();
    expect(data.behaviorObservation && data.behaviorObservation.pattern).toBeTruthy();
    expect(data.attackPath).toBeDefined();
    expect(data.attackPath && data.attackPath.steps.length).toBeGreaterThan(0);
    expect(data.simulation).toBeDefined();
    expect(data.simulation && data.simulation.stateDiff).toBeDefined();
    expect(data.simulation && Array.isArray(data.simulation.stateDiff.entries)).toBe(true);
    expect(data.simulation && data.simulation.stateDiff.entries.length).toBeGreaterThan(0);
    expect(data.simulation && data.simulation.invariantResult).toBe('VIOLATION');
    expect(data.simulation && data.simulation.invariantEvidence.length).toBeGreaterThan(0);
    expect(data.policyDecision && data.policyDecision.decision).toBe('BLOCK');
    expect(data.policyDecision && data.policyDecision.reason).toBeTruthy();
    expect(data.defenseAction && data.defenseAction.action).toBe('BLOCK');
  });

  it('GET /overview reflects the active defense state', async () => {
    const res = await httpGet(`${API_BASE}/overview`);
    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.protectionStatus).toBe('ACTIVE');
    expect(data.activeThreats).toBe(1);
    expect(data.latestDetection).toBeTruthy();
    expect(data.defensiveState).toBe('CRITICAL');
    expect(data.action).toBe('BLOCK');
  });

  it('GET /investigation returns the full incident story', async () => {
    const res = await httpGet(`${API_BASE}/investigation`);
    expect(res.status).toBe(200);
    const data = res.body;

    expect(data.whatHappened && data.whatHappened.pattern).toBeTruthy();
    expect(data.whatHappened && Array.isArray(data.whatHappened.sequence)).toBe(true);
    expect(data.whatHappened && data.whatHappened.confidence).toBeGreaterThanOrEqual(70);
    expect(data.whatHappened && Array.isArray(data.whatHappened.evidence)).toBe(true);

    expect(data.whyItMatters && data.whyItMatters.summary).toBeTruthy();
    expect(data.whyItMatters && Array.isArray(data.whyItMatters.steps)).toBe(true);

    expect(data.whatWouldHappen && data.whatWouldHappen.invariantResult).toBe('VIOLATION');
    expect(data.whatWouldHappen && data.whatWouldHappen.invariantEvidence.length).toBeGreaterThan(0);

    expect(data.whatSystemDid && data.whatSystemDid.decision).toBe('BLOCK');
    expect(data.whatSystemDid && data.whatSystemDid.level).toBe('CRITICAL');
    expect(data.whatSystemDid && data.whatSystemDid.reason).toBeTruthy();
    expect(data.whatSystemDid && data.whatSystemDid.blocked).toBe(true);
  });
});
