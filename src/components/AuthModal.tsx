import React, { useState, useEffect } from 'react';
import { authService } from '@/lib/authService';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Phone, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export function AuthModal({ defaultTab = 'signin' }: { defaultTab?: 'signin' | 'signup' | 'phone' }) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'phone'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'number' | 'code'>('number');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setError(null);
      setSuccess(null);
      setLoading(false);
      setGoogleLoading(false);
    } else {
      // Clear sensitive fields when closed
      setError(null);
      setSuccess(null);
      setPhoneStep('number');
    }
  }, [open, defaultTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authService.signIn(email, password);
      setSuccess('Signed in successfully! Redirecting...');
      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (err: any) {
      console.warn('Sign In error:', err);
      setError(err?.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authService.signUp(email, password, displayName || email.split('@')[0]);
      setSuccess('Account created successfully! Welcome to BinancePH.');
      setTimeout(() => {
        setOpen(false);
      }, 600);
    } catch (err: any) {
      console.warn('Sign Up error:', err);
      setError(err?.message || 'Failed to create account. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    
    // Simulate SMS verification code send
    setTimeout(() => {
      setPhoneStep('code');
      setLoading(false);
      setSuccess('SMS verification code sent to ' + phoneNumber);
    }, 800);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.signInWithPhone(phoneNumber, verificationCode);
      setSuccess('Phone verified! Signing in...');
      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await authService.signInWithGoogle();
      setSuccess('Signed in with Google!');
      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (err: any) {
      console.warn('Google Sign In error:', err);
      setError(err?.message || 'Google sign-in was cancelled or encountered an error.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('randyalcaide2@gmail.com');
    setPassword('BinancePH2026!');
    setDisplayName('Randy Alcaide');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(
        buttonVariants({ variant: defaultTab === 'signup' ? 'default' : 'ghost' }), 
        defaultTab === 'signup' ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-lg shadow-yellow-500/20" : "text-zinc-300 hover:text-white hover:bg-zinc-900"
      )}>
        {defaultTab === 'signup' ? 'Sign Up' : 'Sign In'}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[420px] p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="mx-auto w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center mb-1 shadow-inner">
            <span className="text-yellow-500 font-black text-2xl">B</span>
          </div>
          <DialogTitle className="text-2xl font-black text-center tracking-tight">
            {activeTab === 'signup' ? 'Create an Account' : activeTab === 'phone' ? 'Phone Verification' : 'Welcome to BinancePH'}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-zinc-400">
            {activeTab === 'signup' 
              ? 'Start trading crypto and exploring Web3 NFTs in minutes.' 
              : 'Sign in to access live spot trading, your portfolio, and wallet.'}
          </DialogDescription>
        </DialogHeader>

        {/* 1-Click Google Sign-In Button */}
        <div className="mt-2 space-y-3">
          <Button 
            type="button"
            variant="outline" 
            className="w-full border-zinc-700 bg-zinc-900/80 hover:bg-zinc-850 hover:border-yellow-500/50 text-zinc-100 font-bold h-11 rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                <span>Connecting with Google...</span>
              </div>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google (1-Click)</span>
              </>
            )}
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-zinc-950 px-2.5 text-zinc-500 font-mono">or email credentials</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val as any);
            setError(null);
            setSuccess(null);
          }} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800/80 p-1 rounded-xl">
            <TabsTrigger 
              value="signin" 
              className="text-xs font-bold py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="text-xs font-bold py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500"
            >
              Sign Up
            </TabsTrigger>
            <TabsTrigger 
              value="phone" 
              className="text-xs font-bold py-1.5 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-500"
            >
              Phone SMS
            </TabsTrigger>
          </TabsList>

          {/* Feedback Messages */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-400 leading-relaxed animate-in fade-in duration-200">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 rounded-xl bg-green-950/40 border border-green-500/30 text-xs text-green-400 flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
              <span>{success}</span>
            </div>
          )}

          {/* SIGN IN TAB */}
          <TabsContent value="signin" className="space-y-4 mt-4">
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="text-[10px] text-yellow-500 hover:text-yellow-400 font-mono transition-colors"
                  >
                    Use Sample Account
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Enter password"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11 font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold h-11 rounded-xl shadow-lg shadow-yellow-500/10 text-sm mt-2" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In to Account'}
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-zinc-500">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setError(null);
                    }}
                    className="text-yellow-500 font-bold hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          </TabsContent>

          {/* SIGN UP TAB */}
          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="e.g. Satoshi Nakamoto"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11 font-mono"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold h-11 rounded-xl shadow-lg shadow-yellow-500/10 text-sm mt-2" 
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-zinc-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setError(null);
                    }}
                    className="text-yellow-500 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          </TabsContent>

          {/* PHONE TAB */}
          <TabsContent value="phone" className="space-y-4 mt-4">
            {phoneStep === 'number' ? (
              <form onSubmit={handlePhoneSignIn} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      type="tel"
                      placeholder="+63 912 345 6789"
                      className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11 font-mono"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Includes international country code.</p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold h-11 rounded-xl text-sm" 
                  disabled={loading}
                >
                  {loading ? 'Sending code...' : 'Send SMS Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">6-Digit SMS Code</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="123456"
                      className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 text-zinc-100 h-11 font-mono tracking-widest text-center"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      maxLength={6}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold h-11 rounded-xl text-sm" 
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify Code & Sign In'}
                </Button>
                <button
                  type="button"
                  onClick={() => setPhoneStep('number')}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1"
                >
                  Change phone number
                </button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
