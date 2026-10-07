// Mock of 'firebase/auth' used when running `npm run dev:mock`.
// signInWithPopup shows an account picker with the seeded test accounts instead of Google.
import { MOCK_ACCOUNTS } from './seed';

const SESSION_KEY = 'nv_mock_session';

function makeUser({ uid, email, displayName }) {
  return {
    uid,
    email,
    displayName,
    emailVerified: true,
    photoURL: null,
    providerData: [{ providerId: 'google.com', email }],
    getIdToken: async () => `mock-token-${uid}`
  };
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? makeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const listeners = new Set();

const authInstance = {
  currentUser: loadSession(),
  onAuthStateChanged: (cb) => onAuthStateChanged(authInstance, cb),
  signOut: () => signOut(authInstance)
};

function setCurrentUser(user) {
  authInstance.currentUser = user;
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // session just won't survive a reload
  }
  listeners.forEach(cb => cb(user));
}

export function getAuth() {
  return authInstance;
}

export function onAuthStateChanged(auth, cb) {
  listeners.add(cb);
  setTimeout(() => cb(authInstance.currentUser), 0);
  return () => listeners.delete(cb);
}

export async function signOut() {
  setCurrentUser(null);
}

export class GoogleAuthProvider {
  setCustomParameters() {}
  addScope() {}
}

export class FacebookAuthProvider {
  setCustomParameters() {}
  addScope() {}
}

function uidForEmail(email) {
  const known = MOCK_ACCOUNTS.find(a => a.email === email);
  return known ? known.uid : `mock-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
}

// Account picker rendered with plain DOM so it works on any page without React
function pickAccount() {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Mock sign-in');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;font-family:system-ui,sans-serif';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:14px;max-width:420px;width:100%;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.3);max-height:90vh;overflow:auto';
    panel.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:#b45309;letter-spacing:.05em">MOCK MODE</div>
      <h2 style="font-size:20px;font-weight:700;margin:4px 0 12px">Choose a test account</h2>
    `;

    const close = (result, error) => {
      overlay.remove();
      error ? reject(error) : resolve(result);
    };

    MOCK_ACCOUNTS.forEach(account => {
      const button = document.createElement('button');
      button.type = 'button';
      button.style.cssText = 'display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:8px;border:1px solid #ddd;border-radius:10px;background:#fafafa;cursor:pointer';
      button.innerHTML = `<div style="font-weight:600">${account.displayName}</div><div style="font-size:12px;color:#666">${account.email} · ${account.description}</div>`;
      button.onclick = () => close(account);
      panel.appendChild(button);
    });

    const form = document.createElement('form');
    form.style.cssText = 'display:flex;gap:8px;margin-top:8px';
    form.innerHTML = `
      <input name="email" type="email" required placeholder="or any email, e.g. me@test.dev" aria-label="Custom test email"
        style="flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px" />
      <button type="submit" style="padding:8px 12px;border-radius:8px;background:#7c3aed;color:#fff;border:0;cursor:pointer">Sign in</button>
    `;
    form.onsubmit = (e) => {
      e.preventDefault();
      const email = form.email.value.trim().toLowerCase();
      close({ email, displayName: email.split('@')[0] });
    };
    panel.appendChild(form);

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'margin-top:12px;background:none;border:0;color:#666;cursor:pointer';
    cancel.onclick = () => {
      const error = new Error('Popup closed by user');
      error.code = 'auth/popup-closed-by-user';
      close(null, error);
    };
    panel.appendChild(cancel);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}

export async function signInWithPopup() {
  const account = await pickAccount();
  const user = makeUser({ uid: uidForEmail(account.email), email: account.email, displayName: account.displayName });
  setCurrentUser(user);
  return { user };
}
