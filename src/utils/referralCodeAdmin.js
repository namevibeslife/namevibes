// Admin-only referral code operations that touch Firestore: atomic reservation of a new
// code, activating/deactivating an existing one, and the referral-code migration tool.
// All of this runs from an authenticated admin's browser session, gated by firestore.rules
// (isAdmin()/isSuperAdmin()) - there is no separate backend in this app.
import { doc, runTransaction, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { generateCandidateCode, normalizeReferralCode } from './referralCode';

const MAX_ATTEMPTS = 10;
export const CURRENT_CODE_VERSION = 2;

// Atomically reserves a brand-new, never-before-used code for this ambassador. countryCode
// must be the ambassador's real 2-letter country code - generateCandidateCode throws clearly
// if it's missing or invalid, rather than guessing.
// A referralCodes/{code} doc is created only if it doesn't already exist (transaction), so
// two admins approving at the same instant can never collide on the same code. Retries with a
// fresh random code up to MAX_ATTEMPTS times (10^6 = 1M codes per country, so a real collision
// is very unlikely at ambassador-program scale - this is defensive, not expected to loop).
export async function reserveReferralCode(ambassadorId, ambassadorEmail, countryCode) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCandidateCode(countryCode); // throws clearly if countryCode is bad
    const ref = doc(db, 'referralCodes', code);
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) throw new Error('referral-code-collision');
        tx.set(ref, {
          code,
          ambassadorId,
          ambassadorEmail: ambassadorEmail.toLowerCase(),
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      return code;
    } catch (error) {
      lastError = error;
      if (error?.message !== 'referral-code-collision') throw error;
      // else: loop and try another random code
    }
  }
  throw new Error(`Could not reserve a unique referral code after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
}

// Flips a code's active flag without touching its identity - firestore.rules locks
// ambassadorId/code/createdAt on update, only active/updatedAt may change.
export async function setReferralCodeActive(code, active) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  await updateDoc(doc(db, 'referralCodes', normalized), {
    active,
    updatedAt: serverTimestamp()
  });
}

// ---------- referral code migration (regenerate to the current format/version) ----------

// Ambassadors eligible for migration: approved, and not already on the current code version.
// firestore.rules locks referralCode once codeVersion reaches CURRENT_CODE_VERSION, so this is
// also what determines whether a change would even be accepted - keeping the two in sync.
// Idempotent - re-running finds nothing left to do once every ambassador is on the current version.
export function ambassadorsNeedingMigration(ambassadors) {
  return ambassadors.filter(a => a.isApproved && a.referralCode && (a.codeVersion || 1) < CURRENT_CODE_VERSION);
}

// Dry run: shows what WOULD change without writing anything. The candidate codes shown here
// are for preview only - the real run reserves fresh ones atomically (these aren't pre-booked).
// An ambassador missing a country code is shown with an error instead of a candidate, so the
// admin can fix it before running for real rather than having the run fail partway through.
export function previewMigration(ambassadors) {
  const seen = new Set();
  return ambassadorsNeedingMigration(ambassadors).map(a => {
    const row = {
      ambassadorId: a.id,
      ambassadorName: a.fullName,
      ambassadorEmail: a.email,
      oldCode: a.referralCode,
      newCode: null,
      error: null
    };
    try {
      let candidate = generateCandidateCode(a.countryCode);
      while (seen.has(candidate)) candidate = generateCandidateCode(a.countryCode);
      seen.add(candidate);
      row.newCode = candidate;
    } catch (error) {
      row.error = error.message;
    }
    return row;
  });
}

// Real run: for each eligible ambassador, atomically reserves a new code (using their own
// country code), updates the ambassador record with the new code, legacyCode (the immediately
// previous code) and codeVersion: CURRENT_CODE_VERSION, and deactivates the OLD referralCodes
// doc (rules forbid deleting it, so it's set active: false instead - never reused). An
// ambassador missing a country code fails clearly for that one row; the rest still proceed.
export async function runMigration(ambassadors, { onProgress } = {}) {
  const targets = ambassadorsNeedingMigration(ambassadors);
  const results = [];
  for (const ambassador of targets) {
    const oldCode = ambassador.referralCode;
    try {
      const newCode = await reserveReferralCode(ambassador.id, ambassador.email, ambassador.countryCode);
      await updateDoc(doc(db, 'ambassadors', ambassador.id), {
        referralCode: newCode,
        legacyCode: oldCode,
        codeVersion: CURRENT_CODE_VERSION,
        codeMigratedAt: serverTimestamp()
      });
      await setReferralCodeActive(oldCode, false).catch((error) => {
        console.warn(`[referral migration] could not deactivate old code ${oldCode}:`, error.message);
      });
      const result = { ambassadorId: ambassador.id, ambassadorEmail: ambassador.email, oldCode, newCode, status: 'ok' };
      results.push(result);
      onProgress?.(result);
    } catch (error) {
      const result = { ambassadorId: ambassador.id, ambassadorEmail: ambassador.email, oldCode, status: 'error', error: error.message };
      results.push(result);
      onProgress?.(result);
    }
  }
  return results;
}
