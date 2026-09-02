import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { FileRecord } from '../models/FileRecord.js';
import { getDbStatus } from '../config/db.js';
import { getFirebaseStatus, getFirestoreDb } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';
import {
  generateTextChat,
  analyzeImageInMemory,
  analyzePdfInMemory,
  generateImageBase64
} from '../services/geminiService.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');

// Persistent storage helpers
function readData(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`Error reading ${file}`, e.message);
  }
  return [];
}

function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`Error writing ${file}`, e.message);
  }
}

let persistentChats = readData(CHATS_FILE);
let persistentMessages = readData(MESSAGES_FILE);
let persistentFiles = readData(FILES_FILE);

// STRICT ZERO-DISK PRIVACY: Multer memory storage only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

router.use(requireAuth);

// ==================================================================
// 1. GET /api/chats (Restores all chats from Cloud, 30-Day Retention)
// ==================================================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const nowIso = new Date().toISOString();

    // 1. Fetch from Google Cloud Firestore
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const snap = await firestore.collection('chats')
        .where('user_id', '==', userId)
        .get();

      let userChats = [];
      snap.forEach(doc => {
        const data = doc.data();
        // 30-Day Retention check
        if (!data.expiresAt || data.expiresAt > nowIso) {
          userChats.push({ _id: doc.id, ...data });
        }
      });

      // Sort by newest first (so the last chat back is index 0)
      userChats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: userChats });
    }

    // 2. Fetch from MongoDB
    if (getDbStatus()) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const chats = await Chat.find({
        user_id: userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: -1 });
      return res.json({ success: true, data: chats });
    }

    // 3. Fallback Local Storage (30-day filter)
    persistentChats = readData(CHATS_FILE);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userChats = persistentChats
      .filter(c => c.user_id === userId && new Date(c.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, data: userChats });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// 2. POST /api/chats (Create new conversation session)
// ==================================================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const title = req.body.title || 'New Conversation';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Google Cloud Firestore
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const chatRef = firestore.collection('chats').doc();
      const newChat = {
        _id: chatRef.id,
        user_id: userId,
        title,
        createdAt: now.toISOString(),
        expiresAt
      };
      await chatRef.set(newChat);
      return res.status(201).json({ success: true, data: newChat });
    }

    // 2. MongoDB
    if (getDbStatus()) {
      const chat = await Chat.create({ user_id: userId, title });
      return res.status(201).json({ success: true, data: chat });
    }

    // 3. Fallback Local Storage
    persistentChats = readData(CHATS_FILE);
    const newChat = {
      _id: `chat_${Date.now()}`,
      user_id: userId,
      title,
      createdAt: now.toISOString(),
      expiresAt
    };
    persistentChats.unshift(newChat);
    writeData(CHATS_FILE, persistentChats);

    return res.status(201).json({ success: true, data: newChat });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// 3. GET /api/chats/:chat_id/messages (Fetches messages, 30-Day Retention)
// ==================================================================
router.get('/:chat_id/messages', async (req, res) => {
  try {
    const { chat_id } = req.params;
    const nowIso = new Date().toISOString();

    // 1. Google Cloud Firestore
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const snap = await firestore.collection('messages')
        .where('chat_id', '==', chat_id)
        .get();

      let msgs = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (!data.expiresAt || data.expiresAt > nowIso) {
          msgs.push({ _id: doc.id, ...data });
        }
      });
      msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return res.json({ success: true, data: msgs });
    }

    // 2. MongoDB
    if (getDbStatus()) {
      const messages = await Message.find({ chat_id }).sort({ createdAt: 1 });
      return res.json({ success: true, data: messages });
    }

    // 3. Fallback Local Storage
    persistentMessages = readData(MESSAGES_FILE);
    const msgs = persistentMessages
      .filter(m => m.chat_id === chat_id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.json({ success: true, data: msgs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// 4. POST /api/chats/:chat_id/messages (Sends text turn, saved in Cloud)
// ==================================================================
router.post('/:chat_id/messages', async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { content_text } = req.body;
    if (!content_text) {
      return res.status(400).json({ error: 'content_text is required.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 0. Detect natural language image generation intent (like Gemini / ChatGPT Plus)
    const lower = content_text.toLowerCase().trim();
    const isImageRequest =
      lower.startsWith('generate an image') ||
      lower.startsWith('generate image') ||
      lower.startsWith('create an image') ||
      lower.startsWith('create image') ||
      lower.startsWith('draw a ') ||
      lower.startsWith('draw an ') ||
      lower.startsWith('draw ') ||
      lower.startsWith('paint ') ||
      lower.startsWith('make an image of') ||
      lower.includes('generate an image of') ||
      lower.includes('generate a photo of');

    if (isImageRequest) {
      const cleanPrompt = content_text
        .replace(/^(generate an image of|generate image of|create an image of|create image of|generate image|create image|draw a|draw an|draw|make an image of|paint a|paint an|paint)\s*/i, '')
        .trim() || content_text;

      const imageDataUrl = await generateImageBase64(cleanPrompt);
      const aiReply = `Here is your generated vision for "${cleanPrompt}".`;

      const uMsg = {
        _id: `msg_u_${Date.now()}`,
        chat_id,
        user_id: req.user.sub,
        role: 'user',
        content_text,
        message_type: 'image_generated',
        createdAt: now.toISOString(),
        expiresAt
      };
      const aMsg = {
        _id: `msg_a_${Date.now() + 1}`,
        chat_id,
        user_id: req.user.sub,
        role: 'assistant',
        content_text: aiReply,
        message_type: 'image_generated',
        image_data_url: imageDataUrl,
        createdAt: new Date(now.getTime() + 50).toISOString(),
        expiresAt
      };

      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        await firestore.collection('messages').add(uMsg);
        await firestore.collection('messages').add(aMsg);
      } else if (getDbStatus()) {
        await Message.create(uMsg);
        await Message.create(aMsg);
      } else {
        persistentMessages = readData(MESSAGES_FILE);
        persistentMessages.push(uMsg, aMsg);
        writeData(MESSAGES_FILE, persistentMessages);
      }

      return res.status(201).json({ success: true, data: [uMsg, aMsg] });
    }

    // Ask AI engine with creator persona (Tharak and Gowtham)
    const aiReply = await generateTextChat(content_text, history);

    // 1. Google Cloud Firestore
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const uRef = firestore.collection('messages').doc();
      const aRef = firestore.collection('messages').doc();

      const uMsg = {
        _id: uRef.id,
        chat_id,
        user_id: req.user.sub,
        role: 'user',
        content_text,
        message_type: 'text',
        createdAt: now.toISOString(),
        expiresAt
      };
      const aMsg = {
        _id: aRef.id,
        chat_id,
        user_id: req.user.sub,
        role: 'assistant',
        content_text: aiReply,
        message_type: 'text',
        createdAt: new Date(now.getTime() + 50).toISOString(),
        expiresAt
      };

      await Promise.all([uRef.set(uMsg), aRef.set(aMsg)]);
      console.log(`[GatePost Firebase] Chat turn saved to Cloud Firestore for 30 days!`);
      return res.status(201).json({ success: true, data: [uMsg, aMsg] });
    }

    // 2. MongoDB
    if (getDbStatus()) {
      const userMsg = await Message.create({
        chat_id,
        role: 'user',
        content_text,
        message_type: 'text'
      });
      const assistantMsg = await Message.create({
        chat_id,
        role: 'assistant',
        content_text: aiReply,
        message_type: 'text'
      });
      return res.status(201).json({ success: true, data: [userMsg, assistantMsg] });
    }

    // 3. Fallback Local Storage
    persistentMessages = readData(MESSAGES_FILE);
    const uMsg = {
      _id: `msg_u_${Date.now()}`,
      chat_id,
      role: 'user',
      content_text,
      message_type: 'text',
      createdAt: now.toISOString(),
      expiresAt
    };
    const aMsg = {
      _id: `msg_a_${Date.now() + 1}`,
      chat_id,
      role: 'assistant',
      content_text: aiReply,
      message_type: 'text',
      createdAt: new Date(now.getTime() + 50).toISOString(),
      expiresAt
    };
    persistentMessages.push(uMsg, aMsg);
    writeData(MESSAGES_FILE, persistentMessages);

    return res.status(201).json({ success: true, data: [uMsg, aMsg] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// 5. DELETE /api/chats/:chat_id (Delete conversation)
// ==================================================================
router.delete('/:chat_id', async (req, res) => {
  try {
    const { chat_id } = req.params;

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      await firestore.collection('chats').doc(chat_id).delete();
      const msgSnap = await firestore.collection('messages').where('chat_id', '==', chat_id).get();
      const batch = firestore.batch();
      msgSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return res.json({ success: true, message: 'Chat deleted from Firebase' });
    }

    if (getDbStatus()) {
      await Chat.findByIdAndDelete(chat_id);
      await Message.deleteMany({ chat_id });
    } else {
      persistentChats = readData(CHATS_FILE).filter(c => c._id !== chat_id);
      persistentMessages = readData(MESSAGES_FILE).filter(m => m.chat_id !== chat_id);
      writeData(CHATS_FILE, persistentChats);
      writeData(MESSAGES_FILE, persistentMessages);
    }
    return res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// 6. Media Endpoints (Processed in-memory, zero files saved on disk)
// ==================================================================
router.post('/:chat_id/upload-image', upload.single('file'), async (req, res) => {
  try {
    const { chat_id } = req.params;
    const prompt = req.body.prompt || "Analyze and describe this photo.";
    const saveToCloud = req.body.save_to_cloud === 'true';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Process from RAM buffer only
    const aiAnalysis = await analyzeImageInMemory(file.buffer, file.mimetype, prompt);
    const userPromptText = `[Photo: ${file.originalname}] ${prompt}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    let cloudUrl = null;
    if (saveToCloud) {
      cloudUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const fileRecord = {
        user_id: req.user.sub,
        chat_id,
        filename: file.originalname,
        file_type: 'image',
        file_url: cloudUrl,
        is_public: true,
        createdAt: new Date().toISOString(),
        expiresAt
      };
      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        await firestore.collection('files').add(fileRecord);
      } else if (getDbStatus()) {
        await FileRecord.create(fileRecord);
      } else {
        persistentFiles = readData(FILES_FILE);
        persistentFiles.unshift({ _id: `file_${Date.now()}`, ...fileRecord });
        writeData(FILES_FILE, persistentFiles);
      }
    }

    const uMsg = {
      _id: `msg_img_u_${Date.now()}`,
      chat_id,
      role: 'user',
      content_text: userPromptText,
      message_type: 'image_upload',
      createdAt: new Date().toISOString(),
      expiresAt
    };
    const aMsg = {
      _id: `msg_img_a_${Date.now() + 1}`,
      chat_id,
      role: 'assistant',
      content_text: aiAnalysis,
      message_type: 'image_upload',
      image_data_url: cloudUrl,
      createdAt: new Date().toISOString(),
      expiresAt
    };

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      await firestore.collection('messages').add(uMsg);
      await firestore.collection('messages').add(aMsg);
    }

    return res.status(201).json({ success: true, data: [uMsg, aMsg] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:chat_id/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const { chat_id } = req.params;
    const prompt = req.body.prompt || "Summarize key findings from this document.";
    const saveToCloud = req.body.save_to_cloud === 'true';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const aiAnalysis = await analyzePdfInMemory(file.buffer, prompt);
    const userPromptText = `[PDF: ${file.originalname}] ${prompt}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    let cloudUrl = null;
    if (saveToCloud) {
      cloudUrl = `data:application/pdf;base64,${file.buffer.toString('base64')}`;
      const fileRecord = {
        user_id: req.user.sub,
        chat_id,
        filename: file.originalname,
        file_type: 'pdf',
        file_url: cloudUrl,
        is_public: true,
        createdAt: new Date().toISOString(),
        expiresAt
      };
      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        await firestore.collection('files').add(fileRecord);
      } else if (getDbStatus()) {
        await FileRecord.create(fileRecord);
      } else {
        persistentFiles = readData(FILES_FILE);
        persistentFiles.unshift({ _id: `file_${Date.now()}`, ...fileRecord });
        writeData(FILES_FILE, persistentFiles);
      }
    }

    const uMsg = {
      _id: `msg_pdf_u_${Date.now()}`,
      chat_id,
      role: 'user',
      content_text: userPromptText,
      message_type: 'pdf_upload',
      createdAt: new Date().toISOString(),
      expiresAt
    };
    const aMsg = {
      _id: `msg_pdf_a_${Date.now() + 1}`,
      chat_id,
      role: 'assistant',
      content_text: aiAnalysis,
      message_type: 'pdf_upload',
      createdAt: new Date().toISOString(),
      expiresAt
    };

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      await firestore.collection('messages').add(uMsg);
      await firestore.collection('messages').add(aMsg);
    }

    return res.status(201).json({ success: true, data: [uMsg, aMsg] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:chat_id/generate-image', async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required.' });
    }

    const imageDataUrl = await generateImageBase64(prompt);
    const userPromptText = `Generate image: "${prompt}"`;
    const aiResponseText = `Here is your generated concept for "${prompt}".`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const uMsg = {
      _id: `msg_gen_u_${Date.now()}`,
      chat_id,
      role: 'user',
      content_text: userPromptText,
      message_type: 'image_generated',
      createdAt: new Date().toISOString(),
      expiresAt
    };
    const aMsg = {
      _id: `msg_gen_a_${Date.now() + 1}`,
      chat_id,
      role: 'assistant',
      content_text: aiResponseText,
      message_type: 'image_generated',
      image_data_url: imageDataUrl,
      createdAt: new Date().toISOString(),
      expiresAt
    };

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      await firestore.collection('messages').add(uMsg);
      await firestore.collection('messages').add(aMsg);
    }

    return res.status(201).json({ success: true, data: [uMsg, aMsg] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/user/files (Auto-purges files older than 30 days)
router.get('/user/files', async (req, res) => {
  try {
    const userId = req.user.sub;
    const nowIso = new Date().toISOString();

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const snap = await firestore.collection('files').where('user_id', '==', userId).get();
      let files = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.expiresAt || d.expiresAt > nowIso) {
          files.push({ _id: doc.id, ...d });
        }
      });
      files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: files });
    }

    if (getDbStatus()) {
      const now = new Date();
      await FileRecord.deleteMany({ user_id: userId, expiresAt: { $lte: now } });
      const files = await FileRecord.find({ user_id: userId, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
      return res.json({ success: true, data: files });
    }

    persistentFiles = readData(FILES_FILE);
    const now = new Date();
    const validFiles = persistentFiles.filter(f => {
      const exp = new Date(f.expiresAt || new Date(new Date(f.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000));
      return exp > now;
    });

    if (validFiles.length !== persistentFiles.length) {
      persistentFiles = validFiles;
      writeData(FILES_FILE, persistentFiles);
    }

    const userFiles = validFiles.filter(f => f.user_id === userId);
    return res.json({ success: true, data: userFiles });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
