import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '../lib/firebase';
import { AuthModal } from './AuthModal';

interface Order {
  id: string;
  time: string;
  asset: string;
  type: 'Market' | 'Limit';
  side: 'Buy' | 'Sell';
  price: number;
  amount: number;
  total: number;
  status: 'Filled' | 'Pending' | 'Cancelled';
}

const MOCK_ORDERS: Order[] = [
  { id: '1', time: '2024-04-13 10:24:12', asset: 'BTC', type: 'Market', side: 'Buy', price: 64231.50, amount: 0.05, total: 3211.58, status: 'Filled' },
  { id: '2', time: '2024-04-13 09:15:45', asset: 'ETH', type: 'Limit', side: 'Sell', price: 3500.00, amount: 1.2, total: 4200.00, status: 'Pending' },
  { id: '3', time: '2024-04-12 18:30:00', asset: 'SOL', type: 'Market', side: 'Buy', price: 142.10, amount: 10, total: 1421.00, status: 'Filled' },
  { id: '4', time: '2024-04-12 14:20:12', asset: 'BNB', type: 'Limit', side: 'Sell', price: 600.00, amount: 5, total: 3000.00, status: 'Cancelled' },
];

export function OrderHistory({ isVerified }: { isVerified: boolean }) {
  const user = auth.currentUser;
  const showLock = !user || !isVerified;

  return (
    <Card className="bg-zinc-950 border-zinc-800 p-0 overflow-hidden relative min-h-[400px]">
      {showLock && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
            <Lock className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-zinc-100 font-bold mb-2">
            {!user ? 'Login Required' : 'Security Verification'}
          </p>
          <p className="text-zinc-400 text-sm mb-6 max-w-xs">
            {!user ? 'Sign in to view your orders and trade history' : 'Complete verification to view your private trading data'}
          </p>
          {!user && <AuthModal />}
        </div>
      )}

      <Tabs defaultValue="open" className="w-full">
        <div className="px-6 pt-4 border-b border-zinc-900">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger 
              value="open" 
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-yellow-500 data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 rounded-none px-0 pb-4 text-xs font-bold uppercase tracking-wider text-zinc-500"
            >
              Open Orders (1)
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-yellow-500 data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 rounded-none px-0 pb-4 text-xs font-bold uppercase tracking-wider text-zinc-500"
            >
              Order History
            </TabsTrigger>
            <TabsTrigger 
              value="trade" 
              className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-yellow-500 data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 rounded-none px-0 pb-4 text-xs font-bold uppercase tracking-wider text-zinc-500"
            >
              Trade History
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="open" className="m-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-b border-zinc-900">
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Asset</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Side</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {MOCK_ORDERS.filter(o => o.status === 'Pending').map((order) => (
                  <tr key={order.id} className="border-b border-zinc-900/50 group hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[11px]">{order.time}</td>
                    <td className="px-6 py-4 font-bold text-zinc-100">{order.asset}/USDT</td>
                    <td className="px-6 py-4 text-zinc-400">{order.type}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        order.side === 'Buy' ? "text-green-500" : "text-red-500"
                      )}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-300">${order.price.toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono text-zinc-300">{order.amount}</td>
                    <td className="px-6 py-4 font-mono text-zinc-300">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-yellow-500">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{order.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
                {MOCK_ORDERS.filter(o => o.status === 'Pending').length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center">
                      <History className="h-10 w-10 text-zinc-900 mx-auto mb-4" />
                      <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">No open orders</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 border-b border-zinc-900">
                  <th className="px-6 py-4 font-bold">Time</th>
                  <th className="px-6 py-4 font-bold">Asset</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Side</th>
                  <th className="px-6 py-4 font-bold">Price</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Total</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {MOCK_ORDERS.filter(o => o.status !== 'Pending').map((order) => (
                  <tr key={order.id} className="border-b border-zinc-900/50 group hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4 text-zinc-500 font-mono text-[11px]">{order.time}</td>
                    <td className="px-6 py-4 font-bold text-zinc-100">{order.asset}/USDT</td>
                    <td className="px-6 py-4 text-zinc-400">{order.type}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold",
                        order.side === 'Buy' ? "text-green-500" : "text-red-500"
                      )}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-300">${order.price.toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono text-zinc-300">{order.amount}</td>
                    <td className="px-6 py-4 font-mono text-zinc-300">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-1.5",
                        order.status === 'Filled' ? "text-green-500" : "text-zinc-500"
                      )}>
                        {order.status === 'Filled' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">{order.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
