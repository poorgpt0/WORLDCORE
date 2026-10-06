import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  ColorType, 
  CrosshairMode, 
  IChartApi, 
  ISeriesApi, 
  Time, 
  CandlestickSeries, 
  AreaSeries, 
  HistogramSeries 
} from 'lightweight-charts';
import { Asset } from './AssetList';
import { Maximize2, Minimize2, BarChart2, Activity, Wifi, Bell } from 'lucide-react';
import { fetchLiveBinanceKlines, KlinePoint, VolumePoint, formatPrice } from '@/lib/binance';

export function TradingChart({
  asset,
  onOpenPriceAlert,
  activeAlertCount = 0,
}: {
  asset: Asset;
  onOpenPriceAlert?: (asset: Asset) => void;
  activeAlertCount?: number;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastPriceRef = useRef<number>(asset?.price || 100);
  const lastBarTimeRef = useRef<number>(0);
  const currentChartTypeRef = useRef<'candlestick' | 'area'>('candlestick');
  const isDisposedRef = useRef<boolean>(false);
  const lastWsTickTimeRef = useRef<number>(0);
  const cachedPointsRef = useRef<KlinePoint[]>([]);
  const cachedVolPointsRef = useRef<VolumePoint[]>([]);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState('1m');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  currentChartTypeRef.current = chartType;

  // Fallback synthetic data generator if network is completely offline
  const generateFallbackData = useCallback((basePrice: number) => {
    const validBase = typeof basePrice === 'number' && !isNaN(basePrice) && basePrice > 0 ? basePrice : 100;
    const points: KlinePoint[] = [];
    const volPoints: VolumePoint[] = [];
    
    let currentPrice = validBase * 0.98;
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 80; i >= 0; i--) {
      const barTime = (now - i * 60) as Time;
      const open = Math.max(0.00000001, currentPrice);
      const close = Math.max(0.00000001, open * (1 + (Math.random() * 0.008 - 0.004)));
      const high = Math.max(open, close) * (1 + Math.random() * 0.004);
      const low = Math.max(0.00000001, Math.min(open, close) * (1 - Math.random() * 0.004));
      
      currentPrice = close;
      points.push({ time: barTime, open, high, low, close, value: close });
      volPoints.push({
        time: barTime,
        value: Math.random() * 100 + 50,
        color: close >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    }

    if (points.length > 0) {
      lastBarTimeRef.current = points[points.length - 1].time as number;
    }

    return { points, volPoints };
  }, []);

  // Initialize and mount chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    isDisposedRef.current = false;

    const initialWidth = container.clientWidth > 0 ? container.clientWidth : 600;
    const initialHeight = container.clientHeight > 0 ? container.clientHeight : 350;

    let chart: IChartApi;
    try {
      chart = createChart(container, {
        width: initialWidth,
        height: initialHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#A1A1AA', // zinc-400
        },
        grid: {
          vertLines: { color: '#27272a' }, // zinc-800
          horzLines: { color: '#27272a' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#52525b',
            labelBackgroundColor: '#18181b',
          },
          horzLine: {
            color: '#52525b',
            labelBackgroundColor: '#18181b',
          },
        },
        timeScale: {
          borderColor: '#27272a',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#27272a',
          autoScale: true,
        },
      });
    } catch (e) {
      console.warn("Failed to create lightweight chart instance:", e);
      return;
    }

    chartRef.current = chart;

    // Create volume series
    let volumeSeries: ISeriesApi<"Histogram"> | null = null;
    try {
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
      });
      volumeSeriesRef.current = volumeSeries;

      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    } catch (e) {
      console.warn("Error adding volume series:", e);
    }

    // Create price series
    let priceSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null = null;
    try {
      if (currentChartTypeRef.current === 'candlestick') {
        priceSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else {
        priceSeries = chart.addSeries(AreaSeries, {
          lineColor: '#eab308',
          topColor: 'rgba(234, 179, 8, 0.4)',
          bottomColor: 'rgba(234, 179, 8, 0.0)',
          lineWidth: 2,
        });
      }
      seriesRef.current = priceSeries;
    } catch (e) {
      console.warn("Error adding price series:", e);
    }

    // ResizeObserver for responsive container
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposedRef.current || !chartRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          try {
            chartRef.current.applyOptions({ width, height });
          } catch {
            // suppress transient resize errors
          }
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      isDisposedRef.current = true;
      resizeObserver.disconnect();
      
      const currentChart = chartRef.current;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      chartRef.current = null;

      if (currentChart) {
        try {
          currentChart.remove();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // Fetch real Binance candlestick historical data when asset or timeframe changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingHistory(true);

    const intervalParam = timeframe === '1s' ? '1m' : timeframe;

    fetchLiveBinanceKlines(asset.symbol, intervalParam, 120)
      .then(({ points, volPoints }) => {
        if (isCancelled || isDisposedRef.current || !chartRef.current) return;

        let finalPoints = points;
        let finalVolPoints = volPoints;

        if (finalPoints.length === 0) {
          const fallback = generateFallbackData(asset?.price || 100);
          finalPoints = fallback.points;
          finalVolPoints = fallback.volPoints;
        }

        cachedPointsRef.current = finalPoints;
        cachedVolPointsRef.current = finalVolPoints;

        if (finalPoints.length > 0) {
          const lastPoint = finalPoints[finalPoints.length - 1];
          lastBarTimeRef.current = lastPoint.time as number;
          lastPriceRef.current = lastPoint.close;
        }

        try {
          if (seriesRef.current) {
            if (currentChartTypeRef.current === 'candlestick') {
              (seriesRef.current as ISeriesApi<"Candlestick">).setData(finalPoints as any);
            } else {
              (seriesRef.current as ISeriesApi<"Area">).setData(finalPoints.map(p => ({ time: p.time, value: p.value })));
            }
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(finalVolPoints);
          }
          chartRef.current.timeScale().fitContent();
        } catch (e) {
          console.warn("Error setting Binance kline data:", e);
        }
      })
      .catch((err) => {
        console.warn("Failed to load Binance klines, using fallback:", err);
        if (isCancelled || isDisposedRef.current || !chartRef.current) return;
        const fallback = generateFallbackData(asset?.price || 100);
        cachedPointsRef.current = fallback.points;
        cachedVolPointsRef.current = fallback.volPoints;
        if (seriesRef.current) {
          if (currentChartTypeRef.current === 'candlestick') {
            (seriesRef.current as ISeriesApi<"Candlestick">).setData(fallback.points as any);
          } else {
            (seriesRef.current as ISeriesApi<"Area">).setData(fallback.points.map(p => ({ time: p.time, value: p.value })));
          }
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingHistory(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [asset?.symbol, timeframe, generateFallbackData]);

  // Connect to Binance live kline stream for the active symbol and timeframe
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isMounted = true;
    const intervalParam = timeframe === '1s' ? '1m' : timeframe;
    const streamName = `${asset.symbol.toLowerCase()}usdt@kline_${intervalParam}`;

    const connectKlineWS = () => {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`);

        ws.onopen = () => {
          if (isMounted) setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted || isDisposedRef.current || !seriesRef.current || !volumeSeriesRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.e === 'kline' && data.k) {
              const k = data.k;
              const timeSec = Math.floor(k.t / 1000) as Time;
              const open = parseFloat(k.o);
              const high = parseFloat(k.h);
              const low = parseFloat(k.l);
              const close = parseFloat(k.c);
              const vol = parseFloat(k.v);

              if (isNaN(close) || close <= 0) return;

              lastWsTickTimeRef.current = Date.now();
              lastBarTimeRef.current = timeSec as number;
              lastPriceRef.current = close;

              if (currentChartTypeRef.current === 'candlestick') {
                (seriesRef.current as ISeriesApi<"Candlestick">).update({
                  time: timeSec,
                  open,
                  high,
                  low,
                  close,
                });
              } else {
                (seriesRef.current as ISeriesApi<"Area">).update({
                  time: timeSec,
                  value: close,
                });
              }

              volumeSeriesRef.current.update({
                time: timeSec,
                value: vol,
                color: close >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              });
            }
          } catch {
            // ignore malformed ws messages
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsWsConnected(false);
            // Reconnect after 3 seconds
            setTimeout(connectKlineWS, 3000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.warn("WebSocket init error:", err);
      }
    };

    connectKlineWS();

    return () => {
      isMounted = false;
      setIsWsConnected(false);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [asset?.symbol, timeframe]);

  // Handle chartType switch: safely swap price series without losing data
  useEffect(() => {
    if (isDisposedRef.current || !chartRef.current) return;

    const chart = chartRef.current;
    const oldSeries = seriesRef.current;

    try {
      if (oldSeries) {
        chart.removeSeries(oldSeries);
      }
    } catch {
      // old series might already be removed
    }
    seriesRef.current = null;

    try {
      let newSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;
      if (chartType === 'candlestick') {
        newSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      } else {
        newSeries = chart.addSeries(AreaSeries, {
          lineColor: '#eab308',
          topColor: 'rgba(234, 179, 8, 0.4)',
          bottomColor: 'rgba(234, 179, 8, 0.0)',
          lineWidth: 2,
        });
      }

      seriesRef.current = newSeries;
      const points = cachedPointsRef.current;
      if (points.length > 0) {
        if (chartType === 'candlestick') {
          newSeries.setData(points as any);
        } else {
          newSeries.setData(points.map(p => ({ time: p.time, value: p.value })));
        }
      }
    } catch (e) {
      console.warn("Error switching chart series type:", e);
    }
  }, [chartType]);

  // Fallback update on asset.price if WebSocket kline stream hasn't ticked recently
  useEffect(() => {
    if (isDisposedRef.current || !seriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;
    if (typeof asset?.price !== 'number' || isNaN(asset.price) || asset.price <= 0) return;

    // If we received a real WS tick in the last 2 seconds, let the WS handle live candle precision
    if (Date.now() - lastWsTickTimeRef.current < 2000) return;

    try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const time = Math.max(lastBarTimeRef.current, nowSeconds) as Time;
      lastBarTimeRef.current = time as number;

      const currentPrice = asset.price;
      const open = typeof lastPriceRef.current === 'number' && !isNaN(lastPriceRef.current) && lastPriceRef.current > 0
        ? lastPriceRef.current
        : currentPrice;
      const high = Math.max(open, currentPrice);
      const low = Math.min(open, currentPrice);
      
      lastPriceRef.current = currentPrice;

      if (chartType === 'candlestick') {
        (seriesRef.current as ISeriesApi<"Candlestick">).update({
          time,
          open,
          high,
          low,
          close: currentPrice,
        });
      } else {
        (seriesRef.current as ISeriesApi<"Area">).update({
          time,
          value: currentPrice,
        });
      }
    } catch {
      // Ignore sequencing or transient chart update errors
    }
  }, [asset?.price, chartType]);

  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;
    if (!isFullscreen) {
      chartContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!asset) return null;

  const displayHigh = asset.high24h ? formatPrice(asset.high24h) : formatPrice(asset.price * 1.02);
  const displayLow = asset.low24h ? formatPrice(asset.low24h) : formatPrice(asset.price * 0.98);

  return (
    <div className={`w-full bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col shadow-2xl shadow-black/50 ${isFullscreen ? 'h-full fixed inset-0 z-50 rounded-none border-none p-4' : 'h-[460px] p-4 sm:p-6'}`}>
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 shrink-0 flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black text-zinc-100 tracking-tighter">{asset.symbol}/USDT</h2>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                {isWsConnected ? 'Binance Live' : 'Binance Syncing'}
              </div>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{asset.name} Perpetual</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-mono font-bold ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${formatPrice(asset.price)}
            </span>
            <span className={`text-xs font-mono font-bold ${asset.change >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
              {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Chart Type Toggle */}
          <div className="flex bg-zinc-900/80 rounded-lg p-1 border border-zinc-800">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'area' ? 'bg-zinc-800 text-yellow-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Area Chart"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-1.5 rounded-md transition-colors ${chartType === 'candlestick' ? 'bg-zinc-800 text-yellow-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Candlestick Chart"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>

          {/* Timeframes */}
          <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 overflow-x-auto no-scrollbar">
            {['1s', '1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  timeframe === tf ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 font-extrabold' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {onOpenPriceAlert && (
            <button
              type="button"
              onClick={() => onOpenPriceAlert(asset)}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-yellow-500/40 text-zinc-300 hover:text-yellow-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title={`Set price alert for ${asset.symbol}/USDT`}
            >
              <Bell className="w-3.5 h-3.5 text-yellow-500" />
              <span>Alert</span>
              {activeAlertCount > 0 && (
                <span className="font-mono text-[10px] text-yellow-500">({activeAlertCount})</span>
              )}
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="relative flex-1 w-full min-h-[260px]">
        {isLoadingHistory && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-xs font-mono text-yellow-500">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
              Loading {asset.symbol} live Binance klines...
            </div>
          </div>
        )}
        <div 
          ref={chartContainerRef} 
          className="w-full h-full cursor-crosshair"
        />
      </div>
      
      <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex gap-4 sm:gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h High</span>
            <span className="text-[11px] font-mono font-bold text-zinc-300">${displayHigh}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h Low</span>
            <span className="text-[11px] font-mono font-bold text-zinc-300">${displayLow}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h Volume</span>
            <span className="text-[11px] font-mono font-bold text-zinc-300">{asset.volume} USDT</span>
          </div>
        </div>
        <div className="text-[9px] text-zinc-500 font-mono font-medium flex items-center gap-2">
          <Wifi className={`w-3 h-3 ${isWsConnected ? 'text-green-500' : 'text-yellow-500'}`} />
          <span>Binance Spot Stream</span>
        </div>
      </div>
    </div>
  );
}
