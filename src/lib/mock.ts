// Mock data for development — replace with real Binance API calls via Settings

export const mockBalance = {
  totalWalletBalance: 24578.0,
  unrealizedPnl: 234.5,
  totalMaintMargin: 4520.3,
  availableBalance: 20057.7,
};

// Simulated 30 days of daily realized PNL
export const mockDailyPnl = (() => {
  const days: { date: string; dailyPnl: number; cumulativePnl: number }[] = [];
  const rawPnl = [
    120, -45, 230, 180, -120, 310, 420, -180, 95, 210,
    -60, 145, 280, 190, -90, 320, 110, -30, 200, 260,
    -150, 175, 89, 140, -75, 300, 215, -40, 130, 89,
  ];
  let cumulative = 0;
  const today = new Date();
  rawPnl.forEach((pnl, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    cumulative += pnl;
    days.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dailyPnl: pnl,
      cumulativePnl: cumulative,
    });
  });
  return days;
})();

export const mockPositions = [
  { symbol: "BTCUSDT", side: "LONG",  size: 0.1,  entryPrice: 42000, markPrice: 43500, unrealizedPnl: 150,   roe: 3.57,  leverage: 10 },
  { symbol: "ETHUSDT", side: "SHORT", size: 2.0,  entryPrice: 2800,  markPrice: 2750,  unrealizedPnl: 100,   roe: 1.78,  leverage: 5  },
  { symbol: "SOLUSDT", side: "LONG",  size: 15.0, entryPrice: 98,    markPrice: 102,   unrealizedPnl: 60,    roe: 2.44,  leverage: 5  },
  { symbol: "BNBUSDT", side: "SHORT", size: 5.0,  entryPrice: 380,   markPrice: 392,   unrealizedPnl: -60,   roe: -1.58, leverage: 3  },
  { symbol: "XRPUSDT", side: "LONG",  size: 1000, entryPrice: 0.62,  markPrice: 0.595, unrealizedPnl: -25,   roe: -2.02, leverage: 5  },
  { symbol: "DOGEUSDT",side: "LONG",  size: 5000, entryPrice: 0.092, markPrice: 0.097, unrealizedPnl: 25,    roe: 2.72,  leverage: 5  },
];

export const mockRecentTrades = [
  { symbol: "BTCUSDT", side: "LONG",  qty: 0.05, entryPrice: 41200, exitPrice: 43100, pnl: 95,   roe: 4.61,  time: "14:20" },
  { symbol: "ETHUSDT", side: "SHORT", qty: 1.0,  entryPrice: 2900,  exitPrice: 2800,  pnl: 100,  roe: 3.45,  time: "11:05" },
  { symbol: "SOLUSDT", side: "LONG",  qty: 10,   entryPrice: 95,    exitPrice: 105,   pnl: 100,  roe: 10.53, time: "09:30" },
  { symbol: "BNBUSDT", side: "SHORT", qty: 3,    entryPrice: 390,   exitPrice: 375,   pnl: 45,   roe: 3.85,  time: "Yesterday" },
  { symbol: "XRPUSDT", side: "LONG",  qty: 500,  entryPrice: 0.58,  exitPrice: 0.61,  pnl: 15,   roe: 5.17,  time: "Yesterday" },
];

export const mockMetrics = {
  winRate: 63.4,
  wins: 30,
  losses: 17,
  profitFactor: 2.14,
  avgTrade: 26.38,
  totalFees: -45.2,
};
