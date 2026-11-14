// Admin-only referral code operations that touch Firestore: atomic reservation of a new
// code, activating/deactivating an existing one, and the one-time legacy-code migration.
// All of this runs from an authenticated admin's browser session, gated by firestore.rules
// (isAdmin()/isSuperAdmin()) - there is no separate backend in this app.
import { doc, runTransaction, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { generateCandidateCode, normalizeReferralCode, isWellFormedCode } from './referralCode';

const MAX_ATTEMPTS = 10;

// Atomically reserves a brand-new, never-before-used code for this ambassador.
// A referralCodes/{code} doc is created only if it doesn't already exist (transaction),
// so two admins approving at the same instant can never collide on the same code.
// Retries with a fresh random code up to MAX_ATTEMPTS times (32^6 ~= 1.07B codes, so a
// real collision is astronomically unlikely - this is defensive, not expected to loop).
export async function reserveReferralCode(ambassadorId, ambassadorEmail) {
  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCandidateCode();
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

// ---------- one-time migration of legacy "CC SS NNNNN" codes ----------

// Ambassadors eligible for migration: have a code that ISN'T already the current NV-XXXXXX
// format (an old-format code like "IN TN 00003"). Freshly-approved ambassadors already get a
// well-formed code at approval time and are correctly left alone. Idempotent - re-running
// finds nothing left to do once every ambassador's code is well-formed.
export function ambassadorsNeedingMigration(ambassadors) {
  return ambassadors.filter(a => a.referralCode && !isWellFormedCode(a.referralCode));
}

// Dry run: shows what WOULD change without writing anything. The candidate codes shown here
// are for preview only - the real run reserves fresh ones atomically (these aren't pre-booked).
export function previewMigration(ambassadors) {
  const seen = new Set();
  return ambassadorsNeedingMigration(ambassadors).map(a => {
    let candidate = generateCandidateCode();
    while (seen.has(candidate)) candidate = generateCandidateCode();
    seen.add(candidate);
    return {
      ambassadorId: a.id,
      ambassadorName: a.fullName,
      ambassadorEmail: a.email,
      oldCode: a.referralCode,
      newCode: candidate
    };
  });
}

// Real run: for each eligible ambassador, atomically reserves a new code and updates the
// ambassador record with the new code plus legacyCode. The old referralCodes doc is left
// exactly as it was (still active) - nothing is deleted or deactivated, so a legacy code
// still resolves at lookup if anyone ever had it. Both codes attribute to the same
// ambassadorEmail, so commission tracking (keyed off ambassadorEmail) is unaffected either way.
export async function runMigration(ambassadors, { onProgress } = {}) {
  const targets = ambassadorsNeedingMigration(ambassadors);
  const results = [];
  for (const ambassador of targets) {
    const oldCode = ambassador.referralCode;
    try {
      const newCode = await reserveReferralCode(ambassador.id, ambassador.email);
      await updateDoc(doc(db, 'ambassadors', ambassador.id), {
        referralCode: newCode,
        legacyCode: oldCode,
        codeMigratedAt: serverTimestamp()
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
