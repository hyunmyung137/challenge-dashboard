# Binance Futures PNL Dashboard

A real-time PNL tracking dashboard for Binance Futures accounts. Displays total portfolio value, daily PNL chart, open positions (Binance-style cards), and key performance metrics.

**Live:** https://challenge-dashboard-760234499517.asia-northeast3.run.app/dashboard

---

## Features

- **Total Portfolio Value** — wallet balance + sum of unrealized PNL across all open positions
- **Daily PNL Chart** — bar chart (green/red per day) with cumulative PNL line overlay. Range: 7D / 30D / 90D / All
- **Open Positions** — Binance-style cards showing symbol, side, leverage, unrealized PNL, ROE%, entry/mark/liq. price, margin
- **Metrics Row** — Win Rate, Profit Factor, Avg Trade, Total Fees
- **Auto-refresh** — all data refreshes every 1 hour
- **Secure** — API keys handled server-side only, never exposed to the browser

---

## Prerequisites

- Node.js 20+
- A Binance Futures account with a **read-only** API key + secret
- (For cloud deploy) Google Cloud SDK (`gcloud`) + a GCP project

---

## Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/hyunmyung137/challenge-dashboard.git
cd challenge-dashboard
npm install
```

### 2. Add your Binance API credentials

Create a `.env.local` file in the project root (this file is gitignored and will never be committed):

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your keys:

```
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
```

> **How to get Binance API keys:**
> 1. Log in to Binance → Profile → API Management
> 2. Create a new API key
> 3. Enable **Read** permission only — no trading or withdrawal permissions needed
> 4. Restrict to your IP address for extra security
> 5. Copy both the API Key and Secret Key into `.env.local`

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

---

## Deploying to Google Cloud Run

API keys are stored in **Google Secret Manager** and injected into Cloud Run at runtime. They are never baked into the Docker image or stored in environment variable fields visible in the console.

### Prerequisites

```bash
# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### Step 1 — Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### Step 2 — Create Artifact Registry repository

```bash
gcloud artifacts repositories create challenge-dashboard \
  --repository-format=docker \
  --location=asia-northeast3 \
  --description="Challenge Dashboard container images"
```

### Step 3 — Store secrets in Secret Manager

```bash
# Store API key
echo -n "your_api_key_here" | \
  gcloud secrets create BINANCE_API_KEY --data-file=-

# Store API secret
echo -n "your_api_secret_here" | \
  gcloud secrets create BINANCE_API_SECRET --data-file=-
```

> If the secrets already exist and you need to update them:
> ```bash
> echo -n "new_value" | gcloud secrets versions add BINANCE_API_KEY --data-file=-
> echo -n "new_value" | gcloud secrets versions add BINANCE_API_SECRET --data-file=-
> ```

### Step 4 — Grant Cloud Run access to the secrets

```bash
# Get your project number
PROJECT_NUM=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding BINANCE_API_KEY \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding BINANCE_API_SECRET \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 5 — Build and push the Docker image

```bash
gcloud builds submit \
  --tag asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/challenge-dashboard/app:latest \
  .
```

### Step 6 — Deploy to Cloud Run

```bash
gcloud run deploy challenge-dashboard \
  --image asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/challenge-dashboard/app:latest \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-secrets "BINANCE_API_KEY=BINANCE_API_KEY:latest,BINANCE_API_SECRET=BINANCE_API_SECRET:latest"
```

The command will output a **Service URL** — open it in your browser.

---

## Redeploying after code changes

```bash
# Commit and push changes
git add -A && git commit -m "your message" && git push

# Rebuild image
gcloud builds submit \
  --tag asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/challenge-dashboard/app:latest \
  .

# Redeploy (secrets are already set — no need to pass them again)
gcloud run deploy challenge-dashboard \
  --image asia-northeast3-docker.pkg.dev/YOUR_PROJECT_ID/challenge-dashboard/app:latest \
  --region asia-northeast3
```

---

## Security model

| Location | API Key stored? |
|----------|----------------|
| GitHub repo | No — `.env*` is gitignored |
| Docker image | No — `.dockerignore` excludes all `.env*` |
| Cloud Run env vars (console) | No — secrets come from Secret Manager |
| Google Secret Manager | Yes — encrypted at rest, IAM-gated |
| Browser / client JS | Never — all API calls are server-side route handlers |

All Binance API requests are signed server-side with HMAC-SHA256. The browser only calls internal Next.js routes (`/api/binance/*`), never Binance directly.

---

## Project structure

```
src/
├── app/
│   ├── dashboard/page.tsx           # Main dashboard page
│   ├── api/binance/
│   │   ├── balance/route.ts         # Wallet balance
│   │   ├── positions/route.ts       # Open positions
│   │   └── income/route.ts          # Daily PNL history
│   └── layout.tsx
├── components/
│   ├── layout/Header.tsx
│   └── dashboard/
│       ├── PortfolioHero.tsx        # Total portfolio value
│       ├── DailyPNLChart.tsx        # Daily PNL bar + cumulative line
│       ├── MetricsRow.tsx           # Win rate, profit factor, etc.
│       └── PositionCards.tsx        # Open positions grid
└── lib/
    ├── binance/client.ts            # HMAC-signed Binance REST client
    └── utils.ts                     # formatUSD, formatPct, formatPnl
```

---

## Tech stack

- **Next.js 16** (App Router, standalone output)
- **Tailwind CSS v4**
- **Recharts** — ComposedChart with Bar + Line
- **Google Cloud Run** — containerized hosting
- **Google Secret Manager** — secure key storage
- **Google Artifact Registry** — Docker image storage
