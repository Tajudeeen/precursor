// @ts-nocheck
/* [SYNC: all] */
import { describe, it, expect, before, after } from 'vitest';
import http from 'node:http';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT = process.cwd();
const FOUNDRY_BIN = 'forge';
const ANVIL_PORT = 8555;
const API_PORT = 3002;

let anvilProc: any = null;
let anvilUrl = '';
let apiUrl = '';

function waitFor(url: string, timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      http.get(url, (res) => res.statusCode === 200 ? resolve(true) : resolve(false)).on('error', () => resolve(false)).end();
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function httpGet(url: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let body: any = data;
        try { body = JSON.parse(data as string); } catch {}
        resolve({ status: res.statusCode ?? 200, body });
      });
    }).on('error', reject).end();
  });
}

async function httpPost(url: string, body: Record<string, unknown>): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let body: any = data;
        try { body = JSON.parse(data as string); } catch {}
        resolve({ status: res.statusCode ?? 200, body });
      });
    }).on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

describe.skipIfNoServer('Integration: Defense Loop End-to-End', () => {
  const skip = (msg: string) => {
    it.skip(msg);
    throw new Error(msg);
  };

  // Detect if server is already running
  const serverRunning = await waitFor(`http://127.0.0.1:${API_PORT}/health`, 3000);
  
  if (!serverRunning) {
    skip('API server not running on port ' + API_PORT + ' — start with: npx tsx apps/api/src/index.ts');
    return;
  }

  it('POST /run-scenario blocks the oracle manipulation attack', async () => {
    const res = await httpPost(`http://127.0.0.1:${API_PORT}/run-scenario`, {});
    expect(res.status).toBe(200);
    
    const data = res.body;
    expect(data.blocked).toBe(true);
    expect(data.behaviorObservation).toBeDefined();
    expect(data.behaviorObservation && data.behaviorObservation.pattern).toBeTruthy();
    expect(data.behaviorObservation && data.behaviorObservation.confidence).toBeGreaterThanOrEqual(70);
    
    expect(data.attackPath).toBeDefined();
    expect(Array.isArray(data.attackPath?.steps)).toBe(true);
    expect(data.attackPath?.steps.length).toBeGreaterThan(0);
    
    expect(data.simulation).toBeDefined();
    expect(data.simulation && data.simulation.stateDiff).toBeDefined();
    expect(Array.isArray(data.simulation?.stateDiff?.entries)).toBe(true);
    expect(data.simulation?.stateDiff?.entries.length).toBeGreaterThan(0);
    
    expect(data.simulation?.invariantResult).toBe('VIOLATION');
    expect(Array.isArray(data.simulation?.invariantEvidence)).toBe(true);
    expect(data.simulation?.invariantEvidence.length).toBeGreaterThan(0);
    
    expect(data.policyDecision && data.policyDecision.decision).toBe('BLOCK');
    expect(data.policyDecision && data.policyDecision.reason).toBeTruthy();
    expect(data.defenseAction && data.defenseAction.action).toBe('BLOCK');
  });

  it('GET /overview reflects the active defense state', async () => {
    const res = await httpGet(`http://127.0.0.1:${API_PORT}/overview`);
    expect(res.status).toBe(200);
    const data = res.body;
    expect(data.protectionStatus).toBe('ACTIVE');
    expect(data.activeThreats).toBeGreaterThan(0);
    expect(data.latestDetection).toBeTruthy();
    expect(['CRITICAL', 'HIGH'].includes(data.defensiveState)).toBe(true);
    expect(data.action).toBe('BLOCK');
  });

  it('GET /investigation returns the full incident story', async () => {
    const res = await httpGet(`http://127.0.0.1:${API_PORT}/investigation`);
    expect(res.status).toBe(200);
    const data = res.body;

    expect(data.whatHappened && data.whatHappened.pattern).toBeTruthy();
    expect(Array.isArray(data.whatHappened?.sequence)).toBe(true);
    expect(data.whatHappened && data.whatHappened.confidence).toBeGreaterThanOrEqual(70);
    expect(Array.isArray(data.whatHappened?.evidence)).toBe(true);

    expect(data.whyItMatters && data.whyItMatters.summary).toBeTruthy();
    expect(Array.isArray(data.whyItMatters?.steps)).toBe(true);

    expect(data.whatWouldHappen && data.whatWouldHappen.invariantResult).toBe('VIOLATION');
    expect(Array.isArray(data.whatWouldHappen?.invariantEvidence)).toBe(true);
    expect(data.whatWouldHappen?.invariantEvidence.length).toBeGreaterThan(0);

    expect(data.whatSystemDid && data.whatSystemDid.decision).toBe('BLOCK');
    expect(['CRITICAL', 'HIGH'].includes(data.whatSystemDid?.level)).toBe(true);
    expect(data.whatSystemDid && data.whatSystemDid.reason).toBeTruthy();
    expect(data.whatSystemDid && data.whatSystemDid.blocked).toBe(true);
  });
});
