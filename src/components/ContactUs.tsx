import { Mail, MessageCircle, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ContactUs() {
  return (
    <div className="max-w-6xl mx-auto w-full py-8 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black text-zinc-100 uppercase tracking-tight">
          Get in <span className="text-yellow-500">Touch</span>
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Our global support team is available 24/7 to assist you. Whether you have a question about your account, an API issue, or institutional inquiries, we're here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Contact Info */}
        <div className="col-span-1 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 mb-1">Email Support</h4>
              <p className="text-sm text-zinc-400 mb-2">Typically replies in 2-4 hours.</p>
              <a href="mailto:support@binanceph.ai" className="text-sm font-mono text-yellow-500 hover:underline">support@binanceph.ai</a>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 mb-1">Live Chat</h4>
              <p className="text-sm text-zinc-400 mb-2">Available 24/7 for VIP users.</p>
              <button className="text-sm font-bold text-green-500 hover:text-green-400 transition-colors uppercase tracking-wider">Start Chat</button>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-100 mb-1">Headquarters</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                123 Crypto Tower, BGC<br/>
                Taguig City, Metro Manila<br/>
                Philippines 1634
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="col-span-1 md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-3xl p-8">
          <h3 className="text-2xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            Send us a message <Send className="w-5 h-5 text-yellow-500" />
          </h3>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                <Input placeholder="John Doe" className="bg-zinc-900 border-zinc-800 h-12 focus-visible:ring-yellow-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                <Input type="email" placeholder="john@example.com" className="bg-zinc-900 border-zinc-800 h-12 focus-visible:ring-yellow-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Subject Category</label>
              <select className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md h-12 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="account">Account Access</option>
                <option value="deposit">Deposit & Withdrawal</option>
                <option value="api">API Issue</option>
                <option value="feedback">General Feedback</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Message</label>
              <textarea 
                rows={6}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <Button className="w-full bg-yellow-500 text-black font-bold h-12 hover:bg-yellow-600 text-base">
              Submit Ticket
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
