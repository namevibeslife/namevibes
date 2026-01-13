import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

          {/* This is a placeholder - in real implementation, you'd need to store element data */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 text-center">
            <p className="text-gray-700 mb-2">
              <strong>Note:</strong> Full element visualization coming soon!
            </p>
            <p className="text-sm text-gray-600">
              Analysis ID: {analysis.id}
            </p>
            <p className="text-sm text-gray-600">
              Type: {analysis.type}
            </p>
            <p className="text-sm text-gray-600">
              Elements: {analysis.elementCount || 'N/A'}
            </p>
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