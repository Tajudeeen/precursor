'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { api, type ProofData } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateHash(hash: string, head = 10, tail = 8): string {
  if (!hash || hash.length <= head + tail + 3) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

function formatTs(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function riskBadge(level: string) {
  const map: Record<string, string> = {
    MEDIUM: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    LOW: 'bg-[#D4F63D]/25 text-[#4E7514] dark:bg-emerald-500/10 dark:text-[#00F5A0] border-[#D4F63D]',
    ARCHITECTURAL: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    DISCLOSED: 'bg-black/5 dark:bg-slate-700/50 text-[#44443E] dark:text-slate-400 border-[#E5E5DF] dark:border-slate-600/50',
    HIGH: 'bg-[#FEECEB] text-[#901B18] dark:bg-rose-500/15 dark:text-rose-400 border-[#FCD2D0]',
  };
  const cls = map[level] ?? 'bg-black/5 dark:bg-white/5 text-[#44443E] dark:text-slate-400 border-[#E5E5DF] dark:border-white/10';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded border uppercase tracking-wider ${cls}`}>
      {level}
    </span>
  );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-black/[0.04] dark:bg-white/[0.04] rounded ${className}`} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProofPage() {
  const [data, setData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const fetchProof = useCallback(async (showSpinner = false) => {
    if (showSpinner) setVerifying(true);
    try {
      const d = await api.getProof();
      setData(d);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to reach defense API');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    fetchProof();
  }, [fetchProof]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiedAddr(label);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="pb-6 border-b border-[#E5E5DF] dark:border-white/[0.08] flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#4E7514] dark:text-[#00F5A0] border border-[#D4F63D] dark:border-emerald-500/30 bg-[#F0F7DE] dark:bg-emerald-500/[0.06] px-2.5 py-0.5 rounded-full font-semibold">
              on-chain read
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#111215] dark:text-white">
            Live Proof
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#44443E] dark:text-slate-400 max-w-xl font-sans leading-relaxed">
            Every field below is read directly from Anvil at call-time — no screenshots, no mocks.
            Negative proofs confirm the security controller&apos;s revert path. Known limitations are stated flat.
          </p>
        </div>
        <button
          onClick={() => fetchProof(true)}
          disabled={verifying}
          className="btn-cyber-secondary text-xs flex items-center gap-2 self-start"
        >
          {verifying ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-[#111215] dark:text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Re-verifying…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-verify Live
            </>
          )}
        </button>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEECEB] dark:bg-rose-500/10 border border-[#FCD2D0] dark:border-rose-500/25 text-[#901B18] dark:text-[#FF3366] text-xs font-mono flex items-start gap-3">
          <svg className="w-4 h-4 text-[#901B18] dark:text-[#FF3366] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856C18.995 20 20 18.657 20 17V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10c0 1.657 1.005 3 2.062 3z" />
          </svg>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5">API Unreachable</p>
            <p className="text-xs text-[#901B18]/80 dark:text-[#FF3366]/80 font-mono">{error}</p>
            <p className="text-[11px] text-[#44443E] dark:text-slate-400 mt-1">Make sure the defense API is running on port 3001 and Anvil is live on 8555.</p>
          </div>
        </div>
      )}

      {/* ── Chain Telemetry ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-3 font-semibold">
          Chain Telemetry
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cyber-card p-4 space-y-2">
                <Shimmer className="h-3 w-20" />
                <Shimmer className="h-5 w-full" />
              </div>
            ))
          ) : data ? (
            <>
              <div className="cyber-card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Block</p>
                <p className="text-lg font-bold font-mono text-[#4E7514] dark:text-[#00F5A0]">#{data.chain.blockNumber.toLocaleString()}</p>
              </div>
              <div className="cyber-card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">RPC Latency</p>
                <p className="text-lg font-bold font-mono text-[#111215] dark:text-[#00D2FF]">{data.chain.rpcLatencyMs}ms</p>
              </div>
              <div className="cyber-card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Network</p>
                <p className="text-sm font-semibold text-[#111215] dark:text-white capitalize">{data.chain.name}</p>
                <p className="text-[10px] text-[#44443E] dark:text-slate-500 font-mono">id {data.chain.id}</p>
              </div>
              <div className="cyber-card p-4 sm:p-5">
                <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Verified At</p>
                <p className="text-[11px] font-mono text-[#4A4D40] dark:text-slate-300">{formatTs(data.verifiedAt)}</p>
              </div>
            </>
          ) : null}
        </div>
        {data && (
          <div className="mt-2 cyber-card p-3 flex items-center gap-2">
            <span className="text-[10px] text-[#44443E] dark:text-slate-500 font-mono uppercase tracking-wider flex-shrink-0">block hash</span>
            <span className="text-[11px] font-mono text-[#4A4D40] dark:text-slate-300 truncate">{data.chain.blockHash}</span>
          </div>
        )}
      </section>

      {/* ── Contract Addresses ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-3 font-semibold">
          Deployed Contracts
        </h2>
        {loading ? (
          <div className="cyber-card p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-4 w-full" />)}
          </div>
        ) : data ? (
          <div className="cyber-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5DF] dark:border-white/[0.06] bg-[#F7F7F2] dark:bg-white/[0.02]">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono font-normal">Contract</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono font-normal">Address</th>
                    <th className="px-5 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5DF] dark:divide-white/[0.04]">
                  {(Object.entries(data.contracts) as [string, string][]).map(([key, addr]) => {
                    const labels: Record<string, string> = {
                      lendingPool: 'LendingPool',
                      oracle: 'Oracle',
                      collateral: 'Collateral',
                      securityController: 'SecurityController',
                    };
                    const isCopied = copiedAddr === key;
                    return (
                      <tr key={key} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-3 font-mono text-[#111215] dark:text-slate-300 font-medium">{labels[key] ?? key}</td>
                        <td className="px-5 py-3 font-mono text-[#111215] dark:text-[#00D2FF] text-[11px]">
                          <span className="hidden sm:inline">{addr}</span>
                          <span className="sm:hidden">{truncateHash(addr, 8, 6)}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => copyToClipboard(addr, key)}
                            className="text-[#44443E] hover:text-[#111215] dark:text-slate-500 dark:hover:text-[#00F5A0] transition-colors"
                            title="Copy address"
                          >
                            {isCopied ? (
                              <svg className="w-3.5 h-3.5 text-[#4E7514] dark:text-[#00F5A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── On-chain State ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-3 font-semibold">
          On-chain State
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="cyber-card p-4 space-y-2">
                <Shimmer className="h-3 w-24" />
                <Shimmer className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="cyber-card p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Oracle Spot Price</p>
              <p className="text-base font-bold font-mono text-[#111215] dark:text-white">{data.onChainState.oracleSpotPrice}</p>
            </div>
            <div className="cyber-card p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Vault Collateral</p>
              <p className="text-base font-bold font-mono text-[#111215] dark:text-white">{data.onChainState.vaultCollateralReserves}</p>
            </div>
            <div className="cyber-card p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Min Collateral Ratio</p>
              <p className="text-base font-bold font-mono text-[#4E7514] dark:text-[#00F5A0]">{data.onChainState.minCollateralRatioFormatted}</p>
            </div>
            <div className="cyber-card p-4 sm:p-5 col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1">Security Controller</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${data.onChainState.securityControllerArmed ? 'bg-[#7DA61C] dark:bg-[#00F5A0]' : 'bg-rose-500'}`} />
                <p className={`text-sm font-bold font-mono ${data.onChainState.securityControllerArmed ? 'text-[#4E7514] dark:text-[#00F5A0]' : 'text-[#901B18] dark:text-rose-400'}`}>
                  {data.onChainState.securityControllerArmed ? 'ARMED' : 'DISARMED'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Negative Proofs ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono font-semibold">
            Negative Proofs
          </h2>
          <span className="text-[10px] font-mono text-[#44443E] dark:text-slate-600">confirming revert path fires</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} className="h-20 w-full" />)}
          </div>
        ) : data ? (
          <div className="space-y-3">
            {data.negativeProofs.map((proof) => (
              <div key={proof.id} className="cyber-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono text-[#44443E] dark:text-slate-400 border border-[#E5E5DF] dark:border-white/[0.08] bg-[#F7F7F2] dark:bg-white/[0.03] px-2 py-0.5 rounded">
                        {proof.id}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[#111215] dark:text-white">{proof.title}</span>
                    </div>
                    <p className="text-xs text-[#44443E] dark:text-slate-400 mb-3 font-sans">{proof.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.04] rounded-lg p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono mb-0.5">Expected error</p>
                        <p className="text-[11px] font-mono text-[#111215] dark:text-slate-300">{proof.expectedError}</p>
                      </div>
                      <div className="bg-[#F7F7F2] dark:bg-white/[0.02] border border-[#E5E5DF] dark:border-white/[0.04] rounded-lg p-2.5">
                        <p className="text-[9px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono mb-0.5">Revert reason</p>
                        <p className="text-[11px] font-mono text-[#4E7514] dark:text-[#00D2FF] font-medium">{proof.revertReason}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#44443E] dark:text-slate-500 mt-2 font-mono">→ {proof.targetContract}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold rounded-full border bg-[#D4F63D]/25 text-[#4E7514] border-[#D4F63D] dark:bg-emerald-500/10 dark:text-[#00F5A0] dark:border-emerald-500/25 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7DA61C] dark:bg-[#00F5A0]" />
                      {proof.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Known Limitations ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono font-semibold">
            Known Limitations
          </h2>
          <span className="text-[10px] font-mono text-[#44443E] dark:text-slate-600">stated flat — no hedging</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-14 w-full" />)}
          </div>
        ) : data ? (
          <div className="cyber-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5DF] dark:border-white/[0.06] bg-[#F7F7F2] dark:bg-white/[0.02]">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono font-normal">Area</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono font-normal hidden sm:table-cell">Disclosure</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-[#44443E] dark:text-slate-500 font-mono font-normal">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5DF] dark:divide-white/[0.04]">
                  {data.knownLimitations.map((lim, i) => (
                    <tr key={i} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 align-top">
                        <span className="font-mono text-[#111215] dark:text-slate-300 font-medium block whitespace-nowrap">{lim.area}</span>
                        <p className="text-xs text-[#44443E] dark:text-slate-400 font-sans mt-1 sm:hidden leading-relaxed">{lim.disclosure}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#44443E] dark:text-slate-400 align-top hidden sm:table-cell max-w-sm font-sans leading-relaxed">{lim.disclosure}</td>
                      <td className="px-5 py-3.5 align-top">{riskBadge(lim.riskLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Proof Hash Footer ────────────────────────────────────────────── */}
      {data && (
        <div className="border-t border-[#E5E5DF] dark:border-white/[0.06] pt-6">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#44443E] dark:text-slate-500 font-mono mb-1 font-semibold">
                Verification anchor · proof hash
              </p>
              <p className="text-[11px] font-mono text-[#4A4D40] dark:text-slate-400 break-all">{data.proofHash}</p>
            </div>
            <button
              onClick={() => copyToClipboard(data.proofHash, '__proofHash')}
              className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-mono text-[#44443E] hover:text-[#111215] dark:text-slate-400 dark:hover:text-white transition-colors border border-[#E5E5DF] dark:border-white/[0.06] px-3 py-1.5 rounded-md bg-white dark:bg-white/[0.02]"
            >
              {copiedAddr === '__proofHash' ? (
                <>
                  <svg className="w-3 h-3 text-[#4E7514] dark:text-[#00F5A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy hash
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
