# Binance Futures PNL & Tracking Dashboard

## Project Overview
A real-time PNL tracking and performance analytics dashboard for Binance Futures accounts.
Supports multi-account management with detailed trade history, position monitoring, and risk metrics.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) + TypeScript | Consistent with existing projects |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, consistent design system |
| Charts | Recharts | React-native, responsive, lightweight |
| State | Zustand | Simple global state for account/positions |
| Data Fetching | SWR + Binance REST API | Auto-revalidation, polling support |
| WebSocket | Binance WS API | Real-time price & position updates |
| Auth | Local API key storage (encrypted) | No backend required initially |

---

## Folder Structure

```
challenge-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with sidebar
│   │   ├── page.tsx                 # Redirect to /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Main overview
│   │   ├── positions/
│   │   │   └── page.tsx             # Open positions table
│   │   ├── history/
│   │   │   └── page.tsx             # Trade history & closed PNL
│   │   ├── analytics/
│   │   │   └── page.tsx             # Performance charts & stats
│   │   └── settings/
│   │       └── page.tsx             # API key management
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   ├── Header.tsx           # Top bar: account selector, refresh, theme
│   │   │   └── PageShell.tsx        # Page wrapper with title
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx         # Reusable KPI card (balance, PNL, etc.)
│   │   │   ├── AccountSummary.tsx   # Wallet balance + margin info
│   │   │   ├── UnrealizedPNL.tsx    # Live unrealized PNL banner
│   │   │   ├── DailyPNLChart.tsx    # Bar chart: daily realized PNL (30d)
│   │   │   ├── WinRateGauge.tsx     # Win rate donut / gauge
│   │   │   └── RecentTrades.tsx     # Last 5 closed trades list
│   │   │
│   │   ├── positions/
│   │   │   ├── PositionsTable.tsx   # Open positions with live PNL
│   │   │   ├── PositionRow.tsx      # Single position row
│   │   │   └── PositionBadge.tsx    # LONG/SHORT badge
│   │   │
│   │   ├── history/
│   │   │   ├── TradeHistoryTable.tsx
│   │   │   ├── TradeFilters.tsx     # Symbol, date range, side filters
│   │   │   └── PNLSummaryBar.tsx    # Totals above table
│   │   │
│   │   ├── analytics/
│   │   │   ├── CumulativePNLChart.tsx  # Line chart: cumulative PNL over time
│   │   │   ├── MonthlyHeatmap.tsx      # Calendar heatmap of daily PNL
│   │   │   ├── SymbolBreakdown.tsx     # Bar: PNL by trading pair
│   │   │   └── MetricsGrid.tsx         # Win rate, avg RR, profit factor, etc.
│   │   │
│   │   └── ui/                      # shadcn/ui base components
│   │
│   ├── lib/
│   │   ├── binance/
│   │   │   ├── client.ts            # Binance REST API client
│   │   │   ├── websocket.ts         # WS connection manager
│   │   │   └── types.ts             # Binance API response types
│   │   ├── store/
│   │   │   ├── accountStore.ts      # Zustand: accounts, selected account
│   │   │   └── positionStore.ts     # Zustand: live positions
│   │   └── utils/
│   │       ├── pnl.ts               # PNL calculation helpers
│   │       ├── format.ts            # Currency, % formatters
│   │       └── crypto.ts            # API key encrypt/decrypt
│   │
│   └── hooks/
│       ├── usePositions.ts          # SWR hook for open positions
│       ├── useTradeHistory.ts       # SWR hook for closed trades
│       ├── useAccountBalance.ts     # SWR hook for wallet balance
│       └── useLivePrices.ts         # WebSocket hook for mark prices
│
├── public/
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── Claude.md
```

---

## Pages & UI Layout

### Global Layout
```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (64px wide, collapsible)                       │
│  ┌──────┐  ┌───────────────────────────────────────┐   │
│  │  🏠  │  │  HEADER: [Account ▼]  [⟳ Refresh]  [🌙]│   │
│  │  📊  │  ├───────────────────────────────────────┤   │
│  │  📋  │  │                                       │   │
│  │  📈  │  │           PAGE CONTENT                │   │
│  │  ⚙️  │  │                                       │   │
│  └──────┘  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

### Page 1: Dashboard (Overview)

#### Section A — Portfolio Value Hero
The most prominent element. Takes the full width at the top.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Total Portfolio Value                          Updated: 14:32:05  │
│   ─────────────────────────────────────────────────────────────     │
│   $ 24,812.50                       ▲ +$312.40  (+1.27%) today      │
│                                                                     │
│   Wallet Balance    Unrealized PNL    Open Positions   Margin Used  │
│   $24,578.00        +$234.50          6 positions       18.4%       │
│   (cross margin)    [live, green]     [clickable]       [bar fill]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data sources:**
- `totalWalletBalance` from `GET /fapi/v2/balance` (USDT asset)
- `unrealizedProfit` = sum of all position `unrealizedProfit` from `/fapi/v2/positionRisk`
- **Portfolio Value = Wallet Balance + Unrealized PNL**
- Today's change = Portfolio Value − yesterday's ending balance (stored in localStorage)
- Margin used = `totalMaintMargin / totalWalletBalance × 100`

**Live behavior:**
- Portfolio value ticks every 5s as unrealized PNL updates via WebSocket mark prices
- Change arrow and color flip dynamically (green ▲ / red ▼)

---

#### Section B — Daily PNL Tracking & Chart
The second major block. Full-width chart with summary stats above it.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Daily PNL                               [7D]  [30D]  [90D]  [All] │
│  ─────────────────────────────────────────────────────────────────  │
│  Today (realized)    Best Day            Worst Day    Total (range) │
│  +$89.20             +$420.00  Feb 14    -$180.00     +$1,240.00    │
│                                                                     │
│  $                                                                  │
│  500 ┤                          ██                                  │
│  400 ┤                    ██    ██   ██                              │
│  300 ┤        ██    ██    ██    ██   ██    ██                        │
│  200 ┤  ██    ██    ██    ██    ██   ██    ██   ██    ██             │
│  100 ┤  ██    ██    ██    ██    ██   ██    ██   ██    ██   ██        │
│    0 ├──────────────────────────────────────────────────────────    │
│ -100 ┤                                            ██        ██      │
│ -180 ┤                                       ▓▓                     │
│       Feb01  Feb05  Feb08  Feb11  Feb14  Feb17  Feb20  Feb23  Feb27 │
│                                                                     │
│       ██ Profit day   ▓▓ Loss day   ─── Cumulative PNL (line)       │
└─────────────────────────────────────────────────────────────────────┘
```

**Chart type:** Recharts `ComposedChart`
- `Bar` — daily realized PNL per day (green `#0ECB81` if positive, red `#F6465D` if negative)
- `Line` — cumulative PNL overlay on secondary Y-axis (yellow `#F0B90B`, dashed)
- `ReferenceLine` at y=0 (white, dashed)
- `Tooltip` shows: date, day PNL ($), cumulative PNL ($), # trades that day

**Time range selector (tabs):** `7D` | `30D` | `90D` | `All`
- Drives the API call window for `/fapi/v1/income?incomeType=REALIZED_PNL`
- Default: `30D`

**Summary stats row above chart:**

| Stat | Value | Source |
|------|-------|--------|
| Today (realized) | sum of today's `REALIZED_PNL` income | `/fapi/v1/income` filtered to today UTC |
| Best Day | max daily PNL in range | computed from income data |
| Worst Day | min daily PNL in range | computed from income data |
| Total (range) | sum of all days in range | sum of income data |

**Data processing (`lib/utils/pnl.ts`):**
```
incomeRecords[]
  → group by UTC date (YYYY-MM-DD)
  → sum PNL per day
  → compute cumulative running total
  → output: { date, dailyPnl, cumulativePnl }[]
```

---

#### Section C — Supporting Stats Row
Below the chart, 4 compact cards:

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Win Rate    │ Profit Factor│  Avg Trade   │  Total Fees  │
│   63.4%      │    2.14      │   +$26.38    │   -$45.20    │
│  30W / 17L   │              │  (in range)  │  (in range)  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

#### Section D — Recent Trades (bottom)
Last 5 closed trades, compact list view:

```
┌──────────────────────────────────────────────────────────┐
│  Recent Closed Trades                       [View All →] │
│  ─────────────────────────────────────────────────────── │
│  BTCUSDT  LONG  0.1     Entry $42,000 → Exit $43,500     │
│                         +$150.00  (+3.57%)   Feb 27 14:20│
│  ─────────────────────────────────────────────────────── │
│  ETHUSDT  SHORT 2.0     Entry $2,800 → Exit $2,750       │
│                         +$100.00  (+1.78%)   Feb 27 11:05│
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

---

#### Full Dashboard Layout
```
┌────────────────────────────────────────────────────────────────┐
│  [A] Portfolio Value Hero                          (full width) │
├────────────────────────────────────────────────────────────────┤
│  [B] Daily PNL Chart  [7D|30D|90D|All]             (full width) │
├────────────────────────────────────────────────────────────────┤
│  [C] Win Rate │ Profit Factor │ Avg Trade │ Total Fees  (4 col) │
├────────────────────────────────────────────────────────────────┤
│  [D] Recent Closed Trades                          (full width) │
└────────────────────────────────────────────────────────────────┘
```

**Components for this layout:**
```
components/dashboard/
├── PortfolioHero.tsx       ← Section A: total value + breakdown
├── DailyPNLChart.tsx       ← Section B: chart + range tabs + summary row
├── DailyPNLSummary.tsx     ← Sub-component: Today / Best / Worst / Total stats
├── MetricsRow.tsx          ← Section C: 4 stat cards
└── RecentTrades.tsx        ← Section D: last 5 trades list
```

---

### Page 2: Positions (Live)
```
┌─────────────────────────────────────────────────────────┐
│  Open Positions (8)    [⟳ Auto-refresh: 5s]             │
├────────┬──────┬──────┬───────┬───────┬────────┬────────┤
│ Symbol │ Side │  Qty │ Entry │ Mark  │   PNL  │  ROE%  │
├────────┼──────┼──────┼───────┼───────┼────────┼────────┤
│ BTCUSD │ LONG │  0.1 │ 42000 │ 43500 │ +$150  │ +3.57% │
│ ETHUSD │SHORT │  2.0 │  2800 │  2750 │  +$100 │ +1.78% │
│  ...   │      │      │       │       │        │        │
└────────┴──────┴──────┴───────┴───────┴────────┴────────┘
  Live mark price updates via WebSocket. PNL color: green/red.
```

---

### Page 3: Trade History
```
┌─────────────────────────────────────────────────────────┐
│  [Symbol ▼]  [Date Range 📅]  [Side ▼]  [Search 🔍]    │
├─────────────────────────────────────────────────────────┤
│  Total Realized PNL: +$1,240.00   Trades: 47   Win: 30  │
├────────┬──────┬──────┬───────┬───────┬────────┬────────┤
│ Symbol │ Side │  Qty │ Entry │  Exit │  PNL   │  Date  │
├────────┼──────┼──────┼───────┼───────┼────────┼────────┤
│  ...paginated rows...                                   │
└────────┴──────┴──────┴───────┴───────┴────────┴────────┘
```

---

### Page 4: Analytics
```
┌─────────────────────────────────────────────────────────┐
│  Cumulative PNL Line Chart                              │
│  [1W] [1M] [3M] [All]                                  │
│  ↗ $0 ─────────────────────────────── $1,240            │
├──────────────────────────┬──────────────────────────────┤
│  PNL by Symbol (Bar)     │  Monthly Heatmap             │
│  BTC ████████ +$800      │  Sun Mon Tue Wed Thu Fri Sat │
│  ETH ████ +$300          │   .   .  [+] [-] [+]  .   . │
│  SOL ██ +$140            │  ...                         │
├──────────────────────────┴──────────────────────────────┤
│  [Win Rate: 63%] [Avg RR: 1.8] [Profit Factor: 2.1]    │
│  [Best Day: +$420] [Worst Day: -$180] [Total Fees: $45] │
└─────────────────────────────────────────────────────────┘
```

---

### Page 5: Settings
```
┌─────────────────────────────────────────────────────────┐
│  API Key Management                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Account Label:  [Main Account          ]       │   │
│  │  API Key:        [••••••••••••••••••••••]       │   │
│  │  API Secret:     [••••••••••••••••••••••]       │   │
│  │  Testnet:        [ ] Use testnet                │   │
│  │                  [Test Connection] [Save]        │   │
│  └─────────────────────────────────────────────────┘   │
│  [+ Add Another Account]                               │
│                                                         │
│  Accounts:  Main Account ✅  Sub Account 1 ✅           │
└─────────────────────────────────────────────────────────┘
```

---

## Color & Design System

```
Background:   #0B0E11  (dark, Binance-inspired)
Surface:      #1E2329  (card background)
Border:       #2B3139
Accent:       #F0B90B  (Binance yellow)

Profit:       #0ECB81  (green)
Loss:         #F6465D  (red)
Neutral:      #848E9C

Text Primary:   #EAECEF
Text Secondary: #848E9C

Font: Inter or Geist (monospace numbers)
```

---

## Data Flow

```
Binance REST API ──► SWR Hooks ──► Zustand Store ──► Components
Binance WS API  ──► useLivePrices ──► positionStore ──► PositionsTable
                                                    └──► UnrealizedPNL
```

---

## Key Metrics to Track

| Metric | Description |
|--------|-------------|
| Total Balance | Wallet + unrealized PNL |
| Unrealized PNL | Sum of all open position PNL |
| Realized PNL | Closed trade PNL (today / 7d / 30d) |
| Win Rate | Winning trades / total trades |
| Profit Factor | Gross profit / gross loss |
| Avg RR | Average risk:reward ratio |
| Max Drawdown | Largest peak-to-trough drop |
| Total Fees | Cumulative trading fees |
| Best/Worst Day | Max gain/loss in a single day |

---

## Binance API Endpoints Needed

```
GET /fapi/v2/balance              → Wallet balances
GET /fapi/v2/positionRisk         → Open positions
GET /fapi/v1/userTrades           → Trade history
GET /fapi/v1/income               → Realized PNL history
WS  wss://fstream.binance.com     → Mark prices, position updates
```

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] Next.js project setup with Tailwind + shadcn/ui
- [ ] Sidebar + Header layout
- [ ] Settings page: API key input & storage (localStorage, encrypted)
- [ ] Binance REST client with HMAC signing

### Phase 2 — Core Data
- [ ] Account balance display
- [ ] Open positions table with manual refresh
- [ ] Trade history table with filters

### Phase 3 — Live Updates
- [ ] WebSocket integration for mark prices
- [ ] Auto-refresh positions every 5s
- [ ] Unrealized PNL live counter

### Phase 4 — Analytics
- [ ] Cumulative PNL chart
- [ ] Daily PNL bar chart (30d)
- [ ] Win rate, profit factor, metrics grid
- [ ] PNL by symbol breakdown
- [ ] Monthly calendar heatmap

### Phase 5 — Polish
- [ ] Multi-account support
- [ ] Dark/light theme toggle
- [ ] Export to CSV
- [ ] Mobile responsive layout
