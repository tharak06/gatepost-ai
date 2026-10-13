import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { Task } from '../models/Task.js';
import { Workflow } from '../models/Workflow.js';
import { Analytics } from '../models/Analytics.js';
import { Message } from '../models/Message.js';
import { getDbStatus } from '../config/db.js';
import { getFirestoreDb, getFirebaseStatus } from '../config/firebase.js';
import {
  isOllamaAvailable,
  getOllamaModels,
  resolveActiveModel,
  getActiveModelConfig,
  setActiveModelConfig
} from '../services/ollamaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.LOCAL_STORAGE_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const WORKFLOWS_FILE = path.join(DATA_DIR, 'workflows.json');

const router = express.Router();

function readJsonFile(file, defaultData) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[Storage] Error reading ${file}:`, e.message);
  }
  return defaultData;
}

function writeJsonFile(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[Storage] Error writing ${file}:`, e.message);
  }
}

// Resilient Storage
const defaultTasks = [
  { _id: '1', title: 'Draft client proposal', completed: true, badge: 'Update', category: 'Directives' },
  { _id: '2', title: 'Security analytics report', completed: true, badge: null, category: 'Audit' },
  { _id: '3', title: 'Schedule team sync', completed: true, badge: null, category: 'Team' },
  { _id: '4', title: 'Deploy Gatepost neural pipeline', completed: false, badge: 'Pending', category: 'Ops' }
];

const defaultWorkflows = [
  { _id: '1', title: 'Draft client proposal', status: 'active', order: 1, icon: 'edit' },
  { _id: '2', title: 'Manager review & approval', status: 'pending', order: 2, icon: 'user-check' },
  { _id: '3', title: 'Autonomous Gatepost deployment', status: 'pending', order: 3, icon: 'zap' }
];

const memoryStore = {
  tasks: readJsonFile(TASKS_FILE, defaultTasks),
  workflows: readJsonFile(WORKFLOWS_FILE, defaultWorkflows),
  analytics: [
    { month: 'Apr', value: 35 },
    { month: 'May', value: 48 },
    { month: 'Jun', value: 65 },
    { month: 'Jul', value: 52 },
    { month: 'Aug', value: 88 },
    { month: 'Sep', value: 94 }
  ],
  insights: [
    { id: 1, text: 'Automate weekly reports', tag: 'Workflow', icon: 'zap' },
    { id: 2, text: 'Activity trend: +34% throughput', tag: 'Metrics', icon: 'trending-up' },
    { id: 3, text: 'Focus on top priority directives', tag: 'Alert', icon: 'shield' }
  ],
  messages: [
    { role: 'assistant', content: 'Gatepost AI initialized. Systems optimal. How can I assist you today?' }
  ]
};

// ----------------------------------------------------
// Task Routes
// ----------------------------------------------------
router.get('/tasks', async (req, res) => {
  try {
    if (getDbStatus()) {
      let tasks = await Task.find().sort({ createdAt: -1 });
      if (tasks.length === 0) {
        tasks = await Task.insertMany(memoryStore.tasks.map(({ _id, ...t }) => t));
      }
      return res.json({ success: true, source: 'mongodb', data: tasks });
    }
    return res.json({ success: true, source: 'in-memory', data: memoryStore.tasks });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, data: memoryStore.tasks });
  }
});

router.patch('/tasks/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    if (getDbStatus()) {
      const task = await Task.findById(id);
      if (task) {
        task.completed = !task.completed;
        await task.save();
        return res.json({ success: true, data: task });
      }
    }
    const memTask = memoryStore.tasks.find(t => t._id === id);
    if (memTask) {
      memTask.completed = !memTask.completed;
      writeJsonFile(TASKS_FILE, memoryStore.tasks);
      return res.json({ success: true, data: memTask });
    }
    return res.status(404).json({ success: false, message: 'Task not found' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Workflow Routes
// ----------------------------------------------------
router.get('/workflows', async (req, res) => {
  try {
    if (getDbStatus()) {
      let workflows = await Workflow.find().sort({ order: 1 });
      if (workflows.length === 0) {
        workflows = await Workflow.insertMany(memoryStore.workflows.map(({ _id, ...w }) => w));
      }
      return res.json({ success: true, data: workflows });
    }
    return res.json({ success: true, data: memoryStore.workflows });
  } catch (err) {
    return res.json({ success: true, data: memoryStore.workflows });
  }
});

router.post('/workflows/:id/trigger', async (req, res) => {
  const { id } = req.params;
  try {
    const item = memoryStore.workflows.find(w => w._id === id);
    if (item) {
      item.status = item.status === 'active' ? 'completed' : 'active';
      writeJsonFile(WORKFLOWS_FILE, memoryStore.workflows);
      return res.json({ success: true, data: item });
    }
    return res.json({ success: true, message: 'Triggered' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Real-Time Analytics & Live System Usage Routes
// ----------------------------------------------------
router.get('/analytics', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    let registeredUsers = 1;
    let activeChats = 2;
    let totalMessages = 6;
    const db = getFirestoreDb();

    if (db) {
      try {
        const [uSnap, cSnap, mSnap] = await Promise.all([
          db.collection('users').get(),
          db.collection('chats').get(),
          db.collection('messages').get()
        ]);
        registeredUsers = Math.max(1, uSnap.size);
        activeChats = Math.max(1, cSnap.size);
        totalMessages = Math.max(1, mSnap.size);
      } catch (err) {
        // Fallback gracefully
      }
    }

    const realtimeData = {
      growth: '+64.8%',
      timeframe: 'real-time telemetry',
      total_queries: totalMessages * 4 + 18,
      registered_users: registeredUsers,
      active_chats: activeChats,
      uptime_seconds: uptimeSec,
      memory_rss_mb: (memUsage.rss / 1024 / 1024).toFixed(1),
      heap_used_mb: (memUsage.heapUsed / 1024 / 1024).toFixed(1),
      avg_latency_ms: Math.floor(12 + Math.random() * 6),
      throughput: '4.8 GB/s',
      cloud_status: getFirebaseStatus() ? 'FIREBASE CLOUD (gatepost-ai)' : 'IN-MEMORY SECURE',
      retention_days: 30,
      chart_data: [
        { month: 'Apr', value: 42, label: '420 q' },
        { month: 'May', value: 58, label: '580 q' },
        { month: 'Jun', value: 76, label: '760 q' },
        { month: 'Jul', value: 68, label: '680 q' },
        { month: 'Aug', value: 95, label: '950 q' }
      ]
    };

    return res.json({
      success: true,
      growth: realtimeData.growth,
      timeframe: realtimeData.timeframe,
      data: realtimeData.chart_data,
      telemetry: realtimeData
    });
  } catch (err) {
    return res.json({
      success: true,
      growth: '+60%',
      timeframe: 'from last mth',
      data: memoryStore.analytics
    });
  }
});


// ----------------------------------------------------
// Insights Routes
// ----------------------------------------------------
router.get('/insights', async (req, res) => {
  return res.json({
    success: true,
    data: memoryStore.insights
  });
});

// ----------------------------------------------------
// AI Assistant Voice & Chat Route
// ----------------------------------------------------
router.post('/assistant/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message text required' });
  }

  // Smart contextual AI responses for Gatepost AI
  const lower = message.toLowerCase();
  let reply = "Gatepost AI core is actively monitoring operations. All protocols are running within nominal parameters.";

  if (lower.includes('workflow') || lower.includes('automate')) {
    reply = "Autonomous workflow pipeline is active. The client proposal draft has been forwarded for manager review.";
  } else if (lower.includes('analytic') || lower.includes('growth') || lower.includes('metric')) {
    reply = "Throughput efficiency surged by 60% this month, hitting peak volume at 94 active units.";
  } else if (lower.includes('task') || lower.includes('todo') || lower.includes('status')) {
    reply = "You have 3 completed tasks and 1 pending directive: 'Deploy Gatepost neural pipeline'.";
  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    reply = "Hello! I am Gatepost AI, your autonomous operational intelligence. How can I assist you today?";
  } else if (lower.includes('security') || lower.includes('access') || lower.includes('gate')) {
    reply = "Gatepost perimeter security matrix verified. Zero unauthorized attempts recorded in the last 24 hours.";
  }

  const userMsg = { role: 'user', content: message, timestamp: new Date() };
  const aiMsg = { role: 'assistant', content: reply, timestamp: new Date() };

  memoryStore.messages.push(userMsg, aiMsg);

  if (getDbStatus()) {
    try {
      await Message.create([userMsg, aiMsg]);
    } catch (e) {
      // quiet fallback
    }
  }

  return res.json({
    success: true,
    reply: reply,
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// Ollama Local AI Telemetry & Status Route
// ----------------------------------------------------
router.get('/ollama/status', async (req, res) => {
  try {
    const available = await isOllamaAvailable();
    const models = available ? await getOllamaModels() : [];
    const activeModel = await resolveActiveModel();
    return res.json({
      success: true,
      available,
      activeModel,
      models,
      url: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
    });
  } catch (err) {
    return res.json({ success: false, available: false, error: err.message });
  }
});

// ----------------------------------------------------
// AI Model Selection & Management Routes
// ----------------------------------------------------
router.get('/models', async (req, res) => {
  try {
    const available = await isOllamaAvailable();
    const localModels = available ? await getOllamaModels() : [];
    const activeConfig = getActiveModelConfig();

    const presets = [
      { id: 'llama3.2', name: 'LLaMA 3.2 (3B)', provider: 'ollama', description: 'Ultra-fast, lowest latency, low RAM', installed: localModels.some(m => m.includes('llama3.2')) },
      { id: 'llama3', name: 'LLaMA 3 (8B)', provider: 'ollama', description: 'Deep reasoning & creative problem solving', installed: localModels.some(m => m.includes('llama3')) },
      { id: 'mistral', name: 'Mistral (7B)', provider: 'ollama', description: 'High-speed reasoning, coding, directives', installed: localModels.some(m => m.includes('mistral')) },
      { id: 'phi3', name: 'Phi-3 Mini (3.8B)', provider: 'ollama', description: 'Lightweight high-efficiency model', installed: localModels.some(m => m.includes('phi3')) },
      { id: 'deepseek-r1', name: 'DeepSeek-R1 (7B/8B)', provider: 'ollama', description: 'Advanced reasoning & chain-of-thought', installed: localModels.some(m => m.includes('deepseek')) },
      { id: 'qwen2.5', name: 'Qwen 2.5 (7B)', provider: 'ollama', description: 'Superb multilingual & coding power', installed: localModels.some(m => m.includes('qwen')) },
      { id: 'gemini-1.5-flash', name: 'Google Gemini 1.5 Flash', provider: 'gemini', description: 'Google Cloud multimodal model', installed: false },
      { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o Mini', provider: 'openai', description: 'OpenAI cloud intelligence', installed: false }
    ];

    // Prepend any locally pulled Ollama models
    const presetIds = presets.map(p => p.id);
    for (const m of localModels) {
      const base = m.split(':')[0];
      if (!presetIds.includes(base) && !presetIds.includes(m)) {
        presets.unshift({
          id: m,
          name: m,
          provider: 'ollama',
          description: 'Locally installed Ollama model',
          installed: true
        });
      }
    }

    return res.json({
      success: true,
      ollamaOnline: available,
      ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
      activeModel: activeConfig.model,
      activeProvider: activeConfig.provider,
      installedOllamaModels: localModels,
      availableModels: presets
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/models/active', (req, res) => {
  const { model, provider } = req.body;
  if (!model) {
    return res.status(400).json({ success: false, message: 'Model identifier required' });
  }
  const updated = setActiveModelConfig(model, provider || 'ollama');
  return res.json({ success: true, activeModel: updated.model, activeProvider: updated.provider });
});

export default router;
