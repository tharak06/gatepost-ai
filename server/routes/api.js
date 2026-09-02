import express from 'express';
import { Task } from '../models/Task.js';
import { Workflow } from '../models/Workflow.js';
import { Analytics } from '../models/Analytics.js';
import { Message } from '../models/Message.js';
import { getDbStatus } from '../config/db.js';

const router = express.Router();

// Resilient In-Memory Fallback Store
const memoryStore = {
  tasks: [
    { _id: '1', title: 'Draft client proposal', completed: true, badge: 'Update', category: 'Directives' },
    { _id: '2', title: 'Security analytics report', completed: true, badge: null, category: 'Audit' },
    { _id: '3', title: 'Schedule team sync', completed: true, badge: null, category: 'Team' },
    { _id: '4', title: 'Deploy Gatepost neural pipeline', completed: false, badge: 'Pending', category: 'Ops' }
  ],
  workflows: [
    { _id: '1', title: 'Draft client proposal', status: 'active', order: 1, icon: 'edit' },
    { _id: '2', title: 'Manager review & approval', status: 'pending', order: 2, icon: 'user-check' },
    { _id: '3', title: 'Autonomous Gatepost deployment', status: 'pending', order: 3, icon: 'zap' }
  ],
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
      return res.json({ success: true, data: item });
    }
    return res.json({ success: true, message: 'Triggered' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// Analytics Routes
// ----------------------------------------------------
router.get('/analytics', async (req, res) => {
  return res.json({
    success: true,
    growth: '+60%',
    timeframe: 'from last mth',
    data: memoryStore.analytics
  });
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

export default router;
