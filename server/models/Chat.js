import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  title: { type: String, default: 'New Conversation' },
  createdAt: { type: Date, default: Date.now }
});

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
