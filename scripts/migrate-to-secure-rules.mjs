// One-time migration of live Firestore data to the format the new security rules expect.
// Must run BEFORE deploying firestore.rules (it relies on the current open rules).
//
//   node scripts/migrate-to-secure-rules.mjs           -> dry run: prints what would change
//   node scripts/migrate-to-secure-rules.mjs --apply   -> makes the changes
//
// What it does:
//   1. admins: re-keys each admin document by lowercase email (admins/{email}) and drops the
//      stored password. Admins then sign in with Google using that email.
//   2. ambassadors: lowercases emails; for approved ambassadors creates referralCodes/{CODE}.
//   3. users: adds ambassadorEmail to users who signed up with a valid referral code.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc',
  authDomain: 'namevibes-life.firebaseapp.com',
  projectId: 'namevibes-life'
};

const APPLY = process.argv.includes('--apply');
const db = getFirestore(initializeApp(firebaseConfig));
const log = (...args) => console.log(APPLY ? '[apply]' : '[dry run]', ...args);

async function migrateAdmins() {
  const snapshot = await getDocs(collection(db, 'admins'));
  for (const adminDoc of snapshot.docs) {
    const data = adminDoc.data();
    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
      log(`admins/${adminDoc.id}: no email, skipped (fix by hand)`);
      continue;
    }
    if (adminDoc.id === email && !('password' in data)) continue;

    const { password, ...rest } = data;
    log(`admins/${adminDoc.id} -> admins/${email} (role: ${data.role || 'admin'}, password removed)`);
    if (APPLY) {
      await setDoc(doc(db, 'admins', email), { ...rest, email, migratedAt: Timestamp.now() });
      if (adminDoc.id !== email) await deleteDoc(adminDoc.ref);
    }
  }
}

async function migrateAmbassadors() {
  const codes = new Map();
  const snapshot = await getDocs(collection(db, 'ambassadors'));
  for (const ambassadorDoc of snapshot.docs) {
    const data = ambassadorDoc.data();
    const email = (data.email || '').trim().toLowerCase();
    if (email && email !== data.email) {
      log(`ambassadors/${ambassadorDoc.id}: email lowercased`);
      if (APPLY) await updateDoc(ambassadorDoc.ref, { email });
    }
    if (data.referralCode && data.isApproved) {
      const key = data.referralCode.replace(/\s/g, '');
      codes.set(data.referralCode, email);
      log(`referralCodes/${key} -> ${email} (active: ${!!data.isActive})`);
      if (APPLY) {
        await setDoc(doc(db, 'referralCodes', key), {
          code: data.referralCode,
          ambassadorId: ambassadorDoc.id,
          ambassadorEmail: email,
          active: !!data.isActive,
          updatedAt: Timestamp.now()
        });
      }
    }
  }
  return codes;
}

async function linkReferredUsers(codes) {
  const snapshot = await getDocs(collection(db, 'users'));
  let linked = 0;
  let unknown = 0;
  for (const userDoc of snapshot.docs) {
    const { referralCode, ambassadorEmail } = userDoc.data();
    if (!referralCode || ambassadorEmail) continue;
    const email = codes.get(referralCode);
    if (!email) {
      unknown++;
      continue;
    }
    linked++;
    if (APPLY) await updateDoc(userDoc.ref, { ambassadorEmail: email });
  }
  log(`users: ${linked} linked to their ambassador, ${unknown} with a code that matches no approved ambassador (left as is)`);
}

await migrateAdmins();
const codes = await migrateAmbassadors();
await linkReferredUsers(codes);
console.log(APPLY ? '\nDone.' : '\nDry run only. Re-run with --apply to make these changes.');
process.exit(0);
