import { Search, Book, ShieldAlert, Wallet, CreditCard, LifeBuoy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function HelpCenter() {
  const categories = [
    { icon: <Wallet className="w-6 h-6 text-yellow-500" />, title: 'Crypto Deposits/Withdrawals', desc: 'Find guides on how to transfer funds.' },
    { icon: <ShieldAlert className="w-6 h-6 text-green-500" />, title: 'Security Verification', desc: 'MFA setup, KYC guidelines, and account protection.' },
    { icon: <Book className="w-6 h-6 text-blue-500" />, title: 'Spot Trading Guide', desc: 'Learn the fundamentals of order types and charts.' },
    { icon: <CreditCard className="w-6 h-6 text-purple-500" />, title: 'Fiat Channels', desc: 'Linking bank accounts and processing withdrawals.' },
  ];

  const faqs = [
    { q: 'How do I complete my KYC verification?', a: 'Go to your Profile tab after signing in, click on Security Verification, and follow the on-screen prompts.' },
    { q: 'What are the withdrawal limits?', a: 'Standard tier users have a 2 BTC daily limit. VIP 1 users can withdraw up to 100 BTC equivalent per day.' },
    { q: 'How does the SAFU fund protect me?', a: 'We allocate 10% of all trading fees to our Secure Asset Fund for Users, stored in cold wallets for emergency insurance.' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-8 space-y-12">
      <div className="text-center space-y-6 pt-8 pb-12 border-b border-zinc-900">
        <h1 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-tight">
          How can we <span className="text-yellow-500">help you?</span>
        </h1>
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
          <Input 
            placeholder="Search for articles, guides, or troubleshooting..." 
            className="w-full pl-12 h-14 bg-zinc-900 border-zinc-800 text-lg rounded-xl focus-visible:ring-yellow-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, i) => (
          <Card key={i} className="bg-zinc-950 border-zinc-800 p-6 flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors cursor-pointer group">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {cat.icon}
            </div>
            <h3 className="font-bold text-zinc-100 mb-2">{cat.title}</h3>
            <p className="text-sm text-zinc-500">{cat.desc}</p>
          </Card>
        ))}
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
          <LifeBuoy className="text-yellow-500" /> Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-zinc-800/50 pb-6 last:border-0 last:pb-0">
              <h4 className="text-lg font-bold text-zinc-200 mb-2">{faq.q}</h4>
              <p className="text-zinc-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Cannot find what you are looking for?</span>
          <Button className="bg-zinc-800 hover:bg-zinc-700 text-yellow-500 font-bold">Contact Support</Button>
        </div>
      </div>
    </div>
  );
}
