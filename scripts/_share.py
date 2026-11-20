from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

sub('src/utils/referralCode.js', [
("import { SITE_URL } from '../config/site.js';", "import i18n from 'i18next';\nimport { SITE_URL } from '../config/site.js';"),
("""    'Your name is more than just an identity. What if it has a connection to the very elements of our universe? 🌌',
    "I discovered something fascinating on Namasutra — a unique platform that connects the letters of our names to chemical elements, while exploring numerology, astrology and Nakshatra insights.",
    'Every name has a story. Discover what yours reveals! ✨',
    `🔗 Explore your Namasutra: ${link}`,
    `🎁 Try it with my referral code: ${c} this can give you a DISCOUNT`""", """    i18n.t('share.line1'),
    i18n.t('share.line2'),
    i18n.t('share.line3'),
    i18n.t('share.line4', { link }),
    i18n.t('share.line5', { code: c })"""),
])
X.add([
('share.line1', 'Your name is more than just an identity. What if it has a connection to the very elements of our universe? 🌌'),
('share.line2', 'I discovered something fascinating on Namasutra — a unique platform that connects the letters of our names to chemical elements, while exploring numerology, astrology and Nakshatra insights.'),
('share.line3', 'Every name has a story. Discover what yours reveals! ✨'),
('share.line4', '🔗 Explore your Namasutra: {{link}}'),
('share.line5', '🎁 Try it with my referral code: {{code}} this can give you a DISCOUNT'),
('invite.subject', 'You are invited to become a NAMASUTRA Ambassador'),
('invite.line1', "You're invited to become a NAMASUTRA Ambassador 🌟"),
('invite.line2', 'Sign in with your Google account ({{email}}) here: {{url}}'),
('invite.line3', 'Your unique Ambassador Code is already waiting for you in your dashboard.'),
('invite.member', 'Member'),
])
sub('src/utils/ambassadorInvite.js', [
("import { SITE_URL } from '../config/site.js';", "import i18n from 'i18next';\nimport { SITE_URL } from '../config/site.js';"),
("export const INVITE_EMAIL_SUBJECT = 'You are invited to become a NAMASUTRA Ambassador';", "export const inviteEmailSubject = () => i18n.t('invite.subject');"),
("""    "You're invited to become a NAMASUTRA Ambassador 🌟",
    `Sign in with your Google account (${email}) here: ${AMBASSADOR_LOGIN_URL}`,
    'Your unique Ambassador Code is already waiting for you in your dashboard.'""", """    i18n.t('invite.line1'),
    i18n.t('invite.line2', { email, url: AMBASSADOR_LOGIN_URL }),
    i18n.t('invite.line3')"""),
("if (!parts.length) return 'Member';", "if (!parts.length) return i18n.t('invite.member');"),
])
print('ok')
