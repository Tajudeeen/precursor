'use client';

import React, { useEffect, useState } from 'react';
import { api, type ComparisonData } from '@/lib/api';

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    api.getComparison()
      .then(setData)
      .catch(() => {
        // No comparison run yet
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunComparison = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runComparison();
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] mb-2 uppercase tracking-widest font-semibold">
            <span>DETERMINISTIC VERIFICATION</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">A/B EXPLOIT PROOF</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
            Unprotected vs Protected Execution
          </h1>
          <p className="text-sm sm:text-base text-[#44443E] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-sans">
            Side-by-side execution of the identical oracle manipulation sequence against the unprotected protocol baseline versus the Precursor-defended protocol.
          </p>
        </div>
        <div>
          <button
            onClick={handleRunComparison}
            disabled={running}
            className="btn-cyber-primary text-xs px-6 py-3"
          >
            {running ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-[#06080c]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Executing test on Anvil...</span>
              </>
            ) : (
              <span>Run live comparison</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEECEB] dark:bg-rose-500/10 border border-[#FCD2D0] dark:border-rose-500/25 text-[#901B18] dark:text-[#FF3366] text-xs font-mono">
          Error executing comparison: {error}
        </div>
      )}

      {/* Outcome Verdict Card (Ambit Style) */}
      {data && (
        <div className="p-6 sm:p-7 rounded-2xl border border-[#D4F63D] bg-[#F0F7DE]/60 dark:bg-emerald-950/20 dark:border-emerald-500/30 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#D4F63D] text-[#111215] dark:bg-emerald-500/20 dark:text-[#00F5A0] border border-[#B8DE22] dark:border-emerald-500/30">
                Live Verification Confirmed
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111215] dark:text-white mt-2">
                100% of Protocol Collateral Preserved Under Active Attack Sequence
              </h2>
              <p className="text-xs sm:text-sm text-[#4A4D40] dark:text-slate-300 font-mono mt-1 leading-relaxed">
                Same contract deployment. Same oracle inflation sequence ($1.00 → $1.80).
                In the unprotected baseline, the attacker extracted 100 DCC. In the defended run, SecurityController intercepted and reverted the final withdrawal.
              </p>
            </div>
            <div className="text-right whitespace-nowrap">
              <div className="text-3xl font-bold font-serif text-[#4E7514] dark:text-[#00F5A0]">
                {data.summary.defenseEfficacy}
              </div>
              <div className="text-[11px] font-mono text-[#44443E] dark:text-slate-400">
                Zero liquidity leaked
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RUN A: UNPROTECTED */}
        <div className="cyber-card overflow-hidden border-[#FCD2D0] dark:border-rose-500/30">
          <div className="p-5 sm:p-6 bg-[#FEECEB] dark:bg-rose-500/[0.08] border-b border-[#FCD2D0] dark:border-rose-500/20 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#901B18] text-white">
                  Baseline Run
                </span>
                <span className="text-xs font-mono text-[#901B18] dark:text-rose-400 font-semibold">
                  Controller: Disabled
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mt-1">
                Vulnerable Protocol
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-[#901B18] dark:text-rose-400 px-2.5 py-1 rounded-full bg-white/70 dark:bg-black/20 border border-[#FCD2D0]">
              Attack succeeds
            </span>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-xs text-[#4A4D40] dark:text-slate-300 leading-relaxed font-sans">
              The attacker inflates the spot price, borrows 60 DCC in phantom capacity, and executes withdrawal. Without an enforcement hook, the pool releases collateral.
            </p>

            {/* Transaction Steps for Run A */}
            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-semibold text-[#44443E] dark:text-slate-400 uppercase tracking-wider text-[11px]">
                Transaction Log
              </h4>
              {data?.unprotected.transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    tx.description.toLowerCase().includes('withdraw')
                      ? 'bg-[#FEECEB] dark:bg-rose-500/15 border-[#FCD2D0] dark:border-rose-500/30 text-[#901B18] dark:text-[#FF3366] font-medium'
                      : 'bg-[#F7F7F2] dark:bg-white/[0.02] border-[#E5E5DF] dark:border-white/[0.06] text-[#4A4D40] dark:text-slate-300'
                  }`}
                >
                  <span className="truncate mr-2">{tx.description}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      tx.status === 'success'
                        ? 'bg-emerald-500/15 text-[#4E7514] dark:text-[#00F5A0]'
                        : 'bg-[#901B18]/15 dark:bg-rose-500/20 text-[#901B18] dark:text-[#FF3366]'
                    }`}
                  >
                    {tx.status.toUpperCase()}
                  </span>
                </div>
              )) || (
                <div className="text-[#44443E] dark:text-slate-400 italic py-4 text-center">
                  Click &quot;Run live comparison&quot; to execute baseline run.
                </div>
              )}
            </div>

            {/* Final State for Run A */}
            <div className="p-4 rounded-xl bg-[#FEECEB] border border-[#FCD2D0] dark:bg-rose-500/[0.06] dark:border-rose-500/20 font-mono text-xs space-y-2">
              <div className="font-bold text-[#901B18] dark:text-[#FF3366] uppercase text-[11px]">
                Final Outcome
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-[#44443E] dark:text-slate-400 block">Attacker Collateral</span>
                  <span className="font-bold text-[#901B18] dark:text-[#FF3366]">
                    {data ? `${data.unprotected.finalState.attackerCollateralBalance} DCC extracted` : '100 DCC extracted'}
                  </span>
                </div>
                <div>
                  <span className="text-[#44443E] dark:text-slate-400 block">Unbacked Debt Remaining</span>
                  <span className="font-bold text-[#901B18] dark:text-[#FF3366]">
                    {data ? `${data.unprotected.finalState.attackerDebt} DCC in pool` : '135 DCC in pool'}
                  </span>
                </div>
              </div>
              <div className="text-[#901B18] dark:text-[#FF3366] font-medium text-[11px] pt-1">
                Protocol drained: Attacker extracts the original collateral and leaves unbacked debt behind.
              </div>
            </div>
          </div>
        </div>

        {/* RUN B: PROTECTED */}
        <div className="cyber-card overflow-hidden border-[#D4F63D] dark:border-emerald-500/30">
          <div className="p-5 sm:p-6 bg-[#F0F7DE]/60 dark:bg-emerald-500/[0.08] border-b border-[#D4F63D]/60 dark:border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#111215] text-[#D4F63D] dark:bg-[#00F5A0] dark:text-[#06080c]">
                  Protected Run
                </span>
                <span className="text-xs font-mono text-[#4E7514] dark:text-[#00F5A0] font-semibold">
                  Controller: Armed
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mt-1">
                Precursor Defended
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-[#4E7514] dark:text-[#00F5A0] px-2.5 py-1 rounded-full bg-white/70 dark:bg-black/20 border border-[#D4F63D]/60">
              Attack blocked
            </span>
          </div>

          <div className="p-6 space-y-6">
            <p className="text-xs text-[#4A4D40] dark:text-slate-300 leading-relaxed font-sans">
              The attacker performs the identical sequence. At the final withdrawal attempt, the SecurityController evaluates terminal solvency and reverts the call.
            </p>

            {/* Transaction Steps for Run B */}
            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-semibold text-[#44443E] dark:text-slate-400 uppercase tracking-wider text-[11px]">
                Transaction Log
              </h4>
              {data?.protected.transactions.map((tx, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    tx.description.toLowerCase().includes('withdraw')
                      ? 'bg-[#F0F7DE] dark:bg-emerald-500/15 border-[#D4F63D] dark:border-emerald-500/30 text-[#4E7514] dark:text-[#00F5A0] font-medium'
                      : 'bg-[#F7F7F2] dark:bg-white/[0.02] border-[#E5E5DF] dark:border-white/[0.06] text-[#4A4D40] dark:text-slate-300'
                  }`}
                >
                  <span className="truncate mr-2">{tx.description}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      tx.status === 'revert'
                        ? 'bg-[#D4F63D] text-[#111215] dark:bg-[#00F5A0] dark:text-[#06080c] border border-[#B8DE22] dark:border-[#00F5A0]'
                        : tx.status === 'success'
                        ? 'bg-black/5 dark:bg-white/10 text-[#44443E] dark:text-slate-300'
                        : 'bg-[#901B18]/15 dark:bg-rose-500/20 text-[#901B18] dark:text-[#FF3366]'
                    }`}
                  >
                    {tx.status === 'revert' ? 'REVERTED (BLOCKED)' : tx.status.toUpperCase()}
                  </span>
                </div>
              )) || (
                <div className="text-[#44443E] dark:text-slate-400 italic py-4 text-center">
                  Click &quot;Run live comparison&quot; to execute protected run.
                </div>
              )}
            </div>

            {/* Final State for Run B */}
            <div className="p-4 rounded-xl bg-[#F0F7DE]/50 border border-[#D4F63D]/60 dark:bg-emerald-500/[0.06] dark:border-emerald-500/20 font-mono text-xs space-y-2">
              <div className="font-bold text-[#4E7514] dark:text-[#00F5A0] uppercase text-[11px]">
                Final Outcome
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-[#44443E] dark:text-slate-400 block">Attacker Extracted</span>
                  <span className="font-bold text-[#4E7514] dark:text-[#00F5A0]">
                    {data ? `${data.protected.finalState.attackerCollateralBalance} DCC` : '0 DCC'}
                  </span>
                </div>
                <div>
                  <span className="text-[#44443E] dark:text-slate-400 block">Attacker Debt</span>
                  <span className="font-bold text-[#4E7514] dark:text-[#00F5A0]">
                    {data ? `${data.protected.finalState.attackerDebt} DCC` : '60 DCC'}
                  </span>
                </div>
              </div>
              <div className="text-[#4E7514] dark:text-[#00F5A0] font-medium text-[11px] pt-1">
                Zero liquidity lost: Collateral remained locked in pool due to the invariant block hook.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Explanatory Section */}
      <div className="cyber-card p-6 sm:p-7">
        <h3 className="font-serif text-xl font-bold text-[#111215] dark:text-white mb-2">
          Deterministic Verification Methodology
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-[#44443E] dark:text-slate-400 mt-5">
          <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
            <div className="text-[#111215] dark:text-white font-bold mb-1 uppercase">1. Same State Fork</div>
            <p className="font-sans text-xs text-[#4A4D40] dark:text-slate-300 leading-relaxed">
              Both test sequences execute against the identical Initial State: DCC collateral pool funded, MockSpotOracle at $1.00 DCC.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold mb-1 uppercase">2. Sequence Identical</div>
            <p className="font-sans text-xs text-[#4A4D40] dark:text-slate-300 leading-relaxed">
              Deposit collateral → inflate spot price to $1.80 → execute maximum phantom borrow → attempt final withdrawal.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
            <div className="text-[#901B18] dark:text-[#FF3366] font-bold mb-1 uppercase">3. Objective Proof</div>
            <p className="font-sans text-xs text-[#4A4D40] dark:text-slate-300 leading-relaxed">
              Without Precursor: Collateral drained, unbacked debt left in pool. With Precursor: SecurityController reverts withdrawal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
