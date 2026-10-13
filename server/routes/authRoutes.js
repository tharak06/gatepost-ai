import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';
import { getDbStatus } from '../config/db.js';
import { getFirebaseStatus, getFirestoreDb } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'gatepost-ultra-secure-jwt-secret-key-2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.LOCAL_STORAGE_DIR || path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
console.log(`[GatePost Auth] Local user storage active at: ${DATA_DIR}`);

// Helper: Load persistent local user credentials
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('[GatePost Auth] Error reading users.json:', e.message);
  }
  return [];
}

// Helper: Save persistent local user credentials
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.warn('[GatePost Auth] Error saving users.json:', e.message);
  }
}

let persistentUsers = loadUsers();

function generateToken(user) {
  return jwt.sign(
    { sub: user._id || user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// ------------------------------------------------------------------
// 1. Email & Password: Sign Up (Unique Email Enforced in Cloud)
// ------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 1. Cloud Firestore: Enforce UNIQUE EMAIL across all devices
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const existingEmailSnap = await firestore.collection('users')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();

      if (!existingEmailSnap.empty) {
        return res.status(400).json({
          error: 'An account with this email already exists. Please Sign In with your password.'
        });
      }

      const userRef = firestore.collection('users').doc();
      const fbUser = {
        _id: userRef.id,
        username: cleanUsername,
        email: cleanEmail,
        password_hash,
        createdAt: new Date().toISOString()
      };
      await userRef.set(fbUser);
      console.log(`[GatePost Firebase] 🔥 Unique user account created in Cloud Firestore: ${cleanEmail}`);

      const token = generateToken(fbUser);
      return res.status(201).json({
        success: true,
        token,
        user: { id: fbUser._id, username: fbUser.username, email: fbUser.email }
      });
    }

    // 2. MongoDB Fallback
    if (getDbStatus()) {
      const existing = await User.findOne({
        $or: [{ email: cleanEmail }, { username: cleanUsername }]
      });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists. Please Sign In.' });
      }

      const newUser = await User.create({
        username: cleanUsername,
        email: cleanEmail,
        password_hash
      });
      const token = generateToken(newUser);
      return res.status(201).json({
        success: true,
        token,
        user: { id: newUser._id, username: newUser.username, email: newUser.email }
      });
    }

    // 3. Local Storage Fallback
    persistentUsers = loadUsers();
    const existingUser = persistentUsers.find(
      u => u.email === cleanEmail || u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists. Please Sign In.' });
    }

    const newUser = {
      _id: `user_${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail,
      password_hash,
      createdAt: new Date().toISOString()
    };

    persistentUsers.push(newUser);
    saveUsers(persistentUsers);

    const token = generateToken(newUser);
    return res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 2. Email & Password: Sign In (Login from Any Device)
// ------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const credential = username.trim().toLowerCase();
    let user = null;

    // 1. Check Firebase Cloud Firestore (Login from Any Device)
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      try {
        const snap = await firestore.collection('users')
          .where('email', '==', credential)
          .limit(1)
          .get();

        if (!snap.empty) {
          const doc = snap.docs[0];
          user = { _id: doc.id, ...doc.data() };
        }
      } catch (e) {
        console.warn('[GatePost Firebase] Firestore lookup error:', e.message);
      }
    }

    // 2. Check MongoDB if active
    if (!user && getDbStatus()) {
      user = await User.findOne({
        $or: [{ email: credential }, { username: credential }]
      });
    }

    // 3. Check Persistent Storage Fallback
    if (!user) {
      persistentUsers = loadUsers();
      user = persistentUsers.find(
        u => u.email.toLowerCase() === credential || u.username.toLowerCase() === credential
      );
    }

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please click "Create Account" to register.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your password and try again.' });
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 3. Google / Gmail Sign In
// ------------------------------------------------------------------
router.post('/google', async (req, res) => {
  try {
    const { email, name, google_id } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = name ? name.trim() : cleanEmail.split('@')[0];

    let user = null;

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const snap = await firestore.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        user = { _id: doc.id, ...doc.data() };
      } else {
        const userRef = firestore.collection('users').doc();
        user = {
          _id: userRef.id,
          username: cleanUsername,
          email: cleanEmail,
          password_hash: `GOOGLE_AUTH_${google_id || Date.now()}`,
          createdAt: new Date().toISOString()
        };
        await userRef.set(user);
      }
    } else if (getDbStatus()) {
      user = await User.findOne({ email: cleanEmail });
      if (!user) {
        user = await User.create({
          username: cleanUsername,
          email: cleanEmail,
          password_hash: `GOOGLE_AUTH_${google_id || Date.now()}`
        });
      }
    } else {
      persistentUsers = loadUsers();
      user = persistentUsers.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        user = {
          _id: `user_g_${Date.now()}`,
          username: cleanUsername,
          email: cleanEmail,
          password_hash: `GOOGLE_AUTH_${google_id || Date.now()}`,
          createdAt: new Date().toISOString()
        };
        persistentUsers.push(user);
        saveUsers(persistentUsers);
      }
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// 4. Session Validation Endpoint
// ------------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ success: true, user: req.user });
});

export default router;
