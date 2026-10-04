
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateData() {
  try {
    // Replace with actual target UID from your current session
    // Since I don't have the live session UID, I will look for the only user in the 'users' collection
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.error('No users found in the database. Cannot migrate.');
      return;
    }
    const targetUid = usersSnapshot.docs[0].id;
    console.log(`Migrating data to user: ${targetUid}`);

    // 1. Migrate Sales
    const globalSalesSnapshot = await getDocs(collection(db, 'sales'));
    console.log(`Found ${globalSalesSnapshot.size} global sales. Migrating...`);
    
    let salesMigrated = 0;
    globalSalesSnapshot.forEach(async (docSnap) => {
      const data = docSnap.data();
      const saleId = docSnap.id;
      await setDoc(doc(db, 'users', targetUid, 'sales', saleId), data);
      salesMigrated++;
    });

    // 2. Migrate Expenses
    const globalExpensesSnapshot = await getDocs(collection(db, 'expenses'));
    console.log(`Found ${globalExpensesSnapshot.size} global expenses. Migrating...`);
    
    let expensesMigrated = 0;
    globalExpensesSnapshot.forEach(async (docSnap) => {
      const data = docSnap.data();
      const expenseId = docSnap.id;
      await setDoc(doc(db, 'users', targetUid, 'expenses', expenseId), data);
      expensesMigrated++;
    });

    console.log(`Migration completed: ${salesMigrated} sales and ${expensesMigrated} expenses moved to user ${targetUid}.`);
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateData();
