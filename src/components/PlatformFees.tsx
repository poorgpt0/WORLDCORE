import { CreditCard, Zap, TrendingDown, ArrowRight } from 'lucide-react';

export function PlatformFees() {
  return (
    <div className="max-w-5xl mx-auto w-full py-8 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-tight">
          Transparent <span className="text-yellow-500">Fees</span>
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          We believe in fair, predictable pricing. Enjoy industry-leading low fees for trading and completely free fiat deposits via official channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
            <Zap className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Spot Trading</h3>
          <p className="text-4xl font-black text-yellow-500 mb-2">0.10%</p>
          <p className="text-zinc-500 text-sm">Maker / Taker fee for standard users. Use BNB for a 25% discount.</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
            <TrendingDown className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Futures Trading</h3>
          <p className="text-4xl font-black text-green-500 mb-2">0.05%</p>
          <p className="text-zinc-500 text-sm">Taker fee for USDⓈ-M futures contracts. 0.02% Maker fee.</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
            <CreditCard className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Fiat Deposits</h3>
          <p className="text-4xl font-black text-blue-500 mb-2">Free</p>
          <p className="text-zinc-500 text-sm">Zero fees for bank transfers and official e-wallet partnerships.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-12 text-sm">
        <div className="p-6 border-b border-zinc-800 bg-zinc-950">
          <h3 className="text-xl font-bold text-zinc-100">VIP Tier Discounts</h3>
          <p className="text-zinc-500 mt-1">Scale your volume, lower your fees.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="p-4 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Level</th>
                <th className="p-4 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">30d Volume (BUSD)</th>
                <th className="p-4 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Spot Maker / Taker</th>
                <th className="p-4 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Futures Maker / Taker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              <tr className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-4 text-zinc-100 font-bold">Standard</td>
                <td className="p-4 text-zinc-500 font-mono">&lt; 1,000,000</td>
                <td className="p-4 font-mono text-zinc-300">0.1000% / 0.1000%</td>
                <td className="p-4 font-mono text-zinc-300">0.0200% / 0.0500%</td>
              </tr>
              <tr className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-4 text-yellow-500 font-bold flex items-center gap-2">VIP 1</td>
                <td className="p-4 text-zinc-500 font-mono">&ge; 1,000,000</td>
                <td className="p-4 font-mono text-zinc-300">0.0900% / 0.1000%</td>
                <td className="p-4 font-mono text-zinc-300">0.0160% / 0.0400%</td>
              </tr>
              <tr className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-4 text-yellow-500 font-bold flex items-center gap-2">VIP 2</td>
                <td className="p-4 text-zinc-500 font-mono">&ge; 5,000,000</td>
                <td className="p-4 font-mono text-zinc-300">0.0800% / 0.1000%</td>
                <td className="p-4 font-mono text-zinc-300">0.0140% / 0.0350%</td>
              </tr>
              <tr className="hover:bg-zinc-800/20 transition-colors">
                <td className="p-4 text-yellow-500 font-bold flex items-center gap-2">VIP 3</td>
                <td className="p-4 text-zinc-500 font-mono">&ge; 20,000,000</td>
                <td className="p-4 font-mono text-zinc-300">0.0700% / 0.1000%</td>
                <td className="p-4 font-mono text-zinc-300">0.0120% / 0.0320%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
