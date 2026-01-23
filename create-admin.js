// Script zum Erstellen eines Admin-Accounts für car-check
const admin = require('firebase-admin');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Firebase Admin SDK initialisieren
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin() {
  console.log('\n🚀 car-check Admin-Account Ersteller\n');

  // Email abfragen
  const email = await new Promise(resolve => {
    rl.question('Admin E-Mail Adresse: ', answer => resolve(answer));
  });

  // Passwort abfragen
  const password = await new Promise(resolve => {
    rl.question('Admin Passwort: ', answer => resolve(answer));
  });

  // Name abfragen
  const name = await new Promise(resolve => {
    rl.question('Admin Name (z.B. Administrator): ', answer => resolve(answer || 'Administrator'));
  });

  try {
    console.log('\n⏳ Erstelle Admin-Account...');

    // User in Firebase Auth erstellen
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    console.log('✅ User in Authentication erstellt:', userRecord.uid);

    // User-Dokument in Firestore erstellen
    await db.collection('users').doc(userRecord.uid).set({
      role: 'admin',
      name: name,
      email: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Dokument in Firestore erstellt');
    console.log('\n🎉 Admin-Account erfolgreich erstellt!');
    console.log('\nLogin-Daten:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('E-Mail:   ', email);
    console.log('Passwort: ', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
  }

  rl.close();
  process.exit();
}

createAdmin();
