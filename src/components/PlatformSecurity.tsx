import { ShieldCheck, Lock, Server, Fingerprint, Activity } from 'lucide-react';

export function PlatformSecurity() {
  return (
    <div className="max-w-5xl mx-auto w-full py-8 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-tight">
          Enterprise-Grade <span className="text-green-500">Security</span>
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          User protection is our top priority. Our platform incorporates rigorous security protocols, real-time monitoring, and comprehensive risk management systems.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
              <Server className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Cold Storage</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The vast majority of user funds and crypto assets are safely stored in offline, air-gapped cold storage facilities. This prevents unauthorized network access and isolates digital assets from vulnerabilities.
          </p>
        </div>

        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
              <ShieldCheck className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">SAFU Fund</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We maintain a Secure Asset Fund for Users (SAFU), dedicating a portion of all trading fees to a cold wallet. This emergency insurance fund offers extreme protection to users in unforeseen catastrophe events.
          </p>
        </div>

        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Fingerprint className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Identity Verification</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            We adhere to strict KYC (Know Your Customer) and AML (Anti-Money Laundering) practices. Linking Web3 wallets helps us build a highly verified, Sybil-resistant trading network.
          </p>
        </div>

        <div className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <Activity className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Real-Time Risk Engine</h3>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Our AI-powered monitoring systems evaluate thousands of signals every second to detect suspicious behavior, prevent market manipulation, and block unauthorized withdrawal attempts instantly.
          </p>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl text-center flex flex-col items-center">
        <Lock className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-2xl font-black text-zinc-100 mb-2">Your Security, Enhanced</h3>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto mb-6">
          Security is a shared responsibility. We highly recommend all users enable Multi-Factor Authentication (MFA), use strong unique passwords, and consider hardware keys for the highest level of account protection.
        </p>
        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/20 transition-all uppercase tracking-wider text-sm">
          Set Up 2FA Now
        </button>
      </div>
    </div>
  );
}
