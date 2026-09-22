'use client';

import React, { useEffect, useState } from 'react';
import { api, type ProtocolData } from '@/lib/api';

export default function ProtocolPage() {
  const [data, setData] = useState<ProtocolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getProtocol()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-sm text-[#44443E] dark:text-slate-400">
        Loading protocol security model...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center text-[#901B18] dark:text-[#FF3366] font-mono text-sm">
        Failed to load protocol data: {error || 'No response'}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08]">
        <div className="flex items-center space-x-2 text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] mb-2 uppercase tracking-widest font-semibold">
          <span>ARCHITECTURE SPECIFICATION</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">TRUST BOUNDARY MAP</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
          Protocol Security Model
        </h1>
        <p className="text-sm sm:text-base text-[#44443E] dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-sans">
          Inspection of protected contracts, spot price feed mechanics, collateral custody, and the non-custodial controller hook.
        </p>
      </div>

      {/* Protocol Summary Card */}
      <div className="cyber-card p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E5DF] dark:border-white/[0.08]">
          <div>
            <div className="text-[11px] font-mono text-[#4E7514] dark:text-[#00F5A0] font-semibold uppercase tracking-wider">
              Controlled Lending Market
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111215] dark:text-white mt-1">
              {data.protocol.name}
            </h2>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">
              {data.protocol.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-[#D4F63D]/25 dark:bg-emerald-500/10 text-[#4E7514] dark:text-[#00F5A0] border border-[#D4F63D]/50 dark:border-emerald-500/20 font-semibold">
              Controller: {data.protocol.securityControllerEnabled ? 'Active (Opt-In)' : 'Disabled'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs font-mono">
          <div className="p-3 bg-[#F7F7F2] dark:bg-white/[0.02] rounded-xl border border-[#E5E5DF] dark:border-white/[0.04]">
            <span className="text-[#44443E] dark:text-slate-400 uppercase text-[10px]">Network</span>
            <div className="font-semibold text-[#111215] dark:text-white mt-1">{data.chain.name} (ID: {data.chain.id})</div>
          </div>
          <div className="p-3 bg-[#F7F7F2] dark:bg-white/[0.02] rounded-xl border border-[#E5E5DF] dark:border-white/[0.04]">
            <span className="text-[#44443E] dark:text-slate-400 uppercase text-[10px]">Borrow Factor</span>
            <div className="font-semibold text-[#111215] dark:text-white mt-1">{data.protocol.borrowFactor} collateral value</div>
          </div>
          <div className="p-3 bg-[#F7F7F2] dark:bg-white/[0.02] rounded-xl border border-[#E5E5DF] dark:border-white/[0.04]">
            <span className="text-[#44443E] dark:text-slate-400 uppercase text-[10px]">Liquidation Threshold</span>
            <div className="font-semibold text-[#4E7514] dark:text-[#00F5A0] mt-1">{data.protocol.liquidationThreshold} minimum</div>
          </div>
          <div className="p-3 bg-[#F7F7F2] dark:bg-white/[0.02] rounded-xl border border-[#E5E5DF] dark:border-white/[0.04]">
            <span className="text-[#44443E] dark:text-slate-400 uppercase text-[10px]">Enforcement Hook</span>
            <div className="font-semibold text-[#901B18] dark:text-[#FF3366] mt-1 truncate" title={data.protocol.protectedOperation}>
              withdrawal hook
            </div>
          </div>
        </div>
      </div>

      {/* Trust Boundary Specification Callout */}
      <div className="p-6 rounded-2xl border border-[#D4F63D] dark:border-emerald-500/30 bg-[#F0F7DE]/50 dark:bg-emerald-950/15 text-xs text-[#111215] dark:text-slate-200">
        <div className="font-semibold font-mono uppercase tracking-wider mb-2 text-[11px] text-[#4E7514] dark:text-[#00F5A0] flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4E7514] dark:bg-[#00F5A0]" />
          <span>Trust Boundary & Non-Custodial Architecture</span>
        </div>
        <p className="leading-relaxed font-sans text-xs sm:text-sm text-[#4A4D40] dark:text-slate-300">
          Precursor does not custody funds, hold protocol keys, or require administrative privileges. The protected protocol voluntarily delegates a narrow, revocable permission to <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.08] font-mono text-[#111215] dark:text-[#00D2FF]">SecurityController</code> exclusively for the <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/[0.08] font-mono text-[#111215] dark:text-[#00D2FF]">withdraw()</code> operation. If an attack sequence violates solvency invariants, the controller reverts the transaction directly at the EVM opcode level.
        </p>
      </div>

      {/* Contracts Inventory Table */}
      <div className="cyber-card overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Deployed Contract Ecosystem</h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono mt-0.5">Addresses verified on local Anvil chain</p>
          </div>
          <span className="text-[10px] font-mono text-[#8E8E84] dark:text-slate-400 sm:hidden">Swipe to view →</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs font-mono">
            <thead className="bg-[#F7F7F2] dark:bg-white/[0.02] border-b border-[#E5E5DF] dark:border-white/[0.08] text-[#44443E] dark:text-slate-400 uppercase">
              <tr>
                <th className="py-3 px-5">Component</th>
                <th className="py-3 px-5">Contract Address</th>
                <th className="py-3 px-5">Security Role</th>
                <th className="py-3 px-5">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5DF] dark:divide-white/[0.06]">
              <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                <td className="py-4 px-5 font-semibold text-[#111215] dark:text-white whitespace-nowrap">LendingPool</td>
                <td className="py-4 px-5 text-[#111215] dark:text-[#00D2FF] select-all font-mono">{data.contracts.lendingPool}</td>
                <td className="py-4 px-5 text-[#44443E] dark:text-slate-300">Custodies collateral, issues loans, enforces hook</td>
                <td className="py-4 px-5 text-[#4E7514] dark:text-[#00F5A0] whitespace-nowrap font-semibold">onlyOwner (Controller toggle)</td>
              </tr>
              <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                <td className="py-4 px-5 font-semibold text-[#111215] dark:text-white whitespace-nowrap">MockOracle</td>
                <td className="py-4 px-5 text-[#111215] dark:text-[#00D2FF] select-all font-mono">{data.contracts.oracle}</td>
                <td className="py-4 px-5 text-[#44443E] dark:text-slate-300">Spot price feed (single unvalidated feed without TWAP)</td>
                <td className="py-4 px-5 text-[#901B18] dark:text-[#FF3366] whitespace-nowrap font-semibold">Public setPrice (Exploit vector)</td>
              </tr>
              <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                <td className="py-4 px-5 font-semibold text-[#111215] dark:text-white whitespace-nowrap">ControlledCollateral (DCC)</td>
                <td className="py-4 px-5 text-[#111215] dark:text-[#00D2FF] select-all font-mono">{data.contracts.collateral}</td>
                <td className="py-4 px-5 text-[#44443E] dark:text-slate-300">ERC20 test collateral</td>
                <td className="py-4 px-5 text-[#44443E] dark:text-slate-400">Standard ERC20</td>
              </tr>
              <tr className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                <td className="py-4 px-5 font-semibold text-[#111215] dark:text-white whitespace-nowrap">SecurityController</td>
                <td className="py-4 px-5 text-[#111215] dark:text-[#00D2FF] select-all font-mono">{data.contracts.securityController}</td>
                <td className="py-4 px-5 text-[#44443E] dark:text-slate-300">Deterministic gate enforcing collateral invariant</td>
                <td className="py-4 px-5 text-[#4E7514] dark:text-[#00F5A0] whitespace-nowrap font-semibold">onlyProtected (LendingPool only)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Oracle & Invariant Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Oracle Card */}
        <div className="cyber-card p-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E5DF] dark:border-white/[0.08]">
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Oracle Configuration</h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono">Spot feed pricing parameters</p>
          </div>
          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#E5E5DF] dark:border-white/[0.04]">
              <span className="text-[#44443E] dark:text-slate-400">Feed Type:</span>
              <span className="font-semibold text-[#111215] dark:text-white">{data.oracle.type}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5DF] dark:border-white/[0.04]">
              <span className="text-[#44443E] dark:text-slate-400">Current Spot Price:</span>
              <span className="font-bold text-[#4E7514] dark:text-[#00F5A0] text-sm">{data.oracle.currentPrice} / token</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E5DF] dark:border-white/[0.04]">
              <span className="text-[#44443E] dark:text-slate-400">Precision Scale:</span>
              <span className="text-[#111215] dark:text-white">{data.oracle.scale} (18 decimals)</span>
            </div>
            <div className="pt-2">
              <span className="text-[#901B18] dark:text-[#FF3366] font-semibold uppercase text-[11px]">Vulnerability Surface:</span>
              <p className="text-[#44443E] dark:text-slate-300 text-xs mt-1.5 leading-relaxed font-sans">
                {data.oracle.vulnerability}
              </p>
            </div>
          </div>
        </div>

        {/* Invariant Rules Card */}
        <div className="cyber-card p-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E5DF] dark:border-white/[0.08]">
            <h3 className="font-serif text-lg font-bold text-[#111215] dark:text-white">Solvency Invariants</h3>
            <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono">Predicates evaluated before withdrawal execution</p>
          </div>
          {data.invariants.map((inv, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.06] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#111215] dark:text-white">{inv.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inv.healthy ? 'bg-[#D4F63D]/30 dark:bg-emerald-500/15 text-[#4E7514] dark:text-[#00F5A0] border border-[#D4F63D]' : 'bg-[#FEECEB] dark:bg-rose-500/15 text-[#901B18] dark:text-[#FF3366] border border-[#FCD2D0]'}`}>
                  {inv.healthy ? 'Healthy' : 'Breached'}
                </span>
              </div>
              <div className="text-[#44443E] dark:text-slate-400">
                Formula: <code className="text-[#111215] dark:text-[#00D2FF] font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">{inv.formula}</code>
              </div>
              <div className="flex justify-between text-[#44443E] dark:text-slate-400 text-[11px] pt-1">
                <span>Required: {inv.threshold}</span>
                <span className="font-semibold text-[#111215] dark:text-white">Current Ratio: {(inv.currentRatioBps / 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-[#44443E] dark:text-slate-400 font-mono">
            When hypothetical continuation violates this ratio, SecurityController returns <span className="text-[#901B18] dark:text-[#FF3366] font-semibold">BLOCK</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
