// One-time migration of live Firestore data to the format the new security rules expect.
// Must run BEFORE deploying firestore.rules (it relies on the current open rules).
//
//   node scripts/migrate-to-secure-rules.mjs           -> dry run: prints what would change
//   node scripts/migrate-to-secure-rules.mjs --apply   -> makes the changes (backs up to scripts/backups/ first)
//   add --super=you@gmail.com,other@gmail.com to grant super admin to Google accounts
//
// What it does:
//   1. admins: re-keys each admin document by lowercase email (admins/{email}) and drops the
//      stored password. Admins then sign in with Google using that email.
//   2. ambassadors: lowercases emails; for approved ambassadors creates referralCodes/{CODE}.
//   3. users: adds ambassadorEmail to users who signed up with a valid referral code.
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const firebaseConfig = {
  apiKey: 'AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc',
  authDomain: 'namevibes-life.firebaseapp.com',
  projectId: 'namevibes-life'
};

const APPLY = process.argv.includes('--apply');
// --super=a@gmail.com,b@gmail.com adds super admins (Google accounts that can sign in)
const SUPER_ADMINS = (process.argv.find(a => a.startsWith('--super=')) || '--super=')
  .slice('--super='.length).split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const db = getFirestore(initializeApp(firebaseConfig));
const log = (...args) => console.log(APPLY ? '[apply]' : '[dry run]', ...args);

// Before changing anything, save the affected collections locally so the migration can be undone
async function backup() {
  const data = {};
  for (const name of ['admins', 'ambassadors', 'referralCodes']) {
    const snapshot = await getDocs(collection(db, name));
    data[name] = Object.fromEntries(snapshot.docs.map(d => [d.id, d.data()]));
  }
  const dir = new URL('./backups/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`migration-backup-${Date.now()}.json`, dir);
  writeFileSync(file, JSON.stringify(data, null, 2));
  log(`backup written to ${fileURLToPath(file)}`);
}

async function addSuperAdmins() {
  for (const email of SUPER_ADMINS) {
    log(`admins/${email} -> super admin`);
    if (APPLY) {
      await setDoc(doc(db, 'admins', email), {
        email,
        role: 'super',
        countries: ['ALL'],
        states: ['ALL'],
        features: ['users', 'payments', 'ambassadors', 'countries', 'Accounts'],
        createdAt: Timestamp.now()
      }, { merge: true });
    }
  }
}

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

if (APPLY) await backup();
await migrateAdmins();
await addSuperAdmins();
const codes = await migrateAmbassadors();
await linkReferredUsers(codes);
console.log(APPLY ? '\nDone.' : '\nDry run only. Re-run with --apply to make these changes.');
process.exit(0);
