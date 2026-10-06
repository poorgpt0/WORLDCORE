import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Search, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/binance';

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  high24h?: number;
  low24h?: number;
}

export function AssetList({ assets, onSelect }: { assets: Asset[], onSelect: (asset: Asset) => void }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'symbol' | 'price' | 'change' | 'volume'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const parseVolume = (vol: string) => {
    if (!vol) return 0;
    const num = parseFloat(vol);
    if (vol.endsWith('B') || vol.endsWith('b')) return num * 1e9;
    if (vol.endsWith('m') || vol.endsWith('M')) return num * 1e6;
    if (vol.endsWith('k') || vol.endsWith('K')) return num * 1e3;
    return num;
  };

  const filteredAssets = useMemo(() => {
    return assets
      .filter(a => 
        a.symbol.toLowerCase().includes(search.toLowerCase()) || 
        a.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * factor;
        if (sortKey === 'volume') return (parseVolume(a.volume) - parseVolume(b.volume)) * factor;
        return (a[sortKey] - b[sortKey]) * factor;
      });
  }, [assets, search, sortKey, sortOrder]);

  const toggleSort = (key: 'symbol' | 'price' | 'change' | 'volume') => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input 
            placeholder="Search assets..." 
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-yellow-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">
          <button onClick={() => toggleSort('symbol')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            Asset <ArrowUpDown className="h-3 w-3" />
          </button>
          <div className="flex items-center gap-4 text-right">
            <button onClick={() => toggleSort('volume')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
              Vol <ArrowUpDown className="h-3 w-3" />
            </button>
            <button onClick={() => toggleSort('price')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
              Price <ArrowUpDown className="h-3 w-3" />
            </button>
            <button onClick={() => toggleSort('change')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
              24h % <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredAssets.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => onSelect(asset)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900 transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-yellow-500 group-hover:scale-110 transition-transform">
                  {asset.symbol[0]}
                </div>
                <div>
                  <div className="font-semibold text-zinc-100">{asset.symbol}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{asset.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-xs text-zinc-400">
                    {asset.volume}
                  </div>
                </div>
                <div className="text-right min-w-[70px]">
                  <div className="font-mono text-sm text-zinc-100 font-bold">
                    ${formatPrice(asset.price)}
                  </div>
                  <div className={`text-[10px] font-mono flex items-center justify-end gap-1 ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {asset.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 bg-zinc-900/30 border-t border-zinc-800">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          <span>Total Assets</span>
          <span className="text-zinc-300">{filteredAssets.length}</span>
        </div>
      </div>
    </Card>
  );
}
