from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/components/AskAIPanel.jsx'
s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)
rep("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { Trans, useTranslation } from 'react-i18next';")
rep("export default function AskAIPanel({ results, contextLabels = [] }) {\n", "export default function AskAIPanel({ results, contextLabels = [] }) {\n  const { t } = useTranslation();\n")
rep("setAiNotice('your AI app');", "setAiNotice(t('ai.yourApp'));")
rep("title: 'Namasutra Family Report'", "title: t('ai.reportTitle')")
rep("        Deepen Your Understanding with AI (Free)\n", "        {t('ai.title')}\n")
rep("        Uses your own AI account. Your full report is sent along{contextLabels.length > 0 ? ', including the reasons you selected' : ''}.", "        {contextLabels.length > 0 ? t('ai.subtitleReasons') : t('ai.subtitle')}")
rep("          Send PDF to my AI app\n", "          {t('ai.sendPdf')}\n")
rep("            Ask {provider.name}\n", "            {t('ai.ask', { name: provider.name })}\n")
rep("""          ✅ Your report has been copied. If it isn't already in the {aiNotice} chat box, paste it in
          (<strong>Ctrl+V</strong> on a computer, or <strong>long-press → Paste</strong> on a phone) and send.""", """          <Trans i18nKey="ai.copied" values={{ app: aiNotice }} components={{ b: <strong /> }} />""")
rep("{showHelp ? 'Hide help' : 'How does this work?'}", "{showHelp ? t('ai.hideHelp') : t('ai.howWorks')}")
rep("""              <strong>Send PDF to my AI app:</strong> opens your phone's share menu with the PDF report attached.
              Choose Claude, ChatGPT or Gemini and the report arrives ready to send.""", """              <Trans i18nKey="ai.help1" components={{ b: <strong /> }} />""")
rep("""            <strong>Ask Claude / ChatGPT / Gemini:</strong> opens the AI in a new tab with your full report
            (names, elements, meanings and harmony) already written as a question. It's also copied, so you
            can paste it if the box is empty. Gemini always needs a paste.""", """            <Trans i18nKey="ai.help2" components={{ b: <strong /> }} />""")
rep("""            <strong>Want to attach the PDF too?</strong> Use <em>Download PDF</em> at the top, then drag the file
            into the chat or use the AI's attach (paperclip) button.""", """            <Trans i18nKey="ai.help3" components={{ b: <strong />, i: <em /> }} />""")
rep("""            You'll need to be signed in to your AI account. Namasutra doesn't see your conversation.""", """            {t('ai.help4')}""")
open(p, 'w', encoding='utf-8').write(s)

p = 'src/utils/familyReport.js'
s = open(p, encoding='utf-8').read()
rep("import { buildPosterPDF } from './posterReport';", "import i18n from 'i18next';\nimport { buildPosterPDF } from './posterReport';\nimport { elementMeaning } from '../i18n/elements';")
rep("`I used Namasutra (${SITE_HOST}), which maps the letters of a name to periodic table elements. Here is my family report:`", "i18n.t('ai.promptIntro', { host: SITE_HOST })")
rep("lines.push(`  - ${el.name} (${el.symbol}, atomic number ${el.number}): ${el.meaning}`);", "lines.push(i18n.t('ai.promptElement', { name: el.name, symbol: el.symbol, number: el.number, meaning: elementMeaning(el) }));")
rep("lines.push(`${person.relation}: ${person.fullName}`);", "lines.push(`${relationLabel(person.relation)}: ${person.fullName}`);")
rep("lines.push(`Harmony elements shared by everyone: ${commonElements.map(e => `${e.name} (${e.symbol})`).join(', ')}`);", "lines.push(i18n.t('ai.promptHarmony', { elements: commonElements.map(e => `${e.name} (${e.symbol})`).join(', ') }));")
rep("lines.push(`Why I'm exploring this: ${contextLabels.join('; ')}`);", "lines.push(i18n.t('ai.promptWhy', { reasons: contextLabels.join('; ') }));")
rep("lines.push('Can you help me understand what these elements and the harmony between our names might signify, and how they connect us as a family?');", "lines.push(i18n.t('ai.promptQuestion'));")
rep("import { SITE_HOST } from '../config/site.js';", "import { SITE_HOST } from '../config/site.js';\nimport { relationLabel } from '../i18n/poster.js';")
open(p, 'w', encoding='utf-8').write(s)

X.add([
('ai.yourApp', 'your AI app'), ('ai.reportTitle', 'Namasutra Family Report'), ('ai.title', 'Deepen Your Understanding with AI (Free)'),
('ai.subtitle', 'Uses your own AI account. Your full report is sent along.'),
('ai.subtitleReasons', 'Uses your own AI account. Your full report is sent along, including the reasons you selected.'),
('ai.sendPdf', 'Send PDF to my AI app'), ('ai.ask', 'Ask {{name}}'),
('ai.copied', "✅ Your report has been copied. If it isn't already in the {{app}} chat box, paste it in (<b>Ctrl+V</b> on a computer, or <b>long-press → Paste</b> on a phone) and send."),
('ai.hideHelp', 'Hide help'), ('ai.howWorks', 'How does this work?'),
('ai.help1', "<b>Send PDF to my AI app:</b> opens your phone's share menu with the PDF report attached. Choose Claude, ChatGPT or Gemini and the report arrives ready to send."),
('ai.help2', "<b>Ask Claude / ChatGPT / Gemini:</b> opens the AI in a new tab with your full report (names, elements, meanings and harmony) already written as a question. It's also copied, so you can paste it if the box is empty. Gemini always needs a paste."),
('ai.help3', "<b>Want to attach the PDF too?</b> Use <i>Download PDF</i> at the top, then drag the file into the chat or use the AI's attach (paperclip) button."),
('ai.help4', "You'll need to be signed in to your AI account. Namasutra doesn't see your conversation."),
('ai.promptIntro', 'I used Namasutra ({{host}}), which maps the letters of a name to periodic table elements. Here is my family report:'),
('ai.promptElement', '  - {{name}} ({{symbol}}, atomic number {{number}}): {{meaning}}'),
('ai.promptHarmony', 'Harmony elements shared by everyone: {{elements}}'),
('ai.promptWhy', "Why I'm exploring this: {{reasons}}"),
('ai.promptQuestion', 'Can you help me understand what these elements and the harmony between our names might signify, and how they connect us as a family?'),
])
print('ok')
