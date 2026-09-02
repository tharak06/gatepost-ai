import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initFirebase } from './config/firebase.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api', apiRoutes);

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, '../client/dist');

// If client/dist exists, serve it in production
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Boot Server
const startServer = async () => {
  // 1. Initialize MongoDB (if MONGODB_URI provided)
  await connectDB();
  // 2. Initialize Firebase (if serviceAccountKey.json or FIREBASE_PROJECT_ID provided)
  initFirebase();

  app.listen(PORT, () => {
    console.log(`[GatePost AI] MERN Server running on port http://localhost:${PORT}`);
  });
};

startServer();
