'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-black/30 dark:border-[#E5E5DF] bg-[#0D0F14] dark:bg-[#F7F7F2] transition-colors duration-200 text-slate-300 dark:text-[#33332D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Top Section: Brand & 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/10 dark:border-[#E5E5DF]">
          {/* Col 1: Brand & Mission (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#00F5A0] dark:bg-[#D4F63D] p-1 flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src="/favicon.png"
                  alt="Precursor Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white dark:text-[#111215] tracking-tight text-base font-sans leading-tight">
                  Precursor
                </span>
                <span className="text-[11px] text-slate-400 dark:text-[#44443E] font-sans">
                  Autonomous On-Chain DeFi Defense
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-slate-300 dark:text-[#44443E] font-sans leading-relaxed max-w-md">
              Behavior-first pre-transaction defense infrastructure for EVM protocols. Precursor monitors pending mempool sequences, detects multi-step price inflation and flash loan sequences, simulates hypothetical solvency against exact collateral invariants, and deterministically halts exploits on-chain via <code className="text-xs font-mono bg-white/10 dark:bg-black/5 px-1 py-0.5 rounded text-[#00F5A0] dark:text-[#4E7514]">SecurityController</code>.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.06] dark:bg-white border border-white/10 dark:border-[#E5E5DF] text-slate-200 dark:text-[#111215] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] dark:bg-[#4E7514] animate-pulse" />
                <span>Anvil Localnet 31337</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 dark:bg-[#D4F63D]/25 border border-emerald-500/30 dark:border-[#D4F63D]/60 text-[#00F5A0] dark:text-[#4E7514] font-semibold">
                <span>Controller: Armed</span>
              </span>
            </div>
          </div>

          {/* Col 2: Product & Views (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white dark:text-[#111215] font-bold">
              Product
            </h3>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <Link href="/" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Intro Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Defense Radar
                </Link>
              </li>
              <li>
                <Link href="/simulate" className="text-[#00F5A0] hover:underline dark:text-[#4E7514] dark:hover:text-[#111215] transition-colors font-medium">
                  Live Sandbox ⚡
                </Link>
              </li>
              <li>
                <Link href="/protocol" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Protocol Security Model
                </Link>
              </li>
              <li>
                <Link href="/threats" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Threat Taxonomy
                </Link>
              </li>
              <li>
                <Link href="/investigation" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Incident Forensics
                </Link>
              </li>
              <li>
                <Link href="/comparison" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  A/B Exploit Proof Demo
                </Link>
              </li>
              <li>
                <Link href="/proof" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Live On-Chain Proofs
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Documentation & Architecture (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white dark:text-[#111215] font-bold">
              Documentation
            </h3>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <Link href="/protocol" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Trust Boundaries
                </Link>
              </li>
              <li>
                <Link href="/investigation" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Solvency Invariants
                </Link>
              </li>
              <li>
                <Link href="/threats" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Multi-Step Sequences
                </Link>
              </li>
              <li>
                <Link href="/proof" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Negative Proof Vectors
                </Link>
              </li>
              <li>
                <Link href="/protocol" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  SecurityController Hook
                </Link>
              </li>
              <li>
                <Link href="/proof" className="text-slate-400 hover:text-white dark:text-[#44443E] dark:hover:text-[#111215] transition-colors">
                  Disclosed Constraints & Scope
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Developers & Open Source (3 cols on lg) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white dark:text-[#111215] font-bold">
              Open Source & Repo
            </h3>
            <ul className="space-y-2 text-xs font-sans">
              <li>
                <a
                  href="https://github.com/tajudeen-isah/precursor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white dark:text-[#111215] dark:hover:underline transition-colors inline-flex items-center gap-1.5 font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository ↗</span>
                </a>
              </li>
              <li>
                <span className="text-slate-400 dark:text-[#44443E] font-mono text-[11px] block">
                  Foundry Suite: <code className="text-white dark:text-[#111215]">forge test</code>
                </span>
              </li>
              <li>
                <span className="text-slate-400 dark:text-[#44443E] font-mono text-[11px] block">
                  Verification Gate: <code className="text-white dark:text-[#111215]">npm run verify</code>
                </span>
              </li>
              <li>
                <span className="text-slate-400 dark:text-[#44443E] font-mono text-[11px] block">
                  License: MIT Open Source
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Philosophy & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="font-serif text-base sm:text-lg font-bold text-white dark:text-[#111215] tracking-tight mb-0.5">
              Evidence before authority.
            </div>
            <p className="text-xs text-slate-400 dark:text-[#44443E] font-sans max-w-xl">
              Telemetry informs simulation. Deterministic smart contract controls authorize execution. Zero probabilistic heuristics custody or move user funds.
            </p>
          </div>

          <div className="flex flex-col sm:items-end text-xs font-mono text-slate-400 dark:text-[#44443E] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white dark:text-[#111215]">Precursor v0.2.0</span>
              <span>·</span>
              <span>DeFi Defense Infrastructure</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-[#44443E]">
              © {currentYear} Precursor Protocol. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
