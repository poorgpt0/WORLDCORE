import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { authService, nativeAuth } from '@/lib/authService';

interface SecurityVerificationProps {
  onVerify: () => void;
  onCancel: () => void;
  email?: string | null;
}

export function SecurityVerification({ onVerify, onCancel }: SecurityVerificationProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (index: number, value: string) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      return;
    }

    // Support pasting or typing multiple digits
    if (cleanVal.length > 1) {
      const digits = cleanVal.slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, idx) => {
        if (index + idx < 6) newCode[index + idx] = d;
      });
      setCode(newCode);
      const nextFocusIndex = Math.min(index + digits.length, 5);
      document.getElementById(`code-${nextFocusIndex}`)?.focus();
      setError(null);
      return;
    }

    const newCode = [...code];
    newCode[index] = cleanVal;
    setCode(newCode);
    setError(null);

    if (cleanVal && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleAutoFill = () => {
    setCode(['1', '2', '3', '4', '5', '6']);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter a complete 6-digit security PIN.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      authService.verifyUser();
      if (nativeAuth.currentUser) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            isVerified: true,
            lastLogin: serverTimestamp()
          });
        } catch {
          // Non-fatal fallback
        }
      }
      onVerify();
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(243,186,47,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
        
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-6 border border-yellow-500/20 rotate-3">
            <Lock className="h-10 w-10 text-yellow-500 -rotate-3" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Advanced Security</h2>
          <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
            Your account is protected by BinancePH Shield. <br/>
            Enter any 6-digit security PIN to unlock your session.
          </p>
          
          <div className="mt-4 flex items-center gap-2">
            <div className="px-3.5 py-1.5 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs text-zinc-400 font-mono">Device: Authorized</span>
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              className="px-3.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl border border-yellow-500/30 text-xs text-yellow-500 font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Auto-Fill PIN
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {code.map((digit, idx) => (
              <Input
                key={idx}
                id={`code-${idx}`}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-12 h-16 text-center text-2xl font-bold bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 focus-visible:border-yellow-500 transition-all"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                required
              />
            ))}
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-red-500 text-center font-medium bg-red-500/10 py-2 rounded-lg border border-red-500/20"
            >
              {error}
            </motion.p>
          )}

          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-7 text-lg rounded-2xl shadow-lg shadow-yellow-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Securing...</span>
                </div>
              ) : (
                <>
                  Unlock Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 py-6 rounded-xl"
              onClick={onCancel}
            >
              Cancel & Sign Out
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-zinc-900/50 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Protected by BinancePH 2FA Shield
          </p>
        </div>
      </motion.div>
    </div>
  );
}

