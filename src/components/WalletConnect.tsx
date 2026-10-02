import { useConnect, useAccount, useDisconnect, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  Wallet, 
  LogOut, 
  ChevronDown, 
  ExternalLink, 
  ShieldCheck, 
  Smartphone, 
  Copy, 
  Check, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';

const WALLET_OPTIONS = [
  {
    id: 'metaMask',
    name: 'MetaMask',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Mirror_Logo.svg',
    description: 'The world\'s most popular crypto wallet',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://trustwallet.com/assets/images/media/assets/trust_wallet_logo.svg',
    description: 'Secure multi-chain mobile wallet',
  },
  {
    id: 'binanceWallet',
    name: 'Binance Web3 Wallet',
    icon: 'https://public.bnbstatic.com/image/cms/blog/20231102/52174bd5-bb3e-4fb6-be41-11910cf904e5.png',
    description: 'Official Binance Web3 Wallet (App or Extension)',
  },
  {
    id: 'coinbaseWalletSDK',
    name: 'Coinbase Wallet',
    icon: 'https://avatars.githubusercontent.com/u/18060234?s=200&v=4',
    description: 'Securely store your crypto assets',
  },
  {
    id: 'walletConnect',
    name: 'Any Wallet App',
    icon: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg',
    description: 'Connect via QR code with ANY wallet app',
  }
];

const CHAIN_ICONS: Record<number, string> = {
  1: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  56: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
  137: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  42161: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  10: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg',
  8453: 'https://cryptologos.cc/logos/base-base-logo.svg',
};

export function WalletConnect() {
  const { address, isConnected, connector: activeConnector } = useAccount();
  const { connect, connectors, isPending, variables, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ 
    address,
    query: {
      refetchInterval: 2000,
    }
  });
  const { chains, switchChain } = useSwitchChain();
  const chainId = useChainId();
  
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const currentChain = chains.find(c => c.id === chainId);

  // Dynamically merge WALLET_OPTIONS with wagmi's discovered connectors (EIP-6963)
  const displayWallets = (() => {
    const list = [...WALLET_OPTIONS];

    connectors.forEach(c => {
      // Skip generic 'injected' and explicitly listed ones
      if (c.id === 'injected') return;
      const isListed = list.some(w => 
        w.id === c.id || 
        c.id.toLowerCase().includes(w.id.toLowerCase()) || 
        w.name.toLowerCase() === c.name.toLowerCase()
      );
      
      if (!isListed) {
        list.splice(list.length - 1, 0, { // Insert before WalletConnect
          id: c.id,
          name: c.name,
          icon: c.icon || 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg',
          description: `Connect with ${c.name}`,
        });
      }
    });
    return list;
  })();

  const handleConnect = (connectorId: string) => {
    setCustomError(null);
    let connector = connectors.find(c => 
      c.id.toLowerCase() === connectorId.toLowerCase() ||
      c.id.toLowerCase().includes(connectorId.toLowerCase()) ||
      c.name.toLowerCase().includes(connectorId.toLowerCase())
    );

    // Smart Provider Detection & Automatic WalletConnect Fallback
    const isClient = typeof window !== 'undefined';
    let needsFallback = false;

    if (isClient) {
      if (connectorId === 'metaMask' && !(window as any).ethereum?.isMetaMask && !connectors.some(c => c.id === 'metaMaskSDK' || c.name.toLowerCase().includes('metamask'))) {
        needsFallback = true;
      }
      if (connectorId === 'trust' && !(window as any).trustwallet && !(window as any).ethereum?.isTrust && !connectors.some(c => c.name.toLowerCase().includes('trust'))) {
        needsFallback = true;
      }
      if (connectorId === 'binanceWallet' && !(window as any).BinanceChain) {
        needsFallback = true;
      }
    }

    if (needsFallback) {
      const wcConnector = connectors.find(c => c.id === 'walletConnect');
      if (wcConnector) {
        setCustomError(`${connector?.name || 'Extension'} not found. Opening WalletConnect for mobile app...`);
        connect({ connector: wcConnector }, {
          onError: handleConnectError
        });
        return;
      }
    }

    if (connector) {
      connect({ connector }, {
        onError: handleConnectError
      });
    } else {
      setCustomError("Selected wallet is not available.");
    }
  };

  const handleConnectError = (err: any) => {
    if (err.message.includes('ProviderNotFoundError') || err.message.includes('Connector not found') || err.name === 'ProviderNotFoundError') {
      setCustomError("Wallet extension not found. You can try WalletConnect.");
    } else if (err.message.includes('User rejected') || err.name === 'UserRejectedRequestError') {
      setCustomError("Connection request was rejected.");
    } else {
      setCustomError(err.message.split('\n')[0] || "Failed to connect wallet.");
    }
  };

  useEffect(() => {
    if (isConnected) {
      setIsOpen(false);
      setCustomError(null);
    }
  }, [isConnected]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedBalance = balance 
    ? parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)
    : '0.0000';

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {/* Network Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:flex gap-2 bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 h-9 px-3")}>
            <img 
              src={CHAIN_ICONS[chainId] || 'https://cryptologos.cc/logos/ethereum-eth-logo.svg'} 
              alt="chain" 
              className="w-4 h-4"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-medium">{currentChain?.name}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-48">
            <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Switch Network</div>
            {chains.map((chain) => (
              <DropdownMenuItem 
                key={chain.id}
                onClick={() => switchChain({ chainId: chain.id })}
                className={cn(
                  "flex items-center gap-2 cursor-pointer focus:bg-zinc-800",
                  chainId === chain.id && "bg-zinc-800/50 text-yellow-500"
                )}
              >
                <img src={CHAIN_ICONS[chain.id]} alt={chain.name} className="w-4 h-4" referrerPolicy="no-referrer" />
                <span className="text-sm">{chain.name}</span>
                {chainId === chain.id && <Check className="ml-auto h-3 w-3" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Wallet Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 h-9 px-3")}>
            <div className="flex items-center gap-2">
              {activeConnector?.icon ? (
                <img src={activeConnector.icon} alt={activeConnector?.name} className="w-3.5 h-3.5 rounded-sm" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              )}
              <span className="font-mono text-xs font-bold">
                {address?.slice(0, 4)}...{address?.slice(-4)}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-64 p-2">
            <div className="p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50 mb-2">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Balance</span>
                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                  {activeConnector?.icon && (
                    <img src={activeConnector.icon} alt={activeConnector?.name} className="w-3 h-3 rounded-full" />
                  )}
                  {activeConnector?.name || 'Connected'}
                </span>
              </div>
              <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1">
                {formattedBalance}
                <span className="text-xs text-zinc-500">{balance?.symbol}</span>
              </div>
            </div>
            </div>

            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer focus:bg-zinc-800 rounded-md"
              onClick={copyAddress}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer focus:bg-zinc-800 rounded-md"
              onClick={() => window.open(`${currentChain?.blockExplorers?.default.url}/address/${address}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              <span>View on Explorer</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-zinc-800 my-1" />
            
            <DropdownMenuItem 
              onClick={() => disconnect()}
              className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer rounded-md"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Disconnect</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2 shadow-lg shadow-yellow-500/20 h-9 px-4">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      } />
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-md p-0 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-yellow-500" />
              </div>
              Connect Wallet
            </DialogTitle>
            <p className="text-sm text-zinc-400 mt-2">
              Start your professional trading journey on BinancePH Pro.
            </p>
          </DialogHeader>
        </div>
        
        <div className="p-4 grid gap-2">
          {(customError || error) && (
            <div className={`mb-2 p-3 border rounded-lg flex items-start gap-2 text-xs ${
              customError?.includes('Falling back') 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                : 'bg-red-500/10 border-red-500/20 text-red-500'
            }`}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>
                {customError || (
                  error?.message.includes('User rejected') 
                    ? 'Connection request was rejected.' 
                    : error?.message.includes('ProviderNotFoundError')
                      ? 'Wallet extension not found. Please install it or use WalletConnect.'
                      : error?.message.split('\n')[0] || 'Failed to connect wallet.'
                )}
              </p>
            </div>
          )}
          {displayWallets.map((wallet) => {
            const isConnecting = isPending && (variables as any)?.connector?.id?.toLowerCase().includes(wallet.id.toLowerCase());
            
            return (
              <button
                key={wallet.id}
                disabled={isPending}
                onClick={() => handleConnect(wallet.id)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-yellow-500/50 hover:bg-zinc-800 transition-all group text-left relative overflow-hidden",
                  isConnecting && "border-yellow-500 bg-yellow-500/5",
                  isPending && !isConnecting && "opacity-50 grayscale"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center p-2.5 group-hover:scale-105 transition-transform">
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    {isConnecting ? "Confirm in Wallet..." : wallet.name}
                    {!isConnecting && wallet.id === 'metaMask' && (
                      <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded font-bold uppercase">Popular</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 leading-tight mt-0.5">
                    {isConnecting ? "Please accept the connection request" : wallet.description}
                  </div>
                </div>
                
                {isConnecting ? (
                  <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
                ) : wallet.id === 'walletConnect' ? (
                  <Smartphone className="h-5 w-5 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-yellow-500 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              <span className="text-yellow-500 font-bold">Security Tip:</span> Always ensure you are on the official <span className="text-zinc-200">binanceph.ai</span> domain before connecting your wallet. We will never ask for your seed phrase.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
