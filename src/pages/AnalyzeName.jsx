import PosterDownload from '../components/PosterDownload';
import MakeMerchButton from '../components/MakeMerchButton';
import { elementMeaning } from '../i18n/elements';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements } from '../utils/elements';
import { useAuthStore } from '../store/authStore';
import UnmatchedLetters from '../components/UnmatchedLetters';
import { countAnalysesThisMonth, planFeatures } from '../utils/plan';
import { useTranslation } from 'react-i18next';

export default function AnalyzeName() {
  const { t } = useTranslation();
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
      alert(t('errors.monthlyLimit', { limit: monthlyLimit }));
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

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-transparent p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('analyze.title')}</h1>
            <p className={`mb-6 ${remaining === 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
              {remaining === null
                ? t('analyze.checking')
                : t('analyze.remaining', { count: remaining, limit: monthlyLimit })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  {t('analyze.enterName')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder={t('analyze.placeholder')}
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white text-xl font-semibold py-4 rounded-xl hover:from-brand-700 hover:to-ocean-700 transform hover:scale-105 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                {t('analyze.button')}
              </button>
            </div>

            {profile?.planType === 'individual' && (
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>{t('analyze.posterIncluded')}</p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-brand-600 hover:underline"
                >
                  {t('analyze.upgradePdf')}
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

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-transparent p-4 sm:p-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
                {t('analyze.chemistryOf', { name: result.name.toUpperCase() })}
              </h1>
              
              <p className="text-center text-lg text-gray-600 italic font-medium mb-8">
                {t('analyze.tagline')}
              </p>
            </div>

            <PosterDownload person={{ fullName: result.name, elements: result.elements }} showPreparedPreview={false} />
            <MakeMerchButton people={[{ fullName: result.name, elements: result.elements }]} />

            <div className="overflow-x-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('results.colorsMeanings')}</h2>
              <UnmatchedLetters name={result.name} className="mb-4" />
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-brand-600 text-white">
                    <th className="border border-gray-300 px-4 py-3 text-left">#</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">{t('results.element')}</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">{t('results.atomicNumber')}</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">{t('results.color')}</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">{t('results.lifeMeaning')}</th>
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
                      <td className="border border-gray-300 px-4 py-3 text-gray-700">{elementMeaning(el)}</td>
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