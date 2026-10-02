import { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/web3';
import { WalletConnect } from './components/WalletConnect';
import { AssetList, Asset } from './components/AssetList';
import { AssetDetailsModal } from './components/AssetDetailsModal';
import { TradingChart } from './components/TradingChart';
import { TradingPanel } from './components/TradingPanel';
import { OrderHistory } from './components/OrderHistory';
import { AuthModal } from './components/AuthModal';
import { SecurityVerification } from './components/SecurityVerification';
import { NFTMintEvent } from './components/NFTMintEvent';
import { NFTGallery } from './components/NFTGallery';
import { UserProfile } from './components/ProfileSettingsModal';
import { MarketData } from './components/MarketData';
import { PlatformFees } from './components/PlatformFees';
import { PlatformSecurity } from './components/PlatformSecurity';
import { Earn } from './components/Earn';
import { HelpCenter } from './components/HelpCenter';
import { ApiDocs } from './components/ApiDocs';
import { ContactUs } from './components/ContactUs';
import { LegalModal, LegalPolicyType } from './components/LegalModal';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { LayoutDashboard, ArrowLeftRight, Wallet, History, Settings, Bell, Menu, LogOut, User as UserIcon, ShieldCheck, Maximize2, Minimize2, BadgeCheck, Image as ImageIcon, LineChart, TrendingUp, Pickaxe, Banknote, X } from 'lucide-react';
import { Button, buttonVariants } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

const queryClient = new QueryClient();

const INITIAL_ASSETS: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 64231.50, change: 2.45, volume: '32.1B' },
  { symbol: 'ETH', name: 'Ethereum', price: 3452.12, change: -1.20, volume: '15.4B' },
  { symbol: 'BNB', name: 'BNB', price: 582.40, change: 0.85, volume: '2.1B' },
  { symbol: 'SOL', name: 'Solana', price: 145.20, change: 5.60, volume: '4.2B' },
  { symbol: 'XRP', name: 'XRP', price: 0.62, change: -0.45, volume: '1.2B' },
  { symbol: 'ADA', name: 'Cardano', price: 0.45, change: 1.10, volume: '0.8B' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.16, change: -2.30, volume: '1.5B' },
];

export default function App() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(INITIAL_ASSETS[0]);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trade' | 'nft' | 'profile' | 'markets' | 'fees' | 'security' | 'earn' | 'help' | 'api' | 'contact'>('nft');
  const [isNftOwner, setIsNftOwner] = useState(false);
  const [legalPolicy, setLegalPolicy] = useState<LegalPolicyType>(null);
  const [showAssetDetails, setShowAssetDetails] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    let ws: WebSocket;
    let keepAliveInterval: any;
    
    const connectWS = () => {
      ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!Array.isArray(data)) return;

        setAssets((prev) => {
          let updated = false;
          let next = prev;

          data.forEach((t: any) => {
            const assetSymbol = t.s.replace('USDT', '');
            const index = prev.findIndex(a => a.symbol === assetSymbol);
            if (index !== -1) {
              if (!updated) {
                next = [...prev];
                updated = true;
              }
              const asset = next[index];
              const volNum = parseFloat(t.q);
              let volumeStr = asset.volume;
              if (volNum > 1e9) volumeStr = (volNum / 1e9).toFixed(2) + 'B';
              else if (volNum > 1e6) volumeStr = (volNum / 1e6).toFixed(2) + 'M';

              next[index] = {
                ...asset,
                price: parseFloat(t.c),
                change: parseFloat(t.P),
                volume: volumeStr,
              };
            }
          });

          if (updated) {
            setSelectedAsset((currSelected) => {
              const updatedSelected = next.find((a) => a.symbol === currSelected.symbol);
              if (updatedSelected && updatedSelected.price !== currSelected.price) {
                return updatedSelected;
              }
              return currSelected;
            });
            return next;
          }
          return prev;
        });
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(connectWS, 3000);
      };
      
      ws.onerror = () => {
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsVerified(false);
      return;
    }

    // Sync with Firestore for "Full Security"
    const userRef = doc(db, 'users', user.uid);
    
    const unsubFirestore = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsVerified(data.isVerified || false);
        setIsNftOwner(data.isNftOwner || false);
      } else {
        // Initialize new user in Firestore securely
        setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          createdAt: serverTimestamp(),
          isVerified: false,
          mfaEnabled: false,
          phoneNumber: user.phoneNumber || ''
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`));
        setIsVerified(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubFirestore();
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    setIsVerified(false);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="h-screen bg-black text-zinc-100 font-sans selection:bg-yellow-500/30 flex flex-col overflow-hidden">
          {/* Beta Notification Banner */}
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 shrink-0 relative z-50">
            <div className="w-full flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-yellow-500">
              <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>System Status: Beta Phase 1.0 — Use our official portal link for now!</span>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            {/* Global Left Sidebar (Desktop) */}
            <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex-col hidden lg:flex h-full shrink-0 relative z-40">
              <div className="h-20 flex items-center px-6 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                    <span className="text-black font-black text-2xl">B</span>
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-xl font-black tracking-tighter">
                      BINANCE<span className="text-yellow-500">PH</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Philippines</span>
                      <span className="text-xs">🇵🇭</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 relative">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Main Navigation</span>
                
                <button 
                  onClick={() => setActiveTab('trade')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'trade' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <LineChart className="w-5 h-5 flex-shrink-0" />
                  <span>Trading Live</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('markets')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'markets' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <TrendingUp className="w-5 h-5 flex-shrink-0" />
                  <span>Markets</span>
                </button>

                <button 
                  onClick={() => {
                     alert("Fiat Gateway Opening Soon! Redirecting to Markets for now.");
                     setActiveTab('markets');
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                >
                  <Banknote className="w-5 h-5 flex-shrink-0" />
                  <span>Buy/Sell Assets</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('nft')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'nft' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <ImageIcon className="w-5 h-5 flex-shrink-0" />
                  <span>NFT Listing Page</span>
                </button>
                
                <button 
                  onClick={() => setActiveTab('earn')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'earn' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <Pickaxe className="w-5 h-5 flex-shrink-0" />
                  <span>Earn</span>
                </button>
              </div>
            </aside>

            {/* Main Content View with Inner App Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-30">
              <NFTMintEvent isVerified={isVerified} />

              <AnimatePresence>
                {user && !isVerified && (
                  <SecurityVerification 
                    email={user.email}
                    onVerify={() => setIsVerified(true)}
                    onCancel={handleSignOut}
                  />
                )}
              </AnimatePresence>

              {/* Header (Top Nav - Simplified since we have Sidebar) */}
              <header className="h-20 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl shrink-0 flex items-center justify-between px-4 lg:px-8">
                {/* Mobile Logo Only */}
                <div className="flex lg:hidden items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-black text-xl">B</span>
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-xl font-black tracking-tighter">
                      BINANCE<span className="text-yellow-500">PH</span>
                    </span>
                  </div>
                </div>

                <div className="hidden lg:flex items-center">
                   {/* Spacing for Desktop Header Left Side */}
                   <span className="text-2xl font-black text-zinc-100 tracking-tight capitalize">
                     {activeTab === 'nft' ? 'NFT Listing Page' :
                      activeTab === 'trade' ? 'Trading Live' :
                      activeTab === 'markets' ? 'Markets' :
                      activeTab === 'earn' ? 'Earn' :
                      activeTab === 'fees' ? 'Fees' :
                      activeTab === 'security' ? 'Security' :
                      activeTab === 'help' ? 'Help Center' :
                      activeTab === 'api' ? 'API Docs' :
                      activeTab === 'contact' ? 'Contact Us' :
                      activeTab === 'profile' ? 'Profile & Settings' :
                      activeTab}
                   </span>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hidden sm:flex items-center gap-2 text-zinc-400 hover:text-yellow-500 hover:bg-yellow-500/10"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Portal link copied to clipboard!');
                    }}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Share Portal</span>
                  </Button>

                  {user && (
                    <div className={cn(
                      "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-500",
                      isVerified 
                        ? "bg-green-500/10 border-green-500/20 text-green-500" 
                        : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"
                    )}>
                      <ShieldCheck className={cn("h-3 w-3", isVerified && "animate-pulse")} />
                      <span>{isVerified ? 'Verified' : 'Pending'}</span>
                    </div>
                  )}
                  
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 hidden sm:flex">
                    {isFullscreen ? <Minimize2 className="h-5 w-5" onClick={toggleFullscreen} /> : <Maximize2 className="h-5 w-5" onClick={toggleFullscreen} />}
                  </Button>
                  
                  {authReady && (
                    <>
                      {user ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-zinc-100 hover:bg-zinc-900")}>
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon className="h-4 w-4 text-zinc-400" />
                              )}
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5">
                              <span className="text-sm font-bold">
                                {user.displayName || user.email?.split('@')[0]}
                              </span>
                              {isNftOwner && (
                                <div className="bg-yellow-500/10 p-0.5 rounded" title="Verified NFT Owner">
                                  <BadgeCheck className="h-3 w-3 text-yellow-500" />
                                </div>
                              )}
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-zinc-100 w-48">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900"
                              onClick={() => setActiveTab('profile')}
                            >
                              <UserIcon className="h-4 w-4" />
                              <span>Profile & Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900 text-red-500 focus:text-red-500"
                              onClick={() => {
                                setActiveTab('trade');
                                handleSignOut();
                              }}
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Sign Out</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AuthModal defaultTab="signin" />
                          <AuthModal defaultTab="signup" />
                        </div>
                      )}
                    </>
                  )}

                  <WalletConnect />
                  
                  <Sheet>
                    <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}>
                        <Menu className="h-6 w-6" />
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] bg-zinc-950 border-r border-zinc-800 p-0">
                      <div className="h-20 flex items-center px-6 border-b border-zinc-800 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                            <span className="text-black font-black text-2xl">B</span>
                          </div>
                          <div className="flex flex-col -space-y-1">
                            <span className="text-xl font-black tracking-tighter">
                              BINANCE<span className="text-yellow-500">PH</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Main Navigation</span>
                        
                        <button 
                          onClick={() => setActiveTab('trade')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'trade' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <LineChart className="w-5 h-5 flex-shrink-0" />
                          <span>Trading Live</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab('markets')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'markets' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <TrendingUp className="w-5 h-5 flex-shrink-0" />
                          <span>Markets</span>
                        </button>

                        <button 
                          onClick={() => {
                             alert("Fiat Gateway Opening Soon! Redirecting to Markets for now.");
                             setActiveTab('markets');
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                        >
                          <Banknote className="w-5 h-5 flex-shrink-0" />
                          <span>Buy/Sell Assets</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab('nft')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'nft' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <ImageIcon className="w-5 h-5 flex-shrink-0" />
                          <span>NFT Listing Page</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab('earn')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'earn' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <Pickaxe className="w-5 h-5 flex-shrink-0" />
                          <span>Earn</span>
                        </button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto p-4 lg:p-6 w-full relative">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' ? (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <UserProfile user={user} onLogout={() => {
                    handleSignOut();
                    setActiveTab('trade');
                  }} />
                </motion.div>
              ) : activeTab === 'nft' ? (
                <motion.div
                  key="nft"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <NFTGallery />
                </motion.div>
              ) : activeTab === 'markets' ? (
                <motion.div
                  key="markets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="h-full pt-4 pb-12"
                >
                  <MarketData 
                    assets={assets} 
                    onTrade={(asset) => {
                      setSelectedAsset(asset);
                      setActiveTab('trade');
                    }}
                  />
                </motion.div>
              ) : activeTab === 'fees' ? (
                <motion.div
                  key="fees"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlatformFees />
                </motion.div>
              ) : activeTab === 'security' ? (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <PlatformSecurity />
                </motion.div>
              ) : activeTab === 'earn' ? (
                <motion.div
                  key="earn"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <Earn />
                </motion.div>
              ) : activeTab === 'help' ? (
                <motion.div
                  key="help"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <HelpCenter />
                </motion.div>
              ) : activeTab === 'api' ? (
                <motion.div
                  key="api"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <ApiDocs />
                </motion.div>
              ) : activeTab === 'contact' ? (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <ContactUs />
                </motion.div>
              ) : (
                <motion.div
                  key="trade"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4"
                >
                  {/* Left Sidebar - Asset List */}
                  <div className="lg:col-span-3 h-[calc(100vh-160px)]">
                    <AssetList assets={assets} onSelect={(asset) => {
                      setSelectedAsset(asset);
                      setShowAssetDetails(true);
                    }} />
                  </div>

                  {/* Center - Chart & History */}
                  <div className="lg:col-span-6 space-y-4">
                    <TradingChart asset={selectedAsset} />
                    <OrderHistory isVerified={isVerified} />
                  </div>

                  {/* Right Sidebar - Trading Panel */}
                  <div className="lg:col-span-3 h-[calc(100vh-160px)]">
                    <TradingPanel asset={selectedAsset} isVerified={isVerified} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Site Footer */}
            <footer className="mt-20 py-12 border-t border-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <span className="text-black font-black text-xl">B</span>
                    </div>
                    <span className="text-xl font-black tracking-tighter">BINANCE<span className="text-yellow-500">PH</span></span>
                  </div>
                  <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                    The most trusted cryptocurrency exchange in the Philippines. 
                    Trade with confidence on the official www.binanceph.ai platform.
                  </p>
                </div>
                <div>
                  <h4 className="text-zinc-100 font-bold mb-4 text-sm">Platform</h4>
                  <ul className="space-y-2 text-sm text-zinc-500">
                    <li><button onClick={() => { setActiveTab('markets'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Markets</button></li>
                    <li><button onClick={() => { setActiveTab('trade'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Trading</button></li>
                    <li><button onClick={() => { setActiveTab('fees'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Fees</button></li>
                    <li><button onClick={() => { setActiveTab('security'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Security</button></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-zinc-100 font-bold mb-4 text-sm">Support</h4>
                  <ul className="space-y-2 text-sm text-zinc-500">
                    <li><button onClick={() => { setActiveTab('help'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Help Center</button></li>
                    <li><button onClick={() => { setActiveTab('api'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">API Docs</button></li>
                    <li><button onClick={() => { setActiveTab('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-yellow-500 transition-colors">Contact Us</button></li>
                    <li><button onClick={() => setLegalPolicy('terms')} className="hover:text-yellow-500 transition-colors">Legal</button></li>
                  </ul>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-zinc-600">
                  © 2026 BINANCEPH (www.binanceph.ai). All rights reserved.
                </p>
                <div className="flex gap-6 text-xs text-zinc-600">
                  <button onClick={() => setLegalPolicy('privacy')} className="hover:text-zinc-400">Privacy Policy</button>
                  <button onClick={() => setLegalPolicy('terms')} className="hover:text-zinc-400">Terms of Service</button>
                  <button onClick={() => setLegalPolicy('cookies')} className="hover:text-zinc-400">Cookie Policy</button>
                </div>
              </div>
            </footer>
          </main>

          <LegalModal type={legalPolicy} onClose={() => setLegalPolicy(null)} />
          <AssetDetailsModal 
            asset={selectedAsset} 
            isOpen={showAssetDetails} 
            onClose={() => setShowAssetDetails(false)} 
          />

            {/* Footer Stats Bar */}
            <footer className="fixed bottom-0 left-0 right-0 h-10 bg-zinc-950 border-t border-zinc-800 px-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 z-50">
              <div className="flex items-center gap-6 overflow-hidden max-w-[70%]">
                {assets.slice(0, 3).map(asset => (
                  <div key={asset.symbol} className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-600">{asset.symbol}/USDT</span>
                    <span className={asset.change >= 0 ? "text-green-500" : "text-red-500"}>
                      {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%)
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="hidden sm:inline">Stable Connection</span>
                <div className="flex gap-0.5" title="Connected">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-0.5 h-2 bg-green-500" />)}
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
