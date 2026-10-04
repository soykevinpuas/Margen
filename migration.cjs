
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, setDoc, doc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      console.error('No users found in the database. Cannot migrate.');
      return;
    }
    const targetUid = usersSnapshot.docs[0].id;
    console.log(`Target user UID: ${targetUid}`);

    // 1. Migrate Sales
    const globalSalesSnapshot = await getDocs(collection(db, 'sales'));
    console.log(`Found ${globalSalesSnapshot.size} global sales. Migrating...`);
    
    for (const docSnap of globalSalesSnapshot.docs) {
      const data = docSnap.data();
      const saleId = docSnap.id;
      await setDoc(doc(db, 'users', targetUid, 'sales', saleId), data);
    }

    // 2. Migrate Expenses
    const globalExpensesSnapshot = await getDocs(collection(db, 'expenses'));
    console.log(`Found ${globalExpensesSnapshot.size} global expenses. Migrating...`);
    
    for (const docSnap of globalExpensesSnapshot.docs) {
      const data = docSnap.data();
      const expenseId = docSnap.id;
      await setDoc(doc(db, 'users', targetUid, 'expenses', expenseId), data);
    }

    console.log(`Migration completed successfully. Data moved to user ${targetUid}.`);
  } catch (error) {
    console.error('Migration error:', error);
  }
}

migrateData();
