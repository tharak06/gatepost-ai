import mongoose from 'mongoose';

const fileRecordSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  chat_id: { type: String, default: null },
  filename: { type: String, required: true },
  file_type: { type: String, enum: ['image', 'pdf'], required: true },
  file_url: { type: String, required: true },
  is_public: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // 30-Day Auto-Expiration (MongoDB Native TTL Index: automatically deletes after 30 days)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
});

export const FileRecord = mongoose.models.FileRecord || mongoose.model('FileRecord', fileRecordSchema);
