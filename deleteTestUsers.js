import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc",
  authDomain: "namevibes-life.firebaseapp.com",
  projectId: "namevibes-life",
  storageBucket: "namevibes-life.firebasestorage.app",
  messagingSenderId: "231158578994",
  appId: "1:231158578994:web:31a4bf3ea093717b74e12b",
  measurementId: "G-0CYFVB0CFL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteTestUsers() {
  console.log('🔍 Starting cleanup...\n');
  
  // Delete users with planType
  console.log('👥 Deleting paid users...');
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  let deletedUsers = 0;
  for (const docSnap of usersSnapshot.docs) {
    const user = docSnap.data();
    if (user.planType) {
      await deleteDoc(doc(db, 'users', docSnap.id));
      console.log(`  ✅ Deleted user: ${user.email || user.fullName || docSnap.id}`);
      deletedUsers++;
    }
  }
  console.log(`\n👥 Total users deleted: ${deletedUsers}\n`);
  
  // Delete all payments
  console.log('💳 Deleting all payments...');
  const paymentsRef = collection(db, 'payments');
  const paymentsSnapshot = await getDocs(paymentsRef);
  
  let deletedPayments = 0;
  for (const docSnap of paymentsSnapshot.docs) {
    await deleteDoc(doc(db, 'payments', docSnap.id));
    deletedPayments++;
  }
  console.log(`  ✅ Total payments deleted: ${deletedPayments}\n`);
  
  // Delete all payouts
  console.log('💰 Deleting all payouts...');
  const payoutsRef = collection(db, 'payouts');
  const payoutsSnapshot = await getDocs(payoutsRef);
  
  let deletedPayouts = 0;
  for (const docSnap of payoutsSnapshot.docs) {
    await deleteDoc(doc(db, 'payouts', docSnap.id));
    deletedPayouts++;
  }
  console.log(`  ✅ Total payouts deleted: ${deletedPayouts}\n`);
  
  console.log('🎉 Cleanup complete!');
  console.log('📊 Summary:');
  console.log(`  - Users: ${deletedUsers}`);
  console.log(`  - Payments: ${deletedPayments}`);
  console.log(`  - Payouts: ${deletedPayouts}`);
  console.log('  - Ambassadors: Kept (not deleted)');
  
  process.exit(0);
}

deleteTestUsers().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});