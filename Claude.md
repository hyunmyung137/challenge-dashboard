# Binance Futures PNL Dashboard — Project Spec

## Overview
A single-page, real-time PNL tracking dashboard for Binance Futures accounts.
Displays total portfolio value, daily PNL chart, open positions (Binance-style cards),
and key performance metrics. API keys are never stored in code or the repository —
they are injected at runtime via `.env.local` (local) or Google Secret Manager (production).

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, standalone output) + TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts (`ComposedChart` — bars + line overlay) |
| Data Fetching | Native `fetch` in client components |
| API Layer | Next.js Route Handlers (server-side, HMAC-signed) |
| Secret Management | Google Secret Manager (production) / `.env.local` (local) |
| Hosting | Google Cloud Run (`asia-northeast3`, project `agent-wise`) |
| Container Registry | Google Artifact Registry |

---

## Actual Folder Structure

```
challenge-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout — no sidebar
│   │   ├── page.tsx                     # Redirects to /dashboard
│   │   ├── globals.css                  # CSS variables (Binance dark theme)
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # Single dashboard page
│   │   └── api/
│   │       └── binance/
│   │           ├── balance/route.ts     # GET /api/binance/balance
│   │           ├── positions/route.ts   # GET /api/binance/positions
│   │           └── income/route.ts      # GET /api/binance/income?days=N
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Header.tsx               # Top bar with account badge + refresh
│   │   └── dashboard/
│   │       ├── PortfolioHero.tsx        # Section A: total value + breakdown
│   │       ├── DailyPNLChart.tsx        # Section B: bar+line chart + range tabs
│   │       ├── MetricsRow.tsx           # Section C: Win Rate / PF / Avg / Fees
│   │       └── PositionCards.tsx        # Section D: Binance-style position cards
│   │
│   └── lib/
│       ├── binance/
│       │   └── client.ts               # HMAC-signed Binance REST client (server only)
│       ├── mock.ts                      # Mock data (used as fallback in dev)
│       └── utils.ts                    # formatUSD / formatPct / formatPnl / cn
│
├── Dockerfile                           # Multi-stage build, standalone Next.js
├── .dockerignore                        # Excludes .env*, node_modules, .next
├── .env.local                           # Local secrets — gitignored
├── .env.local.example                   # Template (safe to commit)
├── next.config.ts                       # output: "standalone"
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER:  PNL Dashboard          [● Main Account]   [⟳ refresh]    │
├─────────────────────────────────────────────────────────────────────┤
│  [A] PORTFOLIO VALUE HERO                              (full width) │
│                                                                     │
│   Total Portfolio Value                    Updated 14:32  1h auto  │
│   $5,752.84           ▲ +$1,534.62  (+36.36%) unrealized           │
│                                                                     │
│   Wallet Balance  │  Unrealized PNL  │  Available  │  Margin Used  │
│   $4,218.22       │  +$1,534.62      │  $0.84      │  ████░░ 18%   │
├─────────────────────────────────────────────────────────────────────┤
│  [B] DAILY PNL CHART                                   (full width) │
│                                                                     │
│   Daily PNL                           [7D]  [30D]  [90D]  [All]   │
│   Today: -$801    Best: —    Worst: -$801    Total (30D): -$801    │
│                                                                     │
│   ██ green bars = profit days    ▓▓ red bars = loss days            │
│   ─── yellow dashed line = cumulative PNL (right Y-axis)           │
├─────────────────────────────────────────────────────────────────────┤
│  [C] METRICS ROW                                          (4 cards) │
│   Win Rate    │  Profit Factor  │  Avg Trade   │  Total Fees        │
├─────────────────────────────────────────────────────────────────────┤
│  [D] OPEN POSITIONS (Binance-style cards)              (full width) │
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐          │
│  │ ROBO USDT  [LONG]  [5x] │  │ ...                     │          │
│  │ cross                   │  │                         │          │
│  │ Unrealized PNL (USDT)   │  │                         │          │
│  │ +$1,534.62  (+22.21%)   │  │                         │          │
│  │ ─────────────────────── │  │                         │          │
│  │ Size      │ 350,830      │  │                         │          │
│  │ Margin    │ $8,759.00    │  │                         │          │
│  │ Entry     │ $0.1250      │  │                         │          │
│  │ Mark      │ $0.1294      │  │                         │          │
│  │ Liq. Price│ $0.0955 (red)│  │                         │          │
│  └─────────────────────────┘  └─────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
Browser component
  └─ fetch("/api/binance/balance")
  └─ fetch("/api/binance/positions")       ← every 1 hour
  └─ fetch("/api/binance/income?days=N")

Next.js API Route (server-side)
  └─ reads BINANCE_API_KEY + BINANCE_API_SECRET from env
  └─ signs request with HMAC-SHA256
  └─ calls Binance Futures REST API
  └─ returns parsed JSON to browser
```

**Keys never reach the browser.** All signing happens server-side in route handlers.

---

## Binance API Endpoints Used

| Internal Route | Binance Endpoint | Purpose |
|----------------|-----------------|---------|
| `GET /api/binance/balance` | `GET /fapi/v2/balance` | Wallet balance + available |
| `GET /api/binance/positions` | `GET /fapi/v2/positionRisk` | Open positions (filtered: amt ≠ 0) |
| `GET /api/binance/income?days=N` | `GET /fapi/v1/income?incomeType=REALIZED_PNL` | Daily PNL history |

**Signing:** HMAC-SHA256 with `timestamp` + `signature` query params, `X-MBX-APIKEY` header.

---

## Portfolio Value Calculation

```
Portfolio Value = totalWalletBalance + sum(unrealizedPnl per open position)

Note: crossUnPnl from /fapi/v2/balance returns 0 unreliably.
      Positions are fetched separately and summed directly.
```

---

## Refresh Strategy

All components fetch independently on mount and refresh every **1 hour**:

```typescript
const REFRESH_MS = 60 * 60 * 1000;
useEffect(() => {
  fetchAll();
  const interval = setInterval(fetchAll, REFRESH_MS);
  return () => clearInterval(interval);
}, []);
```

Manual refresh available via the button in the Positions card header.

---

## Design System

```
Background:     #0B0E11   (Binance dark)
Surface:        #1E2329   (card bg)
Elevated:       #2B3139   (input / inner card bg)
Border:         #2B3139

Accent:         #F0B90B   (Binance yellow — active states, cumulative line)
Profit:         #0ECB81   (green — positive PNL, LONG badge)
Loss:           #F6465D   (red — negative PNL, SHORT badge, liq. price)

Text Primary:   #EAECEF
Text Secondary: #848E9C

Font:           Geist Sans / Geist Mono (tabular-nums for financial values)
```

---

## Secret Management

### Local Development
Secrets live in `.env.local` (gitignored):
```
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
```

### Production (Google Cloud)
Secrets stored in **Google Secret Manager**, injected into Cloud Run at runtime via `--set-secrets`.
Never stored in:
- Git / GitHub
- Docker image
- Cloud Run environment variables console

---

## Infrastructure

| Resource | Value |
|----------|-------|
| GCP Project | `agent-wise` (project number: `760234499517`) |
| Region | `asia-northeast3` (Seoul) |
| Cloud Run service | `challenge-dashboard` |
| Artifact Registry | `asia-northeast3-docker.pkg.dev/agent-wise/challenge-dashboard/app` |
| GitHub repo | `https://github.com/hyunmyung137/challenge-dashboard` |
| Live URL | `https://challenge-dashboard-760234499517.asia-northeast3.run.app` |
| Secret Manager secrets | `BINANCE_API_KEY`, `BINANCE_API_SECRET` |
| Cloud Run SA | `760234499517-compute@developer.gserviceaccount.com` |
