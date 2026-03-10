# Multi-Exchange Portfolio Dashboard — Project Spec

## Overview

A multi-user, multi-exchange portfolio dashboard where anyone can securely connect their
exchange API keys (Binance, OKX, Bybit, Upbit, Bithumb), view aggregated positions across
all exchanges, and optionally publish their portfolio dashboard at `/u/username`.

**Zero-knowledge security**: API keys are encrypted client-side in the browser using
AES-256-GCM (Web Crypto API). The server and database only ever see encrypted blobs.
Not even the platform admin can read user keys. If the encryption password is lost,
keys are unrecoverable — users simply re-enter them.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, standalone output) + TypeScript |
| Auth | NextAuth v5 (Google + GitHub social login) |
| Database | Supabase Postgres + Row Level Security |
| Key Encryption | Client-side: Web Crypto API (AES-256-GCM, PBKDF2 600k iterations) |
| Server Encryption | Supabase Vault (pgsodium) — defense-in-depth double encryption |
| Styling | Tailwind CSS v4 |
| Charts | Recharts (`ComposedChart` — bars + line overlay) |
| State | Zustand (portfolio state + in-memory decrypted keys) |
| Data Fetching | Native `fetch` in client components |
| API Layer | Next.js Route Handlers (exchange calls via POST with transient keys) |
| Hosting | Google Cloud Run (`asia-northeast3`, project `agent-wise`) |
| Container Registry | Google Artifact Registry |

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (SessionProvider + fonts)
│   ├── page.tsx                            # Redirects to /dashboard or /login
│   ├── globals.css                         # CSS variables (dark theme)
│   │
│   ├── (auth)/                             # Route group for auth pages
│   │   ├── login/page.tsx                  # Social login (Google/GitHub)
│   │   └── layout.tsx                      # Minimal auth layout
│   │
│   ├── dashboard/
│   │   ├── page.tsx                        # Protected — multi-exchange dashboard
│   │   ├── settings/page.tsx               # Credentials + profile management
│   │   └── layout.tsx                      # Auth guard layout
│   │
│   ├── u/
│   │   └── [username]/page.tsx             # Public dashboard (server component)
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts     # NextAuth catch-all
│       ├── credentials/route.ts            # CRUD encrypted blobs (via Supabase RPC)
│       ├── user/profile/route.ts           # GET/PATCH user profile
│       ├── exchange/
│       │   └── [exchange]/
│       │       ├── balance/route.ts        # POST { apiKey, apiSecret, passphrase? }
│       │       ├── positions/route.ts      # POST with transient keys
│       │       └── income/route.ts         # POST + ?days=N
│       ├── portfolio/
│       │   └── snapshot/route.ts           # POST — save snapshot for public view
│       ├── public/
│       │   └── [username]/route.ts         # GET — cached snapshot (no auth)
│       │
│       ├── binance/...                     # LEGACY — env-var routes for cron jobs
│       ├── private/...                     # LEGACY — private account routes
│       ├── telegram/...                    # LEGACY — Telegram alerts
│       └── private-telegram/...            # LEGACY — Private Telegram alerts
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx                      # Top bar (user avatar, exchange selector)
│   │   └── AuthGuard.tsx                   # Redirect to login if unauthenticated
│   ├── auth/
│   │   └── LoginButtons.tsx                # Google/GitHub sign-in buttons
│   ├── settings/
│   │   ├── CredentialForm.tsx              # Add/edit exchange API keys
│   │   ├── EncryptionPasswordModal.tsx     # Set/enter encryption password + auto-decrypt
│   │   ├── ProfileSettings.tsx             # Username slug, public toggle
│   │   └── CredentialList.tsx              # List/delete credentials
│   ├── dashboard/
│   │   ├── PortfolioHero.tsx               # Total value + per-exchange breakdown
│   │   ├── DailyPNLChart.tsx               # Bar+line chart + range tabs
│   │   ├── MetricsRow.tsx                  # Win Rate / PF / Avg Daily PNL / Total PNL
│   │   ├── PositionCards.tsx               # Open positions (exchange badge)
│   │   ├── PNLHistoryTable.tsx             # Closed positions table
│   │   └── ExchangeSelector.tsx            # Tab bar: All / Binance / OKX / ...
│   └── providers/
│       └── SessionProvider.tsx             # NextAuth SessionProvider wrapper
│
├── hooks/
│   ├── usePortfolio.ts                     # Aggregated multi-exchange balance + positions
│   └── useIncome.ts                        # Aggregated multi-exchange daily PNL data
│
├── stores/
│   ├── portfolio-store.ts                  # Zustand: balances, positions, filter, computed
│   └── encryption-store.ts                 # Zustand: decrypted keys (memory only!)
│
└── lib/
    ├── auth.ts                             # NextAuth config (Google + GitHub)
    ├── crypto.ts                           # Web Crypto encrypt/decrypt (browser only)
    ├── supabase/
    │   ├── client.ts                       # Supabase browser client
    │   └── server.ts                       # Supabase server client
    ├── exchanges/
    │   ├── types.ts                        # StandardBalance, StandardPosition, etc.
    │   ├── index.ts                        # createExchangeClient() factory + EXCHANGE_INFO
    │   ├── binance.ts                      # Binance Futures adapter
    │   ├── okx.ts                          # OKX adapter
    │   ├── bybit.ts                        # Bybit adapter
    │   ├── upbit.ts                        # Upbit adapter (spot, KRW)
    │   └── bithumb.ts                      # Bithumb adapter (spot, KRW)
    ├── binance/
    │   └── client.ts                       # LEGACY — env-var-based for cron compat
    ├── utils.ts                            # formatUSD / formatPct / formatPnl / cn
    ├── telegram.ts                         # Telegram Bot API wrapper (legacy)
    ├── alert-state.ts                      # In-memory alert tracking (legacy)
    └── mock.ts                             # Mock data (dev fallback)
```

---

## Key Architecture Patterns

### Dashboard Page Orchestration

`/dashboard/page.tsx` is a "use client" orchestrator that manages 4 states:
1. **Loading** — checking if user has saved credentials (`hasCredentials === null`)
2. **Empty** — no credentials, show "Connect Your Exchange" CTA
3. **Locked** — credentials exist but encryption password not entered, show UnlockPrompt
4. **Ready** — credentials unlocked, render full dashboard components

### Component Data Flow

Dashboard components read from **Zustand stores**, not props:
- `PortfolioHero` → reads `usePortfolioStore()` (balances, totalValue, unrealizedPnl)
- `PositionCards` → reads `usePortfolioStore()` (positions, sorted by |unrealizedPnl|)
- `DailyPNLChart` → uses `useIncome(days)` hook (income aggregated from all exchanges)
- `MetricsRow` → uses `useIncome(30)` hook (win rate, profit factor, avg PNL from 30-day data)
- `ExchangeSelector` → reads/writes `activeFilter` on `usePortfolioStore()`
- `PNLHistoryTable` → reads `useEncryptionStore()` directly for exchange API calls

### Store Architecture

**`encryption-store`** (Zustand, in-memory only):
- `credentials: Map<"exchange:label", { apiKey, apiSecret, passphrase? }>` — decrypted keys
- `isUnlocked: boolean`
- `unlock()`, `lock()`, `setCredential()`, `removeCredential()`
- **Never persisted** — lost on page refresh, user re-enters encryption password

**`portfolio-store`** (Zustand):
- `balances: PortfolioBalance[]` — per-exchange balance data
- `positions: PortfolioPosition[]` — all open positions across exchanges
- `activeFilter: ExchangeName | null` — for exchange selector tabs
- `loading`, `errors`, `lastUpdated`
- Computed: `getTotalValue()`, `getTotalUnrealizedPnl()`, `getFilteredPositions()`, `getFilteredBalances()`

### Hook Architecture

**`usePortfolio`** — core data fetching:
- Reads decrypted credentials from encryption store
- POSTs to `/api/exchange/[exchange]/balance` and `/api/exchange/[exchange]/positions` per exchange
- Stores results in portfolio store
- Auto-refreshes every 1 hour
- Used by dashboard page to trigger initial fetch

**`useIncome(days, legacyApiBase?)`** — PNL chart data:
- Reads credentials from encryption store (or uses legacy GET for `/private` page)
- POSTs to `/api/exchange/[exchange]/income?days=N` per exchange
- Merges daily PNL data across exchanges, computes cumulative PNL
- Used by DailyPNLChart and MetricsRow

### EncryptionPasswordModal

In "unlock" mode, the modal handles the full decryption flow automatically:
1. Fetches credential metadata from `/api/credentials`
2. For each credential, fetches encrypted blob from `/api/credentials?exchange=X&label=Y`
3. Decrypts each blob with the user's password (Web Crypto AES-256-GCM)
4. Stores decrypted keys in encryption store
5. Calls `unlock()` and `onClose()`

Visibility is controlled by **parent conditional rendering** (not an `isOpen` prop).

### Legacy Private Page

`/private` page uses env-var-based Binance routes instead of the multi-exchange encryption flow:
- Fetches from `/api/private/balance` and `/api/private/positions` (GET, server reads env vars)
- Populates the portfolio store manually so shared components work unchanged
- Passes `legacyApiBase="/api/private"` to DailyPNLChart and MetricsRow
- Passes `onRefresh` and `loadingOverride` to PositionCards

---

## Security Architecture

### Zero-Knowledge Encryption Flow

```
User Browser                          Server (Next.js)                    Supabase
─────────────                         ────────────────                    ────────
1. User enters API key + secret
   + encryption password
2. Web Crypto: PBKDF2(password, salt)
   → AES-256-GCM key
3. Encrypt({apiKey, apiSecret})
   → { ciphertext, iv, salt }
4. POST /api/credentials ─────────────→ 5. Validate + forward ────────────→ 6. RPC store_credential()
   body: { exchange, label,                                                   - pgsodium encrypts (layer 2)
           encrypted_blob, iv, salt }                                         - Store double-encrypted blob
                                                                              - Audit log entry
                                                                              - Rate limit check
```

**Decryption flow (dashboard load):**
```
1. GET /api/credentials (metadata only — no blobs)
2. User enters encryption password (once per session, held in zustand memory)
3. Supabase RPC get_credential() → pgsodium decrypts layer 2 → returns client blob
4. Browser: AES-256-GCM decrypt(blob, password) → plaintext { apiKey, apiSecret }
5. POST /api/exchange/[exchange]/balance with keys in body (HTTPS)
6. Server calls exchange API → returns data → discards keys (GC'd)
```

### Database Security (7 Layers)

| # | Layer | What It Does |
|---|-------|-------------|
| 1 | Schema isolation | `vault_private` schema hidden from PostgREST REST API |
| 2 | FORCE RLS | Even service_role/table owner gets zero rows without matching policy |
| 3 | RPC-only access | No direct table queries — all ops via SECURITY DEFINER functions |
| 4 | Double encryption | Client AES-256-GCM + server pgsodium = 2 independent keys needed |
| 5 | Dedicated DB role | `credential_manager` role with minimal, precise permissions |
| 6 | Rate limiting | Per-user sliding window at DB level (30 reads/15min, 10 writes/15min) |
| 7 | Audit logging | Every credential operation logged (who, what, when) |

### Schema Layout

- **`public` schema** (exposed via REST API): `profiles`, `portfolio_snapshots`
- **`vault_private` schema** (hidden, RPC-only): `exchange_credentials`, `credential_audit_log`, `rate_limit_state`
- `PGRST_DB_SCHEMAS = "public"` — vault_private is NEVER in PostgREST config

### Database Tables

**`public.profiles`** — extends NextAuth user
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | FK to auth.users, ON DELETE CASCADE |
| username_slug | TEXT UNIQUE | for `/u/[slug]`, nullable |
| display_name | TEXT | |
| is_public | BOOLEAN | default FALSE |
| created_at / updated_at | TIMESTAMPTZ | auto-managed |

**`vault_private.exchange_credentials`** — double-encrypted key blobs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| user_id | UUID FK | auth.users, ON DELETE CASCADE |
| exchange | TEXT | 'binance' \| 'okx' \| 'bybit' \| 'upbit' \| 'bithumb' |
| label | TEXT | e.g. "Main Account" |
| encrypted_blob | BYTEA | Set to `\x00` — raw client blob NEVER persisted |
| vault_encrypted | BYTEA | Client blob re-encrypted by pgsodium server key |
| vault_key_id | UUID | Which server key was used (for rotation) |
| vault_nonce | BYTEA | pgsodium nonce |
| last_accessed_at | TIMESTAMPTZ | updated on every read |
| UNIQUE(user_id, exchange, label) | | |

**`vault_private.credential_audit_log`** — append-only
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT IDENTITY | |
| user_id | UUID | No FK — survives account deletion for forensics |
| credential_id | UUID | |
| operation | TEXT | INSERT / SELECT / UPDATE / DELETE / RATE_LIMITED |
| metadata | JSONB | exchange, label, context |
| created_at | TIMESTAMPTZ | Auto-cleaned after 90 days via pg_cron |

**`vault_private.rate_limit_state`** — sliding window
| Column | Type | Notes |
|--------|------|-------|
| user_id + action | PK | |
| window_start | TIMESTAMPTZ | |
| request_count | INT | credential_read: 30/15min, credential_write: 10/15min |

**`public.portfolio_snapshots`** — cached for public dashboards
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | ON DELETE CASCADE |
| snapshot | JSONB | `{ totalValue, positions, balances }` |
| created_at | TIMESTAMPTZ | |

### RPC Functions (The ONLY Way to Access Credentials)

| Function | Permission | Purpose |
|----------|-----------|---------|
| `store_credential(exchange, label, blob)` | authenticated | Validate → rate-limit → pgsodium encrypt → store → audit |
| `get_credential(exchange, label)` | authenticated | Rate-limit → fetch → pgsodium decrypt → return client blob → audit |
| `list_credentials()` | authenticated | Metadata only (no blobs returned) |
| `delete_credential(id)` | authenticated | Ownership check → delete → audit |
| `get_credential_audit_log(limit, offset)` | authenticated | User's own audit trail |

All functions: `SECURITY DEFINER`, `SET ROLE credential_manager`, enforce `auth.uid() = user_id`.

### Key Rotation

`vault_private.rotate_vault_key()` — admin-only function:
1. Creates new pgsodium key in Supabase Vault
2. Re-encrypts all credential rows with new key
3. Preserves old `vault_key_id` per-row for in-flight reads
4. Renames old key to deprecated

---

## Supported Exchanges

| Exchange | Type | Auth Method | Key Endpoints |
|----------|------|-------------|---------------|
| Binance | Futures | HMAC-SHA256 + `X-MBX-APIKEY` | `/fapi/v2/balance`, `/fapi/v2/positionRisk`, `/fapi/v1/income` |
| OKX | Perp Swaps | HMAC-SHA256 + passphrase + `OK-ACCESS-*` | `/api/v5/account/balance`, `/api/v5/account/positions` |
| Bybit | Derivatives | HMAC-SHA256 + `X-BAPI-*` | `/v5/account/wallet-balance`, `/v5/position/list` |
| Upbit | Spot (KRW) | JWT HS256 + `Authorization: Bearer` | `/v1/accounts`, `/v1/orders?state=done` |
| Bithumb | Spot (KRW) | HMAC-SHA512 + `Api-Key/Sign/Timestamp` | `/info/balance`, `/info/orders` |

### Standardized Interface

```typescript
type ExchangeName = "binance" | "okx" | "bybit" | "upbit" | "bithumb";

interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;  // OKX requires this
}

interface ExchangeClient {
  getBalance(): Promise<StandardBalance>;
  getPositions(): Promise<StandardPosition[]>;
  getIncome(params: { startTime: number }): Promise<StandardIncome[]>;
}
```

Spot exchanges (Upbit, Bithumb): `side: "SPOT"`, `leverage: 1`, KRW→USD conversion via cached forex rate.

---

## Data Flow

### Authenticated User (Live Data)
```
Browser
  └─ Decrypt credentials (Web Crypto, in-memory)
  └─ POST /api/exchange/binance/balance    { apiKey, apiSecret }
  └─ POST /api/exchange/okx/positions      { apiKey, apiSecret, passphrase }
  └─ POST /api/exchange/bybit/balance      { apiKey, apiSecret }
  └─ Aggregate results client-side

Server (Next.js Route Handler)
  └─ Verify session (NextAuth)
  └─ Create exchange client with transient keys
  └─ Call exchange REST API (HMAC-signed server-side)
  └─ Return standardized JSON
  └─ Keys go out of scope → garbage collected
```

### Public Dashboard Visitor (Cached Data)
```
Browser → GET /u/[username]
Server (Server Component) → Query latest portfolio_snapshot from Supabase
  └─ Render static dashboard — no exchange API calls needed
```

### Aggregation
```
totalValue = sum(balance.totalBalance + unrealizedPnl per exchange)
allPositions = merge + sort by |unrealizedPnl| desc
View modes: "All Exchanges" tab | per-exchange filter tabs
```

---

## Public Dashboards

- Opt-in via Settings → toggle `is_public` + set `username_slug`
- Snapshots auto-save every hour when owner's session is active
- Visitors at `/u/[username]` see cached snapshot (server component, no auth)
- Privacy: only opted-in data included in snapshots

---

## Design System

```
Background:     #0B0E11   (dark bg)
Surface:        #1E2329   (card bg)
Elevated:       #2B3139   (input / inner card bg)
Border:         #2B3139

Accent:         #F0B90B   (yellow — active states, cumulative line)
Profit:         #0ECB81   (green — positive PNL, LONG badge)
Loss:           #F6465D   (red — negative PNL, SHORT badge, liq. price)

Text Primary:   #EAECEF
Text Secondary: #848E9C

Font:           Geist Sans / Geist Mono (tabular-nums for financial values)
```

---

## Secret Management

### Local Development (`.env.local`)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Server-only, never exposed to client

# NextAuth
NEXTAUTH_SECRET=random-secret-string
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Legacy (existing cron jobs / telegram alerts)
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
PRIVATE_BINANCE_API_KEY=your_private_key
PRIVATE_BINANCE_API_SECRET=your_private_secret
TELEGRAM_BOT_TOKEN=...
TELEGRAM_SUMMARY_CHAT_ID=@wise_degen_house
TELEGRAM_ALERT_CHAT_ID=-1002040977958
CRON_SECRET=...
```

### Production (Google Cloud)
Secrets in **Google Secret Manager**, injected via Cloud Run `--set-secrets`.
Never stored in: Git, Docker image, or Cloud Run env console.

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
| Supabase | TBD — project URL and keys |
| Cloud Run SA | `760234499517-compute@developer.gserviceaccount.com` |

---

## Refresh Strategy

- Dashboard fetches on mount + refreshes every **1 hour** (`REFRESH_MS = 3_600_000`)
- Encryption password held in zustand (memory only) for the session
- Manual refresh button in header
- Public snapshots auto-update when owner's session is active

---

## Legacy Compatibility

Existing routes preserved for backward compatibility:

| System | Status | Notes |
|--------|--------|-------|
| `/api/binance/*` | KEEP | Env-var routes for Telegram cron jobs |
| `/api/private/*` | KEEP | Private account with Basic Auth |
| `/api/telegram/*` | KEEP | Weekly summary + price alerts |
| `/api/private-telegram/*` | KEEP | Private account Telegram alerts |
| `/dashboard` | REFACTORED | Now multi-exchange, auth-protected |
| `/private` | KEEP | Legacy private dashboard (populates stores from env-var routes) |
| Cloud Scheduler | KEEP | weekly-summary (Fri 7PM KST), price-alert (every 15min) |

---

## Implementation Progress

### Phase 1: Auth + Database Foundation — CODE COMPLETE
- NextAuth v5 with Google + GitHub providers (`/src/lib/auth.ts`)
- SessionProvider wrapper (`/src/components/providers/SessionProvider.tsx`)
- AuthGuard layout (`/src/app/dashboard/layout.tsx`)
- Login page with social login buttons
- Supabase client/server helpers (`/src/lib/supabase/`)
- **Pending**: Supabase project setup + SQL migration (requires manual action)

### Phase 2: Encryption + Credential Management — CODE COMPLETE
- Web Crypto AES-256-GCM + PBKDF2 (`/src/lib/crypto.ts`)
- Zustand encryption store — in-memory only, never persisted
- `/api/credentials` CRUD route (calls Supabase RPC)
- Settings page: CredentialForm, CredentialList, EncryptionPasswordModal, ProfileSettings
- EncryptionPasswordModal handles full unlock flow (fetch → decrypt → store)

### Phase 3: Multi-Exchange Adapters — CODE COMPLETE
- Standardized types (`/src/lib/exchanges/types.ts`)
- Factory + EXCHANGE_INFO registry (`/src/lib/exchanges/index.ts`)
- 5 exchange adapters: Binance, OKX, Bybit, Upbit, Bithumb
- Dynamic `/api/exchange/[exchange]/*` routes (balance, positions, income)

### Phase 4: Dashboard Refactor + Aggregation — CODE COMPLETE
- `usePortfolio` hook — multi-exchange balance + positions fetching
- `useIncome` hook — multi-exchange income aggregation (supports legacy apiBase)
- All dashboard components refactored to read from zustand stores
- Exchange badges, ExchangeSelector tabs, per-exchange breakdown in hero
- Real metrics (win rate, profit factor, avg daily PNL) from income data
- Legacy `/private` page updated to populate stores from env-var routes
- **Build passes** — all 26 routes compile successfully

### Phase 5: Public Dashboards — CODE COMPLETE
- Profile settings (username slug, public toggle)
- Snapshot save/serve API (`/api/portfolio/snapshot`, `/api/public/[username]`)
- `/u/[username]` server-rendered page with static data components
- **Pending**: Test with real Supabase data

### Phase 6: Deploy — PENDING
- Dockerfile updated with build args for Supabase public vars + HOSTNAME
- `.env.local.example` created with all required variables
- **Pending**: Add Supabase + NextAuth + OAuth secrets to Google Secret Manager
- **Pending**: Update Cloud Run `--set-secrets`
- **Pending**: Set up Supabase project with vault_private schema + RPC functions
