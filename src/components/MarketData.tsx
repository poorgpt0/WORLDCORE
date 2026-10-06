import { useState, useMemo } from 'react';
import { Asset } from './AssetList';
import { Search, ArrowUpDown, TrendingUp, TrendingDown, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '@/lib/binance';

interface MarketDataProps {
  assets: Asset[];
  onTrade?: (asset: Asset) => void;
}

export function MarketData({ assets, onTrade }: MarketDataProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Asset>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAssets = useMemo(() => {
    return [...assets]
      .filter((a) => {
        const query = search.toLowerCase();
        return a.symbol.toLowerCase().includes(query) || a.name.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        
        if (sortKey === 'symbol' || sortKey === 'name') {
          return (a[sortKey] as string).localeCompare(b[sortKey] as string) * factor;
        } else if (sortKey === 'volume') {
          // parse "32.1B", "15.4M"
          const parseVol = (v: string) => {
            const num = parseFloat(v);
            if (v.endsWith('B')) return num * 1e9;
            if (v.endsWith('M')) return num * 1e6;
            return num;
          };
          return (parseVol(a.volume) - parseVol(b.volume)) * factor;
        } else {
          return ((a[sortKey] as number) - (b[sortKey] as number)) * factor;
        }
      });
  }, [assets, search, sortKey, sortOrder]);

  const toggleSort = (key: keyof Asset) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'symbol' || key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Asset }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 text-zinc-600 ml-1" />;
    return (
      <ArrowUpDown className={`h-3 w-3 ml-1 text-yellow-500 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-zinc-100 flex items-center gap-3">
              Market Data
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Binance
            </div>
          </div>
          <p className="text-zinc-500 text-sm mt-1">Real-time cryptocurrency prices and statistics streamed live from Binance.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <Input 
            placeholder="Search Coin Name or Symbol..." 
            className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100 h-12 focus-visible:ring-yellow-500 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex-1">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => toggleSort('symbol')}>
                  <div className="flex items-center text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Asset <SortIcon columnKey="symbol" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => toggleSort('price')}>
                  <div className="flex items-center justify-end text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Price <SortIcon columnKey="price" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => toggleSort('change')}>
                  <div className="flex items-center justify-end text-xs font-bold uppercase tracking-widest text-zinc-400">
                    24h Change <SortIcon columnKey="change" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors" onClick={() => toggleSort('volume')}>
                  <div className="flex items-center justify-end text-xs font-bold uppercase tracking-widest text-zinc-400">
                    Volume <SortIcon columnKey="volume" />
                  </div>
                </th>
                <th className="p-4 text-right">
                  <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">Action</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              <AnimatePresence>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No assets found matching "{search}"
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={asset.symbol} 
                      className="hover:bg-zinc-900/30 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-sm text-yellow-500 shadow-inner border border-zinc-800 group-hover:border-yellow-500/30 transition-colors">
                            {asset.symbol[0]}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-100 text-base">{asset.symbol}</div>
                            <div className="text-xs text-zinc-500">{asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono text-zinc-100 font-bold">
                          ${formatPrice(asset.price)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={`inline-flex items-center justify-end gap-1 px-2.5 py-1 rounded-md text-sm font-mono font-bold ${asset.change >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                          {asset.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono text-zinc-400">
                          {asset.volume}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => onTrade?.(asset)}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-zinc-700 hover:border-zinc-500"
                        >
                          Trade
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
