import { Terminal, Code, Cpu, Activity, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function ApiDocs() {
  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Getting Started</h4>
            <ul className="space-y-2 text-sm">
              <li><button className="text-yellow-500 font-bold">Introduction</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">Authentication</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">Rate Limits</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">REST API</h4>
            <ul className="space-y-2 text-sm">
              <li><button className="text-zinc-400 hover:text-zinc-200">Market Data</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">Spot Trading</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">User Wallet</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">WebSocket API</h4>
            <ul className="space-y-2 text-sm">
              <li><button className="text-zinc-400 hover:text-zinc-200">Live Tickers</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">Order Book Streams</button></li>
              <li><button className="text-zinc-400 hover:text-zinc-200">User Data Stream</button></li>
            </ul>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="flex-1 space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-zinc-100 flex items-center gap-3">
              <Terminal className="text-yellow-500 w-8 h-8" /> API Documentation
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl">
              Integrate with BinancePH Pro's high-frequency trading engine. Build bots, algorithmic strategies, and custom portfolio trackers.
            </p>
          </div>

          <Card className="bg-zinc-950 border-zinc-800 overflow-hidden">
            <div className="border-b border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-2">
              <Code className="text-zinc-500 w-5 h-5" />
              <span className="font-mono text-sm text-zinc-300">Base URL</span>
            </div>
            <div className="p-6">
              <div className="bg-zinc-900 p-4 rounded-lg font-mono text-zinc-300 flex items-center justify-between border border-zinc-800">
                <span>https://api.binanceph.ai/api/v1</span>
                <span className="text-xs text-green-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Operational</span>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-zinc-100 border-b border-zinc-900 pb-4">Latest Ticker Data (WebSocket)</h3>
            <p className="text-zinc-400 text-sm">
              Connect to our live WebSocket stream to receive instantaneous 24-hour ticker updates across all trading pairs.
            </p>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                  bash <Play className="w-3 h-3 hover:text-white cursor-pointer" />
                </div>
              </div>
              <div className="p-4 overflow-x-auto text-sm">
                <pre className="font-mono text-zinc-300">
<span className="text-blue-400">const</span> ws = <span className="text-yellow-300">new</span> <span className="text-green-400">WebSocket</span>(<span className="text-orange-300">'wss://stream.binanceph.ai:9443/ws/!ticker@arr'</span>);<br/><br/>
ws.<span className="text-blue-400">onmessage</span> = <span className="text-yellow-300">function</span>(event) {'{'}<br/>
{'  '}console.<span className="text-blue-400">log</span>(<span className="text-yellow-300">JSON</span>.<span className="text-blue-400">parse</span>(event.data));<br/>
{'}'};<br/><br/>
<span className="text-zinc-500">// Example Output</span><br/>
<span className="text-purple-400">[</span><br/>
{'  '}{'{'}<br/>
{'    '}<span className="text-orange-300">"s"</span>: <span className="text-orange-300">"BTCUSDT"</span>,     <span className="text-zinc-500">// Symbol</span><br/>
{'    '}<span className="text-orange-300">"c"</span>: <span className="text-orange-300">"64231.50"</span>,    <span className="text-zinc-500">// Current Price</span><br/>
{'    '}<span className="text-orange-300">"v"</span>: <span className="text-orange-300">"32100000000"</span>, <span className="text-zinc-500">// Total Volume</span><br/>
{'    '}<span className="text-orange-300">"P"</span>: <span className="text-orange-300">"2.45"</span>         <span className="text-zinc-500">// Price Change %</span><br/>
{'  '}{'}'}<br/>
<span className="text-purple-400">]</span>
                </pre>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
