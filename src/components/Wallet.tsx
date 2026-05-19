import { useState, useEffect } from 'react';
import { UserProfile } from '../App';
import { Wallet as WalletIcon, ArrowDownToLine, Smartphone, Landmark, CheckCircle2, Tag, Plus, Trash2, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment, collection, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface Category {
  id: string;
  name: string;
  description?: string;
}

export function Wallet({ profile, accessToken }: { profile: UserProfile | null, accessToken: string | null }) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [withdrawType, setWithdrawType] = useState<'upi' | 'bank' | null>(null);
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState<null | string>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const unsub = onSnapshot(collection(db, 'users', profile.uid, 'categories'), (snap) => {
      setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });
    return () => unsub();
  }, [profile]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newCatName) return;

    try {
      await addDoc(collection(db, 'users', profile.uid, 'categories'), {
        userId: profile.uid,
        name: newCatName,
        description: newCatDesc,
        updatedAt: serverTimestamp()
      });
      setNewCatName('');
      setNewCatDesc('');
      setIsAddingCat(false);
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!profile || !confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'categories', id));
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!profile || !editCatName) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid, 'categories', id), {
        name: editCatName,
        updatedAt: serverTimestamp()
      });
      setEditingCatId(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !bankAccount || !ifscCode) return;
    
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        bankAccountLinked: true,
        updatedAt: new Date().toISOString()
      });
      setIsLinking(false);
      alert('Bank account linked successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to link bank account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !withdrawType || !amount) return;
    
    const withdrawAmount = Number(amount);
    if (withdrawAmount > (profile.walletBalance || 0)) {
      alert('Insufficient balance in wallet.');
      return;
    }
    setShowConfirm(true);
  };

  const confirmWithdraw = async () => {
    if (!profile || !withdrawType || !amount) return;
    
    setIsProcessing(true);
    const withdrawAmount = Number(amount);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmount,
          type: withdrawType,
          detail: detail
        })
      });
      const data = await res.json();
      
      if (data.success) {
        // Update Firestore
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          walletBalance: increment(-withdrawAmount),
          updatedAt: new Date().toISOString()
        });
        
        // Send Email Confirmation
        if (accessToken && profile.email) {
          try {
            await fetch('/api/mail/send-withdrawal-receipt', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                to: profile.email,
                amount: withdrawAmount,
                type: withdrawType,
                detail: detail,
                transactionId: data.transactionId
              })
            });
          } catch (mailError) {
            console.error('Failed to send receipt email:', mailError);
            // Non-blocking error
          }
        }
        
        setSuccess(data.transactionId);
        setIsWithdrawing(false);
        setShowConfirm(false);
        setAmount('');
        setDetail('');
        setWithdrawType(null);
      }
    } catch (error) {
      console.error(error);
      alert('Withdrawal failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Earnings Wallet</h2>
        <p className="text-gray-400 text-sm">Withdraw your rewards to your bank account.</p>
      </header>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] shadow-2xl shadow-blue-600/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
             <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
               <WalletIcon className="text-white" />
             </div>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-black/20 px-3 py-1 rounded-full text-white/80">Active Rewards</span>
          </div>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
            <h3 className="text-4xl font-bold text-white tracking-tighter">${profile?.walletBalance.toFixed(2) || '0.00'}</h3>
          </div>
          <button 
            onClick={() => { setIsWithdrawing(true); setSuccess(null); }}
            className="w-full bg-white text-blue-600 font-bold py-4 rounded-3xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowDownToLine size={20} />
            Withdraw Now
          </button>
        </div>
      </div>

      {/* Bank Account Linking */}
      {!profile?.bankAccountLinked ? (
        <section className="bg-[#1C2026] p-6 rounded-[32px] border border-gray-800/50 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400">
              <Landmark size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">Link Bank Account</h4>
              <p className="text-gray-500 text-xs">For automatic transaction import</p>
            </div>
            <button 
              onClick={() => setIsLinking(!isLinking)}
              className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              {isLinking ? 'Cancel' : 'Link Now'}
            </button>
          </div>

          <AnimatePresence>
            {isLinking && (
              <motion.form 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                onSubmit={handleLinkBank}
                className="space-y-4 pt-4 border-t border-gray-800 overflow-hidden"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Account Number</label>
                  <input 
                    required
                    placeholder="Enter account number"
                    value={bankAccount}
                    onChange={e => setBankAccount(e.target.value)}
                    className="w-full bg-[#252A31] border-none rounded-2xl p-4 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">IFSC Code</label>
                  <input 
                    required
                    placeholder="SBIN0001234"
                    value={ifscCode}
                    onChange={e => setIfscCode(e.target.value)}
                    className="w-full bg-[#252A31] border-none rounded-2xl p-4 text-sm uppercase"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Save Bank Details'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 p-5 rounded-[32px] flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-green-500 font-bold text-sm">Bank Account Linked</h4>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Automatic sync enabled</p>
          </div>
          <Landmark size={20} className="text-gray-700" />
        </div>
      )}

      {/* Transaction Categories Section */}
      <section className="bg-[#1C2026] p-6 rounded-[32px] border border-gray-800/50 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500">
              <Tag size={24} />
            </div>
            <div>
              <h4 className="font-bold">Categories</h4>
              <p className="text-gray-500 text-xs text-nowrap">Categorize your spending</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="w-10 h-10 bg-[#252A31] rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            {isAddingCat ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>

        <AnimatePresence>
          {isAddingCat && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAddCategory}
              className="space-y-4 pt-4 border-t border-gray-800 overflow-hidden"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Category Name</label>
                <input 
                  required
                  placeholder="e.g. Groceries, Subscriptions"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full bg-[#252A31] border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-purple-600 font-bold py-4 rounded-2xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
              >
                Add Category
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2 pt-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between bg-[#0F1115]/50 p-3 rounded-2xl border border-gray-800/30 group">
              {editingCatId === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    autoFocus
                    value={editCatName}
                    onChange={e => setEditCatName(e.target.value)}
                    className="flex-1 bg-[#252A31] border-none rounded-xl p-2 text-xs"
                    onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                  />
                  <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-500">
                    <CheckCircle2 size={16} />
                  </button>
                  <button onClick={() => setEditingCatId(null)} className="text-gray-500">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); }}
                      className="p-2 text-gray-500 hover:text-white"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && !isAddingCat && (
            <p className="text-center py-4 text-gray-600 text-xs italic">No custom categories yet. Start adding some!</p>
          )}
        </div>
      </section>

      {/* Withdrawal Form Modal-like */}
      <AnimatePresence>
        {isWithdrawing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsWithdrawing(false)} />
            <div className="bg-[#1C2026] w-full max-w-sm rounded-[32px] p-8 relative z-10 border border-gray-800">
               <h3 className="text-xl font-bold mb-6">Withdraw Funds</h3>
               <form onSubmit={handleWithdraw} className="space-y-6">
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setWithdrawType('upi')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        withdrawType === 'upi' ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-gray-800 bg-gray-800/50 text-gray-500"
                      }`}
                    >
                      <Smartphone size={24} />
                      <span className="text-xs font-bold uppercase">UPI</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setWithdrawType('bank')}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        withdrawType === 'bank' ? "border-blue-500 bg-blue-500/10 text-blue-500" : "border-gray-800 bg-gray-800/50 text-gray-500"
                      }`}
                    >
                      <Landmark size={24} />
                      <span className="text-xs font-bold uppercase">Bank</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                      {withdrawType === 'upi' ? 'UPI ID' : 'Bank Account No.'}
                    </label>
                    <input 
                      required
                      placeholder={withdrawType === 'upi' ? 'user@okaxis' : '1234567890'}
                      value={detail}
                      onChange={e => setDetail(e.target.value)}
                      className="w-full bg-[#252A31] border-none rounded-2xl p-4 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Amount ($)</label>
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      min="1"
                      max={profile?.walletBalance}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-[#252A31] border-none rounded-2xl p-4 text-sm"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-xl shadow-blue-600/20"
                  >
                    Review Withdrawal
                  </button>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isProcessing && setShowConfirm(false)} />
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#1C2026] w-full max-w-sm rounded-[32px] p-8 relative z-10 border border-gray-800 space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Confirm Transfer</h3>
                <p className="text-gray-400 text-sm">Please verify the details below</p>
              </div>

              <div className="space-y-4 bg-[#252A31] p-6 rounded-2xl border border-gray-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Amount</span>
                  <span className="text-xl font-bold">${Number(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700/50 pt-4">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Method</span>
                  <span className="font-bold uppercase text-blue-400">{withdrawType}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700/50 pt-4">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Destination</span>
                  <span className="font-mono text-sm">{detail}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={confirmWithdraw}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Confirm & Send <ArrowDownToLine size={20} /></>
                  )}
                </button>
                <button 
                  onClick={() => setShowConfirm(false)}
                  disabled={isProcessing}
                  className="w-full bg-transparent text-gray-500 font-bold py-2 rounded-2xl hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animation */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/20 p-6 rounded-[32px] text-center space-y-4"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white">
               <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
               <h4 className="font-bold text-green-500 text-lg">Transfer Initiated</h4>
               <p className="text-gray-400 text-sm">ID: {success}</p>
            </div>
            <p className="text-xs text-gray-500">Funds should reach your account within 24-48 hours.</p>
            <button onClick={() => setSuccess(null)} className="text-blue-500 text-xs font-bold uppercase tracking-widest pt-2">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History section could be added here */}
    </div>
  );
}
