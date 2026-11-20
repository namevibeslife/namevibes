import PosterDownload from '../components/PosterDownload';
import { FamilyPersonCards, FamilyHarmonyCard } from '../components/FamilyResults';
import { formatDate } from '../i18n/format';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Users } from 'lucide-react';
import AskAIPanel from '../components/AskAIPanel';
import { findCommonElements } from '../utils/familyReport';
import { useTranslation } from 'react-i18next';

export default function FamilyAnalysisView() {
  const { t } = useTranslation();
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
        alert(t('errors.analysisNotFound'));
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      alert(t('errors.analysisLoad'));
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
          <p className="text-gray-600">{t('results.loadingFamily')}</p>
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

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-transparent p-4 sm:p-8">
          {/* Family Title */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-10 h-10 text-brand-600" />
              <h1 className="text-4xl font-bold text-gray-800">
                {results.length === 1 ? t('family.resultTitleSingle') : t('family.resultTitleFamily')}
              </h1>
            </div>
            <p className="text-center text-gray-600">
              {t('results.analyzedOn', { date: formatDate(analysis.timestamp) })}
            </p>
            <p className="text-center text-brand-600 font-semibold mt-2">
              {t('results.memberCount', { count: results.length })}
            </p>
          </div>

          <PosterDownload people={results} family />
          <FamilyPersonCards people={results} />

          {results.length > 1 && (
            <FamilyHarmonyCard people={results}>
              {commonElements.length > 0 && (<>
                <p className="text-gray-600 mb-4 text-center text-lg italic">{t('family.commonAcross')}</p>
                <div className="bg-gradient-to-br from-brand-100 to-ocean-100 rounded-xl p-6 border-2 border-brand-300">
                  <AskAIPanel results={results} />
                </div>
              </>)}
            </FamilyHarmonyCard>
          )}

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/family')}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-semibold"
            >
              {t('results.analyzeAnotherFamily')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}