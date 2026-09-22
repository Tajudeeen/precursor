'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type InvestigationData, type TimelineData } from '@/lib/api';

export default function InvestigationPage() {
  const [investigation, setInvestigation] = useState<InvestigationData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    Promise.allSettled([
      api.getInvestigation(),
      api.getTimeline(),
    ]).then(([inv, tl]) => {
      if (inv.status === 'fulfilled') setInvestigation(inv.value);
      if (tl.status === 'fulfilled') setTimeline(tl.value);
      setLoading(false);
    }).catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('precursor-data-refresh', handler);
    return () => window.removeEventListener('precursor-data-refresh', handler);
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-sm text-[#44443E] dark:text-slate-400">
        Reconstructing forensic attack sequence & state simulation...
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="py-20 text-center font-mono text-sm">
        <p className="text-[#44443E] dark:text-slate-400 mb-4">No active incident telemetry recorded.</p>
        <button
          onClick={() => {
            setLoading(true);
            api.runScenario().then(loadData).catch((e) => setError(e.message));
          }}
          className="btn-cyber-primary"
        >
          Run defense evaluation
        </button>
      </div>
    );
  }

  const { whatHappened, whyItMatters, whatWouldHappen, whatSystemDid } = investigation;
  const isBlocked = whatSystemDid.blocked ?? false;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] mb-2 uppercase tracking-widest font-semibold">
            <span>DIAGNOSTIC FORENSICS</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">CAUSAL SEQUENCE ANALYSIS</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
            Incident Investigation
          </h1>
          <p className="text-sm sm:text-base text-[#44443E] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-sans">
            Reconstructed timeline, attack topology, simulated solvency divergence, and deterministic on-chain enforcement.
          </p>
        </div>
        <div>
          <Link
            href="/comparison"
            className="btn-cyber-secondary text-xs whitespace-nowrap"
          >
            A/B Proof demo →
          </Link>
        </div>
      </div>

      {/* Decision Summary Banner (Ambit alert banner) */}
      <div
        className={`p-6 sm:p-7 rounded-2xl border ${
          isBlocked
            ? 'bg-[#FEECEB] border-[#FCD2D0] dark:bg-rose-500/[0.08] dark:border-rose-500/25'
            : 'bg-[#D4F63D]/20 border-[#D4F63D]/60 dark:bg-emerald-500/[0.08] dark:border-emerald-500/25'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full ${
                  isBlocked
                    ? 'bg-[#901B18] text-white shadow-xs'
                    : 'bg-[#111215] dark:bg-[#00F5A0] text-[#D4F63D] dark:text-[#06080c]'
                }`}
              >
                {whatSystemDid.decision || 'BLOCK'}
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400 uppercase font-semibold">
                Posture: {whatSystemDid.level || 'CRITICAL'}
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111215] dark:text-white mt-2">
              {whatSystemDid.reason || 'Simulation predicts invariant violation'}
            </h2>
            <p className="text-xs text-[#4A4D40] dark:text-slate-300 font-mono mt-1">
              Deterministic on-chain revert enforced via <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.08] text-[#111215] dark:text-[#00F5A0]">SecurityController.evaluateDefenseWithBehaviorEvidence()</code>
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-mono font-semibold px-3.5 py-1.5 rounded-full bg-white dark:bg-white/10 text-[#4E7514] dark:text-[#00F5A0] border border-[#E5E5DF] dark:border-white/20 shadow-xs">
              Zero asset drain
            </span>
          </div>
        </div>
      </div>

      {/* Forensic Narrative Stack */}
      <div className="space-y-8">
        {/* SECTION 1: OBSERVED SEQUENCE */}
        <div className="cyber-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Observed Event Sequence</h3>
              <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">Raw EVM events correlated to actor wallet</p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#D4F63D]/30 dark:bg-cyan-500/10 text-[#4E7514] dark:text-[#00D2FF] font-semibold border border-[#D4F63D]/60">
              Confidence: {whatHappened.confidence ?? 90}%
            </span>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            {timeline?.steps && timeline.steps.length > 0 ? (
              <div className="relative border-l border-[#E5E5DF] dark:border-white/[0.08] ml-3 space-y-4">
                {timeline.steps.map((st, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0]" />
                    <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] text-xs font-mono space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#111215] dark:text-white text-sm">
                          {st.action}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-white/[0.05] border border-[#E5E5DF] dark:border-white/[0.08] text-[#44443E] dark:text-slate-300 text-[10px]">
                          {st.component}
                        </span>
                      </div>
                      <p className="text-[#4A4D40] dark:text-slate-300 font-sans text-xs">
                        {st.description}
                      </p>
                      {st.stateSnapshot && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5E5DF] dark:border-white/[0.04] text-[11px]">
                          <div>
                            <span className="text-[#44443E] dark:text-slate-400 block">Spot Price</span>
                            <span className="font-semibold text-[#111215] dark:text-[#00D2FF]">
                              ${(Number(st.stateSnapshot.oraclePrice) / 1e18).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#44443E] dark:text-slate-400 block">Collateral Value</span>
                            <span className="font-semibold text-[#111215] dark:text-white">
                              ${(Number(st.stateSnapshot.collateralValue) / 1e18).toFixed(0)} DCC
                            </span>
                          </div>
                          <div>
                            <span className="text-[#44443E] dark:text-slate-400 block">Borrow Capacity</span>
                            <span className="font-semibold text-[#111215] dark:text-white">
                              ${(Number(st.stateSnapshot.borrowCapacity) / 1e18).toFixed(0)} DCC
                            </span>
                          </div>
                          <div>
                            <span className="text-[#44443E] dark:text-slate-400 block">Recorded Debt</span>
                            <span className="font-semibold text-[#901B18] dark:text-[#FF3366]">
                              ${(Number(st.stateSnapshot.debt) / 1e18).toFixed(0)} DCC
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs text-[#4A4D40] dark:text-slate-300">
                {whatHappened.sequence?.map((ev, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] flex justify-between">
                    <span className="text-[#111215] dark:text-white font-medium">{ev.event}</span>
                    <span className="text-[#44443E] dark:text-slate-400">{ev.details}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E5E5DF] dark:border-white/[0.08]">
              <h4 className="text-xs font-semibold text-[#44443E] dark:text-slate-400 uppercase tracking-wider font-mono mb-2">
                Signal Evidence Breakdown
              </h4>
              <ul className="space-y-1.5 text-xs font-mono text-[#4A4D40] dark:text-slate-300">
                {whatHappened.evidence?.map((ev, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span className="text-[#4E7514] dark:text-[#00F5A0] font-bold">✓</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* SECTION 2: ATTACK GRAPH */}
        <div className="cyber-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08]">
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Attack Graph & Causal Flow</h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">Component interdependencies and capacity inflation vector</p>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] text-xs font-mono text-[#4A4D40] dark:text-slate-200 leading-relaxed">
              {whyItMatters.summary || 'Oracle price was manipulated to artificially inflate collateral valuation, granting phantom borrowing capacity before an unbacked withdrawal.'}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 font-mono text-xs">
              {whyItMatters.steps?.map((step, i) => (
                <React.Fragment key={i}>
                  <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] shadow-xs flex-1 min-w-[140px]">
                    <div className="text-[10px] text-[#44443E] dark:text-slate-400 uppercase font-mono">
                      {step.component}
                    </div>
                    <div className="text-xs font-bold text-[#111215] dark:text-white mt-1">
                      {step.description}
                    </div>
                    {step.stateChange && (
                      <div className="text-[10px] text-[#4E7514] dark:text-[#00F5A0] mt-1 font-semibold">
                        {step.stateChange}
                      </div>
                    )}
                  </div>
                  {i < (whyItMatters.steps?.length ?? 0) - 1 && (
                    <span className="text-[#44443E] dark:text-slate-400 px-1 text-sm font-bold hidden sm:inline-block">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: SIMULATION */}
        <div className="cyber-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">State Simulation & Invariant Divergence</h3>
              <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">Projected post-execution state compared against solvency ratio</p>
            </div>
            <span
              className={`text-xs font-mono px-3 py-1 rounded-full font-semibold ${
                whatWouldHappen.invariantResult === 'VIOLATION'
                  ? 'bg-[#FEECEB] dark:bg-rose-500/15 text-[#901B18] dark:text-[#FF3366] border border-[#FCD2D0] dark:border-rose-500/30'
                  : 'bg-[#D4F63D]/30 dark:bg-emerald-500/15 text-[#4E7514] dark:text-[#00F5A0] border border-[#D4F63D] dark:border-emerald-500/30'
              }`}
            >
              Simulation: {whatWouldHappen.invariantResult || 'VIOLATION'}
            </span>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {whatWouldHappen.stateDiff?.entries?.map((entry, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] font-mono text-xs">
                  <span className="text-[#44443E] dark:text-slate-400 uppercase text-[10px] block">{entry.key}</span>
                  <div className="mt-2 space-y-1">
                    <div className="text-[#44443E] dark:text-slate-400 flex justify-between">
                      <span>Baseline:</span>
                      <span className="line-through">
                        {entry.key === 'oracle.price' ? `$${(Number(entry.before) / 1e18).toFixed(2)}` : `${(Number(entry.before) / 1e18).toFixed(0)} DCC`}
                      </span>
                    </div>
                    <div className="text-[#111215] dark:text-white font-medium flex justify-between">
                      <span>Projected:</span>
                      <span className="text-[#901B18] dark:text-[#FF3366] font-semibold">
                        {entry.key === 'oracle.price' ? `$${(Number(entry.after) / 1e18).toFixed(2)}` : `${(Number(entry.after) / 1e18).toFixed(0)} DCC`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] space-y-2 text-xs font-mono">
              <h5 className="font-bold text-[#111215] dark:text-white uppercase tracking-wider text-[11px]">
                Mathematical Invariant Proof
              </h5>
              <ul className="space-y-1 text-[#44443E] dark:text-slate-400">
                {whatWouldHappen.evidence?.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-[#901B18] dark:text-[#FF3366] font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#FEECEB] border border-[#FCD2D0] dark:bg-rose-500/[0.06] dark:border-rose-500/20">
                <span className="text-[#901B18] dark:text-[#FF3366] font-semibold uppercase text-[10px] block">
                  Hypothetical Attacker Gain
                </span>
                <span className="text-xl font-bold font-mono text-[#901B18] dark:text-[#FF3366] mt-1 block">
                  +135 DCC extracted
                </span>
                <span className="text-[11px] text-[#44443E] dark:text-slate-400 mt-0.5 block">
                  Attacker pulls unbacked borrow and extracts collateral
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#FEECEB] border border-[#FCD2D0] dark:bg-rose-500/[0.06] dark:border-rose-500/20">
                <span className="text-[#901B18] dark:text-[#FF3366] font-semibold uppercase text-[10px] block">
                  Hypothetical Protocol Liquidity Loss
                </span>
                <span className="text-xl font-bold font-mono text-[#901B18] dark:text-[#FF3366] mt-1 block">
                  -$195 DCC net exposure
                </span>
                <span className="text-[11px] text-[#44443E] dark:text-slate-400 mt-0.5 block">
                  100% of deposited collateral drained from lending vault
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: ENFORCEMENT */}
        <div className="cyber-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08]">
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Enforcement & Verification</h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">Deterministic policy decision and contract reversion proof</p>
          </div>

          <div className="p-6 sm:p-7 space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-[#D4F63D]/20 border border-[#D4F63D]/60 dark:bg-emerald-500/10 dark:border-emerald-500/20 text-[#111215] dark:text-slate-200">
              <div className="text-sm font-bold text-[#4E7514] dark:text-[#00F5A0] flex items-center space-x-2">
                <span>Transaction Intercepted · Withdrawal Reverted</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed font-sans text-[#4A4D40] dark:text-slate-300">
                The withdrawal operation was intercepted at the SecurityController on-chain gate.
                Because the off-chain sequence was flagged with 90% confidence and state simulation predicted a
                collapse of the collateralization ratio below 15000 BPS (150%), the policy engine issued a deterministic <span className="font-semibold text-[#4E7514] dark:text-[#00F5A0]">BLOCK</span> verdict.
                The LendingPool reverted the call with <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#111215] dark:text-[#00F5A0] font-mono">WithdrawBlocked(&quot;simulation predicts invariant violation&quot;)</code>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
              <div>
                <span className="text-[#44443E] dark:text-slate-400 text-[11px] block">Comparative Verification:</span>
                <span className="font-medium text-[#111215] dark:text-white mt-0.5 block">
                  Run the side-by-side comparison to verify the attack succeeds without Precursor and fails with it.
                </span>
              </div>
              <Link
                href="/comparison"
                className="btn-cyber-primary whitespace-nowrap"
              >
                Run A/B Proof demo →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
