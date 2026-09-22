'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ThreatsData } from '@/lib/api';

export default function ThreatsPage() {
  const [data, setData] = useState<ThreatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getThreats()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-sm text-[#44443E] dark:text-slate-400">
        Loading active threat telemetry...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center text-[#901B18] dark:text-[#FF3366] font-mono text-sm">
        Failed to load threats data: {error || 'No response'}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08]">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] mb-2 uppercase tracking-widest font-semibold">
          <span>SEQUENCE DETECTION</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">SIGNAL DIAGNOSTICS</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
          Threat Intelligence & Evidence
        </h1>
        <p className="text-sm sm:text-base text-[#44443E] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-sans">
          Deterministic behavior sequence detection grounded in verifiable on-chain event sequences, without probabilistic guesswork.
        </p>
      </div>

      {/* Active Threats Section */}
      {data.threats.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111215] dark:text-white flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#901B18] dark:bg-[#FF3366] animate-pulse" />
              <span>Active Flagged Sequences ({data.threats.length})</span>
            </h2>
          </div>

          {data.threats.map((threat) => (
            <div
              key={threat.id}
              className="cyber-card overflow-hidden border-[#FCD2D0] dark:border-rose-500/30 shadow-xs"
            >
              {/* Threat Header Bar */}
              <div className="p-5 sm:p-6 bg-[#FEECEB] dark:bg-rose-500/[0.08] border-b border-[#FCD2D0] dark:border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#901B18]/10 text-[#901B18] dark:bg-rose-500/20 dark:text-rose-400 border border-[#901B18]/20">
                      {threat.id}
                    </span>
                    <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">
                      {threat.pattern}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#111215] dark:text-white mt-1">
                    {threat.name}
                  </h3>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#FCD2D0]/60">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] sm:text-[11px] font-mono text-[#44443E] dark:text-slate-400 uppercase">Confidence</div>
                    <div className="text-base font-mono font-bold text-[#901B18] dark:text-[#FF3366]">
                      {threat.confidence}%
                    </div>
                  </div>
                  <Link
                    href="/investigation"
                    className="btn-cyber-primary text-xs whitespace-nowrap px-4 py-2"
                  >
                    Investigate →
                  </Link>
                </div>
              </div>

              {/* Threat Details Grid */}
              <div className="p-6 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                {/* Verifiable Evidence Items */}
                <div className="space-y-4">
                  <h4 className="font-bold text-[#111215] dark:text-white uppercase tracking-wider text-[11px] border-b border-[#E5E5DF] dark:border-white/[0.08] pb-2">
                    Verified Signal Evidence
                  </h4>
                  <ul className="space-y-2">
                    {threat.confidenceEvidence && threat.confidenceEvidence.length > 0 ? (
                      threat.confidenceEvidence.map((ev, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-[#901B18] dark:text-[#FF3366] font-bold">•</span>
                          <span className="text-[#4A4D40] dark:text-slate-300 font-sans">{ev}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-[#44443E] dark:text-slate-400 font-sans">Multi-step sequence interaction detected</li>
                    )}
                  </ul>

                  <div className="pt-2">
                    <span className="text-[#44443E] dark:text-slate-400 block mb-1">Attacker Address:</span>
                    <span className="text-[#111215] dark:text-[#00D2FF] select-all font-medium break-all">
                      {threat.attacker}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#44443E] dark:text-slate-400 block mb-1">Target Contracts:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {threat.contractsInvolved?.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-[#F7F7F2] dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08] text-[#111215] dark:text-slate-300 text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Consequence & Decisions */}
                <div className="space-y-4">
                  <h4 className="font-bold text-[#111215] dark:text-white uppercase tracking-wider text-[11px] border-b border-[#E5E5DF] dark:border-white/[0.08] pb-2">
                    Predicted Consequence & Gate
                  </h4>

                  <div className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] font-sans">
                    <span className="text-[#44443E] dark:text-slate-400 font-mono uppercase text-[10px] block">Potential Impact</span>
                    <p className="text-[#111215] dark:text-slate-200 mt-1 leading-relaxed text-xs">
                      {threat.potentialConsequence}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
                      <span className="text-[#44443E] dark:text-slate-400 text-[10px] uppercase block">Simulation</span>
                      <span className="text-[#901B18] dark:text-[#FF3366] font-bold text-sm mt-0.5 block">
                        {threat.simulationVerdict}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06]">
                      <span className="text-[#44443E] dark:text-slate-400 text-[10px] uppercase block">Policy Verdict</span>
                      <span className="text-[#901B18] dark:text-[#FF3366] font-bold text-sm mt-0.5 block">
                        {threat.policyDecision}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#D4F63D]/20 dark:bg-emerald-500/10 border border-[#D4F63D]/60 dark:border-emerald-500/20 text-[#111215] dark:text-slate-200">
                    <div className="font-bold text-xs text-[#4E7514] dark:text-[#00F5A0]">
                      On-Chain Defense Enforced
                    </div>
                    <p className="mt-1 text-xs leading-relaxed font-sans text-[#4A4D40] dark:text-slate-300">
                      Withdrawal transaction was intercepted and reverted at the SecurityController contract gate before protocol assets moved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cyber-card p-12 text-center font-mono">
          <div className="w-10 h-10 rounded-full bg-[#D4F63D]/30 text-[#4E7514] dark:text-[#00F5A0] flex items-center justify-center mx-auto mb-3 font-bold border border-[#D4F63D]">
            ✓
          </div>
          <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Zero Active Incidents</h3>
          <p className="text-xs text-[#44443E] dark:text-slate-400 mt-1 max-w-md mx-auto font-sans">
            All observed transactions comply with protocol invariants. Run the defense loop from the top bar to analyze live chain events.
          </p>
        </div>
      )}

      {/* Pattern Catalog Section */}
      <div className="cyber-card p-6 sm:p-7">
        <h3 className="font-serif text-xl font-bold text-[#111215] dark:text-white">Supported Behavioral Patterns</h3>
        <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">
          Deterministic sequence rules evaluated against EVM transaction streams
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {data.catalog.map((pat, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#4E7514] dark:text-[#00F5A0]">{pat.pattern}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FEECEB] text-[#901B18] dark:bg-rose-500/15 dark:text-rose-400 font-semibold text-[10px] border border-[#FCD2D0]">
                  {pat.severity}
                </span>
              </div>
              <p className="text-[#4A4D40] dark:text-slate-300 leading-relaxed font-sans text-xs">
                {pat.description}
              </p>
              <div className="text-[11px] text-[#44443E] dark:text-slate-400 pt-1.5 border-t border-[#E5E5DF] dark:border-white/[0.04]">
                Trigger Threshold: Confidence ≥ {pat.sensitivityThreshold}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
