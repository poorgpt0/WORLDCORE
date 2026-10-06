import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Asset } from './AssetList';
import { formatPrice } from '@/lib/binance';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  Layers,
} from 'lucide-react';

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
}

const STORAGE_KEY_HOLDINGS = 'binanceph_portfolio_holdings_v1';
const PHP_EXCHANGE_RATE = 58.45;

const DEFAULT_HOLDINGS: PortfolioHolding[] = [
  { symbol: 'BTC', quantity: 0.42 },
  { symbol: 'BNB', quantity: 14.5 },
  { symbol: 'ETH', quantity: 3.2 },
  { symbol: 'SOL', quantity: 45.0 },
  { symbol: 'WCORE', quantity: 125000 },
  { symbol: 'USDT', quantity: 4850.0 },
];

function loadStoredHoldings(): PortfolioHolding[] {
  if (typeof window === 'undefined') return DEFAULT_HOLDINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HOLDINGS);
    if (!raw) return DEFAULT_HOLDINGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_HOLDINGS;
  } catch {
    return DEFAULT_HOLDINGS;
  }
}

function saveStoredHoldings(holdings: PortfolioHolding[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_HOLDINGS, JSON.stringify(holdings));
  } catch {}
}

export interface PortfolioHistoryPoint {
  date: string;
  fullDate: string;
  dayIndex: number;
  valueUsdt: number;
  valuePhp: number;
  dailyChangePct: number;
  btcPrice: number;
  bnbPrice: number;
}

interface PortfolioDashboardProps {
  assets: Asset[];
  compact?: boolean;
  onSelectAsset?: (asset: Asset) => void;
  onOpenFullDashboard?: () => void;
}

export function PortfolioDashboard({
  assets,
  compact = false,
  onSelectAsset,
  onOpenFullDashboard,
}: PortfolioDashboardProps) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => loadStoredHoldings());
  const [currency, setCurrency] = useState<'USDT' | 'PHP'>('USDT');
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(30);
  const [hideBalances, setHideBalances] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingHoldings, setIsEditingHoldings] = useState(false);
  const [draftHoldings, setDraftHoldings] = useState<Record<string, string>>({});
  const [historicalDailyCloses, setHistoricalDailyCloses] = useState<Record<string, number[]>>({});

  useEffect(() => {
    saveStoredHoldings(holdings);
  }, [holdings]);

  // Fetch real 30-day daily klines from Binance proxy for core portfolio assets
  useEffect(() => {
    let isMounted = true;
    const coreSymbols = ['BTC', 'BNB', 'ETH', 'SOL'];

    Promise.all(
      coreSymbols.map(async (sym) => {
        try {
          const res = await fetch(
            `/api/binance/klines?symbol=${encodeURIComponent(sym + 'USDT')}&interval=1d&limit=30`
          );
          if (!res.ok) return { sym, closes: [] as number[] };
          const rows = await res.json();
          if (!Array.isArray(rows)) return { sym, closes: [] as number[] };
          const closes = rows
            .map((r: any) => parseFloat(r?.[4]))
            .filter((n: number) => !isNaN(n) && n > 0);
          return { sym, closes };
        } catch {
          return { sym, closes: [] as number[] };
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const map: Record<string, number[]> = {};
      results.forEach(({ sym, closes }) => {
        if (closes.length >= 7) {
          map[sym] = closes;
        }
      });
      if (Object.keys(map).length > 0) {
        setHistoricalDailyCloses(map);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const getLiveAssetPrice = (symbol: string): number => {
    if (symbol === 'USDT') return 1.0;
    const match = assets.find((a) => a.symbol === symbol);
    return match ? match.price : 0;
  };

  // Current live portfolio breakdown
  const allocation = useMemo(() => {
    const items = holdings.map((h) => {
      const price = getLiveAssetPrice(h.symbol);
      const assetObj = assets.find((a) => a.symbol === h.symbol);
      const change24h = h.symbol === 'USDT' ? 0 : assetObj?.change || 0;
      const valueUsdt = h.quantity * price;
      return {
        symbol: h.symbol,
        name: h.symbol === 'USDT' ? 'Tether USD' : assetObj?.name || h.symbol,
        quantity: h.quantity,
        price,
        change24h,
        valueUsdt,
        assetObj,
      };
    });

    const totalUsdt = items.reduce((acc, item) => acc + item.valueUsdt, 0);

    return items
      .map((item) => ({
        ...item,
        sharePct: totalUsdt > 0 ? (item.valueUsdt / totalUsdt) * 100 : 0,
      }))
      .sort((a, b) => b.valueUsdt - a.valueUsdt);
  }, [holdings, assets]);

  const currentTotalUsdt = useMemo(
    () => allocation.reduce((sum, item) => sum + item.valueUsdt, 0),
    [allocation]
  );

  // Build 30-day daily portfolio valuation series
  const history30d: PortfolioHistoryPoint[] = useMemo(() => {
    const totalDays = 30;
    const now = new Date();
    const points: PortfolioHistoryPoint[] = [];

    for (let i = 0; i < totalDays; i++) {
      const daysAgo = totalDays - 1 - i;
      const d = new Date(now);
      d.setDate(now.getDate() - daysAgo);

      const shortDate = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const fullDate = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let dayTotalUsdt = 0;

      holdings.forEach((h) => {
        if (h.quantity <= 0) return;
        if (h.symbol === 'USDT') {
          dayTotalUsdt += h.quantity;
          return;
        }

        const livePrice = getLiveAssetPrice(h.symbol);
        const klineCloses = historicalDailyCloses[h.symbol];

        if (i === totalDays - 1) {
          // Today uses exact real-time Binance price
          dayTotalUsdt += h.quantity * livePrice;
        } else if (klineCloses && klineCloses.length > 0) {
          const idx = Math.max(0, klineCloses.length - totalDays + i);
          const histPrice = klineCloses[idx] || livePrice;
          dayTotalUsdt += h.quantity * histPrice;
        } else {
          // Deterministic realistic 30-day trajectory anchored to live price on day 29
          const seed = h.symbol.charCodeAt(0) * 13 + (h.symbol.charCodeAt(1) || 7);
          const progress = i / (totalDays - 1); // 0 -> 1
          const trendFactor = 0.88 + 0.12 * progress;
          const wave1 = Math.sin(i * 0.42 + seed) * 0.026 * (1 - progress * 0.25);
          const wave2 = Math.cos(i * 0.85 + seed * 0.5) * 0.014 * (1 - progress * 0.25);
          const multiplier = Math.max(0.65, trendFactor + wave1 + wave2);
          dayTotalUsdt += h.quantity * livePrice * multiplier;
        }
      });

      const prevValue = i > 0 ? points[i - 1].valueUsdt : dayTotalUsdt;
      const dailyChangePct =
        prevValue > 0 ? ((dayTotalUsdt - prevValue) / prevValue) * 100 : 0;

      const btcCloses = historicalDailyCloses['BTC'];
      const bnbCloses = historicalDailyCloses['BNB'];
      const btcLive = getLiveAssetPrice('BTC');
      const bnbLive = getLiveAssetPrice('BNB');

      const btcPrice =
        i === totalDays - 1
          ? btcLive
          : btcCloses && btcCloses.length > 0
          ? btcCloses[Math.max(0, btcCloses.length - totalDays + i)] || btcLive
          : btcLive * (0.89 + (0.11 * i) / (totalDays - 1));

      const bnbPrice =
        i === totalDays - 1
          ? bnbLive
          : bnbCloses && bnbCloses.length > 0
          ? bnbCloses[Math.max(0, bnbCloses.length - totalDays + i)] || bnbLive
          : bnbLive * (0.91 + (0.09 * i) / (totalDays - 1));

      points.push({
        date: shortDate,
        fullDate,
        dayIndex: i,
        valueUsdt: Number(dayTotalUsdt.toFixed(2)),
        valuePhp: Number((dayTotalUsdt * PHP_EXCHANGE_RATE).toFixed(2)),
        dailyChangePct: Number(dailyChangePct.toFixed(2)),
        btcPrice,
        bnbPrice,
      });
    }

    return points;
  }, [holdings, assets, historicalDailyCloses]);

  const visibleHistory = useMemo(
    () => history30d.slice(history30d.length - rangeDays),
    [history30d, rangeDays]
  );

  const stats = useMemo(() => {
    if (visibleHistory.length === 0) {
      return {
        startVal: 0,
        endVal: 0,
        netPnl: 0,
        netPnlPct: 0,
        highVal: 0,
        lowVal: 0,
        isPositive: true,
      };
    }

    const rate = currency === 'PHP' ? PHP_EXCHANGE_RATE : 1;
    const startVal = visibleHistory[0].valueUsdt * rate;
    const endVal = currentTotalUsdt * rate;
    const netPnl = endVal - startVal;
    const netPnlPct = startVal > 0 ? (netPnl / startVal) * 100 : 0;

    let highVal = endVal;
    let lowVal = endVal;
    visibleHistory.forEach((pt) => {
      const v = pt.valueUsdt * rate;
      if (v > highVal) highVal = v;
      if (v < lowVal) lowVal = v;
    });

    return {
      startVal,
      endVal,
      netPnl,
      netPnlPct,
      highVal,
      lowVal,
      isPositive: netPnl >= 0,
    };
  }, [visibleHistory, currentTotalUsdt, currency]);

  const currencySymbol = currency === 'PHP' ? '₱' : '$';
  const dataKey = currency === 'PHP' ? 'valuePhp' : 'valueUsdt';
  const strokeColor = stats.isPositive ? '#F3BA2F' : '#EF4444';

  const formatMoney = (val: number) => {
    if (hideBalances) return '••••••••';
    return `${currencySymbol}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const openHoldingsEditor = () => {
    const init: Record<string, string> = {};
    holdings.forEach((h) => {
      init[h.symbol] = String(h.quantity);
    });
    setDraftHoldings(init);
    setIsEditingHoldings(true);
  };

  const saveHoldingsEditor = () => {
    const next: PortfolioHolding[] = holdings.map((h) => {
      const parsed = parseFloat(draftHoldings[h.symbol] ?? String(h.quantity));
      return {
        symbol: h.symbol,
        quantity: !isNaN(parsed) && parsed >= 0 ? parsed : h.quantity,
      };
    });
    setHoldings(next);
    setIsEditingHoldings(false);
  };

  const resetHoldingsToDefault = () => {
    setHoldings(DEFAULT_HOLDINGS);
    setIsEditingHoldings(false);
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 text-zinc-100 overflow-hidden shadow-xl">
      {/* Top Portfolio Header */}
      <div className="p-4 sm:p-6 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-zinc-950 via-zinc-900/50 to-zinc-950">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Estimated Portfolio Value ({rangeDays}D Performance)
            </span>
            <button
              type="button"
              onClick={() => setHideBalances(!hideBalances)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
              title={hideBalances ? 'Show Portfolio Balances' : 'Hide Portfolio Balances'}
            >
              {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-100 tabular-nums">
              {formatMoney(stats.endVal)}
            </h2>
            <span className="text-xs font-mono text-zinc-500">{currency}</span>

            <div
              className={`flex items-center gap-1 text-xs font-mono font-bold ${
                stats.isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {hideBalances
                  ? '••••'
                  : `${stats.isPositive ? '+' : '-'}${currencySymbol}${Math.abs(
                      stats.netPnl
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} (${stats.isPositive ? '+' : ''}${stats.netPnlPct.toFixed(2)}%)`}
              </span>
              <span className="text-zinc-500 font-sans font-normal ml-1">
                past {rangeDays}d
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Range Selector, Currency Toggle, Customize Holdings, Collapse */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  rangeDays === d
                    ? 'bg-yellow-500 text-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            {(['USDT', 'PHP'] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setCurrency(curr)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  currency === curr
                    ? 'bg-zinc-800 text-yellow-500 border border-yellow-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {curr === 'USDT' ? '$ USDT' : '₱ PHP'}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              isEditingHoldings ? setIsEditingHoldings(false) : openHoldingsEditor()
            }
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 h-8 px-3 text-xs font-bold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
            <span>{isEditingHoldings ? 'Close Editor' : 'Edit Holdings'}</span>
          </Button>

          {compact && onOpenFullDashboard && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenFullDashboard}
              className="border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 h-8 px-3 text-xs font-bold"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              <span>Full Analytics</span>
            </Button>
          )}

          {compact && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-zinc-400 hover:text-zinc-100 h-8 px-2"
              title={isCollapsed ? 'Expand Chart' : 'Collapse Chart'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Inline Holdings Customizer */}
      {isEditingHoldings && (
        <div className="p-4 sm:p-5 bg-zinc-900/60 border-b border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-500">
              Customize Portfolio Asset Quantities
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetHoldingsToDefault}
                className="h-7 px-2.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Default
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveHoldingsEditor}
                className="h-7 px-3 text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Apply Holdings
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {holdings.map((h) => {
              const livePrice = getLiveAssetPrice(h.symbol);
              return (
                <div
                  key={h.symbol}
                  className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-zinc-100">{h.symbol}</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      ${formatPrice(livePrice)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={draftHoldings[h.symbol] ?? String(h.quantity)}
                    onChange={(e) =>
                      setDraftHoldings((prev) => ({
                        ...prev,
                        [h.symbol]: e.target.value,
                      }))
                    }
                    className="h-8 bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* 4 Summary KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                {rangeDays}D Starting Balance
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-zinc-200 tabular-nums">
                {formatMoney(stats.startVal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                {rangeDays}D Peak Valuation
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 tabular-nums">
                {formatMoney(stats.highVal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                {rangeDays}D Low Valuation
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-zinc-300 tabular-nums">
                {formatMoney(stats.lowVal)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                Top Portfolio Holding
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-black text-yellow-500">
                  {allocation[0]?.symbol || 'BTC'}
                </span>
                <span className="text-xs font-mono text-zinc-400 tabular-nums">
                  {allocation[0] ? `${allocation[0].sharePct.toFixed(1)}% share` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts 30-Day AreaChart */}
          <div className="w-full h-[240px] sm:h-[300px] bg-zinc-900/20 border border-zinc-900 rounded-2xl p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={visibleHistory}
                margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                    <stop offset="60%" stopColor={strokeColor} stopOpacity={0.1} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#27272a"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={78}
                  domain={['auto', 'auto']}
                  tickFormatter={(value: number) => {
                    if (hideBalances) return '•••';
                    if (value >= 1_000_000) {
                      return `${currencySymbol}${(value / 1_000_000).toFixed(2)}M`;
                    }
                    if (value >= 1_000) {
                      return `${currencySymbol}${(value / 1_000).toFixed(1)}k`;
                    }
                    return `${currencySymbol}${value.toFixed(0)}`;
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const point = payload[0].payload as PortfolioHistoryPoint;
                    const val = currency === 'PHP' ? point.valuePhp : point.valueUsdt;
                    const isDayPos = point.dailyChangePct >= 0;

                    return (
                      <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-md space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-yellow-500" />
                            {point.fullDate}
                          </span>
                        </div>
                        <div className="text-base font-black font-mono text-zinc-100 tabular-nums">
                          {hideBalances
                            ? '••••••••'
                            : `${currencySymbol}${val.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} ${currency}`}
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-500">24h Delta:</span>
                          <span
                            className={`font-bold ${
                              isDayPos ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isDayPos ? '+' : ''}
                            {point.dailyChangePct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>BTC Ref: ${formatPrice(point.btcPrice)}</span>
                          <span>BNB Ref: ${formatPrice(point.bnbPrice)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={stats.startVal}
                  stroke="#52525b"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#portfolioValueGradient)"
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Asset Allocation Bar & Interactive Holdings Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-zinc-400">
                Portfolio Allocation Breakdown
              </span>
              <span className="font-mono text-zinc-500">
                Live Binance Spot Valuation
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-zinc-900 overflow-hidden flex gap-0.5 p-0.5 border border-zinc-800">
              {allocation.map((item, idx) => {
                const colors = [
                  'bg-yellow-500',
                  'bg-emerald-500',
                  'bg-sky-500',
                  'bg-purple-500',
                  'bg-amber-400',
                  'bg-zinc-500',
                ];
                return (
                  <div
                    key={item.symbol}
                    style={{ width: `${Math.max(item.sharePct, 2)}%` }}
                    className={`h-full first:rounded-l-full last:rounded-r-full ${
                      colors[idx % colors.length]
                    }`}
                    title={`${item.symbol}: ${item.sharePct.toFixed(1)}%`}
                  />
                );
              })}
            </div>

            {/* Holdings Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {allocation.map((item) => {
                const rate = currency === 'PHP' ? PHP_EXCHANGE_RATE : 1;
                const displayVal = item.valueUsdt * rate;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => {
                      if (item.assetObj && onSelectAsset) {
                        onSelectAsset(item.assetObj);
                      }
                    }}
                    className={`p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-yellow-500/40 transition-all space-y-1.5 ${
                      item.assetObj && onSelectAsset ? 'cursor-pointer group' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-zinc-100 group-hover:text-yellow-500 transition-colors">
                          {item.symbol}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {item.sharePct.toFixed(1)}%
                        </span>
                      </div>
                      {item.assetObj && onSelectAsset && (
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                      )}
                    </div>

                    <div className="text-xs font-mono font-bold text-zinc-200 tabular-nums truncate">
                      {formatMoney(displayVal)}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>
                        {hideBalances
                          ? '•••'
                          : `${item.quantity.toLocaleString('en-US', {
                              maximumFractionDigits: 4,
                            })} ${item.symbol}`}
                      </span>
                      <span
                        className={
                          item.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {item.change24h >= 0 ? '+' : ''}
                        {item.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed 30-Day Daily Log Table when in Full Dashboard tab */}
          {!compact && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                  30-Day Daily Valuation Ledger
                </h3>
                <span className="text-xs font-mono text-zinc-500">
                  Showing last {visibleHistory.length} trading days
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30 max-h-[320px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-950 sticky top-0 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-right">Portfolio Value ({currency})</th>
                      <th className="py-2.5 px-4 text-right">24h Change</th>
                      <th className="py-2.5 px-4 text-right">BTC Benchmark</th>
                      <th className="py-2.5 px-4 text-right">BNB Benchmark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {[...visibleHistory].reverse().map((row) => {
                      const val = currency === 'PHP' ? row.valuePhp : row.valueUsdt;
                      const pos = row.dailyChangePct >= 0;
                      return (
                        <tr
                          key={row.fullDate}
                          className="hover:bg-zinc-900/60 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-sans font-medium text-zinc-300">
                            {row.fullDate}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-zinc-100 tabular-nums">
                            {formatMoney(val)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-bold tabular-nums ${
                              pos ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {pos ? '+' : ''}
                            {row.dailyChangePct.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-4 text-right text-zinc-400 tabular-nums">
                            ${formatPrice(row.btcPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-zinc-400 tabular-nums">
                            ${formatPrice(row.bnbPrice)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
