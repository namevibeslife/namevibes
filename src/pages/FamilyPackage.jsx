import PosterDownload from '../components/PosterDownload';
import { FamilyPersonCards, FamilyHarmonyCard } from '../components/FamilyResults';
import React, { useState } from 'react';
import { Trans } from 'react-i18next';
import { relationLabel } from '../i18n/poster';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements } from '../utils/elements';
import { Plus, X } from 'lucide-react';
import AskAIPanel from '../components/AskAIPanel';
import { findCommonElements } from '../utils/familyReport';
import { FAMILY_MAX_NAMES } from '../utils/plan';
import { useTranslation } from 'react-i18next';

const RELATIONS = [
  'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Husband', 'Wife', 'Friend', 'Uncle', 'Aunt', 'Grandfather',
  'Grandmother', 'Cousin', 'In-Law', 'Company Name', 'Brand Name',
  'Pet Name', 'Other'
];

const contextOptions = [
  { id: 'health_stress', label: 'Family health-related stress' },
  { id: 'emotional_imbalance', label: 'Emotional or relationship imbalance' },
  { id: 'financial_pressure', label: 'Financial or career-related challenges' },
  { id: 'general_curiosity', label: 'General curiosity / self-understanding' }
];

export default function FamilyPackage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [names, setNames] = useState([
    { id: 1, firstName: '', middleName: '', lastName: '', relation: 'Father' }
  ]);
  const [results, setResults] = useState(null);
  const [harmonyStep, setHarmonyStep] = useState('results');
  const [selectedContext, setSelectedContext] = useState([]);

  const toggleContext = (contextId) => {
    setSelectedContext(prev =>
      prev.includes(contextId)
        ? prev.filter(id => id !== contextId)
        : [...prev, contextId]
    );
  };


  const addName = () => {
    if (names.length < FAMILY_MAX_NAMES) {
      setNames([...names, {
        id: Date.now(),
        firstName: '',
        middleName: '',
        lastName: '',
        relation: 'Mother'
      }]);
    }
  };

  const removeName = (id) => {
    if (names.length > 1) {
      setNames(names.filter(n => n.id !== id));
    }
  };

  const updateName = (id, field, value) => {
    setNames(names.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const saveAnalysisToFirebase = async (analyzed) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'users', user.uid, 'analyses'), {
        type: 'family',
        count: analyzed.length,
        members: analyzed.map(m => ({ fullName: m.fullName, relation: m.relation })),
        elementData: analyzed.map(m => ({ fullName: m.fullName, elements: m.elements })),
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  const handleAnalyzeAll = async () => {
    const validNames = names.filter(n => n.firstName.trim() && n.lastName.trim());
    
    if (validNames.length === 0) {
      alert(t('family.needName'));
      return;
    }

    const analyzed = validNames.map(nameData => {
      const fullName = [nameData.firstName, nameData.middleName, nameData.lastName].map(n => n.trim()).filter(Boolean).join(' ');
      const elements = parseNameToElements(fullName);
      
      return {
        ...nameData,
        fullName,
        elements
      };
    });

    setResults(analyzed);
    await saveAnalysisToFirebase(analyzed);
    setHarmonyStep('results');
  };





  if (results) {
    const commonElements = findCommonElements(results);

    return (
      <div className="min-h-screen site-background">
  
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="bg-transparent p-4 sm:p-8">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center mb-4">
                {results.length === 1 ? t('family.resultTitleSingle') : t('family.resultTitleFamily')}
              </h2>

              <p className="text-center text-lg text-gray-600 italic font-medium">
                {t('family.resultTagline')}
              </p>
            </div>

            <PosterDownload people={results} family />
            <FamilyPersonCards people={results} />

            {results.length > 1 && (
              <FamilyHarmonyCard people={results}>
                {commonElements.length > 0 && (<>
                <p className="text-gray-600 mb-4 text-center text-lg italic">
                  {t('family.commonAcross')}
                </p>
                {harmonyStep === 'results' && (
                  <button
                    onClick={() => setHarmonyStep('context')}
                    className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-xl font-bold text-lg hover:from-brand-700 hover:to-ocean-700 transition"
                  >
                    {t('family.knowHarmony')}
                  </button>
                )}

                {harmonyStep === 'context' && (
                  <div className="bg-ocean-50 rounded-xl p-6 border-2 border-ocean-200 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {t('family.whyExploring')}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('family.whyHelp')}
                    </p>
                    <div className="space-y-3 mb-6">
                      {contextOptions.map(option => (
                        <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedContext.includes(option.id)}
                            onChange={() => toggleContext(option.id)}
                            className="w-5 h-5 text-brand-600 rounded focus:ring-2 focus:ring-brand-500"
                          />
                          <span className="text-gray-700">{t(`family.context.${option.id}`)}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => setHarmonyStep('interpretation')}
                      className="w-full bg-gradient-to-r from-ocean-600 to-brand-600 text-white py-3 rounded-lg font-semibold hover:from-ocean-700 hover:to-brand-700 transition"
                    >
                      {t('family.getInterpretation')}
                    </button>
                  </div>
                )}

                {harmonyStep === 'interpretation' && (
                 <div className="mt-6 bg-gradient-to-br from-brand-100 to-ocean-100 rounded-xl p-8 border-2 border-brand-300">
                  <p className="text-xl text-brand-900 text-center font-semibold mb-4">
                    <Trans i18nKey="family.harmonyIntro" values={{ elements: commonElements.map(e => e.name).join(', ') }} components={{ b: <span className="font-bold" /> }} />
                  </p>
                    <AskAIPanel
                      results={results}
                      contextLabels={contextOptions.filter(o => selectedContext.includes(o.id)).map(o => t(`family.context.${o.id}`))}
                    />
                  </div>
                )}
                </>)}
              </FamilyHarmonyCard>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-background">
  
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-transparent p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('family.title')}</h1>
            <p className="text-gray-600 mb-8">
              {t('family.subtitle', { max: FAMILY_MAX_NAMES })}
            </p>

            <div className="space-y-6">
              {names.map((nameData) => (
                <div key={nameData.id} className="bg-gray-50 rounded-xl p-6 relative">
                  <div className="absolute top-4 right-4">
                    {names.length > 1 && (
                      <button
                        onClick={() => removeName(nameData.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('family.firstName')}
                      </label>
                      <input
                        type="text"
                        value={nameData.firstName}
                        onChange={(e) => updateName(nameData.id, 'firstName', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('family.middleName')}
                      </label>
                      <input
                        type="text"
                        value={nameData.middleName}
                        onChange={(e) => updateName(nameData.id, 'middleName', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('family.lastName')}
                      </label>
                      <input
                        type="text"
                        value={nameData.lastName}
                        onChange={(e) => updateName(nameData.id, 'lastName', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('family.relation')}
                      </label>
                      <select
                        value={nameData.relation}
                        onChange={(e) => updateName(nameData.id, 'relation', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      >
                        {RELATIONS.map(rel => (
                          <option key={rel} value={rel}>{relationLabel(rel, t)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addName}
                disabled={names.length >= FAMILY_MAX_NAMES}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Plus size={20} />
                {t('family.addName', { n: names.length, max: FAMILY_MAX_NAMES })}
              </button>
              {names.length >= FAMILY_MAX_NAMES && (
                <p role="note" className="text-center text-sm text-gray-600">
                  {t('family.limitNote', { max: FAMILY_MAX_NAMES })}
                </p>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={handleAnalyzeAll}
                className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-xl font-semibold hover:from-brand-700 hover:to-ocean-700 transition"
              >
                {t('family.analyzeAll')}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}