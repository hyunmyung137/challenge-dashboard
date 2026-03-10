# Multi-Exchange Portfolio Dashboard

A real-time PNL tracking dashboard that aggregates your portfolio across **Binance, OKX, Bybit, Upbit, and Bithumb**. Sign in with Google or GitHub, securely add your exchange API keys, and view all your positions in one place.

**Live:** https://challenge-dashboard-760234499517.asia-northeast3.run.app

---

## Features

- **Multi-Exchange Support** — Binance Futures, OKX, Bybit, Upbit (KRW), Bithumb (KRW)
- **Aggregated Portfolio View** — total value, unrealized PNL, wallet balance across all exchanges
- **Daily PNL Chart** — bar chart (green/red per day) with cumulative PNL line overlay (7D / 30D / 90D / All)
- **Open Positions** — exchange-badged cards showing symbol, side, leverage, unrealized PNL, ROE%, entry/mark/liq. price
- **Metrics Row** — Win Rate, Profit Factor, Avg Daily PNL, Total PNL (computed from real data)
- **Exchange Filtering** — tab bar to view All or filter by specific exchange
- **Public Dashboards** — optionally share your portfolio at `/u/your-username`
- **Auto-refresh** — data refreshes every 1 hour, manual refresh button available

---

## Security Model

### Zero-Knowledge Encryption

Your API keys are **never stored in plaintext** — not on the server, not in the database, not anywhere.

1. You set an **encryption password** (only you know it, never sent to server)
2. Your API keys are encrypted **in your browser** using AES-256-GCM (Web Crypto API) with PBKDF2 key derivation (600,000 iterations)
3. Only the **encrypted blob** is sent to the server and stored in the database
4. The server applies a **second layer** of encryption (pgsodium) for defense-in-depth
5. To use your keys, you enter your password once per session — decryption happens **in your browser**
6. Decrypted keys are held **in memory only** and lost when you close the tab

> **If you forget your encryption password**, your keys cannot be recovered. Simply delete and re-add them.

### API Key Permissions

> **IMPORTANT: Use READ-ONLY API keys only.**
>
> This dashboard only needs to **read** your balances, positions, and trade history.
> It does **not** need trading, withdrawal, or transfer permissions.

When creating API keys on each exchange:

| Exchange | Required Permission | DO NOT Enable |
|----------|-------------------|---------------|
| **Binance** | Read Only | Trading, Withdrawal, Internal Transfer |
| **OKX** | Read Only | Trade, Withdraw |
| **Bybit** | Read Only | Contract Trade, Wallet Transfer |
| **Upbit** | Read (자산조회) | Trade (주문), Withdrawal (출금) |
| **Bithumb** | Read (조회) | Trade (거래), Withdrawal (출금) |

**Additional security recommendations:**
- **IP Whitelist** — restrict your API key to your own IP address
- **No passphrase sharing** — OKX passphrase is encrypted alongside your keys
- **Unique keys per service** — create a dedicated read-only key for this dashboard
- **Regular rotation** — periodically regenerate your API keys

### Where Keys Are Stored

| Location | Plaintext Keys? |
|----------|----------------|
| Your browser (session) | Yes — in memory only, lost on tab close |
| Network requests | Encrypted (HTTPS POST body only, never in URLs) |
| Server (Next.js) | Transient — used for one API call, then garbage collected |
| Database (Supabase) | Double-encrypted — client AES-256-GCM + server pgsodium |
| GitHub repo | Never — `.env*` files are gitignored |
| Docker image | Never — `.dockerignore` excludes all secrets |

### Database Security (7 Layers)

| Layer | Protection |
|-------|-----------|
| Schema isolation | Credential tables hidden from REST API |
| FORCE Row Level Security | Even admin roles get zero rows without matching policy |
| RPC-only access | No direct table queries — all operations go through secure functions |
| Double encryption | Client-side AES-256-GCM + server-side pgsodium |
| Dedicated DB role | Minimal-permission `credential_manager` role |
| Rate limiting | Per-user sliding window (30 reads/15min, 10 writes/15min) |
| Audit logging | Every credential operation logged with metadata |

---

## Prerequisites

- Node.js 20+
- Exchange accounts with **read-only** API keys
- (Optional) Google Cloud SDK for production deployment
- (Optional) Supabase project for persistent credential storage

---

## Running Locally

### 1. Clone and install

```bash
git clone https://github.com/hyunmyung137/challenge-dashboard.git
cd challenge-dashboard
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```bash
# Supabase (required for multi-user features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth (required for authentication)
NEXTAUTH_SECRET=random-secret-string    # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Google Cloud Run

### Store secrets in Google Secret Manager

```bash
# Auth secrets
echo -n "your-nextauth-secret" | gcloud secrets create NEXTAUTH_SECRET --data-file=-
echo -n "your-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "your-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# Supabase secrets
echo -n "your-supabase-service-role-key" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
```

### Build and deploy

```bash
# Build image
gcloud builds submit \
  --tag asia-northeast3-docker.pkg.dev/YOUR_PROJECT/challenge-dashboard/app:latest \
  .

# Deploy with secrets
gcloud run deploy challenge-dashboard \
  --image asia-northeast3-docker.pkg.dev/YOUR_PROJECT/challenge-dashboard/app:latest \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest"
```

---

## Supported Exchanges

| Exchange | Type | Markets |
|----------|------|---------|
| Binance | Futures | USDT-margined perpetuals |
| OKX | Perpetual Swaps | USDT-margined perpetuals |
| Bybit | Derivatives | USDT perpetuals, inverse contracts |
| Upbit | Spot | KRW-denominated spot trading |
| Bithumb | Spot | KRW-denominated spot trading |

Spot exchanges (Upbit, Bithumb) show positions with `SPOT` badge and `1x` leverage.
KRW values are automatically converted to USD using cached forex rates.

---

## Tech Stack

- **Next.js 16** (App Router, standalone output) + TypeScript
- **NextAuth v5** — Google + GitHub social login
- **Supabase** — Postgres with Row Level Security
- **Web Crypto API** — AES-256-GCM client-side encryption
- **Tailwind CSS v4** — dark theme styling
- **Recharts** — ComposedChart with Bar + Line overlays
- **Zustand** — client state management (portfolio data + in-memory keys)
- **Google Cloud Run** — containerized hosting (Seoul region)

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/page.tsx          # Multi-exchange dashboard (protected)
│   ├── dashboard/settings/         # Credential & profile management
│   ├── login/                      # Social login page
│   ├── u/[username]/               # Public dashboard (server component)
│   ├── private/                    # Legacy single-user dashboard
│   └── api/
│       ├── exchange/[exchange]/    # Dynamic exchange API routes (POST with keys)
│       ├── credentials/            # Encrypted credential CRUD
│       ├── auth/                   # NextAuth
│       └── binance/                # Legacy env-var routes
├── components/
│   ├── dashboard/                  # PortfolioHero, DailyPNLChart, PositionCards, etc.
│   ├── settings/                   # CredentialForm, EncryptionPasswordModal, etc.
│   └── auth/                       # LoginButtons
├── hooks/
│   ├── usePortfolio.ts             # Multi-exchange balance + positions
│   └── useIncome.ts                # Multi-exchange daily PNL aggregation
├── stores/
│   ├── portfolio-store.ts          # Zustand: portfolio data + computed values
│   └── encryption-store.ts         # Zustand: decrypted keys (memory only)
└── lib/
    ├── crypto.ts                   # Web Crypto AES-256-GCM + PBKDF2
    ├── exchanges/                  # 5 exchange adapters + factory
    └── auth.ts                     # NextAuth configuration
```

---

## License

Private repository.
