import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Challenges } from './components/Challenges';
import { Goals } from './components/Goals';
import { Wallet } from './components/Wallet';
import { LogIn, Wallet as WalletIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  walletBalance: number;
  bankAccountLinked: boolean;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'challenges' | 'goals' | 'wallet'>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for profile changes (especially wallet balance)
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Initialize new user
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              walletBalance: 0,
              bankAccountLinked: false,
            };
            setDoc(userRef, { ...newProfile, updatedAt: new Date().toISOString() });
            setProfile(newProfile);
          }
        });
        
        return () => unsubProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1115] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0F1115] p-6 text-center">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20"
        >
          <WalletIcon size={48} className="text-white" />
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Budgee</h1>
        <p className="text-gray-400 mb-8 max-w-xs">
          The gamified way to master your finances. Sync your bank, take challenges, and earn real rewards.
        </p>
        <button
          onClick={login}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-colors w-full max-w-sm"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard profile={profile} />;
      case 'challenges': return <Challenges profile={profile} />;
      case 'goals': return <Goals profile={profile} />;
      case 'wallet': return <Wallet profile={profile} accessToken={accessToken} />;
      default: return <Dashboard profile={profile} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} profile={profile}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="pb-24"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
