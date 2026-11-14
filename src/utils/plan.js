import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Most names a single Family analysis can hold. Results screens and the PDF/image exports are
// designed around this many people. Older saved analyses may hold more and still open and print.
export const FAMILY_MAX_NAMES = 4;

// What each plan allows. Individual name analyses are capped per calendar month on both plans;
// Family analyses (up to FAMILY_MAX_NAMES names each) are a Family-plan feature.
export const PLAN_FEATURES = {
  individual: { monthlyAnalyses: 8, familyPackage: false, pdfDownload: false },
  family: { monthlyAnalyses: 8, familyPackage: true, pdfDownload: true }
};

const toDate = (value) => (value?.toDate ? value.toDate() : value ? new Date(value) : null);

export function isPlanActive(profile) {
  if (!profile?.planType || !profile.planActive) return false;
  const expiry = toDate(profile.planExpiry);
  return !expiry || expiry > new Date();
}

export function planFeatures(profile) {
  return isPlanActive(profile) ? PLAN_FEATURES[profile.planType] || null : null;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Single-field range query (no composite index needed); the type is filtered client-side
export async function countAnalysesThisMonth(uid) {
  const snapshot = await getDocs(query(
    collection(db, 'users', uid, 'analyses'),
    where('timestamp', '>=', startOfMonth())
  ));
  return snapshot.docs.filter(d => d.data().type === 'individual').length;
}
