import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Phone, ShieldCheck } from 'lucide-react';

export function AuthModal({ defaultTab = 'signin' }: { defaultTab?: 'signin' | 'signup' | 'phone' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (!open) {
      // Cleanup when modal closes
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = null;
      }
      setConfirmationResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const getErrorMessage = (err: any) => {
    const msg = err?.code || err?.message || '';
    if (msg.includes('operation-not-allowed')) {
      return 'Email/password registration is not enabled on this Firebase project. Please use the "Continue with Google" button above for instant 1-click sign-in and account creation.';
    }
    if (msg.includes('email-already-in-use')) return 'This email is already registered. Please sign in with Google or your account.';
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) return 'Invalid email or password.';
    if (msg.includes('weak-password')) return 'Password should be at least 6 characters.';
    if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
    if (msg.includes('too-many-requests')) return 'Too many failed attempts. Please try again later.';
    if (msg.includes('invalid-verification-code')) return 'Invalid verification code. Please check and try again.';
    if (msg.includes('invalid-phone-number')) return 'Invalid phone number format. Include country code (e.g., +63).';
    if (msg.includes('popup-closed-by-user')) return 'Google Sign-in was cancelled. Please try again.';
    return err?.message || 'An unexpected error occurred. Please try again.';
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setOpen(false);
    } catch (err: any) {
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn("Sign In notice:", err);
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      setOpen(false);
    } catch (err: any) {
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn("Sign Up notice:", err);
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
    } catch (err: any) {
      if (err?.code !== 'auth/operation-not-allowed') {
        console.warn("Phone Sign In notice:", err);
      }
      setError(getErrorMessage(err));
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(verificationCode);
      setOpen(false);
    } catch (err: any) {
      console.warn("Code Verification notice:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
      setOpen(false);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.warn("Google Sign In notice:", err);
      }
      setError(getErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(
        buttonVariants({ variant: defaultTab === 'signup' ? 'default' : 'ghost' }), 
        defaultTab === 'signup' ? "bg-yellow-500 hover:bg-yellow-600 text-black font-bold" : "text-zinc-400 hover:text-zinc-100"
      )}>
        {defaultTab === 'signup' ? 'Sign Up' : 'Sign In'}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Security First Trading</DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            {confirmationResult ? 'Enter the code sent to your phone.' : 'Choose your preferred secure login method.'}
          </DialogDescription>
        </DialogHeader>

        <div id="recaptcha-container"></div>

        {/* Primary Recommended Auth Provider */}
        {!confirmationResult && (
          <div className="mt-4 space-y-3">
            <Button 
              variant="outline" 
              className="w-full border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-500 font-bold h-12 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(243,186,47,0.15)] flex items-center justify-center gap-2 group cursor-pointer"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                  <span>Connecting Google Account...</span>
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
                  <span>Continue with Google (Recommended)</span>
                </>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800"></span>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-zinc-950 px-3 text-zinc-500 font-mono">or manual credential login</span>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue={defaultTab} className="w-full">
          {!confirmationResult && (
            <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
              <TabsTrigger value="signin">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="phone" className="space-y-4 mt-6">
            {!confirmationResult ? (
              <form onSubmit={handlePhoneSignIn} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      type="tel"
                      placeholder="+63 912 345 6789"
                      className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Enter your phone number with country code.</p>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={loading}>
                  {loading ? 'Sending SMS...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      type="text"
                      placeholder="6-digit code"
                      className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-zinc-500"
                  onClick={() => setConfirmationResult(null)}
                >
                  Change Phone Number
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="signin" className="space-y-4 mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 space-y-2">
                  <p className="text-xs text-red-400">{error}</p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="w-full border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-400 font-bold text-xs h-8"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? 'Connecting...' : '⚡ Continue with Google (1-Click)'}
                  </Button>
                </div>
              )}
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Password"
                    className="pl-10 bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 space-y-2">
                  <p className="text-xs text-red-400">{error}</p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="w-full border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-400 font-bold text-xs h-8"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? 'Connecting...' : '⚡ Continue with Google (1-Click)'}
                  </Button>
                </div>
              )}
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
