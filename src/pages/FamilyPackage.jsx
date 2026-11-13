import PosterDownload from '../components/PosterDownload';
import ElementMeanings from '../components/ElementMeanings';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements } from '../utils/elements';
import { Plus, X } from 'lucide-react';
import AskAIPanel from '../components/AskAIPanel';
import { findCommonElements } from '../utils/familyReport';

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
  const navigate = useNavigate();
  const [names, setNames] = useState([
    { id: 1, firstName: '', middleName: '', lastName: '', relation: 'Father' }
  ]);
  const [results, setResults] = useState(null);
  const [showingCount, setShowingCount] = useState(10);
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
    if (names.length < 50) {
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
      alert('Please enter at least one complete name (First and Last name required)');
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
    const displayedResults = results.slice(0, showingCount);
    const commonElements = findCommonElements(results);

    return (
      <div className="min-h-screen site-background">
        <UserNav />
  
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center mb-4">
                {results.length === 1 ? 'Name Chemistry' : 'Family Chemistry Analysis'}
              </h2>

              <p className="text-center text-lg text-gray-600 italic font-medium">
                "Elements of the Universe Found in Your Names"
              </p>
            </div>

            <PosterDownload people={results} family />
            <ElementMeanings people={displayedResults} />

            {results.length > showingCount && (
              <button
                onClick={() => setShowingCount(showingCount + 10)}
                className="w-full py-3 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition font-semibold"
              >
                Show More ({results.length - showingCount} remaining)
              </button>
            )}

            {results.length > 1 && commonElements.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-brand-200">
                <h3 className="text-3xl font-bold text-brand-600 mb-2 text-center">The Harmony</h3>
                <p className="text-gray-600 mb-6 text-center text-lg italic">
                  "Common Elements Across All Family Members"
                </p>

                {harmonyStep === 'results' && (
                  <button
                    onClick={() => setHarmonyStep('context')}
                    className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-xl font-bold text-lg hover:from-brand-700 hover:to-ocean-700 transition"
                  >
                    Know Your Harmony - Press to Know More
                  </button>
                )}

                {harmonyStep === 'context' && (
                  <div className="bg-ocean-50 rounded-xl p-6 border-2 border-ocean-200 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Why are you exploring this? (Optional)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      This helps us give you a more meaningful interpretation.
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
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => setHarmonyStep('interpretation')}
                      className="w-full bg-gradient-to-r from-ocean-600 to-brand-600 text-white py-3 rounded-lg font-semibold hover:from-ocean-700 hover:to-brand-700 transition"
                    >
                      Get Interpretation
                    </button>
                  </div>
                )}

                {harmonyStep === 'interpretation' && (
                 <div className="mt-6 bg-gradient-to-br from-brand-100 to-ocean-100 rounded-xl p-8 border-2 border-brand-300">
                  <p className="text-xl text-brand-900 text-center font-semibold mb-4">
                    Your harmony elements <span className="font-bold">{commonElements.map(e => e.name).join(', ')}</span> represent shared connection and energy across all names.
                  </p>
                    <AskAIPanel
                      results={results}
                      contextLabels={contextOptions.filter(o => selectedContext.includes(o.id)).map(o => o.label)}
                    />
                  </div>
                )}
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
  
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-paper rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Family Package</h1>
            <p className="text-gray-600 mb-8">
              Analyze up to 50 names • Showing {Math.min(names.length, 10)} at once
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
                        First Name *
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
                        Middle Name
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
                        Last Name *
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
                        Relation
                      </label>
                      <select
                        value={nameData.relation}
                        onChange={(e) => updateName(nameData.id, 'relation', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      >
                        {RELATIONS.map(rel => (
                          <option key={rel} value={rel}>{rel}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addName}
                disabled={names.length >= 50}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Plus size={20} />
                Add Another Name ({names.length}/50)
              </button>
            </div>

            <div className="mt-8">
              <button
                onClick={handleAnalyzeAll}
                className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-xl font-semibold hover:from-brand-700 hover:to-ocean-700 transition"
              >
                Analyze All Names
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}