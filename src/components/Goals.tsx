import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../App';
import { Target, Plus, TrendingUp, MoreVertical, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
}

export function Goals({ profile }: { profile: UserProfile | null }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '' });

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'users', profile.uid, 'goals'), (snap) => {
      setGoals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
    });
    return () => unsub();
  }, [profile]);

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newGoal.name || !newGoal.target) return;
    
    await addDoc(collection(db, 'users', profile.uid, 'goals'), {
      userId: profile.uid,
      name: newGoal.name,
      targetAmount: Number(newGoal.target),
      currentAmount: 0,
       updatedAt: new Date().toISOString()
    });
    
    setNewGoal({ name: '', target: '' });
    setIsAdding(false);
  };

  const updateProgress = async (id: string, current: number, target: number) => {
    if (!profile) return;
    const amountStr = prompt("How much did you save today?");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount)) return;

    const goalRef = doc(db, 'users', profile.uid, 'goals', id);
    await updateDoc(goalRef, {
      currentAmount: Math.min(current + amount, target),
      updatedAt: new Date().toISOString()
    });
  };

  const deleteGoal = async (id: string) => {
    if (!profile || !confirm("Are you sure you want to delete this goal?")) return;
    await deleteDoc(doc(db, 'users', profile.uid, 'goals', id));
  };

  return (
    <div className="p-6 space-y-8">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Savings Goals</h2>
          <p className="text-gray-400 text-sm">Track your path to what matters.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </header>

      {isAdding && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          onSubmit={addGoal}
          className="bg-[#1C2026] p-6 rounded-3xl border border-blue-500/20 space-y-4 overflow-hidden"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Goal Name</label>
            <input 
              required
              placeholder="e.g. Dream House, New Laptop"
              value={newGoal.name}
              onChange={e => setNewGoal({...newGoal, name: e.target.value})}
              className="w-full bg-[#252A31] border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 text-sm text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Target Amount ($)</label>
            <input 
              required
              type="number"
              placeholder="1500"
              value={newGoal.target}
              onChange={e => setNewGoal({...newGoal, target: e.target.value})}
              className="w-full bg-[#252A31] border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 text-sm text-white"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            Create Goal
          </button>
        </motion.form>
      )}

      <div className="space-y-4">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return (
            <div key={goal.id} className="bg-[#1C2026] p-5 rounded-3xl border border-gray-800/50 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <Target size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">{goal.name}</h4>
                    <p className="text-gray-500 text-xs">${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-gray-600 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-gray-500">
                  <span>{progress.toFixed(0)}% Complete</span>
                  <button 
                    onClick={() => updateProgress(goal.id, goal.currentAmount, goal.targetAmount)}
                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    <Plus size={10} /> Add Savings
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && !isAdding && (
          <div className="text-center py-12 space-y-4 bg-[#1C2026]/30 rounded-3xl border border-dashed border-gray-800">
             <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-600">
               <Target size={32} />
             </div>
             <div className="space-y-1">
               <p className="font-bold text-gray-400">No goals yet</p>
               <p className="text-gray-500 text-xs px-12">Start your first savings goal and we'll help you track every dollar.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
