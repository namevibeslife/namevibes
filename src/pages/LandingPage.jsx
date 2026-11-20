import ChemistryPoster from '../components/ChemistryPoster';
import { parseNameToElements } from '../utils/elements';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import LanguagePicker from '../components/LanguagePicker';
import { hasChosenLanguage } from '../i18n';
import { Sparkles, Atom, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { captureReferralFromUrl } from '../utils/referralCode';

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Capture ?ref=<CODE> (e.g. IN482913) from a shared link (30-day localStorage), so it's
  // ready to prefill at sign-up even if the person browses a bit before creating an account.
  useEffect(() => {
    captureReferralFromUrl(window.location.search);
  }, []);

  return (
    <div className="min-h-screen site-background">


      {/* Hero Section */}
      <section className="landing-hero container mx-auto px-4 py-20 text-center">
        {!hasChosenLanguage() && <div className="mb-8"><LanguagePicker prominent /></div>}
        <p className="hero-kicker">{t('landing.kicker')}</p>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          {t('landing.headingLine1')}<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-ocean-600">
            {t('landing.headingLine2')}
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          {t('landing.subheading')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gradient-to-r from-brand-600 to-ocean-600 text-white text-lg font-semibold rounded-xl hover:from-brand-700 hover:to-ocean-700 transform hover:scale-105 transition shadow-lg"
          >
            <Sparkles className="inline mr-2" size={20} />
            {t('landing.getStarted')}
          </button>
          <button
            onClick={() => navigate('/learn-more')}
            className="px-8 py-4 bg-paper text-brand-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition shadow-lg border-2 border-brand-200"
          >
            <BookOpen className="inline mr-2" size={20} />
            {t('landing.learnMore')}
          </button>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-14 text-center" aria-labelledby="about-namevibes">
        <h2 id="about-namevibes" className="text-3xl text-brand-800 mb-6">{t('landing.aboutHeading')}</h2>
        <div className="space-y-4 text-gray-700 text-lg">
          <p>{t('landing.about1')}</p>
          <p>{t('landing.about2')}</p>
          <p>{t('landing.about3')}</p>
          <p><Trans i18nKey="landing.about4" components={{ b: <strong /> }} /></p>
          <p className="font-semibold text-brand-700">{t('landing.about5')}</p>
        </div>
      </section>
      <section className="landing-showcase" aria-label={t('landing.sampleAria')}>
        <p className="text-center text-brand-600 text-sm mb-4 tracking-widest uppercase">{t('landing.sampleLabel')}</p>
        <ChemistryPoster people={[{ fullName: 'Vibes', elements: parseNameToElements('Vibes') }]} theme="gold" />
      </section>
      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <Atom className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">{t('landing.feature1Title')}</h3>
            <p className="text-gray-600">
              {t('landing.feature1Text')}
            </p>
          </div>

          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-ocean-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-ocean-600">9</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">{t('landing.feature2Title')}</h3>
            <p className="text-gray-600">
              {t('landing.feature2Text')}
            </p>
          </div>

          <div className="bg-paper rounded-2xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-brand-600">ॐ</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">{t('landing.feature3Title')}</h3>
            <p className="text-gray-600">
              {t('landing.feature3Text')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-brand-600 to-ocean-600 rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">{t('landing.ctaHeading')}</h2>
          <p className="text-xl mb-8 opacity-90">{t('landing.ctaText')}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-paper text-brand-600 text-lg font-semibold rounded-xl hover:bg-gray-100 transition shadow-xl"
          >
            {t('landing.ctaButton')}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>{t('landing.copyright', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
