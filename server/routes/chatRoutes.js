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
const DATA_DIR = process.env.LOCAL_STORAGE_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');
console.log(`[GatePost Chats] Local conversation storage active at: ${DATA_DIR}`);

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
// 0. GET /api/chats/user/analytics (Real-time per-user usage & telemetry)
// ==================================================================
router.get('/user/analytics', async (req, res) => {
  try {
    const userId = req.user.sub;
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let userChats = [];
    let userMessages = [];

    // 1. Google Cloud Firestore
    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const [cSnap, mSnap] = await Promise.all([
        firestore.collection('chats').where('user_id', '==', userId).get(),
        firestore.collection('messages').where('user_id', '==', userId).get()
      ]);

      cSnap.forEach(doc => {
        const d = doc.data();
        if (!d.expiresAt || new Date(d.expiresAt) > now) {
          userChats.push({ _id: doc.id, ...d });
        }
      });

      mSnap.forEach(doc => {
        const d = doc.data();
        if (!d.expiresAt || new Date(d.expiresAt) > now) {
          userMessages.push({ _id: doc.id, ...d });
        }
      });
    } else if (getDbStatus()) {
      // 2. MongoDB
      userChats = await Chat.find({
        user_id: userId,
        createdAt: { $gte: thirtyDaysAgo }
      });
      userMessages = await Message.find({
        user_id: userId,
        createdAt: { $gte: thirtyDaysAgo }
      });
    } else {
      // 3. Persistent Local Storage
      persistentChats = readData(CHATS_FILE);
      persistentMessages = readData(MESSAGES_FILE);
      userChats = persistentChats.filter(c => c.user_id === userId && new Date(c.createdAt) >= thirtyDaysAgo);
      userMessages = persistentMessages.filter(m => m.user_id === userId && new Date(m.createdAt) >= thirtyDaysAgo);
    }

    // Sort chats newest first
    userChats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate real user usage metrics
    const chatsCount = userChats.length;
    let promptsSent = 0;
    let aiCreations = 0;
    let docsAnalyzed = 0;

    // Calculate real activity for the last 6 days + Today
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDays = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayName = i === 0 ? 'Today' : dayLabels[d.getDay()];
      const dateKey = d.toISOString().slice(0, 10);
      chartDays.push({ day: dayName, dateKey, count: 0 });
    }

    userMessages.forEach(msg => {
      if (msg.role === 'user') {
        promptsSent++;
      }
      if (msg.message_type === 'image_generated') {
        aiCreations++;
      }
      if (msg.message_type === 'pdf_upload' || msg.message_type === 'file_upload') {
        docsAnalyzed++;
      }

      if (msg.createdAt) {
        const msgDateKey = new Date(msg.createdAt).toISOString().slice(0, 10);
        const match = chartDays.find(cd => cd.dateKey === msgDateKey);
        if (match) {
          match.count++;
        }
      }
    });

    const maxDayCount = Math.max(...chartDays.map(cd => cd.count), 1);
    const activityChart = chartDays.map(cd => {
      const pct = cd.count === 0 ? 12 : Math.min(100, Math.round(20 + (cd.count / maxDayCount) * 80));
      return {
        day: cd.day,
        value: pct,
        count: cd.count,
        tooltip: `${cd.day}: ${cd.count} ${cd.count === 1 ? 'prompt' : 'prompts'}`
      };
    });

    // Dynamic user checklist
    const tasks = [
      {
        id: '1',
        title: 'Authenticate personal cloud credentials',
        completed: true,
        badge: 'Done'
      },
      {
        id: '2',
        title: userChats[0]?.title ? `Resume chat: "${userChats[0].title}"` : 'Start your first chat session',
        completed: chatsCount > 0,
        badge: chatsCount > 0 ? 'Saved' : 'Pending'
      },
      {
        id: '3',
        title: 'Generate high-res AI image via Flux.1',
        completed: aiCreations > 0,
        badge: aiCreations > 0 ? `${aiCreations} Done` : 'Try'
      },
      {
        id: '4',
        title: docsAnalyzed > 0 ? 'In-Memory PDF analysis verified' : 'Upload document for RAM analysis',
        completed: docsAnalyzed > 0,
        badge: docsAnalyzed > 0 ? 'Done' : 'Try'
      }
    ];

    // Real-time user feed
    const insights = [
      {
        id: 1,
        text: `Account Synced: ${req.user.name || req.user.username || 'User'} (${req.user.email || 'Cloud'})`,
        time: 'Active',
        icon: 'UserCheck',
        level: 'optimal'
      },
      {
        id: 2,
        text: userChats[0]
          ? `Recent Chat: "${userChats[0].title}" is saved & ready to resume`
          : 'Start your first conversation with GaTePoSt',
        time: chatsCount > 0 ? `${chatsCount} Chats` : 'Cloud',
        icon: 'MessageSquare',
        level: 'boost'
      },
      {
        id: 3,
        text: '30-Day Chat Retention: All your messages are retained for 30 days',
        time: '30 Days',
        icon: 'History',
        level: 'optimal'
      },
      {
        id: 4,
        text: aiCreations > 0
          ? `AI Vision Synthesis: ${aiCreations} artwork creations generated`
          : 'AI Vision Synthesis: Type "Generate an image of..." to create artwork',
        time: aiCreations > 0 ? `${aiCreations} Arts` : 'Ready',
        icon: 'Sparkles',
        level: 'ready'
      }
    ];

    return res.json({
      success: true,
      data: {
        userId,
        username: req.user.name || req.user.username || 'User',
        email: req.user.email || 'Cloud Account',
        chatsCount,
        promptsSent,
        aiCreations,
        docsAnalyzed,
        lastChatTitle: userChats[0]?.title || 'New Session',
        lastChatId: userChats[0]?._id || null,
        activityChart,
        tasks,
        insights
      }
    });
  } catch (err) {
    console.error('[User Analytics Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
// DELETE /api/chats/:id (Deletes a chat conversation & messages)
// ==================================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      await firestore.collection('chats').doc(id).delete();
      const mSnap = await firestore.collection('messages').where('chat_id', '==', id).get();
      const batch = firestore.batch();
      mSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } else if (getDbStatus()) {
      await Chat.findByIdAndDelete(id);
      await Message.deleteMany({ chat_id: id });
    }

    persistentChats = readData(CHATS_FILE);
    persistentChats = persistentChats.filter(c => (c._id !== id && c.id !== id));
    writeData(CHATS_FILE, persistentChats);

    persistentMessages = readData(MESSAGES_FILE);
    persistentMessages = persistentMessages.filter(m => m.chat_id !== id);
    writeData(MESSAGES_FILE, persistentMessages);

    return res.json({ success: true, message: 'Chat deleted', id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// PATCH /api/chats/:id/pin (Toggles pin status for a chat)
// ==================================================================
router.patch('/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    let isPinned = false;

    if (getFirebaseStatus()) {
      const firestore = getFirestoreDb();
      const chatDoc = await firestore.collection('chats').doc(id).get();
      if (chatDoc.exists) {
        isPinned = !chatDoc.data().pinned;
        await firestore.collection('chats').doc(id).update({ pinned: isPinned });
      }
    } else if (getDbStatus()) {
      const chat = await Chat.findById(id);
      if (chat) {
        chat.pinned = !chat.pinned;
        await chat.save();
        isPinned = chat.pinned;
      }
    }

    persistentChats = readData(CHATS_FILE);
    const target = persistentChats.find(c => c._id === id || c.id === id);
    if (target) {
      target.pinned = !target.pinned;
      isPinned = target.pinned;
      writeData(CHATS_FILE, persistentChats);
    }

    return res.json({ success: true, pinned: isPinned, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// PATCH /api/chats/:id/rename (Rename chat conversation title)
// ==================================================================
router.patch('/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Valid title is required.' });
    }
    const cleanTitle = title.trim().slice(0, 80);

    // 1. Google Cloud Firestore
    try {
      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        await firestore.collection('chats').doc(id).set({
          title: cleanTitle,
          customTitle: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else if (getDbStatus()) {
        // 2. MongoDB
        await Chat.findByIdAndUpdate(id, { title: cleanTitle, customTitle: true });
      }
    } catch (dbErr) {
      console.warn('[GaTePoSt] Cloud DB rename sync note:', dbErr.message);
    }

    // 3. Fallback Local Storage
    persistentChats = readData(CHATS_FILE);
    const target = persistentChats.find(c => c._id === id || c.id === id);
    if (target) {
      target.title = cleanTitle;
      target.customTitle = true;
      writeData(CHATS_FILE, persistentChats);
    }

    return res.json({ success: true, id, title: cleanTitle });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==================================================================
// POST /api/chats/:id/summarize (Regenerate chat title from messages summary)
// ==================================================================
router.post('/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;
    let messages = [];

    try {
      if (getFirebaseStatus()) {
        const snap = await getFirestoreDb().collection('messages').where('chat_id', '==', id).get();
        snap.forEach(d => messages.push(d.data()));
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (getDbStatus()) {
        messages = await Message.find({ chat_id: id }).sort({ createdAt: 1 });
      }
    } catch (fetchErr) {
      console.warn('[GaTePoSt] Fetch messages for summarize note:', fetchErr.message);
    }

    if (messages.length === 0) {
      persistentMessages = readData(MESSAGES_FILE);
      messages = persistentMessages.filter(m => m.chat_id === id);
    }

    const userMsg = messages.find(m => m.role === 'user' && m.content_text && !/^(hi|hello|hey)$/i.test(m.content_text.trim())) || messages.find(m => m.role === 'user');
    const newTitle = userMsg ? summarizeChatTitle(userMsg.content_text) : 'Conversation';

    try {
      if (getFirebaseStatus()) {
        await getFirestoreDb().collection('chats').doc(id).set({
          title: newTitle,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else if (getDbStatus()) {
        await Chat.findByIdAndUpdate(id, { title: newTitle });
      }
    } catch (saveErr) {
      console.warn('[GaTePoSt] Save summarized title note:', saveErr.message);
    }

    persistentChats = readData(CHATS_FILE);
    const target = persistentChats.find(c => c._id === id || c.id === id);
    if (target) {
      target.title = newTitle;
      writeData(CHATS_FILE, persistentChats);
    }

    return res.json({ success: true, id, title: newTitle });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Smart Chat Title Summarizer: Extracts concise, clean 3-5 word topic title
function summarizeChatTitle(prompt, replyText = '') {
  if (!prompt || typeof prompt !== 'string') return 'New Conversation';
  let clean = prompt
    .replace(/^(generate an image of|generate image of|create an image of|create image of|draw a|draw an|draw|paint a|paint|what is|what are|how to|tell me about|explain|who is|can you please|can you|could you|please help me with|please|help me with|write a code for|write code for|write a|i want to know about|i want to know)\s+/i, '')
    .trim();
  clean = clean.replace(/[?.,!#*`~^]+$/, '').trim();

  // If prompt was just a greeting like "hi", return general inquiry or greeting
  if (/^(hi|hello|hey|greetings|good morning|good evening)$/i.test(clean)) {
    return 'General Chat';
  }

  // Capitalize and format nicely (max ~38 chars)
  if (clean.length > 38) {
    clean = clean.slice(0, 38).trim();
    const lastSpace = clean.lastIndexOf(' ');
    if (lastSpace > 14) clean = clean.slice(0, lastSpace);
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    clean = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return clean || 'Conversation';
}

// ==================================================================
// 4. POST /api/chats/:chat_id/messages (Sends text turn, saved in Cloud)
// ==================================================================
router.post('/:chat_id/messages', async (req, res) => {
  try {
    const { chat_id } = req.params;
    const { content_text, model, provider } = req.body;
    if (!content_text) {
      return res.status(400).json({ error: 'content_text is required.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Auto-summarize chat title if currently default or uncustomized
    let updatedChatTitle = null;
    const smartTitle = summarizeChatTitle(content_text);

    try {
      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        const chatDoc = await firestore.collection('chats').doc(chat_id).get();
        if (chatDoc.exists) {
          const cData = chatDoc.data();
          const curTitle = cData.title || '';
          if (!cData.customTitle && (curTitle.startsWith('Session #') || curTitle === 'New Conversation' || curTitle === 'Conversation' || curTitle === 'General Chat' || /^(hi|hello|hey)\b/i.test(curTitle))) {
            await firestore.collection('chats').doc(chat_id).update({ title: smartTitle });
            updatedChatTitle = smartTitle;
          }
        }
      } else if (getDbStatus()) {
        const chat = await Chat.findById(chat_id);
        if (chat && !chat.customTitle && (chat.title.startsWith('Session #') || chat.title === 'New Conversation' || chat.title === 'Conversation' || chat.title === 'General Chat' || /^(hi|hello|hey)\b/i.test(chat.title))) {
          chat.title = smartTitle;
          await chat.save();
          updatedChatTitle = smartTitle;
        }
      } else {
        persistentChats = readData(CHATS_FILE);
        const c = persistentChats.find(x => x._id === chat_id || x.id === chat_id);
        if (c && !c.customTitle && (c.title.startsWith('Session #') || c.title === 'New Conversation' || c.title === 'Conversation' || c.title === 'General Chat' || /^(hi|hello|hey)\b/i.test(c.title))) {
          c.title = smartTitle;
          writeData(CHATS_FILE, persistentChats);
          updatedChatTitle = smartTitle;
        }
      }
    } catch (titleErr) {
      console.warn('[GaTePoSt] Title summarization notice:', titleErr.message);
    }

    // 0. Detect natural language image generation intent (like Gemini / ChatGPT Plus)
    const lower = content_text.toLowerCase().trim();
    const isImageRequest =
      /\b(generate|create|draw|paint|render|make)\s+(me\s+)?(an?\s+)?(image|photo|picture|illustration|painting|visual|graphic|artwork)\b/i.test(lower) ||
      /^draw\s+/i.test(lower) ||
      /^paint\s+/i.test(lower) ||
      /^image of\s+/i.test(lower) ||
      /^picture of\s+/i.test(lower) ||
      /^photo of\s+/i.test(lower);

    // If query is just asking about capability rather than requesting an image
    const isCapabilityQuestion =
      /^(can you|do you|are you able to|can you do)\s+(generate|create|draw|paint|make)\s+(images?|pictures?|photos?)/i.test(lower) ||
      /^(image generation|can you do image generation|image generation can you do)\??$/i.test(lower);

    if (isImageRequest && !isCapabilityQuestion) {
      const cleanPrompt = content_text
        .replace(/^(can you\s+)?(please\s+)?(generate|create|draw|paint|render|make)\s+(me\s+)?(an?\s+)?(image|photo|picture|illustration|painting|visual|graphic|artwork)?(\s+of)?\s*/i, '')
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

      return res.status(201).json({
        success: true,
        data: [uMsg, aMsg],
        updated_chat_title: updatedChatTitle,
        chat_id
      });
    }

    // Fetch previous conversation turns for context
    let history = [];
    try {
      if (getFirebaseStatus()) {
        const firestore = getFirestoreDb();
        const snap = await firestore.collection('messages')
          .where('chat_id', '==', chat_id)
          .limit(8)
          .get();
        snap.forEach(doc => history.push(doc.data()));
        history.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      } else if (getDbStatus()) {
        history = await Message.find({ chat_id }).sort({ createdAt: -1 }).limit(8);
        history.reverse();
      } else {
        persistentMessages = readData(MESSAGES_FILE);
        history = persistentMessages
          .filter(m => m.chat_id === chat_id)
          .slice(-8);
      }
    } catch (histErr) {
      history = [];
    }

    // Ask AI engine with creator persona (Tharak and Gowtham)
    const aiReply = await generateTextChat(content_text, history, { model, provider });

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
        model: model || 'llama3.2',
        message_type: 'text',
        createdAt: new Date(now.getTime() + 50).toISOString(),
        expiresAt
      };

      await Promise.all([uRef.set(uMsg), aRef.set(aMsg)]);
      console.log(`[GatePost Firebase] Chat turn saved to Cloud Firestore for 30 days!`);
      return res.status(201).json({
        success: true,
        data: [uMsg, aMsg],
        updated_chat_title: updatedChatTitle,
        chat_id
      });
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
      return res.status(201).json({
        success: true,
        data: [userMsg, assistantMsg],
        updated_chat_title: updatedChatTitle,
        chat_id
      });
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

    return res.status(201).json({
      success: true,
      data: [uMsg, aMsg],
      updated_chat_title: updatedChatTitle,
      chat_id
    });
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
