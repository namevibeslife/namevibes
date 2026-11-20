from importlib.machinery import SourceFileLoader
X = SourceFileLoader('x', 'scripts/i18n-extract.py').load_module()

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:80])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

p = 'src/components/AmbassadorRegister.jsx'
sub(p, [
("summary: 'Details submitted'", "summary: 'Details submitted'"),
("notify('Your details are saved.');", "notify(t('ambassador.detailsSaved'));"),
("setError('Could not save your details: ' + e.message);", "setError(t('ambassador.saveFailed', { message: e.message }));"),
("notify('No changes to save');", "notify(t('ambassador.noChanges'));"),
("notify('Your changes are saved.');", "notify(t('ambassador.changesSaved'));"),
("setError('Could not save your changes: ' + e.message);", "setError(t('ambassador.saveChangesFailed', { message: e.message }));"),
(">My Details</h2>", ">{t('ambassador.myDetails')}</h2>"),
(">Your profile and payout details.</p>", ">{t('ambassador.myDetailsHint')}</p>"),
("submitLabel=\"Save changes\"", "submitLabel={t('ambassador.saveChanges')}"),
(">Edit</button>", ">{t('common.edit')}</button>"),
(">Confirm your changes</h3>", ">{t('ambassador.confirmChanges')}</h3>"),
("<span className=\"font-semibold\">{c.label}:</span>", "<span className=\"font-semibold\">{fieldLabel(c.field)}:</span>"),
(">Cancel</button>", ">{t('common.cancel')}</button>"),
("{busy ? 'Saving...' : 'Confirm changes'}", "{busy ? t('profileComplete.saving') : t('ambassador.confirmButton')}"),
])
s = open(p, encoding='utf-8').read()
import re
m = re.search(r"import \{[^}]*\} from '\.\./utils/ambassadorProfile';", s)
print('profile import:', m.group(0) if m else None)
open(p, 'w', encoding='utf-8').write(s)
