import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;
let db = null;
let bucket = null;
let firebaseApp = null;

export function initFirebase() {
  try {
    let keyData = null;

    // 1. Check environment variable (e.g. Render, Railway, Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        keyData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
        console.warn('[GatePost Firebase] FIREBASE_SERVICE_ACCOUNT JSON parse warning:', e.message);
      }
    }

    // 2. Check local key file
    if (!keyData) {
      const possiblePaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(__dirname, '../serviceAccountKey.json'),
        path.join(__dirname, '../serviceAccountKey.json.json'),
        path.join(__dirname, 'serviceAccountKey.json')
      ].filter(Boolean);

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          keyData = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }
    }

    if (keyData) {
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${keyData.project_id}.appspot.com`;

      firebaseApp = initializeApp({
        credential: cert(keyData),
        storageBucket
      });

      db = getFirestore(firebaseApp);
      try {
        bucket = getStorage(firebaseApp).bucket();
      } catch (e) {
        console.warn('[GatePost Firebase] Storage bucket notice:', e.message);
      }

      isFirebaseInitialized = true;
      console.log(`[GatePost Firebase] 🔥 SUCCESSFULLY CONNECTED TO FIREBASE CLOUD (${keyData.project_id})!`);
      return true;
    }

    console.log('[GatePost Firebase] No serviceAccountKey.json found. Running in resilient storage mode.');
    return false;
  } catch (err) {
    console.warn('[GatePost Firebase] Initialization warning:', err.message);
    isFirebaseInitialized = false;
    return false;
  }
}

export function getFirebaseStatus() {
  return isFirebaseInitialized;
}

export function getFirestoreDb() {
  return db;
}

export function getStorageBucket() {
  return bucket;
}
