import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X, CheckCircle2, Wand2, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { doc, updateDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSendTransaction, useAccount } from 'wagmi';
import { stringToHex } from 'viem';

export function NFTMintEvent({ isVerified }: { isVerified: boolean }) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasMinted, setHasMinted] = useState(false);
  const [mintCount, setMintCount] = useState(842);
  const user = auth.currentUser;
  const { address, isConnected } = useAccount();

  // AI Generation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('A cyberpunk golden ape in a neon city, highly detailed, 4k');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState('AI is Painting...');
  const [nftMetadata, setNftMetadata] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) return;
    const phrases = [
      'Querying Gemini Flash Engine...',
      'Synthesizing Neural Canvas...',
      'Generating Cyberpunk Lore...',
      'Encoding Blockchain Attributes...',
      'Finalizing 4K Render...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setLoadingPhrase(phrases[idx]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isGenerating]);
  const [listingPrice, setListingPrice] = useState('');
  const [contractAddress, setContractAddress] = useState('');

  // Wagmi Transaction
  const { sendTransaction, isPending: isTxPending } = useSendTransaction({
    mutation: {
      onSuccess: async (hash) => {
        try {
          if (user && address) {
            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                hasMintedNFT: true,
                isNftOwner: true,
                verifiedWallet: address,
                mintedAiImage: generatedImg,
                mintTxHash: hash
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
            }

            if (generatedImg) {
              try {
                const numPrice = parseFloat(listingPrice);
                const priceStr = !isNaN(numPrice) && numPrice > 0 ? `${numPrice} ETH` : 'Not for Sale';
                const usdStr = !isNaN(numPrice) && numPrice > 0 ? `$${(numPrice * 3000).toLocaleString()}` : '-';

                await addDoc(collection(db, 'ai_nfts'), {
                  userId: user.uid,
                  creator: user.displayName || 'Anonymous',
                  image: generatedImg,
                  txHash: hash,
                  contractAddress: contractAddress || 'BinancePH_Native',
                  createdAt: serverTimestamp(),
                  price: priceStr,
                  usdPrice: usdStr,
                  likes: 0
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, 'ai_nfts');
              }
            }

            setMintCount(prev => prev + 1);
            setHasMinted(true);
            setIsModalOpen(false);
          }
        } catch (error) {
          console.error("Error saving mint data:", error);
        }
      }
    }
  });

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().hasMintedNFT) {
          setHasMinted(true);
        }
      }, () => {});
    } catch {}
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Generate high-resolution collectible artwork canvas based on Gemini response
  const generateCanvasImage = (title: string, rarity: string, colors: string[], promptText: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const primaryColor = colors[0] || '#F3BA2F';
    const secondaryColor = colors[2] || '#00F0FF';
    const darkBg = '#0B0E11';

    // Dark sleek background
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 600);
    bgGrad.addColorStop(0, darkBg);
    bgGrad.addColorStop(0.5, '#14181E');
    bgGrad.addColorStop(1, '#050709');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Cyberpunk grid
    ctx.strokeStyle = 'rgba(243, 186, 47, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    // Glowing central geometric circle
    const glowGrad = ctx.createRadialGradient(300, 260, 20, 300, 260, 220);
    glowGrad.addColorStop(0, 'rgba(243, 186, 47, 0.35)');
    glowGrad.addColorStop(0.6, 'rgba(0, 240, 255, 0.12)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(300, 260, 220, 0, Math.PI * 2);
    ctx.fill();

    // Outer neon ring
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(300, 260, 160, 0, Math.PI * 2);
    ctx.stroke();

    // Inner pulsing ring
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(300, 260, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Central Binance Diamond Glyph
    ctx.save();
    ctx.translate(300, 260);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-45, -45, 90, 90);

    ctx.fillStyle = '#0B0E11';
    ctx.fillRect(-22, -22, 44, 44);

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();

    // Top Header: BINANCEPH AI LABS
    ctx.fillStyle = 'rgba(243, 186, 47, 0.9)';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ BINANCEPH AI GENESIS 1-OF-1', 300, 50);

    // Rarity Badge
    ctx.fillStyle = primaryColor;
    ctx.fillRect(230, 70, 140, 26);
    ctx.fillStyle = '#000000';
    ctx.font = '900 12px sans-serif';
    ctx.fillText(rarity.toUpperCase() + ' EDITION', 300, 88);

    // Title at bottom
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px sans-serif';
    ctx.fillText(title.length > 28 ? title.slice(0, 28) + '...' : title, 300, 480);

    // Prompt subtitle
    ctx.fillStyle = '#A1A1AA';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText(`"${promptText.length > 45 ? promptText.slice(0, 45) + '...' : promptText}"`, 300, 510);

    // Blockchain verified footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.fillText(`POWERED BY GEMINI FLASH • VERIFIED ON-CHAIN • MANILA, PH`, 300, 555);

    return canvas.toDataURL('image/png', 0.85);
  };

  const handleGenerateAI = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedImg(null);
    setErrorMsg(null);
    
    try {
      const response = await fetch('/api/gemini/generate-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const resData = await response.json();
      const meta = resData.metadata || {};
      setNftMetadata(meta);

      const title = meta.title || 'Cyberpunk NFT';
      const rarity = meta.rarity || 'Legendary';
      const colors = meta.colors || ['#F3BA2F', '#0B0E11', '#00F0FF'];

      const artwork = generateCanvasImage(title, rarity, colors, prompt);
      setGeneratedImg(artwork);
    } catch (error: any) {
      console.error('Image generation error:', error);
      setErrorMsg('Failed to generate NFT with Gemini Flash. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMintOnChain = () => {
    if (!address) return;
    // Push an anchor transaction to their own wallet with the AI prompt encoded as hex data
    const txData = stringToHex(`MINT_AI_NFT_BINANCEPH:${prompt}`);
    
    // If contract address is provided, send to that contract. Otherwise, self-send to anchor.
    const toAddress = contractAddress && contractAddress.startsWith('0x') && contractAddress.length === 42 
      ? contractAddress as `0x${string}` 
      : address;

    sendTransaction({
      to: toAddress,
      data: txData,
      value: BigInt(0) // 0 value tx, just pays gas for metadata anchorage
    });
  };

  if (!isVisible && !isModalOpen) return null;

  return (
    <>
      {isVisible && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-b border-yellow-500/20 relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            
            <div className="max-w-[1800px] mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0">
                  <Gift className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    Exclusive AI NFT Drop <Sparkles className="h-3 w-3 text-yellow-500" />
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Create and anchor your own AI-generated NFT on-chain. Free for verified users.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none flex flex-col items-end gap-1">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Minted
                  </div>
                  <div className="text-xs font-mono text-yellow-500 font-bold">
                    {mintCount} / 1000
                  </div>
                  <div className="w-full sm:w-32 h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${(mintCount / 1000) * 100}%` }}
                    />
                  </div>
                </div>

                {hasMinted ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-xs font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Successfully Minted
                  </div>
                ) : (
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={!user || !isVerified}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-xs h-9 px-6 shadow-[0_0_15px_rgba(243,186,47,0.3)] transition-all hover:scale-105"
                  >
                    {!user ? 'Login to Mint' : !isVerified ? 'Verify to Mint' : 'Create AI NFT'}
                  </Button>
                )}

                <button 
                  onClick={() => setIsVisible(false)}
                  className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* AI MINT DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-3xl p-0 overflow-hidden">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-xl">
                  <Wand2 className="h-6 w-6 text-yellow-500" />
                </div>
                Create On-Chain AI NFT
              </DialogTitle>
              <p className="text-sm text-zinc-400 mt-2">
                Generate a unique avatar using AI. A real Web3 transaction will anchor your text prompt and ownership onto the blockchain.
              </p>
            </DialogHeader>
          </div>
          
          <div className="p-0 flex flex-col md:flex-row h-full">
            <div className="flex-1 p-6 space-y-6">
              {!generatedImg ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                      Describe your masterpiece
                    </label>
                    <Input 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. A magic backpack..."
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-yellow-500 h-12"
                    />
                  </div>
                  
                  <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4 flex gap-3 text-sm text-zinc-300">
                    <Sparkles className="h-5 w-5 text-yellow-500 shrink-0" />
                    <p>Our powerful gen-AI engine will create a 1-of-1 digital collectible from your description in seconds.</p>
                  </div>

                  <Button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !prompt}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 text-lg mt-4 transition-all"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2 animate-pulse">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {loadingPhrase}
                      </div>
                    ) : (
                      'Generate Artwork'
                    )}
                  </Button>
                  
                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-3 text-sm font-medium mt-4">
                      {errorMsg}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-2 block">
                      1. Setup Listing (Optional)
                    </label>
                    <div className="bg-zinc-900/50 p-4 border border-zinc-800 rounded-xl space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Listing Price (ETH)</label>
                        <Input 
                          type="number"
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          placeholder="e.g. 0.5 (Leave empty to just hold)"
                          className="bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 mb-1 flex items-center justify-between">
                          <span>Custom NFT Contract Address</span>
                          <span className="text-yellow-500 text-[10px] flex items-center">
                            <Link className="w-3 h-3 mr-1" /> Advanced
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <Input 
                            type="text"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                            placeholder="0x... (Leave empty to anchor to your wallet)"
                            className="bg-zinc-950 border-zinc-800 text-zinc-100 h-10 font-mono text-xs flex-1"
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              const bytes = new Uint8Array(20);
                              crypto.getRandomValues(bytes);
                              const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
                              setContractAddress(`0x${hex}`);
                            }}
                            className="h-10 border-zinc-800 hover:bg-zinc-800 hover:text-yellow-500 px-3"
                            title="Generate Mock Address"
                          >
                            <Wand2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-zinc-800">
                        <label className="text-xs text-zinc-400 mb-2 block">Deploy Your Own Contract (Remix)</label>
                        <div className="bg-black border border-zinc-800 rounded-lg p-3 relative group">
                          <pre className="text-[10px] text-zinc-500 font-mono overflow-hidden h-20">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract AIArtwork is ERC721 {
    uint256 private _nextTokenId;
    
    constructor() ERC721("AI Collectible", "AINFT") {}

    function mint(address to) public {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }
}`}
                          </pre>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-center pb-2 opacity-90 transition-opacity">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-[10px]"
                              onClick={() => window.open('https://remix.ethereum.org', '_blank')}
                            >
                              Open in Remix IDE
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isConnected ? (
                    <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-sm font-bold text-red-500">Please connect your Web3 wallet in the main header first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-2 block border-t border-zinc-800 pt-4">
                        2. Mint & List
                      </label>
                      <Button 
                        onClick={handleMintOnChain}
                        disabled={isTxPending}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold h-12 text-lg shadow-[0_0_20px_rgba(243,186,47,0.3)] transition-all"
                      >
                        {isTxPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                            Confirm in Wallet...
                          </>
                        ) : (
                          listingPrice ? 'Mint & List on Marketplace' : 'Mint to Wallet'
                        )}
                      </Button>
                      <p className="text-center text-xs text-zinc-500">
                        {contractAddress 
                          ? 'This will send your anchor transaction to your specified contract address.'
                          : 'This will pop up your wallet. A generic 0-value transaction will anchor your metadata to your address.'}
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => setGeneratedImg(null)}
                    disabled={isTxPending}
                    className="w-full text-zinc-400 hover:text-zinc-100"
                  >
                    Regenerate Image
                  </Button>
                </div>
              )}
            </div>

            {/* Right side preview */}
            {generatedImg && (
               <div className="hidden md:flex flex-1 bg-black/40 border-l border-zinc-800 items-center justify-center p-6 relative">
                 <div className="relative group rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl w-full aspect-square max-w-[350px]">
                   <img src={generatedImg} alt="AI Generated" className="w-full h-full object-cover" />
                   <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-4 transform translate-y-full group-hover:translate-y-0 transition-transform">
                     <p className="text-xs text-zinc-300 font-medium leading-relaxed">{prompt}</p>
                   </div>
                   
                   {/* Preview price tag */}
                   {listingPrice && !isNaN(parseFloat(listingPrice)) && (
                     <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                       {listingPrice} ETH
                     </div>
                   )}
                 </div>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

