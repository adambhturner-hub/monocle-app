/**
 * Monocle Database Backup Script
 * Run this locally to download a full JSON backup of the Firestore Database.
 * Requires a serviceAccountKey.json file in the project root.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin
let serviceAccount;
try {
  // Try to find the service account key in the root directory
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('\n❌ ERROR: Could not find serviceAccountKey.json!');
  console.error('Please download your Admin Service Account key from the Firebase Console');
  console.error('(Project Settings > Service Accounts > Generate new private key)');
  console.error('and save it in the root folder of Monocle as: serviceAccountKey.json\n');
  process.exit(1);
}

// 2. Connect to the project using the key credentials
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function backupDatabase() {
  console.log('🔄 Starting Monocle Database Backup...');
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      users: {}
    };

    // 3. Fetch all users from the "users" collection
    const usersSnapshot = await db.collection('users').get();
    
    let userCount = 0;
    
    // 4. Extract data for each user
    usersSnapshot.forEach(doc => {
      userCount++;
      backupData.users[doc.id] = doc.data();
    });

    console.log(`✅ Successfully fetched data for ${userCount} users.`);

    // 5. Generate a timestamped backup file
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `monocle_backup_${dateStr}_${Date.now()}.json`;
    const filePath = path.join(__dirname, '..', fileName);

    // 6. Write JSON to disk
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    console.log(`🎉 Backup complete! Saved to: ${fileName}`);
    console.log(`Remember to store this backup securely.`);

  } catch (error) {
    console.error('\n❌ Failed to backup database:', error);
  } finally {
    process.exit(0);
  }
}

backupDatabase();
