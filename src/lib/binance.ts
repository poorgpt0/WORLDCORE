import { Time } from 'lightweight-charts';

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  high24h?: number;
  low24h?: number;
}

export const KNOWN_CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  SOL: 'Solana',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  LINK: 'Chainlink',
  SUI: 'Sui',
  SHIB: 'Shiba Inu',
  PEPE: 'Pepe',
  NEAR: 'Near Protocol',
  DOT: 'Polkadot',
  LTC: 'Litecoin',
  TRX: 'TRON',
  TON: 'Toncoin',
  APT: 'Aptos',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  RENDER: 'Render',
  INJ: 'Injective',
  FTM: 'Fantom',
  MATIC: 'Polygon',
  POL: 'Polygon (POL)',
  FET: 'Artificial Superintelligence',
  ICP: 'Internet Computer',
  BCH: 'Bitcoin Cash',
  UNI: 'Uniswap',
  ATOM: 'Cosmos',
  XLM: 'Stellar',
  FIL: 'Filecoin',
  HBAR: 'Hedera',
  AAVE: 'Aave',
  KAS: 'Kaspa'
};

export const DEFAULT_WATCHLIST_SYMBOLS = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX',
  'LINK', 'SUI', 'PEPE', 'SHIB', 'NEAR', 'DOT', 'LTC', 'TON',
  'APT', 'ARB', 'OP', 'RENDER', 'INJ', 'UNI'
];

export const INITIAL_FALLBACK_ASSETS: Asset[] = DEFAULT_WATCHLIST_SYMBOLS.map(sym => ({
  symbol: sym,
  name: KNOWN_CRYPTO_NAMES[sym] || sym,
  price: sym === 'BTC' ? 86500 : sym === 'ETH' ? 2750 : sym === 'BNB' ? 590 : sym === 'SOL' ? 150 : 1,
  change: 0.0,
  volume: '1.2B',
}));

export function formatPrice(price: number): string {
  if (typeof price !== 'number' || isNaN(price) || price <= 0) return '0.00';
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (price >= 0.001) return price.toFixed(5);
  if (price >= 0.00001) return price.toFixed(7);
  return price.toFixed(8);
}

export function formatVolume(quoteVolNum: number): string {
  if (isNaN(quoteVolNum) || quoteVolNum <= 0) return '0.00M';
  if (quoteVolNum >= 1e9) {
    return (quoteVolNum / 1e9).toFixed(2) + 'B';
  } else if (quoteVolNum >= 1e6) {
    return (quoteVolNum / 1e6).toFixed(2) + 'M';
  } else if (quoteVolNum >= 1e3) {
    return (quoteVolNum / 1e3).toFixed(2) + 'K';
  }
  return quoteVolNum.toFixed(2);
}

// Fetch all 24hr tickers from Binance (direct or proxy)
export async function fetchLiveBinanceTickers(): Promise<Asset[]> {
  let rawData: any[] = [];
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (res.ok) {
      rawData = await res.json();
    } else {
      throw new Error('Direct Binance fetch returned ' + res.status);
    }
  } catch {
    // Fallback to server proxy
    try {
      const proxyRes = await fetch('/api/binance/ticker/24hr');
      if (proxyRes.ok) {
        rawData = await proxyRes.json();
      }
    } catch (e) {
      console.warn('Failed to fetch from proxy:', e);
    }
  }

  if (!Array.isArray(rawData) || rawData.length === 0) {
    return INITIAL_FALLBACK_ASSETS;
  }

  const assetMap = new Map<string, Asset>();
  
  // First, map tickers
  for (const item of rawData) {
    const s = item.symbol;
    if (typeof s === 'string' && s.endsWith('USDT')) {
      const base = s.slice(0, -4);
      const price = parseFloat(item.lastPrice);
      const change = parseFloat(item.priceChangePercent);
      const quoteVol = parseFloat(item.quoteVolume);
      const high = parseFloat(item.highPrice);
      const low = parseFloat(item.lowPrice);

      if (!isNaN(price) && price > 0) {
        assetMap.set(base, {
          symbol: base,
          name: KNOWN_CRYPTO_NAMES[base] || base,
          price,
          change: isNaN(change) ? 0 : change,
          volume: formatVolume(quoteVol),
          high24h: !isNaN(high) ? high : price * 1.02,
          low24h: !isNaN(low) ? low : price * 0.98,
        });
      }
    }
  }

  // Build sorted list: priority for default symbols first, then highest volume
  const result: Asset[] = [];
  const added = new Set<string>();

  for (const sym of DEFAULT_WATCHLIST_SYMBOLS) {
    const found = assetMap.get(sym);
    if (found) {
      result.push(found);
      added.add(sym);
    }
  }

  // Add other top USDT coins
  const remaining: Asset[] = [];
  for (const [sym, asset] of assetMap.entries()) {
    if (!added.has(sym)) {
      remaining.push(asset);
    }
  }
  
  // Sort remaining by volume or name
  remaining.sort((a, b) => {
    const parseVol = (v: string) => {
      const n = parseFloat(v);
      if (v.endsWith('B')) return n * 1e9;
      if (v.endsWith('M')) return n * 1e6;
      return n;
    };
    return parseVol(b.volume) - parseVol(a.volume);
  });

  return [...result, ...remaining.slice(0, 30)];
}

// Fetch historical Candlestick / Kline data from Binance
export interface KlinePoint {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;
}

export interface VolumePoint {
  time: Time;
  value: number;
  color: string;
}

export async function fetchLiveBinanceKlines(
  symbol: string,
  interval: string = '1m',
  limit: number = 100
): Promise<{ points: KlinePoint[]; volPoints: VolumePoint[] }> {
  const cleanSymbol = (symbol.endsWith('USDT') ? symbol : `${symbol}USDT`).toUpperCase();
  let rawData: any[] = [];

  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
    if (res.ok) {
      rawData = await res.json();
    } else {
      throw new Error(`Direct klines failed: ${res.status}`);
    }
  } catch {
    try {
      const proxyRes = await fetch(`/api/binance/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`);
      if (proxyRes.ok) {
        rawData = await proxyRes.json();
      }
    } catch (e) {
      console.warn('Failed proxy klines fetch:', e);
    }
  }

  if (!Array.isArray(rawData) || rawData.length === 0) {
    return { points: [], volPoints: [] };
  }

  const points: KlinePoint[] = [];
  const volPoints: VolumePoint[] = [];

  for (const item of rawData) {
    // item: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, trades...]
    const openTimeMs = item[0];
    const timeSec = Math.floor(openTimeMs / 1000) as Time;
    const open = parseFloat(item[1]);
    const high = parseFloat(item[2]);
    const low = parseFloat(item[3]);
    const close = parseFloat(item[4]);
    const vol = parseFloat(item[5]);

    if (!isNaN(close) && close > 0) {
      points.push({
        time: timeSec,
        open,
        high,
        low,
        close,
        value: close,
      });

      volPoints.push({
        time: timeSec,
        value: !isNaN(vol) ? vol : 100,
        color: close >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    }
  }

  return { points, volPoints };
}

// Fetch live order book depth
export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

export async function fetchLiveBinanceDepth(
  symbol: string,
  limit: number = 10
): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  const cleanSymbol = (symbol.endsWith('USDT') ? symbol : `${symbol}USDT`).toUpperCase();
  let data: any = null;

  try {
    const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${cleanSymbol}&limit=${limit}`);
    if (res.ok) {
      data = await res.json();
    } else {
      throw new Error(`Direct depth failed: ${res.status}`);
    }
  } catch {
    try {
      const proxyRes = await fetch(`/api/binance/depth?symbol=${cleanSymbol}&limit=${limit}`);
      if (proxyRes.ok) {
        data = await proxyRes.json();
      }
    } catch (e) {
      console.warn('Failed proxy depth:', e);
    }
  }

  if (!data || !Array.isArray(data.bids) || !Array.isArray(data.asks)) {
    return { bids: [], asks: [] };
  }

  let runningBidTotal = 0;
  const bids: OrderBookLevel[] = data.bids.map((b: [string, string]) => {
    const price = parseFloat(b[0]);
    const qty = parseFloat(b[1]);
    runningBidTotal += qty;
    return { price, qty, total: runningBidTotal };
  });

  let runningAskTotal = 0;
  const asks: OrderBookLevel[] = data.asks.map((a: [string, string]) => {
    const price = parseFloat(a[0]);
    const qty = parseFloat(a[1]);
    runningAskTotal += qty;
    return { price, qty, total: runningAskTotal };
  });

  return { bids, asks };
}

// Fetch recent trades
export interface LiveTrade {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export async function fetchLiveBinanceTrades(symbol: string, limit: number = 20): Promise<LiveTrade[]> {
  const cleanSymbol = (symbol.endsWith('USDT') ? symbol : `${symbol}USDT`).toUpperCase();
  let data: any[] = [];

  try {
    const res = await fetch(`https://api.binance.com/api/v3/trades?symbol=${cleanSymbol}&limit=${limit}`);
    if (res.ok) {
      data = await res.json();
    } else {
      throw new Error(`Direct trades failed: ${res.status}`);
    }
  } catch {
    try {
      const proxyRes = await fetch(`/api/binance/trades?symbol=${cleanSymbol}&limit=${limit}`);
      if (proxyRes.ok) {
        data = await proxyRes.json();
      }
    } catch (e) {
      console.warn('Failed proxy trades:', e);
    }
  }

  if (!Array.isArray(data)) return [];

  return data.map((t: any) => ({
    id: t.id,
    price: t.price,
    qty: t.qty,
    time: t.time,
    isBuyerMaker: t.isBuyerMaker,
  })).reverse();
}
