import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  badge: { type: String, default: null },
  category: { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now }
});

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
