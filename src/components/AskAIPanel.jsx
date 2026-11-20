import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Share2, ExternalLink, HelpCircle } from 'lucide-react';
import { buildAIPrompt, buildFamilyPDF } from '../utils/familyReport';
import { isComplexLanguage } from '../i18n/posterFont';

// Gemini doesn't accept a prefilled prompt in the URL, so it relies on the clipboard copy
const AI_PROVIDERS = [
  { name: 'Claude', url: 'https://claude.ai/new?q=', home: 'https://claude.ai/new' },
  { name: 'ChatGPT', url: 'https://chatgpt.com/?q=', home: 'https://chatgpt.com/' },
  { name: 'Gemini', url: null, home: 'https://gemini.google.com/app' }
];

// File sharing via the share sheet is only worth offering on touch devices (phones/tablets)
const canShareFiles = () => {
  try {
    const probe = new File([''], 'probe.pdf', { type: 'application/pdf' });
    return !!navigator.canShare?.({ files: [probe] }) && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

/**
 * "Deepen your understanding with AI": hands the family report to the user's own AI account.
 * results: [{ relation, fullName, elements }]; contextLabels: reasons the user ticked (optional).
 */
export default function AskAIPanel({ results, contextLabels = [] }) {
  const { t } = useTranslation();
  const [aiNotice, setAiNotice] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const shareFiles = canShareFiles();

  const handleAskAI = (provider) => {
    const prompt = buildAIPrompt(results, contextLabels);
    // Long reports can exceed URL length limits; in that case open the AI empty and rely on the clipboard
    const url = provider.url && prompt.length < 4000
      ? `${provider.url}${encodeURIComponent(prompt)}`
      : provider.home;

    window.open(url, '_blank');
    navigator.clipboard?.writeText(prompt).catch(() => {});
    setAiNotice(provider.name);
  };

  const handleShareToAIApp = async () => {
    const prompt = buildAIPrompt(results, contextLabels);
    const pdf = isComplexLanguage()
      ? await (await import('../utils/posterPdfImage')).buildPosterImagePDF(results, { family: true })
      : buildFamilyPDF(results);
    const file = new File([pdf.output('blob')], 'Namasutra_Family_Report.pdf', { type: 'application/pdf' });

    try {
      await navigator.share({ files: [file], text: prompt, title: t('ai.reportTitle') });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        navigator.clipboard?.writeText(prompt).catch(() => {});
        setAiNotice(t('ai.yourApp'));
      }
    }
  };

  return (
    <div>
      <h4 className="text-lg font-bold text-gray-800 text-center mb-1">
        {t('ai.title')}
      </h4>
      <p className="text-sm text-gray-600 text-center mb-4">
        {contextLabels.length > 0 ? t('ai.subtitleReasons') : t('ai.subtitle')}
      </p>

      {shareFiles && (
        <button
          onClick={handleShareToAIApp}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-600 text-white py-3 rounded-lg font-semibold hover:from-brand-700 hover:to-brand-700 transition mb-3"
        >
          <Share2 size={20} />
          {t('ai.sendPdf')}
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AI_PROVIDERS.map(provider => (
          <button
            key={provider.name}
            onClick={() => handleAskAI(provider)}
            className="flex items-center justify-center gap-2 bg-paper text-brand-700 border-2 border-brand-300 py-3 rounded-lg font-semibold hover:bg-brand-50 transition"
          >
            <ExternalLink size={18} />
            {t('ai.ask', { name: provider.name })}
          </button>
        ))}
      </div>

      {aiNotice && (
        <div className="mt-4 bg-green-50 border border-green-300 text-green-800 rounded-lg p-3 text-sm">
          <Trans i18nKey="ai.copied" values={{ app: aiNotice }} components={{ b: <strong /> }} />
        </div>
      )}

      <button
        onClick={() => setShowHelp(!showHelp)}
        className="mt-4 flex items-center gap-1 text-sm text-brand-700 font-semibold mx-auto hover:underline"
      >
        <HelpCircle size={16} />
        {showHelp ? t('ai.hideHelp') : t('ai.howWorks')}
      </button>

      {showHelp && (
        <div className="mt-3 bg-paper rounded-lg p-4 text-sm text-gray-700 space-y-2 border border-brand-200">
          {shareFiles && (
            <p>
              <Trans i18nKey="ai.help1" components={{ b: <strong /> }} />
            </p>
          )}
          <p>
            <Trans i18nKey="ai.help2" components={{ b: <strong /> }} />
          </p>
          <p>
            <Trans i18nKey="ai.help3" components={{ b: <strong />, i: <em /> }} />
          </p>
          <p>
            {t('ai.help4')}
          </p>
        </div>
      )}
    </div>
  );
}
