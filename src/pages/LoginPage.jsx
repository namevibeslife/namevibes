import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleButton, AppleButton } from '../components/AuthButtons';
import Logo from '../components/Logo';
import LanguagePicker from '../components/LanguagePicker';
import { LANGUAGE_PICKER_ENABLED } from '../config/site';
import { useTranslation } from 'react-i18next';

const QUIET_CODES = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

function friendlyError(error, provider) {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'errors.auth.invalidEmail';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'errors.auth.badCredentials';
    case 'auth/email-already-in-use':
      return 'errors.auth.emailInUse';
    case 'auth/weak-password':
      return 'errors.auth.weakPassword';
    case 'auth/too-many-requests':
      return 'errors.auth.tooMany';
    case 'auth/network-request-failed':
      return 'errors.auth.network';
    case 'auth/popup-blocked':
      return 'errors.auth.popupBlocked';
    case 'auth/account-exists-with-different-credential':
      return 'errors.auth.differentMethod';
    case 'auth/operation-not-allowed':
      return provider === 'apple'
        ? 'errors.auth.appleUnavailable'
        : 'errors.auth.methodUnavailable';
    default:
      return 'errors.auth.failed';
  }
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  // The login route's guard sends the user on (profile, pricing or dashboard) once signed in
  const runSocial = async (provider, name) => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (!QUIET_CODES.includes(err.code)) setError(friendlyError(err, name));
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return runSocial(provider, 'google');
  };

  const handleApple = () => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return runSocial(provider, 'apple');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, cleanEmail);
        setNotice('auth.resetSent');
        setLoading(false);
        return;
      }
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // verification email is a nicety; the account is already created
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      // On success the route guard redirects, so keep the loading state
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  const title = mode === 'signup' ? t('auth.titleSignup') : mode === 'reset' ? t('auth.titleReset') : t('auth.titleSignin');
  const submitLabel = mode === 'signup' ? t('auth.submitSignup') : mode === 'reset' ? t('auth.submitReset') : t('auth.submitSignin');

  return (
    <div className="min-h-screen site-midnight flex items-center justify-center p-4">
      <div className="bg-paper rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="mb-2">
            <Logo className="h-20 w-auto mx-auto" />
          </h1>
          <p className="text-gray-600">{t('auth.tagline')}</p>
        </div>

        {LANGUAGE_PICKER_ENABLED && <div className="flex justify-center mb-4"><LanguagePicker prominent /></div>}
        <h2 className="text-xl font-semibold text-gray-800 text-center mb-5">{title}</h2>

        {mode !== 'reset' && (
          <>
            <div className="space-y-3">
              <GoogleButton onClick={handleGoogle} disabled={loading} />
              <AppleButton onClick={handleApple} disabled={loading} />
            </div>

            <div className="flex items-center gap-3 my-6" role="separator" aria-label={t('auth.or')}>
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-xs uppercase tracking-wider text-gray-500">{t('auth.orUseEmail')}</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700">{t('auth.password')}</label>
                {mode === 'signin' && (
                  <button type="button" onClick={() => switchMode('reset')} className="text-sm text-brand-600 hover:text-brand-700">
                    {t('auth.forgot')}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-3 pr-12 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
                  placeholder={mode === 'signup' ? t('auth.passwordPlaceholderNew') : t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {t(error)}
            </div>
          )}
          {notice && (
            <div role="status" className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
              {t(notice)}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600"
          >
            {loading ? t('common.pleaseWait') : submitLabel}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-600">
          {mode === 'signin' && (
            <>
              {t('auth.newHere')}{' '}
              <button onClick={() => switchMode('signup')} className="text-brand-600 hover:text-brand-700 font-medium">
                {t('auth.createAccountLink')}
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              {t('auth.haveAccount')}{' '}
              <button onClick={() => switchMode('signin')} className="text-brand-600 hover:text-brand-700 font-medium">
                {t('auth.signInLink')}
              </button>
            </>
          )}
          {mode === 'reset' && (
            <button onClick={() => switchMode('signin')} className="text-brand-600 hover:text-brand-700 font-medium">
              {t('auth.backToSignin')}
            </button>
          )}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/')} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
            {t('common.backToHome')}
          </button>
        </div>
      </div>
    </div>
  );
}
