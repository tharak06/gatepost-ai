import mongoose from 'mongoose';

const workflowSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, enum: ['active', 'pending', 'completed'], default: 'pending' },
  order: { type: Number, required: true },
  icon: { type: String, default: 'check' },
  updatedAt: { type: Date, default: Date.now }
});

export const Workflow = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);
