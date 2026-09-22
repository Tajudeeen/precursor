'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasSeen = typeof window !== 'undefined' ? sessionStorage.getItem('precursor_splash_seen') : null;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (!hasSeen || urlParams?.get('intro') === '1') {
      setVisible(true);
    }

    const handleOpen = () => setVisible(true);
    window.addEventListener('precursor-open-splash', handleOpen);
    return () => window.removeEventListener('precursor-open-splash', handleOpen);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('precursor_splash_seen', 'true');
    }
  };

  if (!mounted || !visible) return null;

  return (
    <div className="splash-backdrop" role="dialog" aria-modal="true" aria-label="Welcome to Precursor">
      <div className="splash-container">
        {/* Top Header Bar */}
        <div className="splash-header">
          <div className="splash-tag">
            <span className="signal-pulse" aria-hidden="true" />
            <span>PRE-TRANSACTION DEFI DEFENSE RADAR</span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close intro"
            className="text-[#44443E] hover:text-[#111215] dark:text-slate-400 dark:hover:text-white transition-colors bg-transparent border-none text-lg cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Brand & Headline */}
        <div className="flex items-center space-x-3.5 mb-4">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-[#D4F63D] dark:bg-[#00F5A0] p-1 flex items-center justify-center shadow-xs flex-shrink-0">
            <Image
              src={`${basePath}/favicon.png`}
              alt="Precursor Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain rounded-lg"
              priority
            />
          </div>
          <div>
            <div className="text-[11px] font-mono tracking-widest text-[#4E7514] dark:text-[#00F5A0] uppercase font-semibold">
              PRECURSOR PROTOCOL
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111215] dark:text-white m-0 font-serif">
              Deterministic Defense Layer
            </h2>
          </div>
        </div>

        <h1 className="splash-title">
          Pre-transaction DeFi defense. Before funds leave the pool.
        </h1>

        <p className="splash-desc">
          Precursor is a behavior-first defense infrastructure that monitors pending mempool sequences,
          detects multi-step flash loan & price-skew exploits, simulates hypothetical solvency breaches against
          strict collateral invariants, and deterministically enforces on-chain blocks via <code className="text-[#4E7514] dark:text-[#00F5A0] font-mono text-xs bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">SecurityController</code>.
        </p>

        {/* Telemetry Stat Cards */}
        <div className="splash-grid">
          <div className="p-3.5 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08]">
            <div className="text-[11px] font-mono uppercase text-[#44443E] dark:text-slate-400 font-semibold">Solvency Invariant</div>
            <div className="text-lg font-bold font-mono text-[#111215] dark:text-[#00F5A0] mt-1">150.00%</div>
            <div className="text-[#44443E] dark:text-slate-400 text-[10px] mt-1 font-mono">Fail-closed invariant gate</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08]">
            <div className="text-[11px] font-mono uppercase text-[#44443E] dark:text-slate-400 font-semibold">Sequence Intercept</div>
            <div className="text-lg font-bold font-mono text-[#111215] dark:text-[#00D2FF] mt-1">&lt; 85ms</div>
            <div className="text-[#44443E] dark:text-slate-400 text-[10px] mt-1 font-mono">Pre-execution simulation</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08]">
            <div className="text-[11px] font-mono uppercase text-[#44443E] dark:text-slate-400 font-semibold">Enforcement Core</div>
            <div className="text-lg font-bold font-mono text-[#111215] dark:text-white mt-1">Armed</div>
            <div className="text-[#44443E] dark:text-slate-400 text-[10px] mt-1 font-mono">SecurityController Active</div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            className="btn-cyber-primary text-xs px-6 py-2.5"
            onClick={dismiss}
          >
            Launch Defense Terminal →
          </button>
          <Link
            href="/comparison"
            onClick={dismiss}
            className="btn-cyber-secondary text-xs px-5 py-2.5"
          >
            Explore A/B Proof →
          </Link>
          <span className="ml-auto text-[#44443E] dark:text-slate-400 text-xs font-mono hidden sm:inline-block">
            Press <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-slate-800 text-[#111215] dark:text-slate-300 border border-[#E5E5DF] dark:border-slate-700">Enter</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-slate-800 text-[#111215] dark:text-slate-300 border border-[#E5E5DF] dark:border-slate-700">Esc</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
