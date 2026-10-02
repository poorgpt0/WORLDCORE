import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, Time, CandlestickSeries, AreaSeries, HistogramSeries } from 'lightweight-charts';
import { Asset } from './AssetList';
import { Maximize2, Minimize2, LineChart as LineChartIcon, BarChart2, Activity } from 'lucide-react';

export function TradingChart({ asset }: { asset: Asset }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastPriceRef = useRef<number>(asset.price);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [timeframe, setTimeframe] = useState('1m');

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ 
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.clientHeight,
      });
    };

    const chart = createChart(chartContainerRef.current, {
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

    chartRef.current = chart;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // set as an overlay
    });
    volumeSeriesRef.current = volumeSeries;
    
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Chart Series Type
  useEffect(() => {
    if (!chartRef.current) return;

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current);
    }

    if (chartType === 'candlestick') {
      seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
    } else {
      seriesRef.current = chartRef.current.addSeries(AreaSeries, {
        lineColor: '#eab308',
        topColor: 'rgba(234, 179, 8, 0.4)',
        bottomColor: 'rgba(234, 179, 8, 0.0)',
        lineWidth: 2,
      });
    }

    // Generate initial historical data
    const points = [];
    const volPoints = [];
    let currentPrice = asset.price * 0.95; // start lower
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    
    // We'll generate 100 bars
    for (let i = 100; i >= 0; i--) {
      const time = (now - i * 60) as Time; // 1 minute intervals
      const open = currentPrice;
      const close = open * (1 + (Math.random() * 0.02 - 0.01));
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      currentPrice = close;
      
      points.push({ time, open, high, low, close, value: close });
      
      volPoints.push({
        time,
        value: Math.random() * 100 + 50,
        color: close >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    }

    if (chartType === 'candlestick') {
      seriesRef.current.setData(points as any);
    } else {
      seriesRef.current.setData(points.map(p => ({ time: p.time, value: p.value })));
    }
    
    volumeSeriesRef.current?.setData(volPoints);
    chartRef.current.timeScale().fitContent();

  }, [chartType, asset.symbol]);

  useEffect(() => {
    lastPriceRef.current = asset.price;
  }, [asset.symbol]);

  // Live price updates
  useEffect(() => {
    if (!seriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    const time = Math.floor(Date.now() / 1000) as Time;
    const currentPrice = asset.price;
    const open = lastPriceRef.current;
    const high = Math.max(open, currentPrice) * 1.0001; // tiny wick to show high
    const low = Math.min(open, currentPrice) * 0.9999;
    
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

  }, [asset.price, chartType]);

  const toggleFullscreen = () => {
    if (!chartContainerRef.current) return;
    if (!isFullscreen) {
      chartContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

