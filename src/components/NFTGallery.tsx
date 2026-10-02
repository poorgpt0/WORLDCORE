import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Heart, Sparkles, Image as ImageIcon, Tag, Hash, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

interface NFTItem {
  id: string;
  title: string;
  creator: string;
  price: string;
  usdPrice: string;
  image: string;
  likes: number;
  trending: boolean;
  txHash?: string;
  isAiGen?: boolean;
}

// Initial Mock NFTs
const INITIAL_NFTS: NFTItem[] = [
  {
    id: '1',
    title: 'Golden BNB #001',
    creator: '@binance_labs',
    price: '2.5 BNB',
    usdPrice: '$1,450.00',
    image: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=800&q=80',
    likes: 342,
    trending: true
  },
  {
    id: '2',
    title: 'Cyber Ape #921',
    creator: '@ape_studios',
    price: '0.8 ETH',
    usdPrice: '$2,800.00',
    image: 'https://images.unsplash.com/photo-1618172193763-c511deb635fa?w=800&q=80',
    likes: 894,
    trending: true
  },
  {
    id: '3',
    title: 'Neon Bull Run',
    creator: '@crypto_art',
    price: '500 USDT',
    usdPrice: '$500.00',
    image: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=800&q=80',
    likes: 125,
    trending: false
  },
  {
    id: '4',
    title: 'Diamond Hands',
    creator: '@hodl_king',
    price: '1.2 BNB',
    usdPrice: '$696.00',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f4fc8bc?w=800&q=80',
    likes: 450,
    trending: true
  }
];

export function NFTGallery() {
  const [filter, setFilter] = useState<'all' | 'ai' | 'trending'>('all');
  const [nfts, setNfts] = useState<NFTItem[]>(INITIAL_NFTS);
  const [selectedNft, setSelectedNft] = useState<NFTItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch AI generated NFTs from users
  useEffect(() => {
    async function fetchAiNfts() {
      setIsLoading(true);
      try {
        const nftsRef = collection(db, 'ai_nfts');
        const q = query(nftsRef, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        const aiNfts: NFTItem[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.image) {
            aiNfts.push({
              id: doc.id,
              title: 'AI Gen Avatar',
              creator: data.creator || 'Anonymous',
              price: 'Not for Sale',
              usdPrice: '-',
              image: data.image,
              likes: data.likes || 0,
              trending: true,
              txHash: data.txHash,
              isAiGen: true
            });
          }
        });

        // Combine DB NFTs and Mock NFTs
        setNfts([...aiNfts, ...INITIAL_NFTS]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'ai_nfts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAiNfts();
  }, []);

  const filteredNFTs = nfts.filter(nft => {
    if (filter === 'trending') return nft.trending;
    if (filter === 'ai') return nft.isAiGen;
    return true;
  });

  return (
    <div className="w-full">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-100 flex items-center gap-3">
            Premium NFTs <Sparkles className="h-6 w-6 text-yellow-500" />
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Discover elite assets and user-generated AI collections.</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
              filter === 'all' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('ai')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'ai' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" /> AI Creations
          </button>
          <button
            onClick={() => setFilter('trending')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              filter === 'trending' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔥 Trending
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20">
          <RefreshCcw className="h-8 w-8 text-yellow-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredNFTs.map((nft, idx) => (
            <motion.div
              key={`${nft.id}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedNft(nft)}
              className="group block bg-zinc-900/40 border border-zinc-800 hover:border-yellow-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/10 cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden bg-zinc-950">
                <img 
                  src={nft.image} 
                  alt={nft.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                    View Details
                  </Button>
                </div>

                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-white/10">
                  <Heart className="h-3.5 w-3.5 text-zinc-300 group-hover:text-red-500 transition-colors" />
                  <span className="text-xs font-bold text-zinc-200">{nft.likes}</span>
                </div>
                
                {nft.isAiGen && (
                  <div className="absolute top-4 left-4 bg-yellow-500 text-black rounded-md px-2 py-1 flex items-center gap-1 font-bold text-[10px] uppercase">
                    <Sparkles className="h-3 w-3" /> Gen AI
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-100 group-hover:text-yellow-500 transition-colors">{nft.title}</h3>
                    <p className="text-sm text-zinc-500">{nft.creator}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-zinc-800">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Price</p>
                    <p className="text-sm font-mono font-bold text-zinc-100">{nft.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-zinc-500">{nft.usdPrice}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* DETAILED NFT MODAL */}
      <Dialog open={!!selectedNft} onOpenChange={() => setSelectedNft(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-3xl p-0 overflow-hidden">
          {selectedNft && (
            <div className="grid grid-cols-1 md:grid-cols-2 h-full max-h-[80vh]">
              {/* Image Side */}
              <div className="bg-zinc-900 border-r border-zinc-800 relative flex items-center justify-center p-6 min-h-[300px]">
                <img 
                  src={selectedNft.image} 
                  alt={selectedNft.title} 
                  className="max-w-full max-h-full rounded-xl shadow-2xl"
                />
                {selectedNft.isAiGen && (
                  <div className="absolute top-4 left-4 bg-yellow-500 text-black rounded-md px-2 py-1 flex items-center gap-1 font-bold text-xs uppercase shadow-lg">
                    <Sparkles className="h-4 w-4" /> BinancePH AI Engine
                  </div>
                )}
              </div>

              {/* Data Side */}
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-zinc-100 mb-2">{selectedNft.title}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-zinc-500" />
                    </div>
                    <span className="text-zinc-400 font-medium">Owned by <span className="text-yellow-500 font-bold">{selectedNft.creator}</span></span>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Current Price</p>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-mono font-bold">{selectedNft.price}</span>
                    <span className="text-zinc-500 font-mono">{selectedNft.usdPrice}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 shadow-[0_0_20px_rgba(243,186,47,0.2)]">
                      Make Offer
                    </Button>
                    <Button variant="outline" className="flex-1 border-zinc-700 h-12 font-bold">
                      <Heart className="h-4 w-4 mr-2" /> Add to Watchlist
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex items-center gap-2 font-bold text-sm">
                      <Tag className="h-4 w-4 text-zinc-400" /> Properties
                    </div>
                    <div className="p-4 bg-zinc-900/30 grid grid-cols-2 gap-3">
                      <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                        <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-widest mb-1">Rarity</p>
                        <p className="text-sm font-bold">{selectedNft.isAiGen ? '1 of 1' : 'Epic'}</p>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                        <p className="text-[10px] text-yellow-500 uppercase font-bold tracking-widest mb-1">Platform</p>
                        <p className="text-sm font-bold">Binance Smart Chain</p>
                      </div>
                    </div>
                  </div>

                  {selectedNft.txHash && (
                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                      <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex items-center gap-2 font-bold text-sm">
                        <Hash className="h-4 w-4 text-zinc-400" /> On-Chain Record
                      </div>
                      <div className="p-4 bg-zinc-900/30">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500">Transaction Hash</span>
                          <a href={`https://basescan.org/tx/${selectedNft.txHash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono text-xs">
                            {selectedNft.txHash.substring(0, 10)}... <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
