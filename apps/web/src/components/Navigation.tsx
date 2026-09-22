'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function Navigation() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isRunning, setIsRunning] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('precursor-theme') as 'dark' | 'light' | null;
    const isDocDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const initialTheme = saved || (isDocDark ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('precursor-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  const openSplash = () => {
    window.dispatchEvent(new CustomEvent('precursor-open-splash'));
  };

  const handleRunLoop = async () => {
    setIsRunning(true);
    setLastActionMsg('Simulating pending mempool sequence...');
    try {
      const res = await api.runScenario();
      setLastActionMsg(res.blocked ? 'INTERCEPTED: Invariant breach prevented on-chain' : 'Sequence evaluated: Solvency maintained');
      setTimeout(() => setLastActionMsg(null), 5000);
      window.dispatchEvent(new CustomEvent('precursor-data-refresh'));
    } catch (err: any) {
      setLastActionMsg(`Error: ${err.message}`);
      setTimeout(() => setLastActionMsg(null), 5000);
    } finally {
      setIsRunning(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Intro' },
    { href: '/dashboard', label: 'Radar' },
    { href: '/simulate', label: 'Sandbox ⚡' },
    { href: '/protocol', label: 'Protocol' },
    { href: '/threats', label: 'Threats' },
    { href: '/investigation', label: 'Forensics' },
    { href: '/comparison', label: 'A/B Proof' },
    { href: '/proof', label: 'Live Proof' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5DF] dark:border-white/[0.08] bg-[#F7F7F2]/95 dark:bg-[#07090e]/95 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Favicon Logo & Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden bg-[#D4F63D] dark:bg-[#00F5A0] p-1 flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src={`${basePath}/favicon.png`}
                  alt="Precursor Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain rounded-md"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[#111215] dark:text-white tracking-tight text-sm sm:text-base leading-tight font-sans">
                  Precursor
                </span>
                <span className="hidden min-[360px]:inline-block text-[10px] sm:text-[11px] text-[#44443E] dark:text-slate-400 font-sans leading-tight">
                  Autonomous on-chain defense
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop & Tablet Navigation Links */}
          <nav className="hidden md:flex items-center space-x-0.5 lg:space-x-1 bg-white/80 dark:bg-white/[0.04] p-1 rounded-full border border-[#E5E5DF] dark:border-white/[0.08] shadow-xs">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 lg:px-3.5 py-1 text-[11px] lg:text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#111215] text-white dark:bg-white/[0.12] dark:text-white shadow-xs font-semibold'
                      : 'text-[#33332D] dark:text-slate-300 hover:text-[#111215] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Target Network Pill (hidden on small screens, shown in drawer) */}
            <div
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1 text-[11px] font-mono rounded-full bg-white dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08] text-[#111215] dark:text-slate-200 shadow-xs"
              title="Target Network"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4E7514] dark:bg-[#00F5A0] animate-pulse" />
              <span>Anvil 31337</span>
            </div>

            {/* Quick Trigger Button */}
            <button
              onClick={handleRunLoop}
              disabled={isRunning}
              className="btn-cyber-primary text-xs px-3.5 sm:px-5 py-2 sm:py-2.5 min-h-[36px]"
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5 text-white dark:text-[#06080c]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Run</span>
                  <span className="hidden sm:inline">Run defense loop</span>
                </>
              )}
            </button>

            {/* Splash Intro Modal Trigger */}
            <button
              onClick={openSplash}
              className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-[#E5E5DF] dark:border-white/[0.08] text-[#33332D] dark:text-slate-300 hover:text-[#111215] dark:hover:text-white bg-white dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/[0.07] transition-all"
              title="View Architecture Splash"
              aria-label="View Info"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full border border-[#E5E5DF] dark:border-white/[0.08] text-[#33332D] dark:text-slate-300 hover:text-[#111215] dark:hover:text-white bg-white dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/[0.07] transition-all"
              title={`Switch to ${theme === 'dark' ? 'Warm Editorial' : 'Cyber Dark'} mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Mobile Hamburger Button with Label */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full border border-[#111215] dark:border-white/20 bg-[#111215] text-white dark:bg-white/10 dark:text-white text-xs font-mono font-bold shadow-xs hover:opacity-90 transition-opacity"
              aria-label="Open mobile navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Navigation Strip (visible on mobile screens) */}
        <div className="md:hidden py-2 border-t border-[#E5E5DF] dark:border-white/[0.06] overflow-x-auto no-scrollbar flex items-center space-x-1.5">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1 text-xs whitespace-nowrap rounded-full transition-all font-medium ${
                  active
                    ? 'bg-[#111215] text-white dark:bg-white/20 dark:text-white font-semibold shadow-xs'
                    : 'text-[#44443E] dark:text-slate-300 hover:text-[#111215] dark:hover:text-white bg-black/5 dark:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Dynamic Notification Message */}
        {lastActionMsg && (
          <div className="py-2 px-4 bg-[#D4F63D]/25 border-b border-[#D4F63D]/50 text-[#4E7514] dark:text-[#00F5A0] text-xs font-mono text-center flex items-center justify-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4E7514] dark:bg-[#00F5A0] animate-pulse" />
            <span>{lastActionMsg}</span>
          </div>
        )}
      </div>

      {/* ── Mobile Side Menu Drawer (Off-Canvas Sheet) ───────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Side Drawer from Right */}
          <div className="fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-[#F7F7F2] dark:bg-[#0c1017] border-l border-[#E5E5DF] dark:border-white/[0.08] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header with Logo & Close Button */}
              <div className="flex items-center justify-between pb-5 border-b border-[#E5E5DF] dark:border-white/[0.08] mb-6">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2.5"
                >
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[#D4F63D] dark:bg-[#00F5A0] p-1 flex items-center justify-center shadow-xs flex-shrink-0">
                    <Image
                      src={`${basePath}/favicon.png`}
                      alt="Precursor Logo"
                      width={32}
                      height={32}
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#111215] dark:text-white tracking-tight text-sm font-sans leading-tight">
                      Precursor
                    </span>
                    <span className="text-[10px] text-[#44443E] dark:text-slate-400 font-sans">
                      Autonomous Defense
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 min-w-[36px] min-h-[36px] rounded-full text-[#44443E] hover:text-[#111215] dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                  aria-label="Close navigation menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Links list */}
              <nav className="space-y-1.5">
                {navLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#111215] dark:bg-white/[0.12] text-white font-semibold shadow-xs'
                          : 'text-[#33332D] dark:text-slate-200 hover:text-[#111215] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{link.label}</span>
                      {active && (
                        <span className="w-2 h-2 rounded-full bg-[#D4F63D] dark:bg-[#00F5A0]" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Controls inside Drawer */}
            <div className="pt-6 border-t border-[#E5E5DF] dark:border-white/[0.08] space-y-3.5">
              {/* Target Network Badge */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E5DF] dark:border-white/[0.08] text-xs font-mono">
                <span className="text-[#44443E] dark:text-slate-400">Target Node</span>
                <span className="flex items-center gap-1.5 text-[#111215] dark:text-white font-semibold">
                  <span className="w-2 h-2 rounded-full bg-[#4E7514] dark:bg-[#00F5A0] animate-pulse" />
                  Anvil 31337
                </span>
              </div>

              {/* Run Defense Loop */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleRunLoop();
                }}
                disabled={isRunning}
                className="w-full btn-cyber-primary text-xs py-3 justify-center"
              >
                {isRunning ? 'Simulating Sequence...' : 'Run defense loop'}
              </button>

              {/* Theme & Info Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#E5E5DF] dark:border-white/[0.08] text-xs font-mono text-[#33332D] dark:text-slate-200 bg-white dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  {theme === 'dark' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span>Dark</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openSplash();
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-[#E5E5DF] dark:border-white/[0.08] text-xs font-mono text-[#33332D] dark:text-slate-200 bg-white dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Info</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
