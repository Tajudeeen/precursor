'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api, type OverviewData, type SandboxState } from '@/lib/api';

export default function IntroPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sandboxState, setSandboxState] = useState<SandboxState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([api.getOverview(), api.getSandboxState()]).then(([ov, sb]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (sb.status === 'fulfilled') setSandboxState(sb.value);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-16 py-4">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative pt-6 sm:pt-10 pb-4">
        <div className="max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#F0F7DE] dark:bg-[#00F5A0]/10 border border-[#D4F63D] dark:border-[#00F5A0]/20 text-[#4E7514] dark:text-[#00F5A0] text-xs font-mono font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0] animate-pulse" />
            <span>Pre-Transaction DeFi Defense Radar</span>
            <span>·</span>
            <span>Zero-Loss Invariant Engine</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-[#111215] dark:text-white leading-[1.12]">
            Stop DeFi exploits before funds leave the pool.
          </h1>

          <p className="text-base sm:text-xl text-[#44443E] dark:text-slate-300 font-sans leading-relaxed max-w-3xl">
            Precursor is behavior-first security infrastructure that monitors in-flight mempool sequences,
            classifies multi-step flash loan & price-skew exploits, simulates terminal collateral health against
            strict invariants, and deterministically blocks unauthorized withdrawals on-chain via <code className="text-[#4E7514] dark:text-[#00F5A0] font-mono text-sm bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">SecurityController</code>.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/simulate"
              className="btn-cyber-primary text-sm px-6 py-3 flex items-center gap-2 shadow-sm"
            >
              <span>Interactive Sandbox ⚡</span>
            </Link>

            <Link
              href="/dashboard"
              className="btn-cyber-secondary text-sm px-6 py-3 flex items-center gap-2"
            >
              <span>Launch Defense Terminal →</span>
            </Link>

            <Link
              href="/comparison"
              className="text-xs font-mono text-[#44443E] dark:text-slate-400 hover:text-[#111215] dark:hover:text-white px-3 py-2 transition-colors inline-flex items-center gap-1"
            >
              <span>View A/B Proof Demo</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Live Status Pill Bar */}
        <div className="mt-10 p-4 rounded-2xl bg-[#F7F7F2] dark:bg-white/[0.03] border border-[#E5E5DF] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0] animate-pulse" />
            <span className="text-[#111215] dark:text-white font-semibold">
              Anvil Node Active (Chain ID 31337)
            </span>
            <span className="text-[#44443E] dark:text-slate-500 hidden sm:inline">|</span>
            <span className="text-[#44443E] dark:text-slate-400 hidden sm:inline">
              Spot Price: {sandboxState?.oraclePrice ?? '$1.00'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[#44443E] dark:text-slate-400">
              Min Invariant: <strong className="text-[#111215] dark:text-white">150.00%</strong>
            </span>
            <span className="text-[#44443E] dark:text-slate-400">
              Controller: <strong className="text-[#4E7514] dark:text-[#00F5A0]">ARMED</strong>
            </span>
            <span className="text-[#44443E] dark:text-slate-400">
              Block #{sandboxState?.blockNumber ?? 250}
            </span>
          </div>
        </div>
      </section>

      {/* ── Two Primary Interactive Entrypoints ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] font-semibold">
              EXPERIENCE PRECURSOR IN ACTION
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111215] dark:text-white mt-1">
              Choose How to Explore
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Interactive Execution Sandbox */}
          <div className="cyber-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#D4F63D] dark:bg-[#00F5A0] flex items-center justify-center text-xl font-mono font-bold text-[#111215] dark:text-[#06080c] shadow-xs">
                  ⚡
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F0F7DE] dark:bg-emerald-500/10 text-[#4E7514] dark:text-[#00F5A0] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#D4F63D] dark:border-emerald-500/30">
                  Real-Time EVM Execution
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-[#111215] dark:text-white">
                  Interactive Defense Sandbox
                </h3>
                <p className="text-sm text-[#44443E] dark:text-slate-300 font-sans leading-relaxed mt-2">
                  Execute the 5-step exploit sequence against local Anvil. Toggle between <strong>Protected</strong> and <strong>Unprotected</strong> modes to witness the exact on-chain revert when Precursor&apos;s SecurityController blocks the unbacked withdrawal.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs font-mono text-[#44443E] dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Step-by-step transaction triggers on Anvil</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Live EVM transaction receipts and on-chain revert strings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Auto-play sequence simulation with real-time HUD diffs</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/simulate"
                className="btn-cyber-primary w-full text-xs py-3 text-center justify-center font-bold"
              >
                Launch Sandbox Console ⚡
              </Link>
            </div>
          </div>

          {/* Card 2: Live Radar Dashboard */}
          <div className="cyber-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 border border-[#E5E5DF] dark:border-white/10 flex items-center justify-center text-xl font-mono font-bold text-[#111215] dark:text-white shadow-xs">
                  📡
                </div>
                <span className="px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[#44443E] dark:text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-[#E5E5DF] dark:border-white/10">
                  Telemetry Terminal
                </span>
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-[#111215] dark:text-white">
                  Live Defense Radar
                </h3>
                <p className="text-sm text-[#44443E] dark:text-slate-300 font-sans leading-relaxed mt-2">
                  The mission-control defense terminal. Streams live behavioral classifications, mempool bundle sequence evaluations, latency benchmarks (&lt;85ms), and economic damage calculators ($235 saved).
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs font-mono text-[#44443E] dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Real-time WebSocket heartbeat and health metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Attack economics breakdown and protocol preservation statistics</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#4E7514] dark:text-[#00F5A0]">✓</span>
                  <span>Threat intelligence search and filter catalog</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/dashboard"
                className="btn-cyber-secondary w-full text-xs py-3 text-center justify-center font-bold"
              >
                Enter Defense Radar →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem vs Solution (Why Precursor Matters) ───────────────────── */}
      <section className="space-y-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] font-semibold">
            THE ARCHITECTURAL GAP IN DEFI SECURITY
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111215] dark:text-white mt-1">
            Why Traditional Security Fails Multi-Step Exploits
          </h2>
          <p className="text-sm text-[#44443E] dark:text-slate-400 font-sans mt-2 max-w-2xl leading-relaxed">
            Exploits don&apos;t look like bugs in single transactions; they look like legitimate interactions executed in a predatory sequence across multiple steps within atomic blocks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="cyber-card p-6 border-l-4 border-l-[#901B18] dark:border-l-rose-500">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#901B18] dark:text-[#FF3366] uppercase tracking-wider mb-2">
              <span>✕ Traditional DeFi Security</span>
            </div>
            <h4 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Reactive & Blunt Interventions
            </h4>
            <ul className="space-y-2.5 text-xs text-[#44443E] dark:text-slate-300 font-sans leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#901B18] font-bold mt-0.5">•</span>
                <span><strong>Post-Exploit Alerts:</strong> Discord bots and webhooks fire <em>after</em> the transaction settles and funds are already in Tornado Cash.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#901B18] font-bold mt-0.5">•</span>
                <span><strong>Multisig Emergency Pauses:</strong> Requires human signers, taking 15 minutes to 4 hours to coordinate—far too late for a 12-second block.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#901B18] font-bold mt-0.5">•</span>
                <span><strong>Global Circuit Breakers:</strong> Bludgeon the entire protocol, freezing normal user withdrawals and breaking downstream liquidations.</span>
              </li>
            </ul>
          </div>

          <div className="cyber-card p-6 border-l-4 border-l-[#4E7514] dark:border-l-[#00F5A0]">
            <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#4E7514] dark:text-[#00F5A0] uppercase tracking-wider mb-2">
              <span>✓ Precursor Behavioral Architecture</span>
            </div>
            <h4 className="font-serif text-lg font-bold text-[#111215] dark:text-white mb-2">
              Pre-Transaction & Invariant-Governed
            </h4>
            <ul className="space-y-2.5 text-xs text-[#44443E] dark:text-slate-300 font-sans leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#4E7514] dark:text-[#00F5A0] font-bold mt-0.5">•</span>
                <span><strong>Pre-Execution Simulation:</strong> Evaluates pending mempool bundles against hypothetical terminal states <em>before</em> inclusion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4E7514] dark:text-[#00F5A0] font-bold mt-0.5">•</span>
                <span><strong>Deterministic Revert Gate:</strong> <code>SecurityController</code> executes an on-chain check at withdrawal time that instantly reverts any transaction violating the 150% invariant.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#4E7514] dark:text-[#00F5A0] font-bold mt-0.5">•</span>
                <span><strong>Zero Custody or Moving Funds:</strong> Never holds private keys or moves funds autonomously. Pure validation and gatekeeping.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5-Stage Pipeline Breakdown ───────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] font-semibold">
            HOW PRECURSOR OPERATES
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111215] dark:text-white mt-1">
            The 5-Stage Defense Loop
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
          <div className="cyber-card p-5 space-y-2">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold">01. INGESTION</div>
            <h4 className="font-serif text-sm font-bold text-[#111215] dark:text-white">Normalized EVM Streams</h4>
            <p className="font-sans text-[11px] text-[#44443E] dark:text-slate-400 leading-relaxed">
              Subscribes to raw RPC events, decodes logs, and normalizes them into structured sequence records.
            </p>
          </div>

          <div className="cyber-card p-5 space-y-2">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold">02. BEHAVIOR ENGINE</div>
            <h4 className="font-serif text-sm font-bold text-[#111215] dark:text-white">Sequence Matching</h4>
            <p className="font-sans text-[11px] text-[#44443E] dark:text-slate-400 leading-relaxed">
              Classifies multi-step sequences against known exploit patterns (price manipulation, borrow surges).
            </p>
          </div>

          <div className="cyber-card p-5 space-y-2">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold">03. ATTACK GRAPH</div>
            <h4 className="font-serif text-sm font-bold text-[#111215] dark:text-white">Causal Topology</h4>
            <p className="font-sans text-[11px] text-[#44443E] dark:text-slate-400 leading-relaxed">
              Reconstructs dependencies between oracle spot prices, collateral values, and phantom borrowing power.
            </p>
          </div>

          <div className="cyber-card p-5 space-y-2">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold">04. SIMULATION CORE</div>
            <h4 className="font-serif text-sm font-bold text-[#111215] dark:text-white">Invariant Verification</h4>
            <p className="font-sans text-[11px] text-[#44443E] dark:text-slate-400 leading-relaxed">
              Simulates terminal post-execution state against the protocol&apos;s 150.00% minimum collateralization invariant.
            </p>
          </div>

          <div className="cyber-card p-5 space-y-2">
            <div className="text-[#4E7514] dark:text-[#00F5A0] font-bold">05. CONTROLLER</div>
            <h4 className="font-serif text-sm font-bold text-[#111215] dark:text-white">On-Chain BLOCK</h4>
            <p className="font-sans text-[11px] text-[#44443E] dark:text-slate-400 leading-relaxed">
              <code>SecurityController</code> rejects the transaction on-chain via EVM revert, locking zero legitimate funds.
            </p>
          </div>
        </div>
      </section>

      {/* ── All Navigation Destinations ──────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] font-semibold">
            NAVIGATION DIRECTORY
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#111215] dark:text-white mt-1">
            All Terminal Views & Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/simulate"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                Interactive Sandbox ⚡
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/simulate</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Execute individual transactions on Anvil and toggle Protected vs Unprotected modes.
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                Defense Radar 📡
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/dashboard</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Live mempool event streams, active defense loop triggers, and threat intelligence filters.
            </p>
          </Link>

          <Link
            href="/protocol"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                Protocol Topology 🏛️
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/protocol</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              LendingPool, MockOracle, ControlledCollateral contracts, and invariant specifications.
            </p>
          </Link>

          <Link
            href="/threats"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                Threat Matrix 🚨
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/threats</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Pattern library, sensitivity thresholds, and detected predatory behavioral signatures.
            </p>
          </Link>

          <Link
            href="/investigation"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                Forensics & Causal Flow 🔍
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/investigation</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Incident investigation graph, state divergence simulation, and policy verdict proof.
            </p>
          </Link>

          <Link
            href="/comparison"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                A/B Side-by-Side Proof ⚖️
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/comparison</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Deterministic comparison of identical sequence: unprotected baseline vs Precursor defended.
            </p>
          </Link>

          <Link
            href="/proof"
            className="cyber-card p-5 hover:border-[#111215] dark:hover:border-[#00F5A0] transition-all group sm:col-span-2 lg:col-span-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#111215] dark:text-white text-base group-hover:text-[#4E7514] dark:group-hover:text-[#00F5A0] transition-colors">
                On-Chain Verification & Negative Proofs 🛡️
              </span>
              <span className="text-xs font-mono text-[#44443E] dark:text-slate-400">/proof</span>
            </div>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans leading-relaxed">
              Every field read live from Anvil at call time. Negative proofs verify the contract revert paths, with all trust boundaries disclosed flat.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
