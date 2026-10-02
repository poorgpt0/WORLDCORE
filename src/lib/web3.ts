import { http, createConfig } from 'wagmi';
import { mainnet, bsc, polygon, arbitrum, optimism, base } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Public Project ID for demo purposes - in production, users should use their own
const projectId = 'c02f90d4983a064199a224957097e698'; 

export const config = createConfig({
  chains: [bsc, mainnet, polygon, arbitrum, optimism, base],
  connectors: [
    injected(), // EIP-6963 discovery
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    injected({
      target: 'trust',
      shimDisconnect: true,
    }),
    injected({
      target: () => ({
        id: 'binanceWallet',
        name: 'Binance Web3 Wallet',
        provider: typeof window !== 'undefined' ? (window as any).BinanceChain : undefined,
      }),
    }),
    coinbaseWallet({ 
      appName: 'BinancePH Pro',
      preference: { options: 'all' }, // changed from smartWalletOnly to all to support extension
    }),
    walletConnect({ 
      projectId,
      showQrModal: true,
      metadata: {
        name: 'BinancePH Pro',
        description: 'Professional Crypto Trading Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://binanceph.ai',
        icons: ['https://bin.bnbstatic.com/static/images/common/favicon.ico'],
      },
      // Enhance modal styling to match the Binance Dark theme
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-font-family': 'sans-serif',
          '--wcm-accent-color': '#F3BA2F',
          '--wcm-accent-fill-color': '#000000',
          '--wcm-background-color': '#0B0E11',
        }
      }
    }),
  ],
  transports: {
    [bsc.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
});
