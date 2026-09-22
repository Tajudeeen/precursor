# Investigation UI — Design Spec

## Visual Language: Terminal SIEM meets Editorial Minimal

### Colors
- Background: `#0a0a0a` (deep charcoal)
- Cards: `#141414` with `#262626` border (terminal emulator aesthetic)
- Text: `#e5e5e5` primary, `#9a9a9a` secondary, `#666` muted
- Accent: `#f59e0b` (amber) — for BLOCK/decision highlights only
- Status green: `#10b981` | red: `#ef4444` | yellow: `#f59e0b`
- No blue anywhere (avoids generic boilerplate look)

### Typography
- Primary: JetBrains Mono (monospace) for all data, logs, evidence
- Secondary: Inter (sans-serif) for headings only
- Mono for data creates the terminal/SIEM feel

### Layout: Investigation Timeline

```
┌─ STATUS BAR ─────────────────────────────────────────────────┐
│ [ACTIVE]  Block Height: 142 | Threats: 1 | Last Action: BLOCK │
└─────────────────────────────────────────────────────────────┘

┌─ WHAT HAPPENED ───────────────────────────────────────────────┐
│  [10:55:03] TX 0x8a3f... → CollateralDeposited  100e18 DCC    │
│  [10:55:05] TX 0x8a3f... → Borrowed             75e18        │
│  [10:55:08] TX 0x8a3f... → PriceUpdated         $1.00 → $1.80│
│  [10:55:10] TX 0x8a3f... → Withdrawn            100e18       │
│                                                              │
│  Evidence:                                                   │
│  • Address first seen 2s ago (new wallet)                    │
│  • Oracle price moved 80% — exceeds 20% threshold            │
└─────────────────────────────────────────────────────────────┘

┌─ ATTACK PATH ─────────────────────────────────────────────────┐
│  1. FUNDING       → Attacker receives tokens to begin attack │
│                                                               │
│  2. DEPOSIT       → Deposits 100e18 collateral as $100       │
│       ↳ LendingPool                                          │
│                                                               │
│  3. BORROW        → Borrows 75e18 at fair price              │
│       ↳ LendingPool                                           │
│                                                               │
│  4. MANIPULATE    → Oracle price changed to $1.80            │
│       ↳ MockOracle                                            │
│                                                               │
│  5. BORROW MORE   → Borrows additional 60e18                  │
│       ↳ LendingPool                                           │
│                                                               │
│  6. WITHDRAW      → Attempts to withdraw 100e18 collateral   │
│       ↳ LendingPool                                           │
└─────────────────────────────────────────────────────────────┘

┌─ SIMULATION ──────────────────────────────────────────────────┐
│  ┌──────────────┬──────────────┬──────────────┐               │
│  │ Metric       │ Before       │ After        │               │
│  ├──────────────┼──────────────┼──────────────┤               │
│  │ Collateral   │ 100e18       │ 0e18         │               │
│  │ Debt         │ 0            │ 135e18       │               │
│  │ Oracle Price │ $1.00        │ $1.80        │               │
│  │ Ratio        │ 200%         │ 0% (133%)    │               │
│  └──────────────┴──────────────┴──────────────┘               │
│                                                              │
│  diff --git a/collateral --git b/debt                        │
│  - 100e18 → 0 (collateral drained)                           │
│  + 0 → 135e18 (phantom borrowing)                            │
└─────────────────────────────────────────────────────────────┘

┌─ DECISION │ [BLOCK]  amber badge  ────────────────────────────┐
│  Invariant violated: collateral ratio 133% < 150% threshold   │
│  Behavior flag: HIGH confidence (85%)                         │
│  Action: Withdrawal blocked — attacker funds remain in pool   │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **No cards** — sections are bordered terminal-style panels
2. **Monospace everywhere** — data reads like a SIEM log
3. **Amber accent only** — never blue, never gradient
4. **Vertical flow** — investigation unfolds top to bottom like a report
5. **Diff-style evidence** — green/red inline diffs for state changes
6. **Attribution** — each step shows which contract/component was involved
7. **Status bar** — compact, always-visible summary at top
8. **No hover effects, no animations** — static and trustworthy
