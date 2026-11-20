import { formatDate } from '../i18n/format';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sparkles, Users, Calendar, Settings, ArrowRight } from 'lucide-react';
import { countAnalysesThisMonth, isPlanActive, planFeatures, FAMILY_MAX_NAMES } from '../utils/plan';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [analysesUsed, setAnalysesUsed] = useState(0);

  useEffect(() => {
    loadUserProfile();
    loadRecentAnalyses();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAnalyses = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const analysesRef = collection(db, 'users', user.uid, 'analyses');
      const q = query(analysesRef, orderBy('timestamp', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      
      const analyses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRecentAnalyses(analyses);
      setAnalysesUsed(await countAnalysesThisMonth(user.uid));
    } catch (error) {
      console.error('Error loading analyses:', error);
    }
  };


  const handleViewAnalysis = (analysis) => {
    // Navigate to the analysis view page with the analysis ID
    if (analysis.type === 'individual') {
      navigate(`/analysis/${analysis.id}`);
    } else {
      navigate(`/family-analysis/${analysis.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen site-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  };

  const renewalDate = userProfile?.renewalDate?.toDate();
  const formattedRenewalDate = renewalDate ? formatDate(renewalDate) : t('common.notAvailable');
  const planActive = isPlanActive(userProfile);

  return (
    <div className="min-h-screen site-background">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="bg-transparent rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {t('dashboard.welcome', { name: userProfile?.fullName })}
          </h2>
          {userProfile?.planType && (
            <div className="space-y-2">
              <p className="text-gray-600">
                <strong>{t('dashboard.plan')}</strong> {t('dashboard.annualPlan')}
                {planActive
                  ? <span className="ml-2 text-green-600">{t('dashboard.renews', { date: formattedRenewalDate })}</span>
                  : <span className="ml-2 text-red-600">{t('dashboard.expired', { date: formattedRenewalDate })}</span>}
              </p>
              {planActive && (
                <p className="text-gray-600">
                  <strong>{t('dashboard.analysesUsed')}</strong> {t('dashboard.usedOf', { used: analysesUsed, total: planFeatures(userProfile).monthlyAnalyses })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {planActive && (
            <button
              onClick={() => navigate('/analyze')}
              className="bg-gradient-to-br from-brand-500 to-brand-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Sparkles className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('dashboard.analyzeNew')}</h3>
              <p className="text-brand-100 text-sm">{t('dashboard.analyzeHint')}</p>
            </button>
          )}

          {planActive && userProfile?.planType === 'family' && (
            <button
              onClick={() => navigate('/family')}
              className="bg-gradient-to-br from-ocean-500 to-ocean-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Users className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">{t('family.title')}</h3>
              <p className="text-ocean-100 text-sm">{t('family.subtitle', { max: FAMILY_MAX_NAMES })}</p>
            </button>
          )}

          {(!planActive || userProfile?.planType === 'individual') && (
            <button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
            >
              <Calendar className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {!userProfile?.planType ? t('dashboard.choosePlan') : !planActive ? t('dashboard.renewPlan') : t('pricing.cta')}
              </h3>
              <p className="text-green-100 text-sm">
                {userProfile?.planType === 'individual' && planActive
                  ? t('dashboard.upgradeHint', { max: FAMILY_MAX_NAMES })
                  : t('pricing.subtitle2')}
              </p>
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            <Settings className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">{t('nav.settings')}</h3>
            <p className="text-gray-100 text-sm">{t('dashboard.settingsHint')}</p>
          </button>
        </div>

        {/* Knowledge Base Cards */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('dashboard.knowledgeBase')}</h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Zodiac Name Guide */}
            <div
              onClick={() => navigate('/zodiac-syllables')}
              className="bg-transparent rounded-2xl p-8 transition cursor-pointer kb-card"
            >
              <div className="text-5xl mb-4 text-center">♈</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
                {t('dashboard.zodiacTitle')}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {t('dashboard.zodiacText')}
              </p>
              <div className="flex justify-center">
                <span className="text-brand-600 font-semibold flex items-center gap-2">
                  {t('dashboard.zodiacCta')} <ArrowRight size={18} />
                </span>
              </div>
            </div>

            {/* Numerology Calculator */}
            <div
              onClick={() => navigate('/numerology-calculator')}
              className="bg-transparent rounded-2xl p-8 transition cursor-pointer kb-card"
            >
              <div className="text-5xl mb-4 text-center">🔢</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
                {t('dashboard.numerologyTitle')}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {t('dashboard.numerologyText')}
              </p>
              <div className="flex justify-center">
                <span className="text-brand-600 font-semibold flex items-center gap-2">
                  {t('dashboard.numerologyCta')} <ArrowRight size={18} />
                </span>
              </div>
            </div>

            {/* Element Insights - NEW */}
            <div
              onClick={() => navigate('/element-insights')}
              className="bg-transparent rounded-2xl p-8 transition cursor-pointer kb-card"
            >
              <div className="text-5xl mb-4 text-center">⚛️</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
                {t('dashboard.elementTitle')}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {t('dashboard.elementText')}
              </p>
              <div className="flex justify-center">
                <span className="text-brand-600 font-semibold flex items-center gap-2">
                  {t('dashboard.elementCta')} <ArrowRight size={18} />
                </span>
              </div>
            </div>

            {/* Hora & Muhurat */}
            <div
              onClick={() => navigate('/hora-muhurat')}
              className="bg-transparent rounded-2xl p-8 transition cursor-pointer kb-card"
            >
              <div className="text-5xl mb-4 text-center">🕉️</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">
                {t('dashboard.horaTitle')}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {t('dashboard.horaText')}
              </p>
              <div className="flex justify-center">
                <span className="text-brand-600 font-semibold flex items-center gap-2">
                  {t('dashboard.horaCta')} <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="bg-paper rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('dashboard.recent')}</h3>
          {recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <button
                  key={analysis.id}
                  onClick={() => handleViewAnalysis(analysis)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-brand-50 hover:border-brand-300 border-2 border-transparent transition cursor-pointer"
                >
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-800">
                      {analysis.type === 'individual' 
                        ? analysis.fullName 
                        : t('dashboard.familyEntry', { count: analysis.count })
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(analysis.timestamp)}
                    </div>
                  </div>
                  <ArrowRight className="text-brand-600" size={20} />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>{t('dashboard.noAnalyses')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
