import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

export function Dashboard({ profile }: { profile: UserProfile | null }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [aiTips, setAiTips] = useState<string>('');
  const [loadingTips, setLoadingTips] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'users', profile.uid, 'transactions'),
      orderBy('date', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
    return () => unsub();
  }, [profile]);

  const syncBank = async () => {
    if (!profile) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/bank/sync', { method: 'POST' });
      const data = await res.json();
      
      // Save to Firestore
      for (const tx of data.transactions) {
        await addDoc(collection(db, 'users', profile.uid, 'transactions'), {
          ...tx,
          userId: profile.uid,
          date: serverTimestamp()
        });
      }
      alert('Bank sync successful! Transactions imported.');
    } catch (error) {
      console.error(error);
      alert('Failed to sync bank.');
    } finally {
      setSyncing(false);
    }
  };

  const getAiInsights = async () => {
    setLoadingTips(true);
    try {
      const res = await fetch('/api/gemini/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, transactions }),
      });
      const data = await res.json();
      setAiTips(data.tips);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTips(false);
    }
  };

  const chartData = [
    { name: 'Rent', value: 1200, color: '#3B82F6' },
    { name: 'Food', value: 450, color: '#10B981' },
    { name: 'Travel', value: 300, color: '#F59E0B' },
    { name: 'Fun', value: 150, color: '#EF4444' },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header Stat */}
      <div className="space-y-1">
        <p className="text-gray-400 text-sm font-medium">Total Balance</p>
        <div className="flex items-end gap-2">
           <h2 className="text-3xl font-bold tracking-tighter">$4,250.75</h2>
           <span className="text-green-500 text-xs font-bold mb-1.5">+2.4%</span>
        </div>
      </div>

      {/* Chart Section */}
      <section className="bg-[#1C2026] p-4 rounded-3xl border border-gray-800/50">
        <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider">Spending by Category</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#111827', border: 'none', borderRadius: '12px' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={syncBank}
          disabled={syncing}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-4 rounded-2xl transition-all"
        >
          <RefreshCcw size={18} className={syncing ? "animate-spin" : ""} />
          <span className="font-bold text-sm">Sync Bank</span>
        </button>
        <button 
          onClick={getAiInsights}
          className="flex items-center justify-center gap-2 bg-[#1C2026] border border-gray-700 hover:bg-gray-800 py-4 rounded-2xl transition-all"
        >
          <Sparkles size={18} className="text-yellow-400" />
          <span className="font-bold text-sm">AI Insights</span>
        </button>
      </div>

      {/* AI Tips Display */}
      {aiTips && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={64} />
          </div>
          <h4 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
            AI Suggestions
          </h4>
          <div className="text-sm text-gray-300 prose prose-invert max-w-none prose-sm">
            <Markdown>{aiTips}</Markdown>
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Recent Activity</h3>
          <button className="text-xs text-blue-500 font-bold uppercase tracking-widest">View All</button>
        </div>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between bg-[#1C2026]/50 p-4 rounded-2xl border border-gray-800/30">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  tx.type === 'income' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div>
                  <p className="font-bold text-sm">{tx.description}</p>
                  <p className="text-gray-500 text-xs">{tx.category}</p>
                </div>
              </div>
              <p className={cn("font-bold", tx.type === 'income' ? "text-green-500" : "text-white")}>
                {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-500 italic text-sm">
              No transactions yet. Link your bank to get started!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
