from importlib.machinery import SourceFileLoader
import re
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

p = 'src/components/ReferralShareCard.jsx'
s = open(p, encoding='utf-8').read()
def rep(a, b, count=-1):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b) if count < 0 else s.replace(a, b, count)

rep("const EMAIL_SUBJECT = 'Discover the hidden elements in your name';\n", "")
rep("const subject = encodeURIComponent(EMAIL_SUBJECT);", "const subject = encodeURIComponent(t('share.emailSubject'));")
rep("showToast('Copied!');", "showToast(t('share.copiedBang'));")
rep("showToast('Message copied!');", "showToast(t('share.messageCopiedBang'));")
rep("showToast('Sharing was cancelled.');", "showToast(t('share.cancelled'));")
rep("copying.then(() => showToast('Message copied'));", "copying.then(() => showToast(t('share.messageCopied')));")
rep("copyAndOpen(url, 'Message copied');", "copyAndOpen(url, t('share.messageCopied'));")
rep("'Message copied. Paste it in Messenger.'", "t('share.pasteMessenger')")
rep("'Message copied. Paste it into your LinkedIn post.'", "t('share.pasteLinkedIn')")
rep("showToast('Message copied. Paste it after sharing on Facebook.');", "showToast(t('share.pasteFacebook'));")
rep("showToast('Message copied. Paste it in Instagram.');", "showToast(t('share.pasteInstagram'));")
rep(">Your Referral Code</h2>", ">{t('share.title')}</h2>")
rep("aria-label=\"Copy referral code\"", "aria-label={t('share.copyCodeAria')}")
rep("{copied ? 'Copied' : 'Copy'}", "{copied ? t('share.copied') : t('share.copy')}")
rep(">Share this code with your network to earn commissions!</p>", ">{t('share.subtitle')}</p>")
rep("aria-label=\"Share\">", "aria-label={t('share.share')}>")
rep(">Share</span>", ">{t('share.share')}</span>")
for app in ['WhatsApp', 'Facebook', 'Instagram', 'Telegram', 'X', 'LinkedIn', 'Messenger']:
    rep(f'aria-label="Share on {app}"', "aria-label={t('share.onApp', { app: '" + app + "' })}")
rep("aria-label=\"Share by email\"", "aria-label={t('share.byEmail')}")
rep(">Email</span>", ">{t('share.email')}</span>")
rep("aria-label=\"Copy message to clipboard\"", "aria-label={t('share.copyMessageAria')}")
rep("{messageCopied ? 'Copied' : 'Copy message'}", "{messageCopied ? t('share.copied') : t('share.copyMessage')}")
rep("<span>Email with:</span>", "<span>{t('share.emailWith')}</span>")
rep("Default mail app", "{t('share.defaultMail')}")
rep(">Message that will be sent</span>", ">{t('share.messagePreview')}</span>")
rep("aria-label=\"Copy message\"", "aria-label={t('share.copyMessage')}")
rep("{ title: 'Namasutra', text: message }", "{ title: 'Namasutra', text: message }")
rep("import React, { useRef, useState } from 'react';", "import React, { useRef, useState } from 'react';\nimport { useTranslation } from 'react-i18next';")
rep("export default function ReferralShareCard({ code }) {\n", "export default function ReferralShareCard({ code }) {\n  const { t } = useTranslation();\n")
open(p, 'w', encoding='utf-8').write(s)
# Outlook is a brand name and stays as is
X.add([
('share.emailSubject', 'Discover the hidden elements in your name'), ('share.copiedBang', 'Copied!'), ('share.messageCopiedBang', 'Message copied!'),
('share.cancelled', 'Sharing was cancelled.'), ('share.messageCopied', 'Message copied'),
('share.pasteMessenger', 'Message copied. Paste it in Messenger.'), ('share.pasteLinkedIn', 'Message copied. Paste it into your LinkedIn post.'),
('share.pasteFacebook', 'Message copied. Paste it after sharing on Facebook.'), ('share.pasteInstagram', 'Message copied. Paste it in Instagram.'),
('share.title', 'Your Referral Code'), ('share.copyCodeAria', 'Copy referral code'), ('share.copied', 'Copied'), ('share.copy', 'Copy'),
('share.subtitle', 'Share this code with your network to earn commissions!'), ('share.share', 'Share'),
('share.onApp', 'Share on {{app}}'), ('share.byEmail', 'Share by email'), ('share.email', 'Email'),
('share.copyMessageAria', 'Copy message to clipboard'), ('share.copyMessage', 'Copy message'), ('share.emailWith', 'Email with:'),
('share.defaultMail', 'Default mail app'), ('share.messagePreview', 'Message that will be sent'),
])

# InviteMessageBox (admin tool, uses the selected language for the message text)
p = 'src/components/InviteMessageBox.jsx'
s = open(p, encoding='utf-8').read()
s = s.replace("INVITE_EMAIL_SUBJECT, AMBASSADOR_LOGIN_URL", "inviteEmailSubject, AMBASSADOR_LOGIN_URL").replace("encodeURIComponent(INVITE_EMAIL_SUBJECT)", "encodeURIComponent(inviteEmailSubject())")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
