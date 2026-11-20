import PosterDownload from '../components/PosterDownload';
import ElementMeanings from '../components/ElementMeanings';
import { formatDate } from '../i18n/format';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { parseNameToElements } from '../utils/elements';
import { useTranslation } from 'react-i18next';

export default function AnalysisView() {
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
          <p className="text-gray-600">{t('results.loadingAnalysis')}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="min-h-screen site-background">

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-transparent p-4 sm:p-8">
          {/* Name Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
              {t('analyze.chemistryOf', { name: analysis.fullName?.toUpperCase() })}
            </h1>
            <p className="text-center text-gray-600">
              {t('results.analyzedOn', { date: formatDate(analysis.timestamp) })}
            </p>
          </div>

          <PosterDownload person={{ fullName: analysis.fullName, elements: parseNameToElements(analysis.fullName || '') }} />
          <ElementMeanings people={[{ fullName: analysis.fullName, elements: parseNameToElements(analysis.fullName || '') }]} />

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/analyze')}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition font-semibold"
            >
              {t('results.analyzeAnother')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}