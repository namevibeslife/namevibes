import PosterDownload from '../components/PosterDownload';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { Sparkles } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements } from '../utils/elements';
import { useAuthStore } from '../store/authStore';
import UnmatchedLetters from '../components/UnmatchedLetters';
import { countAnalysesThisMonth, planFeatures } from '../utils/plan';

export default function AnalyzeName() {
  const navigate = useNavigate();
  const profile = useAuthStore(state => state.profile);
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);
  const [analysesUsed, setAnalysesUsed] = useState(null);
  const monthlyLimit = planFeatures(profile)?.monthlyAnalyses ?? 0;
  const remaining = analysesUsed === null ? null : Math.max(monthlyLimit - analysesUsed, 0);

  useEffect(() => {
    if (auth.currentUser) {
      countAnalysesThisMonth(auth.currentUser.uid)
        .then(setAnalysesUsed)
        .catch(error => console.error('Error counting analyses:', error));
    }
  }, []);

  const saveAnalysis = async (fullName, elements) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'users', user.uid, 'analyses'), {
        fullName: fullName,
        elementCount: elements.length,
        type: 'individual',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!name.trim() || remaining === null) return;
    if (remaining <= 0) {
      alert(`You've used all ${monthlyLimit} analyses for this month. Your allowance resets on the 1st.`);
      return;
    }

    const elements = parseNameToElements(name);

    setResult({
      name,
      elements
    });

    await saveAnalysis(name, elements);
    setAnalysesUsed(used => used + 1);
  };


  if (!result) {
    return (
      <div className="min-h-screen site-background">
        <UserNav />

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-paper rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Analyze Name</h1>
            <p className={`mb-6 ${remaining === 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {remaining === null
                ? 'Checking your monthly allowance...'
                : `${remaining} of ${monthlyLimit} analyses remaining this month`}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Enter Name or Word
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="e.g., Rahul"
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white text-xl font-semibold py-4 rounded-xl hover:from-brand-700 hover:to-ocean-700 transform hover:scale-105 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                Analyze Chemistry
              </button>
            </div>

            {profile?.planType === 'individual' && (
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>Poster image saving and sharing included</p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-brand-600 hover:underline"
                >
                  Upgrade to Family for PDF downloads →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-background">
      <UserNav />

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-paper rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
                Chemistry of "{result.name.toUpperCase()}"
              </h1>
              
              <p className="text-center text-lg text-gray-600 italic font-medium mb-8">
                "Elements of the Universe Found in Your Name"
              </p>
            </div>

            <PosterDownload person={{ fullName: result.name, elements: result.elements }} showPreparedPreview={false} />

            <div className="overflow-x-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Element Colors & Meanings</h2>
              <UnmatchedLetters name={result.name} className="mb-4" />
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    <th className="border border-gray-300 px-4 py-3 text-left">#</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Element</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Atomic Number</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Color</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Life Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {result.elements.map((el, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-semibold">{idx + 1}</td>
                      <td className="border border-gray-300 px-4 py-3 font-semibold">{el.name}</td>
                      <td className="border border-gray-300 px-4 py-3">{el.number}</td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded border-2 border-gray-400"
                            style={{ backgroundColor: el.color }}
                          />
                          <span className="font-mono text-sm">{el.color}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">{el.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}