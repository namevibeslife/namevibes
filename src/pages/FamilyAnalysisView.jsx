import ChemistryPoster from '../components/ChemistryPoster';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Users, Download } from 'lucide-react';
import AskAIPanel from '../components/AskAIPanel';
import { findCommonElements, buildFamilyPDF } from '../utils/familyReport';
import { textColorFor } from '../utils/elements';

export default function FamilyAnalysisView() {
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
      <div className="min-h-screen site-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading family analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Saved data keeps relations and elements in two parallel lists
  const results = (analysis.elementData || []).map((person, idx) => ({
    relation: analysis.members?.[idx]?.relation || '',
    fullName: person.fullName,
    elements: person.elements || []
  }));
  const commonElements = findCommonElements(results);

  return (
    <div className="min-h-screen site-background">
      <UserNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-paper rounded-2xl shadow-xl p-8">
          {/* Family Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-10 h-10 text-brand-600" />
              <h1 className="text-4xl font-bold text-gray-800">
                Family Chemistry Analysis
              </h1>
            </div>
            <p className="text-center text-gray-600">
              Analyzed on {analysis.timestamp?.toDate().toLocaleDateString()}
            </p>
            <p className="text-center text-brand-600 font-semibold mt-2">
              {analysis.count} Family Members
            </p>
          </div>

          <ChemistryPoster people={results} family />
          {/* Family Members List */}
          {analysis.members && analysis.members.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Family Members</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {analysis.members.map((member, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-brand-50 to-ocean-50 rounded-xl p-6 border-2 border-brand-200">
                    <p className="text-sm text-brand-600 font-semibold mb-1">{member.relation}</p>
                    <p className="text-xl font-bold text-gray-800">{member.fullName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Element Data Display */}
          {analysis.elementData && analysis.elementData.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Element Breakdown</h2>
              {analysis.elementData.map((person, idx) => (
                <div key={idx} className="mb-6 bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{person.fullName}</h3>
                  <div className="flex flex-wrap gap-4">
                    {person.elements && person.elements.map((el, elIdx) => (
                      <div
                        key={elIdx}
                        className="element-card border-4 border-gray-800 rounded-lg p-4 w-32 h-32 flex flex-col justify-between"
                        style={{ backgroundColor: el.color, color: textColorFor(el.color) }}
                      >
                        <div className="text-sm font-mono font-bold">{el.number}</div>
                        <div className="text-5xl font-bold text-center leading-none">{el.symbol}</div>
                        <div className="text-sm text-center font-bold">{el.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {commonElements.length > 0 && (
            <div className="mb-8 pt-8 border-t-2 border-brand-200">
              <h2 className="text-3xl font-bold text-brand-600 mb-2 text-center">The Harmony</h2>
              <p className="text-gray-600 mb-6 text-center italic">"Common Elements Across All Family Members"</p>
              <div className="flex flex-wrap gap-4 justify-center p-6 bg-brand-50 rounded-xl mb-6">
                {commonElements.map((el, idx) => (
                  <div
                    key={idx}
                    className="element-card border-4 border-brand-600 rounded-lg p-4 w-32 h-32 flex flex-col justify-between"
                    style={{ backgroundColor: el.color, color: textColorFor(el.color) }}
                  >
                    <div className="text-sm font-mono font-bold">{el.number}</div>
                    <div className="text-5xl font-bold text-center leading-none">{el.symbol}</div>
                    <div className="text-sm text-center font-bold">{el.name}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-br from-brand-100 to-ocean-100 rounded-xl p-6 border-2 border-brand-300">
                <AskAIPanel results={results} />
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => buildFamilyPDF(results).save('NameVibes_Family_Report.pdf')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-500 text-white rounded-lg hover:from-brand-600 hover:to-brand-600 transition font-semibold"
            >
              <Download size={20} />
              Download PDF
            </button>
            <button
              onClick={() => navigate('/family')}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-semibold"
            >
              Analyze Another Family
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}