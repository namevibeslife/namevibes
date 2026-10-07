import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements, textColorFor } from '../utils/elements';
import { Download, Plus, X, Share2 } from 'lucide-react';
import AskAIPanel from '../components/AskAIPanel';
import UnmatchedLetters from '../components/UnmatchedLetters';
import { findCommonElements, buildFamilyPDF } from '../utils/familyReport';

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

  const handleShare = () => {
    const text = `Check out our family name chemistry on NameVibes!`;
    const url = 'https://namevibes.life';
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
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


  const downloadPDF = () => {
    buildFamilyPDF(results).save(`NameVibes_Family_Report.pdf`);
  };



  if (results) {
    const displayedResults = results.slice(0, showingCount);
    const commonElements = findCommonElements(results);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <UserNav />
  
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center mb-4">
                {results.length === 1 ? 'Name Chemistry' : 'Family Chemistry Analysis'}
              </h2>
              
              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Share2 size={20} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
                >
                  <Download size={20} />
                  Download PDF
                </button>
              </div>

              <p className="text-center text-lg text-gray-600 italic font-medium">
                "Elements of the Universe Found in Your Names"
              </p>
            </div>

            {displayedResults.map((person, idx) => (
              <div key={idx} className="mb-12 pb-8 border-b-2 border-gray-100 last:border-0">
                {results.length > 1 && (
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                    {person.relation}
                  </div>
                )}
                <h3 className="text-3xl font-bold text-gray-800 mb-6">{person.fullName}</h3>

                <div className="flex flex-wrap gap-6 justify-center p-6 bg-gray-50 rounded-xl mb-6">
                  {person.elements.map((el, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="relative border-4 border-gray-800 rounded-lg p-4 w-40 h-40 flex flex-col justify-between"
                        style={{ backgroundColor: el.color, color: textColorFor(el.color) }}
                      >
                        <div className="text-base font-mono font-bold">{el.number}</div>
                        <div className="text-7xl font-bold text-center leading-none">{el.symbol}</div>
                        <div className="text-base text-center font-bold">{el.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <UnmatchedLetters name={person.fullName} className="-mt-3 mb-6" />

                <div className="overflow-x-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-4">Element Colors & Meanings</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-600 text-white">
                        <th className="border border-gray-300 px-4 py-3 text-left">#</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Element</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Atomic Number</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Color</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Life Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {person.elements.map((el, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 font-semibold">{i + 1}</td>
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
            ))}

            {results.length > showingCount && (
              <button
                onClick={() => setShowingCount(showingCount + 10)}
                className="w-full py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold"
              >
                Show More ({results.length - showingCount} remaining)
              </button>
            )}

            {results.length > 1 && commonElements.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-purple-200">
                <h3 className="text-3xl font-bold text-purple-600 mb-2 text-center">The Harmony</h3>
                <p className="text-gray-600 mb-6 text-center text-lg italic">
                  "Common Elements Across All Family Members"
                </p>

                <div className="flex flex-wrap gap-6 justify-center p-6 bg-purple-50 rounded-xl mb-6">
                  {commonElements.map((el, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="relative border-4 border-purple-600 rounded-lg p-4 w-40 h-40 flex flex-col justify-between"
                        style={{ backgroundColor: el.color, color: textColorFor(el.color) }}
                      >
                        <div className="text-base font-mono font-bold">{el.number}</div>
                        <div className="text-7xl font-bold text-center leading-none">{el.symbol}</div>
                        <div className="text-base text-center font-bold">{el.name}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {harmonyStep === 'results' && (
                  <button
                    onClick={() => setHarmonyStep('context')}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition"
                  >
                    Know Your Harmony - Press to Know More
                  </button>
                )}

                {harmonyStep === 'context' && (
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 mt-6">
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
                            className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => setHarmonyStep('interpretation')}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
                    >
                      Get Interpretation
                    </button>
                  </div>
                )}

                {harmonyStep === 'interpretation' && (
                 <div className="mt-6 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl p-8 border-2 border-purple-300">
                  <p className="text-xl text-purple-900 text-center font-semibold mb-4">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <UserNav />
  
        <div className="container mx-auto max-w-4xl py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
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
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relation
                      </label>
                      <select
                        value={nameData.relation}
                        onChange={(e) => updateName(nameData.id, 'relation', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Plus size={20} />
                Add Another Name ({names.length}/50)
              </button>
            </div>

            <div className="mt-8">
              <button
                onClick={handleAnalyzeAll}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
              >
                Analyze All Names
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}