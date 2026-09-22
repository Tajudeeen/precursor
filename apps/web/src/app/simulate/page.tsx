'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api, type SandboxState, type SandboxStepResult } from '@/lib/api';

interface StepItem {
  id: string;
  name: string;
  title: string;
  description: string;
  details: string;
  expectedOutcome: string;
}

const STEPS: StepItem[] = [
  {
    id: 'deposit',
    name: 'Step 1: Collateral Deposit',
    title: 'Deposit 100 DCC Collateral',
    description: 'Attacker funds wallet with 100 DCC collateral token and deposits it into LendingPool.',
    details: 'Initial borrow capacity established at $75 DCC (75% LTV at honest $1.00 spot price).',
    expectedOutcome: 'LendingPool accepts deposit. Attacker balance credited.',
  },
  {
    id: 'borrow-safe',
    name: 'Step 2: Baseline Safe Borrow',
    title: 'Borrow 50 DCC within Safe Ratio',
    description: 'Attacker borrows 50 DCC. Collateral value is $100, so collateral ratio is 200% (healthy).',
    details: 'Complies with the 150% minimum collateralization invariant.',
    expectedOutcome: 'Pool disburses 50 DCC. Debt recorded.',
  },
  {
    id: 'skew-oracle',
    name: 'Step 3: Oracle Price Manipulation',
    title: 'Manipulate Spot Oracle ($1.00 → $1.80)',
    description: 'Attacker calls setPrice() on the single-source MockOracle, inflating spot price by +80%.',
    details: 'Phantom borrow capacity expands from $75 to $135 without any real liquidity backing.',
    expectedOutcome: 'Oracle updates price. Behavioral detection engine flags price skew anomaly.',
  },
  {
    id: 'borrow-inflated',
    name: 'Step 4: Secondary Inflated Borrow',
    title: 'Borrow Extra 65 DCC on Phantom Capacity',
    description: 'Attacker takes out additional debt up to the artificially inflated borrow ceiling.',
    details: 'Total attacker debt expands to 115 DCC against only 100 real deposited tokens.',
    expectedOutcome: 'Pool approves borrow based on inflated valuation. Debt surges.',
  },
  {
    id: 'withdraw',
    name: 'Step 5: The Exploit Attempt',
    title: 'Attempt Extraction of 100 DCC Collateral',
    description: 'Attacker attempts to withdraw ALL original collateral, leaving 115 DCC of unbacked debt behind in the pool.',
    details: 'In Protected mode, SecurityController simulates terminal state, detects invariant collapse (ratio 0% < 150%), and REVERTS on-chain.',
    expectedOutcome: 'Protected: BLOCKED ON-CHAIN (Reverted). Unprotected: SUCCESS (Pool Drained).',
  },
];

export default function SimulatePage() {
  const [state, setState] = useState<SandboxState | null>(null);
  const [mode, setMode] = useState<'protected' | 'unprotected'>('protected');
  const [customPrice, setCustomPrice] = useState('1.80');
  const [loading, setLoading] = useState(true);
  const [executingStep, setExecutingStep] = useState<string | null>(null);
  const [logs, setLogs] = useState<SandboxStepResult[]>([]);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchState = async () => {
    try {
      const res = await api.getSandboxState();
      setState(res);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const runStep = async (stepId: string) => {
    setExecutingStep(stepId);
    setError(null);
    try {
      const res = await api.executeSandboxStep(
        stepId,
        mode,
        stepId === 'skew-oracle' ? customPrice : undefined
      );
      setLogs((prev) => [...prev, res]);
      setState(res.state);
      window.dispatchEvent(new CustomEvent('precursor-data-refresh'));
    } catch (e: any) {
      setError(`Step failed: ${e.message}`);
    } finally {
      setExecutingStep(null);
    }
  };

  const handleReset = async () => {
    setExecutingStep('reset');
    setError(null);
    try {
      const res = await api.resetSandbox();
      setLogs((prev) => [...prev, res]);
      setState(res.state);
      window.dispatchEvent(new CustomEvent('precursor-data-refresh'));
    } catch (e: any) {
      setError(`Reset failed: ${e.message}`);
    } finally {
      setExecutingStep(null);
    }
  };

  const runFullSequence = async () => {
    if (autoPlaying) return;
    setAutoPlaying(true);
    setError(null);

    const stepsToRun = ['deposit', 'borrow-safe', 'skew-oracle', 'borrow-inflated', 'withdraw'];
    for (const stepId of stepsToRun) {
      setExecutingStep(stepId);
      try {
        const res = await api.executeSandboxStep(
          stepId,
          mode,
          stepId === 'skew-oracle' ? customPrice : undefined
        );
        setLogs((prev) => [...prev, res]);
        setState(res.state);
        window.dispatchEvent(new CustomEvent('precursor-data-refresh'));
        // small pause between steps for realistic live feedback
        await new Promise((resolve) => setTimeout(resolve, 1400));
      } catch (e: any) {
        setError(`Auto-play halted at ${stepId}: ${e.message}`);
        break;
      }
    }
    setExecutingStep(null);
    setAutoPlaying(false);
  };

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] mb-2 uppercase tracking-widest font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0] animate-pulse" />
            <span>INTERACTIVE DEFENSE SANDBOX</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">ANVIL RPC :8555</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
            Live Attack & Defense Execution
          </h1>
          <p className="text-sm sm:text-base text-[#44443E] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-sans">
            Execute each transaction of the oracle manipulation and unbacked collateral extraction sequence live against Anvil.
            Switch between Protected and Unprotected modes to observe the exact on-chain revert when Precursor intercepts the exploit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard" className="btn-cyber-secondary text-xs">
            ← Defense Radar
          </Link>
          <button
            onClick={handleReset}
            disabled={executingStep !== null || autoPlaying}
            className="btn-cyber-secondary text-xs flex items-center gap-1.5"
            title="Restore oracle price to $1.00 and re-arm SecurityController"
          >
            <span>↺</span>
            <span>Reset State</span>
          </button>
          <button
            onClick={runFullSequence}
            disabled={executingStep !== null || autoPlaying}
            className="btn-cyber-primary text-xs flex items-center gap-1.5"
          >
            <span>{autoPlaying ? 'Executing Sequence…' : 'Auto-Play Sequence ⚡'}</span>
          </button>
        </div>
      </div>

      {/* ── Protection Mode Selector ─────────────────────────────────────── */}
      <div className="cyber-card p-5 sm:p-6 bg-gradient-to-r from-[#F7F7F2] to-white dark:from-white/[0.02] dark:to-white/[0.04]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-[#44443E] dark:text-slate-400 font-semibold mb-1">
              Enforcement Mode Toggle
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">
              Choose Defense Posture
            </h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans mt-0.5">
              Select whether the LendingPool enforces the Precursor SecurityController hook on collateral withdrawal.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#EFEFEA] dark:bg-white/[0.06] p-1.5 rounded-xl border border-[#E5E5DF] dark:border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => setMode('protected')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                mode === 'protected'
                  ? 'bg-[#111215] text-white dark:bg-[#00F5A0] dark:text-[#06080c] shadow-xs'
                  : 'text-[#44443E] dark:text-slate-400 hover:text-[#111215] dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'protected' ? 'bg-[#D4F63D] dark:bg-[#06080c]' : 'bg-slate-400'}`} />
              <span>🛡️ Protected (Precursor Active)</span>
            </button>

            <button
              onClick={() => setMode('unprotected')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                mode === 'unprotected'
                  ? 'bg-[#901B18] text-white dark:bg-rose-500 dark:text-white shadow-xs'
                  : 'text-[#44443E] dark:text-slate-400 hover:text-[#111215] dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'unprotected' ? 'bg-white' : 'bg-slate-400'}`} />
              <span>⚠️ Unprotected (Bypassed)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Live State HUD ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Oracle Spot Price
          </div>
          <div className="text-lg font-bold font-mono text-[#111215] dark:text-white">
            {state?.oraclePrice ?? '…'}
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            {state?.oraclePrice === '$1.80' ? (
              <span className="text-[#901B18] dark:text-[#FF3366] font-semibold">⚠️ +80% Inflated</span>
            ) : (
              <span className="text-[#4E7514] dark:text-[#00F5A0]">✓ Baseline ($1.00)</span>
            )}
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Vault Reserves
          </div>
          <div className="text-lg font-bold font-mono text-[#111215] dark:text-white">
            {state?.poolCollateral ?? '…'}
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            LendingPool Total
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Attacker Collateral
          </div>
          <div className="text-lg font-bold font-mono text-[#111215] dark:text-[#00D2FF]">
            {state?.attackerCollateral ?? '…'}
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            Deposited tokens
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Attacker Debt
          </div>
          <div className="text-lg font-bold font-mono text-[#901B18] dark:text-[#FF3366]">
            {state?.attackerDebt ?? '…'}
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            Borrowed principal
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Collateral Ratio
          </div>
          <div className={`text-lg font-bold font-mono ${state?.isSolvent ? 'text-[#4E7514] dark:text-[#00F5A0]' : 'text-[#901B18] dark:text-[#FF3366]'}`}>
            {state?.currentCollateralRatioFormatted ?? '…'}
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            Min Invariant: 150%
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1">
            Controller Status
          </div>
          <div className="text-sm font-bold font-mono flex items-center gap-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${state?.securityControllerArmed ? 'bg-[#7DA61C] dark:bg-[#00F5A0]' : 'bg-[#901B18] dark:bg-rose-500'}`} />
            <span className={state?.securityControllerArmed ? 'text-[#4E7514] dark:text-[#00F5A0]' : 'text-[#901B18] dark:text-rose-400'}>
              {state?.securityControllerArmed ? 'ARMED' : 'BYPASSED'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 mt-1">
            Block #{state?.blockNumber ?? '…'}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEECEB] dark:bg-rose-500/10 border border-[#FCD2D0] dark:border-rose-500/25 text-[#901B18] dark:text-[#FF3366] text-xs font-mono">
          {error}
        </div>
      )}

      {/* ── Transaction Action Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {STEPS.map((step, idx) => {
          const isExecuting = executingStep === step.id;
          const isWithdrawStep = step.id === 'withdraw';

          return (
            <div
              key={step.id}
              className={`cyber-card p-5 flex flex-col justify-between transition-all ${
                isExecuting ? 'ring-2 ring-[#4E7514] dark:ring-[#00F5A0]' : ''
              } ${isWithdrawStep ? 'bg-[#FDFBF7] dark:bg-white/[0.03] border-[#D4F63D]/60 dark:border-emerald-500/30' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#4E7514] dark:text-[#00F5A0]">
                    {step.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#44443E] dark:text-slate-500">
                    Step {idx + 1}/5
                  </span>
                </div>

                <h4 className="font-serif text-base font-bold text-[#111215] dark:text-white mb-2">
                  {step.title}
                </h4>

                <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed mb-3">
                  {step.description}
                </p>

                {step.id === 'skew-oracle' && (
                  <div className="mb-3 p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[#E5E5DF] dark:border-white/10">
                    <label className="block text-[10px] font-mono uppercase text-[#44443E] dark:text-slate-400 mb-1">
                      Custom Skew Price ($)
                    </label>
                    <input
                      type="text"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full bg-white dark:bg-[#111215] border border-[#E5E5DF] dark:border-white/10 rounded px-2 py-1 text-xs font-mono text-[#111215] dark:text-white focus:outline-none"
                    />
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.04] mb-4 text-[11px] font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 mb-1 font-semibold">
                    Expected Outcome:
                  </div>
                  <div className="text-[#111215] dark:text-slate-300">
                    {step.id === 'withdraw' ? (
                      mode === 'protected' ? (
                        <span className="text-[#4E7514] dark:text-[#00F5A0] font-semibold">
                          🛡️ BLOCKED by SecurityController on-chain!
                        </span>
                      ) : (
                        <span className="text-[#901B18] dark:text-[#FF3366] font-semibold">
                          ⚠️ Succeeded (100 DCC collateral stolen!)
                        </span>
                      )
                    ) : (
                      step.expectedOutcome
                    )}
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => runStep(step.id)}
                  disabled={executingStep !== null || autoPlaying}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-2 ${
                    isWithdrawStep
                      ? mode === 'protected'
                        ? 'bg-[#111215] hover:bg-black text-white dark:bg-[#00F5A0] dark:hover:bg-[#00F5A0]/90 dark:text-[#06080c]'
                        : 'bg-[#901B18] hover:bg-[#721513] text-white dark:bg-rose-600 dark:text-white'
                      : 'btn-cyber-primary'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Executing on Anvil…</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Step {idx + 1} →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Real-Time Execution Console ──────────────────────────────────── */}
      <div className="cyber-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0] animate-pulse" />
            <div>
              <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">
                Live Transaction Execution Terminal
              </h3>
              <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">
                On-chain transaction receipts, simulation decisions, and revert traces
              </p>
            </div>
          </div>

          <button
            onClick={() => setLogs([])}
            disabled={logs.length === 0}
            className="text-[11px] font-mono text-[#44443E] hover:text-[#111215] dark:text-slate-400 dark:hover:text-white disabled:opacity-40 transition-colors"
          >
            Clear logs
          </button>
        </div>

        <div
          ref={logContainerRef}
          className="p-5 sm:p-6 max-h-[380px] overflow-y-auto space-y-3 font-mono text-xs bg-[#111215] text-slate-200"
        >
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              <p className="mb-2">Execution terminal ready. Connects directly to local Anvil node.</p>
              <p className="text-slate-600 text-[11px]">
                Click &quot;Execute Step 1 →&quot; or &quot;Auto-Play Sequence ⚡&quot; above to submit real EVM transactions.
              </p>
            </div>
          ) : (
            logs.map((log, index) => {
              const isRevert = log.status === 'revert';
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-xl border ${
                    isRevert
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isRevert
                            ? 'bg-rose-500 text-white'
                            : 'bg-[#00F5A0] text-[#06080c]'
                        }`}
                      >
                        {isRevert ? 'BLOCKED / REVERTED' : 'CONFIRMED'}
                      </span>
                      <span className="text-[#00D2FF] font-semibold text-xs">
                        {log.step.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-slate-500 text-[11px] font-mono">
                      Block #{log.state.blockNumber}
                    </span>
                  </div>

                  <p className="text-xs font-sans text-white mb-2 leading-relaxed">
                    {log.description}
                  </p>

                  {log.revertReason && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px] mb-2 font-mono">
                      <div className="text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">
                        On-Chain Revert Reason:
                      </div>
                      <div>{log.revertReason}</div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500">TX Hash:</span>
                      <span className="text-[#00F5A0] break-all">
                        {log.txHash}
                      </span>
                    </div>
                    <div>
                      Oracle: <span className="text-white">{log.state.oraclePrice}</span> · Ratio:{' '}
                      <span className={log.state.isSolvent ? 'text-[#00F5A0]' : 'text-rose-400'}>
                        {log.state.currentCollateralRatioFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
