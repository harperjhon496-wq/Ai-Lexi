import React from 'react';
import { Home, Trophy, Target, CreditCard, User } from 'lucide-react';
import { UserProfile } from '../App';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  profile: UserProfile | null;
}

export function Layout({ children, activeTab, setActiveTab, profile }: LayoutProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'challenges', icon: Trophy, label: 'Quizzes' },
    { id: 'goals', icon: Target, label: 'Goals' },
    { id: 'wallet', icon: CreditCard, label: 'Earnings' },
  ];

  return (
    <div className="min-h-screen bg-[#0F1115] text-white font-sans selection:bg-blue-500/30">
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0F1115]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm">B</span>
          </div>
          <span className="font-bold tracking-tight">Budgee</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1C2026] text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold font-mono">
            ${profile?.walletBalance.toFixed(2) || '0.00'}
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600">
             <User size={16} className="m-auto mt-2 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0F1115]/80 backdrop-blur-2xl border-t border-gray-800/50 px-6 py-4 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300",
                activeTab === tab.id ? "text-blue-500 scale-110" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <tab.icon size={22} className={activeTab === tab.id ? "fill-blue-500/10" : ""} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
