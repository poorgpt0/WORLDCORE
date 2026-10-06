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
import { GeminiOracle } from './components/GeminiOracle';
import { WorldcoreLaunchpad } from './components/WorldcoreLaunchpad';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import {
  PriceAlertsModal,
  PriceAlert,
  loadStoredAlerts,
  saveStoredAlerts,
  loadSoundPreference,
  saveSoundPreference,
  playAlertChime,
  triggerBrowserNotification,
} from './components/PriceAlertsModal';
import { LegalModal, LegalPolicyType } from './components/LegalModal';
import { auth, db, handleFirestoreError, OperationType, onAuthStateChanged, signOut } from './lib/firebase';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { LayoutDashboard, ArrowLeftRight, Wallet, History, Settings, Bell, Menu, LogOut, User as UserIcon, ShieldCheck, Maximize2, Minimize2, BadgeCheck, Image as ImageIcon, LineChart, TrendingUp, Pickaxe, Banknote, X, Bot, Sparkles, Rocket } from 'lucide-react';
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

import { 
  INITIAL_FALLBACK_ASSETS, 
  fetchLiveBinanceTickers, 
  formatPrice, 
  formatVolume 
} from './lib/binance';

const queryClient = new QueryClient();

export default function App() {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_FALLBACK_ASSETS);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(INITIAL_FALLBACK_ASSETS[0]);
  const [isWsLive, setIsWsLive] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'trade' | 'dashboard' | 'nft' | 'profile' | 'markets' | 'fees' | 'security' | 'earn' | 'help' | 'api' | 'contact' | 'ai' | 'worldcore'>('trade');
  const [isNftOwner, setIsNftOwner] = useState(false);
  const [legalPolicy, setLegalPolicy] = useState<LegalPolicyType>(null);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Personalized Price Alerts state
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>(() => loadStoredAlerts());
  const [showPriceAlerts, setShowPriceAlerts] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadSoundPreference());
  const [triggeredBanner, setTriggeredBanner] = useState<PriceAlert | null>(null);

  useEffect(() => {
    saveStoredAlerts(priceAlerts);
  }, [priceAlerts]);

  // Evaluate active price alerts whenever live Binance prices update
  useEffect(() => {
    const activeAlerts = priceAlerts.filter((a) => a.status === 'active');
    if (activeAlerts.length === 0) return;

    let anyTriggered = false;
    let latestTriggered: PriceAlert | null = null;

    const updated = priceAlerts.map((alert) => {
      if (alert.status !== 'active') return alert;
      const liveAsset = assets.find((a) => a.symbol === alert.symbol);
      if (!liveAsset || !(liveAsset.price > 0)) return alert;

      const hitAbove = alert.condition === 'above' && liveAsset.price >= alert.targetPrice;
      const hitBelow = alert.condition === 'below' && liveAsset.price <= alert.targetPrice;

      if (hitAbove || hitBelow) {
        anyTriggered = true;
        const triggeredAlert: PriceAlert = {
          ...alert,
          status: 'triggered',
          triggeredAt: new Date().toISOString(),
          triggeredPrice: liveAsset.price,
        };
        latestTriggered = triggeredAlert;

        const title = `BinancePH Price Alert: ${alert.symbol}/USDT`;
        const body = `${alert.symbol} reached $${formatPrice(liveAsset.price)} (Target ${
          alert.condition === 'above' ? '≥' : '≤'
        } $${formatPrice(alert.targetPrice)})${alert.note ? ` — ${alert.note}` : ''}`;

        triggerBrowserNotification(title, body, alert.id, () => {
          setSelectedAsset(liveAsset);
          setActiveTab('trade');
        });

        return triggeredAlert;
      }
      return alert;
    });

    if (anyTriggered) {
      setPriceAlerts(updated);
      if (soundEnabled) {
        playAlertChime();
      }
      if (latestTriggered) {
        setTriggeredBanner(latestTriggered);
      }
    }
  }, [assets, priceAlerts, soundEnabled]);

  const handleOpenPriceAlertForAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowPriceAlerts(true);
  };

  const handleTestPriceAlert = (asset: Asset) => {
    if (soundEnabled) {
      playAlertChime();
    }
    const title = `BinancePH Price Alert: ${asset.symbol}/USDT`;
    const body = `${asset.symbol} is trading at $${formatPrice(asset.price)} on Binance Spot.`;
    triggerBrowserNotification(title, body, `test-${asset.symbol}`, () => {
      setSelectedAsset(asset);
      setActiveTab('trade');
    });
    setTriggeredBanner({
      id: `test_${Date.now()}`,
      symbol: asset.symbol,
      name: asset.name,
      targetPrice: asset.price,
      condition: 'above',
      createdAtPrice: asset.price,
      note: 'Test browser & audio notification verified',
      status: 'triggered',
      createdAt: new Date().toISOString(),
      triggeredAt: new Date().toISOString(),
      triggeredPrice: asset.price,
    });
  };

  const activeAlertsCount = priceAlerts.filter((a) => a.status === 'active').length;

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

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

  // Immediate Binance fetch + Live Binance WebSocket stream + automatic polling fallback
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let lastMessageTime = 0;

    // 1. Immediately fetch real Binance 24h prices
    fetchLiveBinanceTickers().then((liveAssets) => {
      if (isMounted && liveAssets.length > 0) {
        setAssets(liveAssets);
        setSelectedAsset((curr) => {
          const match = liveAssets.find(a => a.symbol === curr.symbol);
          return match || liveAssets[0];
        });
      }
    }).catch(err => {
      console.warn('Initial Binance ticker fetch error:', err);
    });

    // 2. Connect to Binance ticker array WebSocket stream
    const connectWS = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

        ws.onopen = () => {
          if (isMounted) setIsWsLive(true);
        };

        ws.onmessage = (event) => {
          lastMessageTime = Date.now();
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (!Array.isArray(data)) return;

            setAssets((prev) => {
              let updated = false;
              let next = prev;

              data.forEach((t: any) => {
                const s = t.s;
                if (typeof s === 'string' && s.endsWith('USDT')) {
                  const assetSymbol = s.slice(0, -4);
                  const index = prev.findIndex(a => a.symbol === assetSymbol);
                  if (index !== -1) {
                    if (!updated) {
                      next = [...prev];
                      updated = true;
                    }
                    const asset = next[index];
                    const volNum = parseFloat(t.q);
                    const newPrice = parseFloat(t.c);
                    const newChange = parseFloat(t.P);
                    const high = parseFloat(t.h);
                    const low = parseFloat(t.l);

                    if (!isNaN(newPrice) && newPrice > 0) {
                      next[index] = {
                        ...asset,
                        price: newPrice,
                        change: !isNaN(newChange) ? newChange : asset.change,
                        volume: !isNaN(volNum) ? formatVolume(volNum) : asset.volume,
                        high24h: !isNaN(high) ? high : asset.high24h,
                        low24h: !isNaN(low) ? low : asset.low24h,
                      };
                    }
                  }
                }
              });

              if (updated) {
                setSelectedAsset((currSelected) => {
                  const updatedSelected = next.find((a) => a.symbol === currSelected.symbol);
                  if (
                    updatedSelected &&
                    typeof updatedSelected.price === 'number' &&
                    !isNaN(updatedSelected.price) &&
                    updatedSelected.price > 0 &&
                    updatedSelected.price !== currSelected.price
                  ) {
                    return updatedSelected;
                  }
                  return currSelected;
                });
                return next;
              }
              return prev;
            });
          } catch {
            // ignore malformed ws messages
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsWsLive(false);
            reconnectTimeout = setTimeout(connectWS, 2500);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (e) {
        console.warn('WS error:', e);
      }
    };

    connectWS();

    // 3. Fallback sync every 3.5 seconds if WebSocket was silent or disconnected
    const pollInterval = setInterval(() => {
      if (Date.now() - lastMessageTime > 3500) {
        fetchLiveBinanceTickers().then((liveAssets) => {
          if (isMounted && liveAssets.length > 0) {
            setAssets((prev) => {
              // merge live assets
              return liveAssets;
            });
            setSelectedAsset((curr) => {
              const match = liveAssets.find(a => a.symbol === curr.symbol);
              return match || curr;
            });
          }
        }).catch(() => {});
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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
      setIsNftOwner(false);
      return;
    }

    if (user.isVerified) {
      setIsVerified(true);
    }
    if (user.isNftOwner) {
      setIsNftOwner(true);
    }

    // Only attach Firestore snapshot if native Firebase Auth session is active
    const userRef = doc(db, 'users', user.uid);
    let unsubFirestore: (() => void) | null = null;

    try {
      unsubFirestore = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsVerified(Boolean(data.isVerified || user.isVerified));
          setIsNftOwner(Boolean(data.isNftOwner || user.isNftOwner));
        } else {
          setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            createdAt: serverTimestamp(),
            isVerified: Boolean(user.isVerified),
            mfaEnabled: false,
            phoneNumber: user.phoneNumber || ''
          }).catch(() => {});
        }
      }, () => {
        // Fallback to local user state when Firestore rules restrict unauthenticated client access
        setIsVerified(Boolean(user.isVerified));
        setIsNftOwner(Boolean(user.isNftOwner));
      });
    } catch {
      setIsVerified(Boolean(user.isVerified));
      setIsNftOwner(Boolean(user.isNftOwner));
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
    };
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
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'dashboard' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                  <div className="flex items-center justify-between flex-1">
                    <span>Portfolio Dashboard</span>
                    <span className="text-[10px] font-mono text-yellow-500">30D</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => setActiveTab('markets')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'markets' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <TrendingUp className="w-5 h-5 flex-shrink-0" />
                  <span>Markets</span>
                </button>

                <button 
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'ai' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <Bot className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                  <div className="flex items-center justify-between flex-1">
                    <span>BinancePH AI</span>
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 font-mono px-1.5 py-0.5 rounded">Flash</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                     showToast("Fiat Gateway Opening Soon! Redirecting to Markets for now.");
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

                <button 
                  onClick={() => setActiveTab('worldcore')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'worldcore' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                >
                  <Rocket className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                  <div className="flex items-center justify-between flex-1">
                    <span>Worldcore BEP-20</span>
                    <span className="text-[10px] font-mono text-emerald-400">WCORE</span>
                  </div>
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
                     {activeTab === 'ai' ? 'BinancePH AI Oracle (Gemini Flash)' :
                      activeTab === 'worldcore' ? 'Worldcore (WCORE) BEP-20 Launchpad' :
                      activeTab === 'dashboard' ? 'Portfolio Valuation Dashboard (30D)' :
                      activeTab === 'nft' ? 'NFT Listing Page' :
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
                      showToast('Portal link copied to clipboard!');
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
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-2 text-zinc-300 hover:text-yellow-500 hover:bg-yellow-500/10 relative"
                    onClick={() => setShowPriceAlerts(true)}
                    title="Manage Personalized Price Alerts"
                  >
                    <Bell className="h-4 w-4 text-yellow-500" />
                    <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Price Alerts</span>
                    {activeAlertsCount > 0 && (
                      <span className="font-mono text-[10px] font-bold text-yellow-500">
                        ({activeAlertsCount})
                      </span>
                    )}
                  </Button>

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
                          onClick={() => setActiveTab('dashboard')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'dashboard' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                          <span>Portfolio Dashboard (30D)</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveTab('markets')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'markets' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <TrendingUp className="w-5 h-5 flex-shrink-0" />
                          <span>Markets</span>
                        </button>

                        <button 
                          onClick={() => setActiveTab('ai')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'ai' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <Bot className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                          <div className="flex items-center justify-between flex-1">
                            <span>BinancePH AI</span>
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 font-mono px-1.5 py-0.5 rounded">Flash</span>
                          </div>
                        </button>

                        <button 
                          onClick={() => {
                             showToast("Fiat Gateway Opening Soon! Redirecting to Markets for now.");
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

                        <button 
                          onClick={() => setActiveTab('worldcore')}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm w-full text-left ${activeTab === 'worldcore' ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}
                        >
                          <Rocket className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                          <span>Worldcore BEP-20</span>
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
              ) : activeTab === 'ai' ? (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <GeminiOracle />
                </motion.div>
              ) : activeTab === 'worldcore' ? (
                <motion.div
                  key="worldcore"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <WorldcoreLaunchpad />
                </motion.div>
              ) : activeTab === 'dashboard' ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                >
                  <PortfolioDashboard
                    assets={assets}
                    onSelectAsset={(asset) => {
                      setSelectedAsset(asset);
                      setActiveTab('trade');
                    }}
                  />
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
                  {/* Top Dashboard Section - 30-Day Estimated Portfolio Value AreaChart */}
                  <div className="lg:col-span-12">
                    <PortfolioDashboard
                      assets={assets}
                      compact
                      onSelectAsset={(asset) => setSelectedAsset(asset)}
                      onOpenFullDashboard={() => setActiveTab('dashboard')}
                    />
                  </div>

                  {/* Left Sidebar - Asset List */}
                  <div className="lg:col-span-3 h-[calc(100vh-160px)]">
                    <AssetList assets={assets} onSelect={(asset) => {
                      setSelectedAsset(asset);
                      setShowAssetDetails(true);
                    }} />
                  </div>

                  {/* Center - Chart & History */}
                  <div className="lg:col-span-6 space-y-4">
                    <TradingChart
                      asset={selectedAsset}
                      onOpenPriceAlert={handleOpenPriceAlertForAsset}
                      activeAlertCount={
                        priceAlerts.filter((a) => a.status === 'active' && a.symbol === selectedAsset.symbol).length
                      }
                    />
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
            onOpenPriceAlert={handleOpenPriceAlertForAsset}
          />
          <PriceAlertsModal
            isOpen={showPriceAlerts}
            onClose={() => setShowPriceAlerts(false)}
            assets={assets}
            selectedAsset={selectedAsset}
            alerts={priceAlerts}
            onAddAlert={(newAlert) => setPriceAlerts((prev) => [newAlert, ...prev])}
            onRemoveAlert={(id) => setPriceAlerts((prev) => prev.filter((a) => a.id !== id))}
            onRearmAlert={(id, currentPrice) =>
              setPriceAlerts((prev) =>
                prev.map((a) =>
                  a.id === id
                    ? {
                        ...a,
                        status: 'active',
                        condition: a.targetPrice >= currentPrice ? 'above' : 'below',
                        triggeredAt: undefined,
                        triggeredPrice: undefined,
                      }
                    : a
                )
              )
            }
            onClearTriggered={() => setPriceAlerts((prev) => prev.filter((a) => a.status !== 'triggered'))}
            onSelectAsset={(asset) => {
              setSelectedAsset(asset);
              setActiveTab('trade');
            }}
            soundEnabled={soundEnabled}
            onToggleSound={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              saveSoundPreference(next);
            }}
            onTestAlert={handleTestPriceAlert}
          />

          {/* Live Triggered Price Alert Notification Banner */}
          <AnimatePresence>
            {triggeredBanner && (
              <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="fixed top-20 right-6 z-[95] bg-zinc-950 border border-yellow-500/50 text-zinc-100 p-4 rounded-2xl shadow-2xl max-w-sm w-full backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500 text-black flex items-center justify-center shrink-0 mt-0.5">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-mono uppercase text-yellow-500 font-bold">
                        Price Target Reached
                      </div>
                      <div className="text-sm font-black text-zinc-100">
                        {triggeredBanner.symbol}/USDT hit ${formatPrice(triggeredBanner.triggeredPrice || triggeredBanner.targetPrice)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Target: {triggeredBanner.condition === 'above' ? '≥' : '≤'} ${formatPrice(triggeredBanner.targetPrice)}
                        {triggeredBanner.note ? ` · ${triggeredBanner.note}` : ''}
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const match = assets.find((a) => a.symbol === triggeredBanner.symbol);
                            if (match) setSelectedAsset(match);
                            setActiveTab('trade');
                            setTriggeredBanner(null);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-7 px-3 text-xs"
                        >
                          Trade {triggeredBanner.symbol}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowPriceAlerts(true);
                            setTriggeredBanner(null);
                          }}
                          className="text-zinc-400 hover:text-zinc-200 h-7 px-2.5 text-xs"
                        >
                          Manage Alerts
                        </Button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setTriggeredBanner(null)}
                    className="text-zinc-500 hover:text-zinc-200 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* In-app Toast Notice */}
          <AnimatePresence>
            {toastNotice && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-14 right-6 z-50 bg-zinc-900 border border-yellow-500/40 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                <span className="text-xs font-bold">{toastNotice}</span>
                <button
                  onClick={() => setToastNotice(null)}
                  className="text-zinc-500 hover:text-zinc-200 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

            {/* Footer Stats Bar */}
            <footer className="fixed bottom-0 left-0 right-0 h-10 bg-zinc-950 border-t border-zinc-800 px-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 z-50">
              <div className="flex items-center gap-6 overflow-hidden max-w-[75%]">
                {assets.slice(0, 6).map(asset => (
                  <button 
                    key={asset.symbol} 
                    onClick={() => {
                      setSelectedAsset(asset);
                      if (activeTab !== 'trade') setActiveTab('trade');
                    }}
                    className="flex items-center gap-2 shrink-0 hover:bg-zinc-900/60 py-1 px-1.5 rounded transition-colors text-left"
                  >
                    <span className="text-zinc-500 font-bold">{asset.symbol}/USDT</span>
                    <span className={asset.change >= 0 ? "text-green-500 font-mono font-bold" : "text-red-500 font-mono font-bold"}>
                      ${formatPrice(asset.price)} ({asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%)
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className={`w-2 h-2 rounded-full ${isWsLive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="hidden sm:inline font-mono font-bold text-[9px]">
                    {isWsLive ? 'Binance Live Feed' : 'Binance Live (Syncing)'}
                  </span>
                </div>
                <div className="flex gap-0.5" title="Connected">
                  {[1, 2, 3, 4].map(i => <div key={i} className={`w-0.5 h-2 ${isWsLive ? 'bg-green-500' : 'bg-yellow-500'}`} />)}
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
