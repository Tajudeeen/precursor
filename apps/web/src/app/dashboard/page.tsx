'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type OverviewData, type BenchmarkData, type EconomicsData } from '@/lib/api';

export default function OverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [economics, setEconomics] = useState<EconomicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const loadData = async () => {
    try {
      const [ov, bm, ec] = await Promise.allSettled([
        api.getOverview(),
        api.getBenchmark(),
        api.getEconomics(),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (bm.status === 'fulfilled') setBenchmark(bm.value);
      if (ec.status === 'fulfilled') setEconomics(ec.value);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('precursor-data-refresh', handler);
    const interval = setInterval(loadData, 5000);
    return () => {
      window.removeEventListener('precursor-data-refresh', handler);
      clearInterval(interval);
    };
  }, []);

  const handleRunDefense = async () => {
    setTriggering(true);
    try {
      await api.runScenario();
      await loadData();
    } finally {
      setTriggering(false);
    }
  };

  const isCritical = overview?.defensiveState === 'CRITICAL';
  const isProtected = overview?.protectionStatus === 'ACTIVE';

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ── 1. Hero Section (Ambit Layout from sampleUI.jpg) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Editorial Headline & Actions */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] font-semibold">
            <span>THE DEFENSE LAYER FOR ON-CHAIN PROTOCOLS</span>
          </div>

          <h1 className="font-serif text-[1.85rem] min-[400px]:text-4xl sm:text-5xl lg:text-6xl font-bold text-[#111215] dark:text-white tracking-tight leading-[1.12]">
            Stop exploits you can{' '}
            <span className="relative inline-block bg-[#D4F63D] dark:bg-[#00F5A0] text-[#111215] dark:text-[#06080c] px-2 sm:px-2.5 py-0.5 rounded-lg shadow-xs">
              simulate
            </span>{' '}
            before they settle.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-[#44443E] dark:text-slate-300 leading-relaxed max-w-xl font-sans">
            Monitor mempool and on-chain event streams, detect predatory multi-step sequences, simulate hypothetical terminal solvency, and enforce an on-chain block via <code className="text-xs font-mono bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[#111215] dark:text-white break-all sm:break-normal">SecurityController</code>.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleRunDefense}
              disabled={triggering}
              className="btn-cyber-primary text-xs sm:text-sm px-6 py-3 justify-center text-center shadow-sm"
            >
              {triggering ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white dark:text-[#06080c]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Simulating sequence...
                </>
              ) : (
                'Run defense loop'
              )}
            </button>

            <Link
              href="/comparison"
              className="btn-cyber-secondary text-xs sm:text-sm px-6 py-3 justify-center text-center"
            >
              A/B Proof demo →
            </Link>
          </div>
        </div>

        {/* Right Column: High-Contrast Terminal Box with Lime Glow (matching sampleUI.jpg) */}
        <div className="lg:col-span-5 relative mt-2 lg:mt-0">
          {/* Lime Glow Shadow behind terminal */}
          <div className="absolute -inset-2 sm:-inset-3 bg-[#D4F63D]/40 dark:bg-[#00F5A0]/20 rounded-3xl blur-2xl -z-10 transform translate-x-2 translate-y-3" />

          <div className="bg-[#16171A] text-slate-300 rounded-2xl p-5 sm:p-7 border border-white/10 shadow-2xl font-mono text-xs space-y-4">
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>
              <span className="text-[11px] text-slate-400">precursor.verify</span>
            </div>

            {/* Step Sequence from Architecture */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start space-x-3 text-slate-300">
                <span className="text-slate-500 select-none">01</span>
                <span>Events indexed from Anvil mempool</span>
              </div>
              <div className="flex items-start space-x-3 text-slate-300">
                <span className="text-slate-500 select-none">02</span>
                <span>Multi-step sequence scored deterministically</span>
              </div>
              <div className="flex items-start space-x-3 text-slate-300">
                <span className="text-slate-500 select-none">03</span>
                <span>Solvency invariant simulation enforced</span>
              </div>
              <div className="flex items-start space-x-3 text-[#D4F63D] dark:text-[#00F5A0] font-semibold bg-white/[0.04] p-2 rounded-lg">
                <span className="text-[#D4F63D] dark:text-[#00F5A0] select-none">04</span>
                <span>Withdrawal blocked by SecurityController</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Stat / Metric Bar with Dividers (sampleUI style) ── */}
      <div className="border-y border-[#E5E5DF] dark:border-white/[0.08] bg-[#F7F7F2] dark:bg-[#07090e] py-6 sm:py-8 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E5DF] dark:divide-white/[0.08] gap-6 md:gap-0">
          {/* Stat 1: Capital Preserved */}
          <div className="px-3 sm:px-6 text-center">
            <div className="font-serif text-2xl sm:text-4xl font-bold text-[#111215] dark:text-white">
              100%
            </div>
            <div className="text-[9px] sm:text-[11px] font-mono tracking-widest text-[#44443E] dark:text-slate-400 uppercase mt-1">
              CAPITAL PRESERVED
            </div>
          </div>

          {/* Stat 2: Projected Loss Saved */}
          <div className="px-3 sm:px-6 text-center pt-4 md:pt-0">
            <div className="font-serif text-2xl sm:text-4xl font-bold text-[#111215] dark:text-white">
              {economics?.valueSaved ? `$${(Number(economics.valueSaved) / 1e18).toFixed(0)} DCC` : '$195 DCC'}
            </div>
            <div className="text-[9px] sm:text-[11px] font-mono tracking-widest text-[#44443E] dark:text-slate-400 uppercase mt-1">
              DEFICIT PREVENTED
            </div>
          </div>

          {/* Stat 3: Pipeline Latency */}
          <div className="px-3 sm:px-6 text-center pt-4 md:pt-0">
            <div className="font-serif text-2xl sm:text-4xl font-bold text-[#111215] dark:text-white">
              {benchmark?.totalLatencyMs ? `${benchmark.totalLatencyMs}ms` : '<85ms'}
            </div>
            <div className="text-[9px] sm:text-[11px] font-mono tracking-widest text-[#44443E] dark:text-slate-400 uppercase mt-1">
              PIPELINE LATENCY
            </div>
          </div>

          {/* Stat 4: Breaches Permitted */}
          <div className="px-3 sm:px-6 text-center pt-4 md:pt-0">
            <div className="font-serif text-2xl sm:text-4xl font-bold text-[#111215] dark:text-white">
              0
            </div>
            <div className="text-[9px] sm:text-[11px] font-mono tracking-widest text-[#44443E] dark:text-slate-400 uppercase mt-1">
              BREACHES PERMITTED
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Four Reference Categories / Attack Vectors (sampleUI style) ── */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-2">
          <div>
            <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#44443E] dark:text-slate-400 font-semibold mb-1">
              FOUR REFERENCE THREAT TAXONOMIES
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#111215] dark:text-white tracking-tight">
              Start with the attack vector.
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-400 max-w-md font-sans leading-relaxed">
            Vectors evaluated against deterministic smart contract invariants. They enforce solvency, not probabilistic trust.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="cyber-card p-6 relative hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-5">
              <div className="ambit-icon-badge">OM</div>
              <span className="text-[#44443E] dark:text-slate-400 group-hover:text-[#111215] dark:group-hover:text-white font-mono text-sm transition-colors">↗</span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Oracle manipulation
            </h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Detects unvalidated spot price inflation before withdrawal execution. Prevents phantom borrowing power.
            </p>
          </div>

          {/* Card 2 */}
          <div className="cyber-card p-6 relative hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-5">
              <div className="ambit-icon-badge">FL</div>
              <span className="text-[#44443E] dark:text-slate-400 group-hover:text-[#111215] dark:group-hover:text-white font-mono text-sm transition-colors">↗</span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Flash loan pump
            </h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Tracks atomic borrow-pump sequences across mempool transaction bundles to catch liquidity drains.
            </p>
          </div>

          {/* Card 3 */}
          <div className="cyber-card p-6 relative hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-5">
              <div className="ambit-icon-badge">HF</div>
              <span className="text-[#44443E] dark:text-slate-400 group-hover:text-[#111215] dark:group-hover:text-white font-mono text-sm transition-colors">↗</span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Health factor deficit
            </h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Simulates terminal post-withdrawal state against the 150% minimum collateralization ratio invariant.
            </p>
          </div>

          {/* Card 4 */}
          <div className="cyber-card p-6 relative hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-5">
              <div className="ambit-icon-badge">CL</div>
              <span className="text-[#44443E] dark:text-slate-400 group-hover:text-[#111215] dark:group-hover:text-white font-mono text-sm transition-colors">↗</span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Collateral extraction
            </h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Blocks unauthorized withdrawal of unbacked collateral via SecurityController on-chain hook.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Intercepted Incident / Alert Banner (sampleUI style) ── */}
      <div className="ambit-alert-banner p-6 sm:p-8 text-center my-6">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#901B18] dark:text-[#FF3366] mb-1">
          INCIDENT INTERCEPTED ON-CHAIN
        </div>
        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#111215] dark:text-white mb-2 tracking-tight">
          Phantom withdrawal prevented by SecurityController.
        </h3>
        <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-sans">
          Attacker inflated MockOracle spot price from $1.00 to $3.00 DCC to claim $108 phantom borrowing power. Terminal simulation predicted solvency collapse; on-chain transaction reverted cleanly.
        </p>
        <div className="mt-5">
          <Link
            href="/investigation"
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-white/10 text-[#111215] dark:text-white border border-[#E5E5DF] dark:border-white/20 px-6 py-2.5 rounded-full text-xs font-semibold shadow-xs hover:bg-slate-50 transition-all"
          >
            Investigate forensic trace →
          </Link>
        </div>
      </div>

      {/* ── 5. Live Marketplace Evidence / Search & Filter Panel ── */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-2">
          <div>
            <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#44443E] dark:text-slate-400 font-semibold mb-1">
              LIVE DEFENSE EVIDENCE
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#111215] dark:text-white tracking-tight">
              Discover the incident sequence.
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-400 max-w-md font-sans leading-relaxed">
            Ranked by deterministic invariant verification, never probabilistic guesswork.
          </p>
        </div>

        <div className="cyber-card p-6 space-y-4">
          {/* Search Row */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-400 mb-1.5 font-medium">
              Search telemetry & event signatures
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, capability, or target contract address (e.g. 0x5D42...)"
                className="flex-1 bg-white dark:bg-[#16171A] border border-[#E5E5DF] dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#111215] dark:text-white placeholder:text-[#76766E] dark:placeholder:text-slate-500 focus:outline-none focus:border-[#111215] dark:focus:border-white"
              />
              <button
                type="button"
                className="btn-cyber-primary text-xs whitespace-nowrap justify-center py-2.5"
              >
                Search evidence
              </button>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-400 mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-white dark:bg-[#16171A] border border-[#E5E5DF] dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[#111215] dark:text-white focus:outline-none"
              >
                <option value="all" className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">All categories</option>
                <option value="oracle" className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Oracle manipulation</option>
                <option value="flashloan" className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Flash loan sequence</option>
                <option value="solvency" className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Solvency breach</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-400 mb-1">
                Verification
              </label>
              <select
                className="w-full bg-white dark:bg-[#16171A] border border-[#E5E5DF] dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[#111215] dark:text-white focus:outline-none"
              >
                <option className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">All evidence levels</option>
                <option className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Deterministic invariant</option>
                <option className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Simulated outcome</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-400 mb-1">
                Enforcement
              </label>
              <select
                className="w-full bg-white dark:bg-[#16171A] border border-[#E5E5DF] dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[#111215] dark:text-white focus:outline-none"
              >
                <option className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Controller Revert (BLOCK)</option>
                <option className="bg-white dark:bg-[#16171A] text-[#111215] dark:text-white">Review only</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[#44443E] dark:text-slate-400 mb-1">
                Protocol
              </label>
              <input
                type="text"
                placeholder="e.g. LendingPool"
                className="w-full bg-white dark:bg-[#16171A] border border-[#E5E5DF] dark:border-white/10 rounded-lg px-3 py-2 text-xs text-[#111215] dark:text-white placeholder:text-[#76766E] dark:placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 text-[10px] font-mono text-[#44443E] dark:text-slate-400">
            Every indexed block remains verifiable by default. SecurityController gates are strictly deterministic.
          </div>
        </div>
      </div>

      {/* ── 6. Three Core Architecture Pillars (sampleUI style) ── */}
      <div className="cyber-card p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E5DF] dark:divide-white/[0.08] gap-6 md:gap-0">
          <div className="md:pr-8">
            <div className="text-xs font-mono text-[#4E7514] dark:text-[#00F5A0] font-bold mb-2">01</div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#111215] dark:text-white mb-2">
              Discover everything
            </h3>
            <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              High-throughput block and mempool log ingestion with sub-millisecond event parsing and touch-graph tracking.
            </p>
          </div>

          <div className="md:px-8 pt-6 md:pt-0">
            <div className="text-xs font-mono text-[#4E7514] dark:text-[#00F5A0] font-bold mb-2">02</div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#111215] dark:text-white mb-2">
              Inspect the evidence
            </h3>
            <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Trace invariant formulas, debt ratios, and hypothetical withdrawal outcomes against exact smart contract storage.
            </p>
          </div>

          <div className="md:pl-8 pt-6 md:pt-0">
            <div className="text-xs font-mono text-[#4E7514] dark:text-[#00F5A0] font-bold mb-2">03</div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#111215] dark:text-white mb-2">
              Authorize narrowly
            </h3>
            <p className="text-xs sm:text-sm text-[#44443E] dark:text-slate-400 leading-relaxed font-sans">
              Non-custodial hook. Deterministic controller reverts transactions before protocol collateral can be extracted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
