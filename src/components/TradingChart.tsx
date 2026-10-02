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
import { Maximize2, Minimize2, LineChart as LineChartIcon, BarChart2, Activity } from 'lucide-react';

export function TradingChart({ asset }: { asset: Asset }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastPriceRef = useRef<number>(asset?.price || 100);
  const lastBarTimeRef = useRef<number>(0);
  const currentChartTypeRef = useRef<'candlestick' | 'area'>('candlestick');
  const isDisposedRef = useRef<boolean>(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState('1m');

  currentChartTypeRef.current = chartType;

  // Helper to generate bars for a symbol
  const generateHistoryData = useCallback((basePrice: number) => {
    const validBase = typeof basePrice === 'number' && !isNaN(basePrice) && basePrice > 0 ? basePrice : 100;
    const points: Array<{ time: Time; open: number; high: number; low: number; close: number; value: number }> = [];
    const volPoints: Array<{ time: Time; value: number; color: string }> = [];
    
    let currentPrice = validBase * 0.95;
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 100; i >= 0; i--) {
      const barTime = (now - i * 60) as Time;
      const open = Math.max(0.0001, currentPrice);
      const close = Math.max(0.0001, open * (1 + (Math.random() * 0.02 - 0.01)));
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.max(0.0001, Math.min(open, close) * (1 - Math.random() * 0.01));
      
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

    // Populate initial data
    try {
      const { points, volPoints } = generateHistoryData(asset?.price || 100);
      if (priceSeries) {
        if (currentChartTypeRef.current === 'candlestick') {
          priceSeries.setData(points as any);
        } else {
          priceSeries.setData(points.map(p => ({ time: p.time, value: p.value })));
        }
      }
      if (volumeSeries) {
        volumeSeries.setData(volPoints);
      }
      chart.timeScale().fitContent();
    } catch (e) {
      console.warn("Error setting initial chart data:", e);
    }

    // ResizeObserver for container resizing
    const resizeObserver = new ResizeObserver((entries) => {
      if (isDisposedRef.current || !chartRef.current) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          try {
            chartRef.current.applyOptions({ width, height });
          } catch (e) {
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
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [generateHistoryData]); // mount once per container

  // Handle asset.symbol change: update data without destroying chart
  useEffect(() => {
    if (isDisposedRef.current || !chartRef.current || !seriesRef.current) return;

    try {
      const { points, volPoints } = generateHistoryData(asset?.price || 100);
      if (chartType === 'candlestick') {
        seriesRef.current.setData(points as any);
      } else {
        seriesRef.current.setData(points.map(p => ({ time: p.time, value: p.value })));
      }
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volPoints);
      }
      chartRef.current.timeScale().fitContent();
    } catch (e) {
      console.warn("Error updating data on asset change:", e);
    }
  }, [asset?.symbol, generateHistoryData]);

  // Handle chartType switch: safely swap price series
  useEffect(() => {
    if (isDisposedRef.current || !chartRef.current) return;

    const chart = chartRef.current;
    const oldSeries = seriesRef.current;

    try {
      if (oldSeries) {
        chart.removeSeries(oldSeries);
      }
    } catch (e) {
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
      const { points } = generateHistoryData(asset?.price || 100);
      if (chartType === 'candlestick') {
        newSeries.setData(points as any);
      } else {
        newSeries.setData(points.map(p => ({ time: p.time, value: p.value })));
      }
    } catch (e) {
      console.warn("Error switching chart series type:", e);
    }
  }, [chartType, generateHistoryData]);

  // Track latest asset price
  useEffect(() => {
    if (typeof asset?.price === 'number' && !isNaN(asset.price) && asset.price > 0) {
      lastPriceRef.current = asset.price;
    }
  }, [asset?.symbol, asset?.price]);

  // Live price updates
  useEffect(() => {
    if (isDisposedRef.current || !seriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;
    if (typeof asset?.price !== 'number' || isNaN(asset.price) || asset.price <= 0) return;

    try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const time = Math.max(lastBarTimeRef.current, nowSeconds) as Time;
      lastBarTimeRef.current = time as number;

      const currentPrice = asset.price;
      const open = typeof lastPriceRef.current === 'number' && !isNaN(lastPriceRef.current) && lastPriceRef.current > 0
        ? lastPriceRef.current
        : currentPrice;
      const high = Math.max(open, currentPrice) * 1.0001;
      const low = Math.max(0.0001, Math.min(open, currentPrice) * 0.9999);
      
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

      volumeSeriesRef.current.update({
        time,
        value: Math.random() * 150 + 50,
        color: currentPrice >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    } catch (err) {
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

  return (
    <div className={`w-full bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col shadow-2xl shadow-black/50 ${isFullscreen ? 'h-full fixed inset-0 z-50 rounded-none border-none p-4' : 'h-[450px] p-4 sm:p-6 lg:p-8'}`}>
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-8 shrink-0 flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-zinc-100 tracking-tighter">{asset.symbol}/USDT</h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{asset.name} Perpetual</span>
          </div>
          <div className="flex flex-col">
            <span className={`text-2xl font-mono font-bold ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-mono ${asset.change >= 0 ? 'text-green-500/70' : 'text-red-500/70'}`}>
              {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
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
          <div className="hidden sm:flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 overflow-x-auto no-scrollbar">
            {['1s', '1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  timeframe === tf ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="flex-1 w-full min-h-[250px] relative cursor-crosshair"
      />
      
      <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h High</span>
            <span className="text-[10px] font-mono text-zinc-300">{(asset.price * 1.05).toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h Low</span>
            <span className="text-[10px] font-mono text-zinc-300">{(asset.price * 0.95).toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">24h Volume</span>
            <span className="text-[10px] font-mono text-zinc-300">{asset.volume} USDT</span>
          </div>
        </div>
        <div className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest flex flex-col items-end">
          <span>Live Market Data Feed</span>
          <span className="text-zinc-800">Scroll to zoom, drag to pan</span>
        </div>
      </div>
    </div>
  );
}

