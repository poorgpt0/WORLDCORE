import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset } from './AssetList';
import { Wallet, Lock, Clock, BookOpen, Activity } from 'lucide-react';
import { auth } from '../lib/firebase';
import { AuthModal } from './AuthModal';
import { cn } from '@/lib/utils';
import { useAccount, useBalance } from 'wagmi';
import { formatPrice, fetchLiveBinanceTrades, fetchLiveBinanceDepth, OrderBookLevel, LiveTrade } from '@/lib/binance';

interface Trade {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export function TradingPanel({ asset, isVerified }: { asset: Asset, isVerified: boolean }) {
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [leverage, setLeverage] = useState(1);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pse');
  
  interface PendingOrder {
    id: string;
    type: 'buy' | 'sell';
    symbol: string;
    amount: string;
    price: string;
    leverage: number;
    time: number;
  }
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

  const handlePlaceOrder = (type: 'buy' | 'sell') => {
    if (orderType === 'market') {
      setAmount('');
    } else {
      if (!amount || !limitPrice) return;
      const newOrder: PendingOrder = {
        id: Math.random().toString(36).substring(7),
        type,
        symbol: asset.symbol,
        amount,
        price: limitPrice,
        leverage,
        time: Date.now()
      };
      setPendingOrders(prev => [newOrder, ...prev]);
      setAmount('');
      setLimitPrice('');
    }
  };

  const [trades, setTrades] = useState<Trade[]>([]);
  const [depth, setDepth] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({ bids: [], asks: [] });
  const [marketView, setMarketView] = useState<'trades' | 'orderbook'>('trades');

  // Fetch initial trades and depth immediately on asset change
  useEffect(() => {
    let isMounted = true;

    fetchLiveBinanceTrades(asset.symbol, 20).then((liveTrades) => {
      if (isMounted && liveTrades.length > 0) {
        setTrades(liveTrades);
      }
    });

    fetchLiveBinanceDepth(asset.symbol, 10).then((liveDepth) => {
      if (isMounted) {
        setDepth(liveDepth);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [asset.symbol]);

  // Connect to Binance aggregate trades & depth stream
  useEffect(() => {
    let tradeWs: WebSocket | null = null;
    let depthWs: WebSocket | null = null;
    let isMounted = true;

    const connectTradeWS = () => {
      try {
        tradeWs = new WebSocket(`wss://stream.binance.com:9443/ws/${asset.symbol.toLowerCase()}usdt@aggTrade`);

        tradeWs.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.e === 'aggTrade') {
              const newTrade = {
                id: data.a,
                price: data.p,
                qty: data.q,
                time: data.T,
                isBuyerMaker: data.m
              };
              setTrades(prev => [newTrade, ...prev].slice(0, 30));
            }
          } catch {
            // ignore
          }
        };

        tradeWs.onclose = () => {
          if (isMounted) {
            setTimeout(connectTradeWS, 3000);
          }
        };
      } catch {
        // ignore
      }
    };

    const connectDepthWS = () => {
      try {
        depthWs = new WebSocket(`wss://stream.binance.com:9443/ws/${asset.symbol.toLowerCase()}usdt@depth10@1000ms`);

        depthWs.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (Array.isArray(data.bids) && Array.isArray(data.asks)) {
              let runningBidTotal = 0;
              const bids = data.bids.map((b: [string, string]) => {
                const price = parseFloat(b[0]);
                const qty = parseFloat(b[1]);
                runningBidTotal += qty;
                return { price, qty, total: runningBidTotal };
              });
              let runningAskTotal = 0;
              const asks = data.asks.map((a: [string, string]) => {
                const price = parseFloat(a[0]);
                const qty = parseFloat(a[1]);
                runningAskTotal += qty;
                return { price, qty, total: runningAskTotal };
              });
              setDepth({ bids, asks });
            }
          } catch {
            // ignore
          }
        };

        depthWs.onclose = () => {
          if (isMounted) {
            setTimeout(connectDepthWS, 3000);
          }
        };
      } catch {
        // ignore
      }
    };

    connectTradeWS();
    connectDepthWS();

    return () => {
      isMounted = false;
      if (tradeWs) tradeWs.close();
      if (depthWs) depthWs.close();
    };
  }, [asset.symbol]);

  const user = auth.currentUser;
  const showLock = !user || !isVerified;

  const { address } = useAccount();
  const { data: balanceData } = useBalance({ address });

  // Format real wallet balance if connected, otherwise default back to paper balance
  const displayBalance = balanceData 
    ? `${(Number(balanceData.value) / 10**balanceData.decimals).toFixed(4)} ${balanceData.symbol}`
    : '12,450.00 USDT';

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 h-full relative overflow-hidden flex flex-col">
      {showLock && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
            <Lock className="h-6 w-6 text-yellow-500" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100 mb-2">
            {!user ? 'Login Required' : 'Security Verification'}
          </h3>
          <p className="text-sm text-zinc-400 mb-6">
            {!user 
              ? `Please sign in to start trading ${asset.name} and manage your portfolio.`
              : 'Please complete the security verification to unlock trading features.'}
          </p>
          {!user && <AuthModal />}
        </div>
      )}
      
      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 mb-6">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs">Buy</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">Sell</TabsTrigger>
            <TabsTrigger value="deposit" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black font-medium text-xs">Deposit</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setOrderType('market')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                orderType === 'market' ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              Market
            </button>
            <button 
              onClick={() => setOrderType('limit')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                orderType === 'limit' ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              Limit
            </button>
          </div>

          <TabsContent value="buy" className="flex flex-col gap-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Price</span>
                  <span>USDT</span>
                </div>
                <Input 
                  type="text" 
                  value={orderType === 'market' ? formatPrice(asset.price) : limitPrice} 
                  onChange={(e) => orderType === 'limit' && setLimitPrice(e.target.value)}
                  readOnly={orderType === 'market'}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-yellow-500 h-10"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Amount</span>
                  <span>{asset.symbol}</span>
                </div>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-green-500 h-10"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span>Leverage</span>
                <span className="text-yellow-500">{leverage}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="125" 
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
                <span>125x</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-zinc-500 font-medium">Total Cost</span>
                <span className="text-zinc-100 font-mono font-bold">
                  ${((Number(amount) * (orderType === 'market' ? asset.price : (Number(limitPrice) || 0))) / leverage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </span>
              </div>
              <Button 
                onClick={() => handlePlaceOrder('buy')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 h-12 shadow-lg shadow-green-900/20"
              >
                {orderType === 'limit' ? `Buy ${asset.symbol} Limit` : `Long ${asset.symbol}`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="flex flex-col gap-4 m-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Price</span>
                  <span>USDT</span>
                </div>
                <Input 
                  type="text" 
                  value={orderType === 'market' ? formatPrice(asset.price) : limitPrice} 
                  onChange={(e) => orderType === 'limit' && setLimitPrice(e.target.value)}
                  readOnly={orderType === 'market'}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-yellow-500 h-10"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Amount</span>
                  <span>{asset.symbol}</span>
                </div>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-red-500 h-10"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span>Leverage</span>
                <span className="text-yellow-500">{leverage}x</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="125" 
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase">
                <span>1x</span>
                <span>25x</span>
                <span>50x</span>
                <span>75x</span>
                <span>100x</span>
                <span>125x</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-zinc-500 font-medium">Total Cost</span>
                <span className="text-zinc-100 font-mono font-bold">
                  ${((Number(amount) * (orderType === 'market' ? asset.price : (Number(limitPrice) || 0))) / leverage).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button 
                onClick={() => handlePlaceOrder('sell')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-5 h-12 shadow-lg shadow-red-900/20"
              >
                {orderType === 'limit' ? `Sell ${asset.symbol} Limit` : `Short ${asset.symbol}`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="deposit" className="flex flex-col gap-4 m-0">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Payment Method</span>
                </div>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg h-10 px-3 text-sm text-zinc-100 font-medium focus:outline-none focus:border-yellow-500 hover:border-zinc-700 transition-colors"
                >
                  <option value="pse">PSE Transfer (Philippines)</option>
                  <option value="gcash">GCash e-Wallet</option>
                  <option value="maya">Maya e-Wallet</option>
                  <option value="bank">Local Bank Transfer (BDO, BPI)</option>
                  <option value="gotym">GOtym</option>
                  <option value="debit">Debit/Credit Card</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Amount to Deposit</span>
                  <span>PHP</span>
                </div>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-yellow-500 h-10"
                />
              </div>

              {paymentMethod === 'gotym' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2 mt-4">
                  <p className="text-xs font-medium text-yellow-500 mb-2">Please transfer funds to the following GOtym account:</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Bank Name</span>
                    <span className="text-zinc-100 font-bold">GOtym</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Account Name</span>
                    <span className="text-zinc-100 font-mono font-bold select-all">Luke manlutac</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Account #</span>
                    <span className="text-zinc-100 font-mono font-bold select-all">010670911430</span>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Processing Time</span>
                  <span className="text-green-500 font-bold tracking-tight">Instant (Under 5 mins)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Transaction Fee</span>
                  <span className="text-yellow-500 font-mono font-bold">{paymentMethod === 'bank' ? '25.00' : '15.00'} PHP</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Est. USDT Received</span>
                  <span className="text-zinc-300 font-mono">
                    ~{depositAmount ? (Number(depositAmount) / 55.4).toFixed(2) : '0.00'} USDT
                  </span>
                </div>
                <div className="pt-3 mt-1 border-t border-zinc-800 flex items-center justify-between text-sm">
                  <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Total to Pay</span>
                  <span className="text-zinc-100 font-mono font-bold text-base">
                    {(Number(depositAmount) + (paymentMethod === 'bank' ? 25 : 15)).toFixed(2)} PHP
                  </span>
                </div>
              </div>
              
              <div className="pt-2">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-5 h-12 shadow-lg shadow-yellow-900/20 transition-all hover:scale-[1.02]">
                  Proceed to Payment
                </Button>
                <p className="text-[10px] text-zinc-500 text-center mt-3 font-medium">
                  Secured by local payment gateway partners. Need help? Contact support.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-8 border-t border-zinc-900">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Pending Orders</span>
          </div>
          {pendingOrders.length === 0 ? (
            <div className="text-center text-xs text-zinc-600 py-4">No pending orders</div>
          ) : (
            <div className="space-y-2 text-xs">
              {pendingOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                  <div>
                    <span className={order.type === 'buy' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                      {order.type === 'buy' ? 'Buy' : 'Sell'} Limit {order.leverage}x
                    </span>
                    <div className="text-[10px] text-zinc-500 mt-1">{new Date(order.time).toLocaleTimeString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-100 font-mono font-bold">${parseFloat(order.price).toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">{order.amount} {order.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setMarketView('trades')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  marketView === 'trades' ? 'bg-zinc-800 text-yellow-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Clock className="h-3 w-3" /> Latest Trades
              </button>
              <button
                onClick={() => setMarketView('orderbook')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  marketView === 'orderbook' ? 'bg-zinc-800 text-yellow-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <BookOpen className="h-3 w-3" /> Order Book
              </button>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>

          {marketView === 'trades' ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                <span>Price(USDT)</span>
                <span>Amount({asset.symbol})</span>
                <span>Time</span>
              </div>
              {trades.length === 0 ? (
                <div className="text-center text-xs text-zinc-600 py-4">Waiting for Binance trades...</div>
              ) : (
                trades.slice(0, 10).map((trade, idx) => (
                  <div key={`${trade.id}-${idx}`} className="flex justify-between text-xs font-mono animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className={trade.isBuyerMaker ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                      {formatPrice(parseFloat(trade.price))}
                    </span>
                    <span className="text-zinc-300">
                      {parseFloat(trade.qty).toString()}
                    </span>
                    <span className="text-zinc-600">
                      {new Date(trade.time).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                <span>Price(USDT)</span>
                <span>Size({asset.symbol})</span>
                <span>Total</span>
              </div>
              {/* Asks (Sells - Red) */}
              <div className="space-y-0.5">
                {depth.asks.slice(0, 5).reverse().map((ask, idx) => (
                  <div key={`ask-${idx}`} className="relative flex justify-between text-[11px] font-mono py-0.5 px-1 rounded overflow-hidden">
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-red-500/10 pointer-events-none" 
                      style={{ width: `${Math.min(100, (ask.qty / (depth.asks[4]?.total || 1)) * 100)}%` }} 
                    />
                    <span className="text-red-500 font-bold z-10">{formatPrice(ask.price)}</span>
                    <span className="text-zinc-300 z-10">{ask.qty.toFixed(4)}</span>
                    <span className="text-zinc-600 z-10">{ask.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="py-1 my-1 border-y border-zinc-900 text-center font-mono font-bold text-xs text-yellow-500">
                ${formatPrice(asset.price)}
              </div>
              {/* Bids (Buys - Green) */}
              <div className="space-y-0.5">
                {depth.bids.slice(0, 5).map((bid, idx) => (
                  <div key={`bid-${idx}`} className="relative flex justify-between text-[11px] font-mono py-0.5 px-1 rounded overflow-hidden">
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-green-500/10 pointer-events-none" 
                      style={{ width: `${Math.min(100, (bid.qty / (depth.bids[4]?.total || 1)) * 100)}%` }} 
                    />
                    <span className="text-green-500 font-bold z-10">{formatPrice(bid.price)}</span>
                    <span className="text-zinc-300 z-10">{bid.qty.toFixed(4)}</span>
                    <span className="text-zinc-600 z-10">{bid.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-900">
          <div className="flex items-center gap-2 text-zinc-400 mb-4">
            <Wallet className="h-4 w-4 text-yellow-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Wallet Balance</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-medium">Available</span>
              <span className="text-sm text-zinc-100 font-mono font-bold">{displayBalance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-4">Address</span>
              <span className="text-sm text-zinc-100 font-mono font-bold">{address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Not Connected'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Official Platform</span>
        <span className="text-[10px] text-yellow-500/40 font-mono">www.binanceph.ai</span>
      </div>
    </div>
  );
}
