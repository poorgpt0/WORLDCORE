import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Terminal, Copy, Check, Bot, Zap, ArrowRight, RefreshCw, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GeminiMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  'Explain how AI works in a few words',
  'What are the advantages of trading crypto on BinancePH?',
  'Explain blockchain smart contracts in simple terms',
  'What is the outlook for Bitcoin and Ethereum in Southeast Asia?'
];

export function GeminiOracle() {
  const [inputPrompt, setInputPrompt] = useState('Explain how AI works in a few words');
  const [messages, setMessages] = useState<GeminiMessage[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: 'Hello! I am BinancePH AI Oracle powered by Google Gemini (gemini-flash-latest). Ask me anything about cryptocurrency, blockchain tech, market concepts, or test any prompt live.',
      timestamp: 'Just now'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rawCurlVisible, setRawCurlVisible] = useState(false);

  const handleSendPrompt = async (promptToSend?: string) => {
    const queryText = (promptToSend || inputPrompt).trim();
    if (!queryText || isLoading) return;

    const userMsg: GeminiMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Calls server-side Gemini API utilizing gemini-flash-latest
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: queryText
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const botMsg: GeminiMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: data.text || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Gemini call error:', err);
      const errorMsg: GeminiMessage = {
        id: `err-${Date.now()}`,
        sender: 'gemini',
        text: `Error connecting to Gemini Flash: ${err?.message || 'Please verify network and API configuration.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const curlExample = `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent" \\
  -H 'Content-Type: application/json' \\
  -H 'X-goog-api-key: YOUR_API_KEY' \\
  -X POST \\
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'`;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-zinc-800 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
                BinancePH AI Oracle
                <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3 w-3 fill-black" /> Gemini Flash
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Direct endpoint integration with <code className="text-yellow-500/90 font-mono">gemini-flash-latest</code>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRawCurlVisible(!rawCurlVisible)}
            className="border-zinc-800 hover:border-yellow-500/50 hover:bg-zinc-900 text-zinc-300 font-mono text-xs flex items-center gap-2"
          >
            <Terminal className="h-3.5 w-3.5 text-yellow-500" />
            {rawCurlVisible ? 'Hide cURL Specification' : 'View cURL Endpoint'}
          </Button>
        </div>
      </div>

      {/* Optional cURL Code Spec Block */}
      <AnimatePresence>
        {rawCurlVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 shrink-0"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-yellow-500" /> Exact API Call: models/gemini-flash-latest:generateContent
                </span>
                <button
                  onClick={() => copyToClipboard(curlExample, 'curl')}
                  className="text-zinc-400 hover:text-yellow-500 text-xs flex items-center gap-1 transition-colors"
                >
                  {copiedId === 'curl' ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === 'curl' ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="text-xs font-mono text-zinc-300 overflow-x-auto p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/80 leading-relaxed">
                {curlExample}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Prompts */}
      <div className="py-4 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Quick Prompts
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(promptText)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-yellow-500/10 hover:border-yellow-500/30 border border-zinc-800 text-zinc-300 hover:text-yellow-500 transition-all flex items-center gap-1.5 text-left disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 text-yellow-500" />
              <span>{promptText}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 rounded-xl bg-zinc-950/40 border border-zinc-850 p-4 border-zinc-900">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {msg.sender === 'user' ? 'You' : 'Gemini Flash'}
              </span>
              <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed relative group ${
                msg.sender === 'user'
                  ? 'bg-yellow-500 text-black font-semibold shadow-lg shadow-yellow-500/10'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {msg.sender === 'gemini' && (
                <button
                  onClick={() => copyToClipboard(msg.text, msg.id)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy text"
                >
                  {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Thinking...
              </span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-zinc-400 text-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-mono text-zinc-400">Processing via Gemini Flash Latest...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="pt-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask Gemini or prompt AI... (e.g. Explain how AI works in a few words)"
            disabled={isLoading}
            className="h-12 bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-yellow-500 flex-1 text-sm rounded-xl"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="h-12 px-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(243,186,47,0.2)] disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
