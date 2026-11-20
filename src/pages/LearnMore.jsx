import React, { useState } from "react";
import { Trans } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from 'react-i18next';

export default function LearnMore() {
  const { t } = useTranslation();
  const [mode, setMode] = useState("science");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen site-background px-6 py-12">
      <div className="max-w-4xl mx-auto bg-paper rounded-2xl shadow-lg p-8">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          {t('landing.learnMore')}
        </h1>

        {/* Navigation */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => navigate("/")}
            className="text-brand-600 font-semibold hover:underline"
          >
            {t('nav.home')}
          </button>

          {user && (
            <button
              onClick={() => navigate("/dashboard")}
              className="text-brand-600 font-semibold hover:underline"
            >
              {t('nav.dashboard')}
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-8" aria-label={t('learn.topicsAria')}>
          {[["science", t('learn.tabScience')], ["spiritual", t('learn.tabSpiritual')], ["explainer", t('learn.tabExplainer')]].map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)} aria-pressed={mode === key}
              className={`px-5 py-3 rounded-full font-semibold transition ${mode === key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {mode === "explainer" ? (
          <section aria-label={t('learn.explainerAria')} className="space-y-4 text-center">
            <h2 className="text-2xl text-brand-700">{t('poster.heading')}</h2>
            <p>{t('learn.explainerText')}</p>
            <a href="/theme/namasutra-explainer.png" target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-amber-200 shadow-lg">
              <img src="/theme/namasutra-explainer.png" alt={t('learn.explainerAlt')} className="w-full h-auto" />
            </a>
            <a href="/theme/namasutra-explainer.png" target="_blank" rel="noreferrer" className="inline-block underline text-brand-700 py-2">{t('learn.explainerFull')}</a>
          </section>
        ) : mode === "science" ? (
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p><Trans i18nKey="learn.science1" components={{ b: <strong /> }} /></p>

            <p>{t('learn.science2')}</p>

            <ul className="list-disc list-inside pl-4">
              <li>{t('learn.scienceItem1')}</li>
              <li>{t('learn.scienceItem2')}</li>
              <li>{t('learn.scienceItem3')}</li>
            </ul>

            <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
              <p className="font-semibold">{t('learn.example')}</p>
              <p className="font-mono">
                BLESSINGS → B – Li – Es – S – In – G – S
              </p>
            </div>

            <p><Trans i18nKey="learn.science3" components={{ b: <strong /> }} /></p>

            <p className="font-semibold text-brand-600">{t('learn.science4')}</p>
          </div>
        ) : (
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p><Trans i18nKey="learn.spiritual1" components={{ b: <strong /> }} /></p>

            <p className="italic">
              {t('learn.spiritual2a')}<br />
              {t('learn.spiritual2b')}<br />
              {t('learn.spiritual2c')}
            </p>

            <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
              <p className="font-semibold">{t('learn.example')}</p>
              <p className="font-mono">
                BLESSINGS → B – Li – Es – S – In – G – S
              </p>
            </div>

            <p><Trans i18nKey="learn.spiritual3" components={{ b: <strong /> }} /></p>

            <p className="font-semibold text-brand-600">{t('learn.spiritual4')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
