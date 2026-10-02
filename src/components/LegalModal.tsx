import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText, Cookie } from 'lucide-react';

export type LegalPolicyType = 'privacy' | 'terms' | 'cookies' | null;

interface LegalModalProps {
  type: LegalPolicyType;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  const getTitle = () => {
    switch (type) {
      case 'privacy': return { title: 'Privacy Policy', icon: <Shield className="w-5 h-5 text-yellow-500" /> };
      case 'terms': return { title: 'Terms of Service', icon: <FileText className="w-5 h-5 text-yellow-500" /> };
      case 'cookies': return { title: 'Cookie Policy', icon: <Cookie className="w-5 h-5 text-yellow-500" /> };
    }
  };

  const { title, icon } = getTitle();

  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            {icon} {title}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Last updated: April 2026
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="prose prose-invert prose-yellow max-w-none text-zinc-300 text-sm leading-relaxed space-y-6 pb-8">
            
            {type === 'privacy' && (
              <>
                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">1. Information We Collect</h3>
                  <p>When you use BinancePH Pro, we may collect the following types of information:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Account Information:</strong> Email address, username, profile picture (if uploaded), and authentication data provided via Google/Firebase Auth.</li>
                    <li><strong>Wallet Information:</strong> Public cryptographic wallet addresses (e.g., Ethereum) when you connect your Web3 wallet and verify NFT ownership.</li>
                    <li><strong>User-Generated Content:</strong> Text prompts used for AI generation, generated images, and metadata associated with NFTs you mint on our platform.</li>
                    <li><strong>Usage Data:</strong> Analytics on how you interact with our trading interfaces, NFT galleries, and platform features.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">2. How We Use Your Information</h3>
                  <p>We use the collected information to:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Provide, secure, and improve our services (including AI-driven NFT minting and trading analytics).</li>
                    <li>Verify blockchain asset ownership to unlock VIP features.</li>
                    <li>Communicate with you regarding account updates, security alerts, and platform news.</li>
                    <li>Ensure the integrity of the platform and prevent fraud.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">3. Public Blockchain Data</h3>
                  <p>Please note that any transactions made on public blockchains (like minting an AI NFT) are immutable and publicly visible. BinancePH Pro does not control the blockchain networks and cannot erase data written to them. When you mint an NFT, your public address and associated metadata become part of the permanent public ledger.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">4. Data Sharing and Security</h3>
                  <p>We do not sell your personal data to third parties. Data is secured using industry-standard protocols via Google Cloud and Firebase. We may share data with service providers (like Pollinations AI for image generation) strictly for performing platform operations.</p>
                </section>
              </>
            )}

            {type === 'terms' && (
              <>
                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">1. Acceptance of Terms</h3>
                  <p>By accessing or using the BinancePH Pro platform ("Platform"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">2. Platform Services</h3>
                  <p>BinancePH Pro acts as a simulated trading environment and AI NFT creation hub. While we display real-time market data sourced from Binance WebSockets, the platform itself does not currently facilitate real monetary trading or host a custodial exchange. Web3 wallet connections are used for identity verification and non-financial on-chain anchoring.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">3. AI NFT Generation & Ownership</h3>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Content Rules:</strong> You agree not to input prompts designed to generate illegal, hateful, sexually explicit, or heavily copyrighted imagery.</li>
                    <li><strong>Ownership:</strong> Once generated and minted via your Web3 wallet, the resulting digital asset anchor is owned by your cryptographic address. You are responsible for any gas fees associated with blockchain transactions (though current implementation focuses on zero-value or testnet anchoring).</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">4. User Account & Security</h3>
                  <p>You are responsible for safeguarding the password and Web3 wallet seed phrases you use to access the Platform. BinancePH Pro will never ask for your seed phrases or private keys. Any loss of assets due to compromised personal security is the sole responsibility of the user.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">5. Disclaimer of Warranties</h3>
                  <p>The Platform is provided "as is" and "as available". We make no warranties, expressed or implied, regarding the accuracy of real-time trading data, the continued availability of the AI generation tools, or the immutability of testnet assets.</p>
                </section>
              </>
            )}

            {type === 'cookies' && (
              <>
                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">1. What Are Cookies?</h3>
                  <p>Cookies are small text files stored on your device when you visit a website. They are widely used to make websites work efficiently, remember your preferences, and provide analytical data to the site owners.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">2. How We Use Cookies</h3>
                  <p>BinancePH Pro uses cookies for the following purposes:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Strictly Necessary Cookies:</strong> Essential for the platform to function. This includes session management via Firebase Authentication and persistent connection states for your Web3 Wallet (e.g., WalletConnect sessions).</li>
                    <li><strong>Preference Cookies:</strong> Used to remember your choices (like your active tab, theming preferences, or dismissed banners).</li>
                    <li><strong>Performance/Analytics Cookies:</strong> Help us understand how users interact with the app, identify errors, and optimize the trading UI.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">3. Third-Party Integrations</h3>
                  <p>When using features like Web3 wallet connections or real-time WebSocket feeds, our authorized partners (e.g., WalletConnect network nodes, Binance public APIs) may also set necessary cookies or local storage objects to maintain secure connection channels.</p>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">4. Managing Your Cookies</h3>
                  <p>You can control and/or delete cookies as you wish using your browser settings. However, disabling strictly necessary cookies will prevent you from logging in, retaining your Web3 wallet connection, or accessing the VIP NFT features.</p>
                </section>
              </>
            )}

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
