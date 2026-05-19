import { useState } from 'react';
import { UserProfile } from '../App';
import { db } from '../lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Trophy, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

const QUIZ_QUESTIONS = [
  {
    id: '1',
    question: "What is an 'emergency fund' typically used for?",
    options: [
      "Buying a new car on impulse",
      "Covering 3-6 months of essential living expenses",
      "Investing in high-risk stocks",
      "Paying for a luxury vacation"
    ],
    correctIndex: 1
  },
  {
    id: '2',
    question: "Which of these is a variable expense?",
    options: [
      "Rent",
      "Car Insurance",
      "Groceries",
      "Internet Bill"
    ],
    correctIndex: 2
  },
  {
    id: '3',
    question: "What does the '50/30/20' rule suggest you do with 50% of your income?",
    options: [
      "Spend on Wants",
      "Put into Savings",
      "Pay for Needs",
      "Invest in Crypto"
    ],
    correctIndex: 2
  },
  {
    id: '4',
    question: "How does inflation affect the purchasing power of your money?",
    options: [
      "It increases it",
      "It decreases it",
      "It has no effect",
      "It makes money more colorful"
    ],
    correctIndex: 1
  },
  {
    id: '5',
    question: "What is 'compound interest' best described as?",
    options: [
      "Interest calculated only on the principal",
      "Interest calculated on principal plus accumulated interest",
      "Interest paid once per decade",
      "A penalty for late payments"
    ],
    correctIndex: 1
  },
  {
    id: '6',
    question: "Which of the following usually has the highest interest rate?",
    options: [
      "Savings Account",
      "Mortgage",
      "Credit Card Debt",
      "Certificate of Deposit (CD)"
    ],
    correctIndex: 2
  },
  {
    id: '7',
    question: "What is the primary benefit of 'diversification' in investing?",
    options: [
      "Guaranteed profits",
      "Higher taxes",
      "Reducing risk by spreading investments",
      "Spending all your money at once"
    ],
    correctIndex: 2
  }
];

export function Challenges({ profile }: { profile: UserProfile | null }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showResult, setShowResult] = useState<null | 'correct' | 'wrong'>(null);

  const handleAnswer = async (index: number) => {
    if (isAnswered) return;
    
    setSelectedIdx(index);
    setIsAnswered(true);
    
    const correct = index === QUIZ_QUESTIONS[currentIdx].correctIndex;
    
    if (correct) {
      setShowResult('correct');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#F59E0B']
      });
      
      // Reward user
      if (profile) {
        const userRef = doc(db, 'users', profile.uid);
        await updateDoc(userRef, {
          walletBalance: increment(5),
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      setShowResult('wrong');
    }
  };

  const nextQuestion = () => {
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedIdx(null);
      setIsAnswered(false);
      setShowResult(null);
    } else {
      // Completed all
      alert('Congratulations! You completed all daily challenges.');
      setCurrentIdx(0); // Reset for demo
      setSelectedIdx(null);
      setIsAnswered(false);
      setShowResult(null);
    }
  };

  const question = QUIZ_QUESTIONS[currentIdx];

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Daily Quiz</h2>
        <p className="text-gray-400 text-sm">Correct answers earn you $5.00 instantly!</p>
      </header>

      {/* Progress tracker */}
      <div className="flex gap-2">
        {QUIZ_QUESTIONS.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < currentIdx ? "bg-green-500" : i === currentIdx ? "bg-blue-500" : "bg-gray-800"
            }`} 
          />
        ))}
      </div>

      <motion.div 
        key={currentIdx}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-[#1C2026] p-6 rounded-3xl border border-gray-800 space-y-6"
      >
        <div className="space-y-4">
           <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Question {currentIdx + 1}</span>
           <h3 className="text-xl font-bold leading-tight">{question.question}</h3>
        </div>

        <div className="space-y-3">
          {question.options.map((option, i) => {
            let stateStyle = "bg-[#252A31] border-gray-700 text-gray-300";
            if (isAnswered) {
               if (i === question.correctIndex) {
                 stateStyle = "bg-green-500/10 border-green-500/50 text-green-500";
               } else if (i === selectedIdx) {
                 stateStyle = "bg-red-500/10 border-red-500/50 text-red-500";
               } else {
                 stateStyle = "bg-[#252A31] border-gray-700 text-gray-600 opacity-50";
               }
            } else {
              stateStyle = "bg-[#252A31] border-gray-700 hover:border-blue-500/50 hover:bg-[#2C323A]";
            }

            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => handleAnswer(i)}
                className={`w-full p-4 rounded-2xl border-2 text-left font-medium transition-all flex items-center justify-between ${stateStyle}`}
              >
                <span>{option}</span>
                {isAnswered && i === question.correctIndex && <CheckCircle2 size={18} />}
                {isAnswered && i === selectedIdx && i !== question.correctIndex && <XCircle size={18} />}
              </button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className={`p-6 rounded-3xl w-full text-center ${
              showResult === 'correct' ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
            }`}>
              {showResult === 'correct' ? (
                <div className="space-y-2">
                   <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Coins className="text-white" size={24} />
                   </div>
                   <h4 className="text-lg font-bold text-green-500">Correct!</h4>
                   <p className="text-sm text-gray-400">You've earned <span className="text-white font-bold">$5.00</span></p>
                </div>
              ) : (
                <div className="space-y-2">
                   <div className="bg-red-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold">!</div>
                   <h4 className="text-lg font-bold text-red-500">Incorrect</h4>
                   <p className="text-sm text-gray-400">Review your finances and try the next one!</p>
                </div>
              )}
            </div>

            <button
               onClick={nextQuestion}
               className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              Next Question
              <Trophy size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
