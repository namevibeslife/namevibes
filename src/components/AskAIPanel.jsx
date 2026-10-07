import React, { useState } from 'react';
import { Share2, ExternalLink, HelpCircle } from 'lucide-react';
import { buildAIPrompt, buildFamilyPDF } from '../utils/familyReport';

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
    const file = new File([buildFamilyPDF(results).output('blob')], 'NameVibes_Family_Report.pdf', { type: 'application/pdf' });

    try {
      await navigator.share({ files: [file], text: prompt, title: 'NameVibes Family Report' });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        navigator.clipboard?.writeText(prompt).catch(() => {});
        setAiNotice('your AI app');
      }
    }
  };

  return (
    <div>
      <h4 className="text-lg font-bold text-gray-800 text-center mb-1">
        Deepen Your Understanding with AI (Free)
      </h4>
      <p className="text-sm text-gray-600 text-center mb-4">
        Uses your own AI account. Your full report is sent along{contextLabels.length > 0 ? ', including the reasons you selected' : ''}.
      </p>

      {shareFiles && (
        <button
          onClick={handleShareToAIApp}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition mb-3"
        >
          <Share2 size={20} />
          Send PDF to my AI app
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AI_PROVIDERS.map(provider => (
          <button
            key={provider.name}
            onClick={() => handleAskAI(provider)}
            className="flex items-center justify-center gap-2 bg-white text-purple-700 border-2 border-purple-300 py-3 rounded-lg font-semibold hover:bg-purple-50 transition"
          >
            <ExternalLink size={18} />
            Ask {provider.name}
          </button>
        ))}
      </div>

      {aiNotice && (
        <div className="mt-4 bg-green-50 border border-green-300 text-green-800 rounded-lg p-3 text-sm">
          ✅ Your report has been copied. If it isn't already in the {aiNotice} chat box, paste it in
          (<strong>Ctrl+V</strong> on a computer, or <strong>long-press → Paste</strong> on a phone) and send.
        </div>
      )}

      <button
        onClick={() => setShowHelp(!showHelp)}
        className="mt-4 flex items-center gap-1 text-sm text-purple-700 font-semibold mx-auto hover:underline"
      >
        <HelpCircle size={16} />
        {showHelp ? 'Hide help' : 'How does this work?'}
      </button>

      {showHelp && (
        <div className="mt-3 bg-white rounded-lg p-4 text-sm text-gray-700 space-y-2 border border-purple-200">
          {shareFiles && (
            <p>
              <strong>Send PDF to my AI app:</strong> opens your phone's share menu with the PDF report attached.
              Choose Claude, ChatGPT or Gemini and the report arrives ready to send.
            </p>
          )}
          <p>
            <strong>Ask Claude / ChatGPT / Gemini:</strong> opens the AI in a new tab with your full report
            (names, elements, meanings and harmony) already written as a question. It's also copied, so you
            can paste it if the box is empty. Gemini always needs a paste.
          </p>
          <p>
            <strong>Want to attach the PDF too?</strong> Use <em>Download PDF</em> at the top, then drag the file
            into the chat or use the AI's attach (paperclip) button.
          </p>
          <p>
            You'll need to be signed in to your AI account. NameVibes doesn't see your conversation.
          </p>
        </div>
      )}
    </div>
  );
}
