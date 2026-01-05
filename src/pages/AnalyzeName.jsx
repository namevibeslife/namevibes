import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Share2, Instagram, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseNameToElements } from '../utils/elements';

export default function AnalyzeName() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
    if (!name.trim()) return;

    const elements = parseNameToElements(name);

    setResult({
      name,
      elements
    });

    // Save analysis to Firebase
    await saveAnalysis(name, elements);
  };

  const handleShare = (platform) => {
    const text = `Check out my name chemistry on NameVibes! ${result.name} = ${result.elements.map(e => e.symbol).join('-')}`;
    const url = 'https://namevibes.life?ref=NV2024XYZ';
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
    } else if (platform === 'instagram') {
      alert('Copy this text and share on Instagram: ' + text);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='molecules' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='80' cy='60' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='60' cy='100' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='120' cy='80' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Cline x1='40' y1='40' x2='80' y2='60' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='80' y1='60' x2='60' y2='100' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='60' y1='100' x2='120' y2='80' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23molecules)'/%3E%3C/svg%3E")`
      }}>
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  NameVibes
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Analyze Name</h1>
            <p className="text-gray-600 mb-6">3 of 8 analyses remaining this month</p>

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
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Sparkles size={24} />
                Analyze Chemistry
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>⚠️ No download on Individual plan</p>
              <button
                onClick={() => navigate('/pricing')}
                className="text-purple-600 hover:underline"
              >
                Upgrade to Family for downloads →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='molecules' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='80' cy='60' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='60' cy='100' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='120' cy='80' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Cline x1='40' y1='40' x2='80' y2='60' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='80' y1='60' x2='60' y2='100' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='60' y1='100' x2='120' y2='80' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23molecules)'/%3E%3C/svg%3E")`
    }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setResult(null)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <ArrowLeft size={20} />
                Analyze Another
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                NameVibes
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Header with Name */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4 text-center">
                Chemistry of "{result.name.toUpperCase()}"
              </h1>
              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Share2 size={20} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={() => handleShare('instagram')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
                >
                  <Instagram size={20} />
                  Share on Instagram
                </button>
              </div>
              
              {/* Tagline */}
              <p className="text-center text-lg text-gray-600 italic font-medium mb-8">
                "Elements of the Universe Found in Your Name"
              </p>
            </div>

            {/* Element Boxes - NO HEADING, LARGER TEXT */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-6 justify-center p-6 bg-gray-50 rounded-xl">
                {result.elements.map((el, idx) => (
                  <div
                    key={idx}
                    className="relative border-4 border-gray-800 rounded-lg p-4 w-40 h-40 flex flex-col justify-between"
                    style={{ backgroundColor: el.color }}
                  >
                    <div className="text-base font-mono text-gray-800 font-bold">
                      {el.number}
                    </div>
                    <div className="text-7xl font-bold text-gray-800 text-center leading-none">
                      {el.symbol}
                    </div>
                    <div className="text-base text-gray-800 text-center font-bold">
                      {el.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Element Details Table */}
            <div className="overflow-x-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Element Colors & Meanings</h2>
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