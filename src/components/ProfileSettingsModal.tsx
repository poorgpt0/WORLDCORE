import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Lock, Image as ImageIcon, ShieldCheck, BadgeCheck, Loader2, LogOut, Key } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { auth, db, updateProfile, updatePassword, signOut } from '@/lib/firebase';
import { authService, nativeAuth } from '@/lib/authService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface UserProfileProps {
  user: any;
  onLogout?: () => void;
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'nft' | 'api'>('profile');
  const [username, setUsername] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [isNftOwner, setIsNftOwner] = useState(Boolean(user?.isNftOwner));
  const [verifiedWallet, setVerifiedWallet] = useState<string | null>(user?.verifiedWallet || null);
  const [apiKey, setApiKey] = useState<string | null>(user?.apiKey || null);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfileData() {
      if (user) {
        setUsername(user.displayName || '');
        setPhotoURL(user.photoURL || '');
        if (user.isNftOwner !== undefined) setIsNftOwner(Boolean(user.isNftOwner));
        if (user.verifiedWallet) setVerifiedWallet(user.verifiedWallet);
        if (user.apiKey) setApiKey(user.apiKey);
        
        if (nativeAuth.currentUser) {
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setIsNftOwner(docSnap.data().isNftOwner || false);
              setVerifiedWallet(docSnap.data().verifiedWallet || null);
              if (docSnap.data().photoURL) setPhotoURL(docSnap.data().photoURL);
              if (docSnap.data().apiKey) setApiKey(docSnap.data().apiKey);
            }
          } catch {
            // Use local profile state
          }
        }
      }
    }
    fetchProfileData();
    setSuccessMessage('');
    setErrorMessage('');
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await updateProfile(auth.currentUser, {
        displayName: username,
        photoURL: photoURL
      });
      
      if (nativeAuth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            displayName: username,
            photoURL: photoURL
          });
        } catch {}
      }

      setSuccessMessage('Profile updated successfully!');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!auth.currentUser) return;
    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const newKey = 'bph_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      authService.updateUserFields({ apiKey: newKey });
      if (nativeAuth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            apiKey: newKey
          });
        } catch {}
      }
      setApiKey(newKey);
      setSuccessMessage('New API Key generated successfully!');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to generate API Key.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser) return;
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await updatePassword(auth.currentUser, newPassword);
      setSuccessMessage('Password updated successfully!');
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setErrorMessage('This operation requires recent authentication. Please log out and back in.');
      } else {
        setErrorMessage(error.message || 'Failed to update password.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyWallet = async () => {
    if (!auth.currentUser || !address) return;
    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      authService.updateUserFields({
        isNftOwner: true,
        verifiedWallet: address
      });
      if (nativeAuth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            isNftOwner: true,
            verifiedWallet: address
          });
        } catch {}
      }
      setIsNftOwner(true);
      setVerifiedWallet(address);
      setSuccessMessage('Wallet verified! You are now recognized as an NFT Owner.');
    } catch {
      setErrorMessage('Failed to verify wallet.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setErrorMessage('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const resultString = reader.result as string;
      setPhotoURL(resultString);
      
      if (auth.currentUser) {
        setIsUpdating(true);
        try {
          await updateProfile(auth.currentUser, { photoURL: resultString });
          if (nativeAuth.currentUser) {
            try {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, { photoURL: resultString });
            } catch {}
          }
          setSuccessMessage('Profile photo updated successfully!');
        } catch (error: any) {
          setErrorMessage(error.message || 'Failed to update profile photo.');
        } finally {
          setIsUpdating(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFullLogout = async () => {
    try {
      await signOut(auth);
      if (isConnected) {
        disconnect();
      }
      if (onLogout) onLogout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) return <div className="text-zinc-400 p-8 text-center">Please sign in to view settings.</div>;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden max-w-5xl mx-auto shadow-2xl flex flex-col md:flex-row min-h-[600px]">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-2">
        <h3 className="font-black text-2xl tracking-tighter mb-6 px-2 text-zinc-100">Settings</h3>
        
        <nav className="flex flex-col gap-2 flex-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'profile' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <UserIcon className="h-5 w-5" /> Public Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'security' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Lock className="h-5 w-5" /> Security
          </button>
          <button
            onClick={() => setActiveTab('nft')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'nft' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <ShieldCheck className="h-5 w-5" /> VIP Status
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'api' ? 'bg-yellow-500 text-black shadow-lg' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Key className="h-5 w-5" /> API Keys
          </button>
        </nav>

        <div className="pt-6 border-t border-zinc-800 mt-auto">
          <button
            onClick={handleFullLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" /> Log Out Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 md:p-12">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-sm font-bold flex items-center gap-2">
            <BadgeCheck className="h-5 w-5" /> {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold">
            {errorMessage}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-3xl font-black mb-2 text-zinc-100">Public Profile</h3>
              <p className="text-zinc-500">Manage how you appear on BinancePH Pro trading network.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 bg-zinc-900/50 p-6 border border-zinc-800 rounded-2xl">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 flex items-center justify-center shadow-lg">
                  {photoURL ? (
                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-10 w-10 text-zinc-500" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer"
                >
                  <ImageIcon className="h-8 w-8 text-white" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden" 
                />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1 text-zinc-100">Profile Photo</h4>
                <p className="text-sm text-zinc-500 mb-4">We recommend an image of at least 200x200px. Max 1MB.</p>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-zinc-700 text-zinc-300">
                  Upload New Picture
                </Button>
              </div>
            </div>

            <div className="space-y-6 max-w-xl">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  Username
                  {isNftOwner && (
                    <div className="bg-yellow-500/10 p-0.5 rounded" title="Verified NFT Owner">
                      <BadgeCheck className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </Label>
                <Input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 focus-visible:ring-yellow-500 h-12 text-lg" 
                  placeholder="e.g. CryptoKing99"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Email Address</Label>
                <Input 
                  value={user?.email || ''} 
                  disabled
                  className="bg-zinc-900/50 border-zinc-800 text-zinc-500 opacity-70 h-12 text-lg" 
                />
              </div>
              <Button 
                onClick={handleUpdateProfile} 
                disabled={isUpdating}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 px-8 shadow-[0_0_20px_rgba(243,186,47,0.2)]"
              >
                {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Save Profile Changes
              </Button>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-3xl font-black mb-2 text-zinc-100">Security Settings</h3>
              <p className="text-zinc-500">Ensure your trading account is protected.</p>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 max-w-xl">
              <h4 className="font-bold text-lg mb-4 text-zinc-100">Change Password</h4>
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">New Password</Label>
                  <Input 
                    type="password"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-yellow-500 h-12" 
                    placeholder="Enter strong password"
                  />
                </div>
                
                <div className="pt-4 border-t border-zinc-800">
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdating || newPassword.length < 6}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 w-full"
                  >
                    {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Update Password Session
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NFT VIP TAB */}
        {activeTab === 'nft' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-3xl font-black flex items-center gap-3 mb-2 text-zinc-100">
                NFT VIP Status <BadgeCheck className="h-8 w-8 text-yellow-500" />
              </h3>
              <p className="text-zinc-500">Link your Web3 wallet containing premium NFTs to unlock benefits.</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <BadgeCheck className="w-48 h-48" />
              </div>

              <div className="relative z-10">
                {isNftOwner && verifiedWallet ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                      <BadgeCheck className="h-10 w-10 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-2xl text-green-500 mb-2">Verified NFT Owner</h4>
                      <p className="text-zinc-400">Wallet Linked:</p>
                      <p className="font-mono text-lg text-zinc-200 mt-1 bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 inline-block">
                        {verifiedWallet}
                      </p>
                    </div>
                    <p className="text-sm text-yellow-500 leading-relaxed font-bold bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                      You are officially verified! Your profile features the exclusive VIP badge across all BinancePH leaderboards.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-zinc-300 leading-relaxed text-lg">
                      Ready to claim your VIP badge? Connect your active wallet.
                    </p>
                    {isConnected && address ? (
                      <div className="p-5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <p className="text-sm text-zinc-500 mb-2 uppercase font-bold tracking-wider">Ready to connect:</p>
                        <p className="font-mono text-lg font-bold text-yellow-500 break-all">{address}</p>
                      </div>
                    ) : (
                      <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm font-bold text-red-500">Please connect your Web3 wallet from the main navigation header first.</p>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleVerifyWallet} 
                      disabled={isUpdating || !isConnected || !address}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-14 text-lg w-full shadow-[0_0_20px_rgba(243,186,47,0.2)]"
                    >
                      {isUpdating ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                      Verify Blockchain Ownership
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* API KEYS TAB */}
        {activeTab === 'api' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-3xl font-black mb-2 text-zinc-100 flex items-center gap-3">
                Developer API <Key className="h-8 w-8 text-yellow-500" />
              </h3>
              <p className="text-zinc-500">Manage your private API key for algorithmic trading and automated interactions.</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-xl">
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                    Your Permanent API Key
                  </label>
                  {apiKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-zinc-300 break-all select-all">
                        {apiKey}
                      </div>
                      <p className="text-sm font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                        Keep this key secure. Do not share it or hardcode it in public repositories.
                      </p>
                      <Button 
                        onClick={handleGenerateApiKey} 
                        disabled={isUpdating}
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400 w-full"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Regenerate API Key (Revokes Old)
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-zinc-300">You don't have an active API key yet.</p>
                      <Button 
                        onClick={handleGenerateApiKey} 
                        disabled={isUpdating}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-12 w-full"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Generate Permanent API Key
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
