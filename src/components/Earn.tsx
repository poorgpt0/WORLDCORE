import { useState } from 'react';
import { motion } from 'motion/react';
import { Pickaxe, TrendingUp, Vault, Coins, Flame, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const STAKING_PRODUCTS = [
  { symbol: 'USDT', name: 'Tether USD', apr: '12.5%', duration: 'Flexible', type: 'Simple Earn' },
  { symbol: 'BNB', name: 'BNB', apr: '8.4%', duration: '120 Days', type: 'Locked Staking', hot: true },
  { symbol: 'ETH', name: 'Ethereum', apr: '4.2%', duration: 'Flexible', type: 'ETH 2.0' },
  { symbol: 'SOL', name: 'Solana', apr: '7.8%', duration: '60 Days', type: 'Locked Staking' },
  { symbol: 'DOT', name: 'Polkadot', apr: '14.1%', duration: '90 Days', type: 'Locked Staking', hot: true },
  { symbol: 'USDC', name: 'USDC', apr: '10.0%', duration: 'Flexible', type: 'Simple Earn' },
];

export function Earn() {
  const [filter, setFilter] = useState<'all' | 'flexible' | 'locked'>('all');

  const filteredProducts = STAKING_PRODUCTS.filter(p => {
    if (filter === 'flexible') return p.duration === 'Flexible';
    if (filter === 'locked') return p.duration !== 'Flexible';
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-6 space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-zinc-900 to-zinc-950 border border-yellow-500/20 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 opacity-20 pointer-events-none">
          <Vault className="w-96 h-96 text-yellow-500" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-6">
            <Flame className="w-4 h-4" /> High Yield
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-zinc-100 uppercase tracking-tight mb-4">
            Maximize Your <span className="text-yellow-500">Crypto Returns</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
            Put your idle assets to work. Earn daily rewards with our industry-leading staking and yield products. Zero fees, maximum security.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 px-8">
              Start Earning
            </Button>
            <Button variant="outline" className="border-zinc-700 text-zinc-300 h-12 px-8">
              Auto-Invest Plan
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Launchpool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 bg-zinc-950 border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-yellow-500/10 transition-colors" />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pickaxe className="h-5 w-5 text-yellow-500" />
              <h3 className="font-bold text-zinc-100">Launchpool / Farming</h3>
            </div>
            <h2 className="text-2xl font-black italic mb-2">New Token: NEXUS (NEX)</h2>
            <p className="text-zinc-500 text-sm max-w-md">Stake BNB or FDUSD to farm NEX tokens before they list on the exchange.</p>
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Farming APY</p>
              <p className="text-3xl font-black text-green-500">145.2%</p>
            </div>
            <Button className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold">
              Stake Now <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>

        <Card className="col-span-1 bg-zinc-950 border-zinc-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-blue-500" />
              <h3 className="font-bold text-zinc-100">My Yield Portfolio</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Value Locked</p>
                <div className="text-2xl font-mono font-bold">$0.00</div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Est. 30D Profit</p>
                <div className="text-lg font-mono text-green-500">+$0.00</div>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-6 border-zinc-800 text-zinc-400">
            View History
          </Button>
        </Card>
      </div>

      {/* Yield Products Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-bold text-zinc-100">All Earn Products</h3>
          <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilter('flexible')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'flexible' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Flexible
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${filter === 'locked' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Locked
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Asset</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Est. APR</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Duration</th>
                <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Type</th>
                <th className="p-4 text-right text-xs font-bold text-zinc-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredProducts.map((product, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={`${product.symbol}-${product.type}`} 
                  className="hover:bg-zinc-900/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-xs text-yellow-500 border border-zinc-800">
                        {product.symbol[0]}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-100 flex items-center gap-2">
                          {product.symbol}
                          {product.hot && <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">Hot</span>}
                        </div>
                        <div className="text-xs text-zinc-500">{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-green-500 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" /> {product.apr}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className={`text-sm font-medium ${product.duration === 'Flexible' ? 'text-zinc-300' : 'text-yellow-500'}`}>
                      {product.duration}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-zinc-400">
                      {product.type}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-9 px-6 text-xs">
                      Subscribe
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
