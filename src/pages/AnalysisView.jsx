import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { parseNameToElements, textColorFor } from '../utils/elements';

export default function AnalysisView() {
  const navigate = useNavigate();
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [analysisId]);

  const loadAnalysis = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const analysisDoc = await getDoc(doc(db, 'users', user.uid, 'analyses', analysisId));
      
      if (analysisDoc.exists()) {
        setAnalysis({ id: analysisDoc.id, ...analysisDoc.data() });
      } else {
        alert('Analysis not found');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      alert('Error loading analysis');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <UserNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Name Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
              Chemistry of "{analysis.fullName?.toUpperCase()}"
            </h1>
            <p className="text-center text-gray-600">
              Analyzed on {analysis.timestamp?.toDate().toLocaleDateString()}
            </p>
          </div>

          {/* Element data isn't stored for individual analyses, so rebuild it from the name */}
          <div className="flex flex-wrap gap-4 justify-center p-6 bg-gray-50 rounded-xl mb-6">
            {parseNameToElements(analysis.fullName || '').map((el, i) => (
              <div
                key={i}
                className="border-4 border-gray-800 rounded-lg p-3 w-28 h-28 flex flex-col justify-between"
                style={{ backgroundColor: el.color, color: textColorFor(el.color) }}
              >
                <div className="text-sm font-mono font-bold">{el.number}</div>
                <div className="text-4xl font-bold text-center leading-none">{el.symbol}</div>
                <div className="text-xs text-center font-bold">{el.name}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-purple-600 text-white">
                  <th className="border border-gray-300 px-4 py-3 text-left">Element</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Life Meaning</th>
                </tr>
              </thead>
              <tbody>
                {parseNameToElements(analysis.fullName || '').map((el, i) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-4 py-3 font-semibold">{el.name} ({el.symbol})</td>
                    <td className="border border-gray-300 px-4 py-3 text-gray-700">{el.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/analyze')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              Analyze Another Name
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}