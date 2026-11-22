from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

p = 'src/components/AmbassadorRegister.jsx'
sub(p, [("import { buildUpdate, diffProfile, fromAmbassador } from '../utils/ambassadorProfile';", "import { buildUpdate, diffProfile, fromAmbassador, fieldLabel } from '../utils/ambassadorProfile';")])
s = X.hook(open(p, encoding='utf-8').read(), ['AmbassadorRegister'])
open(p, 'w', encoding='utf-8').write(s)
X.add([
('ambassador.detailsSaved', 'Your details are saved.'), ('ambassador.saveFailed', 'Could not save your details: {{message}}'),
('ambassador.noChanges', 'No changes to save'), ('ambassador.changesSaved', 'Your changes are saved.'),
('ambassador.saveChangesFailed', 'Could not save your changes: {{message}}'), ('ambassador.myDetails', 'My Details'),
('ambassador.myDetailsHint', 'Your profile and payout details.'), ('ambassador.saveChanges', 'Save changes'),
('common.edit', 'Edit'), ('ambassador.confirmChanges', 'Confirm your changes'), ('ambassador.confirmButton', 'Confirm changes'),
])

p = 'src/components/AmbassadorArea.jsx'
sub(p, [
("const TABS = [['home', 'Home'], ['register', 'Register'], ['followers', 'My Followers']];", "const TABS = [['home', 'ambassador.tabHome'], ['register', 'ambassador.tabRegister'], ['followers', 'ambassador.tabFollowers']];"),
("<h1>Welcome, {ambassador.firstName || ambassador.fullName || user.displayName || 'Ambassador'}.</h1><p>Everything you need, in one place.</p>", "<h1>{t('ambassador.welcome', { name: ambassador.firstName || ambassador.fullName || user.displayName || t('ambassador.fallbackName') })}</h1><p>{t('ambassador.everything')}</p>"),
("<p className=\"amb-kicker\">YOUR AMBASSADOR SPACE</p>", "<p className=\"amb-kicker\">{t('ambassador.yourSpace')}</p>"),
("<CheckCircle size={16} aria-hidden=\"true\" /> Active ambassador", "<CheckCircle size={16} aria-hidden=\"true\" /> {t('ambassador.active')}"),
("aria-label=\"Ambassador sections\"", "aria-label={t('ambassador.sectionsAria')}"),
("<span>{label}</span>", "<span>{t(label)}</span>"),
("Loading your welcome...", "{t('ambassador.loadingWelcome')}"),
("<p className=\"amb-kicker\">WELCOME TO NAMASUTRA</p><h2>Your ambassador home</h2><p>Your account is ready. Use the tabs above to manage your profile and view your followers.</p>", "<p className=\"amb-kicker\">{t('ambassador.emptyKicker')}</p><h2>{t('ambassador.emptyTitle')}</h2><p>{t('ambassador.emptyText')}</p>"),
("The welcome text could not be loaded right now.", "{t('ambassador.welcomeFailed')}"),
("aria-label=\"Your ambassador tools\"", "aria-label={t('ambassador.toolsAria')}"),
("<p className=\"amb-kicker\">YOUR PROFILE</p><h2>{ambassador.detailsCompleted ? 'Details saved' : 'Make yourself at home'}</h2>", "<p className=\"amb-kicker\">{t('ambassador.yourProfile')}</p><h2>{ambassador.detailsCompleted ? t('ambassador.detailsSavedTitle') : t('ambassador.makeHome')}</h2>"),
("{ambassador.detailsCompleted ? 'Your registration details are saved. Review or update them whenever you need.' : 'Complete your details to receive payouts.'}", "{ambassador.detailsCompleted ? t('ambassador.profileSavedText') : t('ambassador.profileCompleteText')}"),
("{ambassador.detailsCompleted ? 'View your profile' : 'Complete details'}", "{ambassador.detailsCompleted ? t('ambassador.viewProfile') : t('ambassador.completeDetails')}"),
(">My Followers</h2>", ">{t('ambassador.tabFollowers')}</h2>"),
("Signed in as {ambassador.email}", "{t('ambassador.signedInAs', { email: ambassador.email })}"),
(">Sign out</button>", ">{t('ambassador.signOut')}</button>"),
])
s = open(p, encoding='utf-8').read()
s = s.replace("export default function AmbassadorArea({ ambassador, user, onAmbassadorChange, onSignOut }) {\n", "export default function AmbassadorArea({ ambassador, user, onAmbassadorChange, onSignOut }) {\n  const { t } = useTranslation();\n")
s = s.replace("import React, { useEffect, useRef, useState } from 'react';", "import React, { useEffect, useRef, useState } from 'react';\nimport { useTranslation } from 'react-i18next';")
open(p, 'w', encoding='utf-8').write(s)
X.add([
('ambassador.tabHome', 'Home'), ('ambassador.tabRegister', 'Register'), ('ambassador.tabFollowers', 'My Followers'),
('ambassador.welcome', 'Welcome, {{name}}.'), ('ambassador.fallbackName', 'Ambassador'), ('ambassador.everything', 'Everything you need, in one place.'),
('ambassador.yourSpace', 'YOUR AMBASSADOR SPACE'), ('ambassador.active', 'Active ambassador'), ('ambassador.sectionsAria', 'Ambassador sections'),
('ambassador.loadingWelcome', 'Loading your welcome...'), ('ambassador.emptyKicker', 'WELCOME TO NAMASUTRA'), ('ambassador.emptyTitle', 'Your ambassador home'),
('ambassador.emptyText', 'Your account is ready. Use the tabs above to manage your profile and view your followers.'),
('ambassador.welcomeFailed', 'The welcome text could not be loaded right now.'), ('ambassador.toolsAria', 'Your ambassador tools'),
('ambassador.yourProfile', 'YOUR PROFILE'), ('ambassador.detailsSavedTitle', 'Details saved'), ('ambassador.makeHome', 'Make yourself at home'),
('ambassador.profileSavedText', 'Your registration details are saved. Review or update them whenever you need.'),
('ambassador.profileCompleteText', 'Complete your details to receive payouts.'),
('ambassador.viewProfile', 'View your profile'), ('ambassador.completeDetails', 'Complete details'),
('ambassador.signedInAs', 'Signed in as {{email}}'),
])
print('ok')
