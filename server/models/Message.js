import mongoose from 'mongoose';

/**
 * CRITICAL PRIVACY ENFORCEMENT CONSTRAINT:
 * The Message collection has NO column/field for file_path, file_data, or file_blob.
 * Uploaded images and PDFs exist ONLY as in-memory RAM buffers for the duration of
 * a single request, and are discarded immediately after processing.
 */
const messageSchema = new mongoose.Schema({
  chat_id: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content_text: { type: String, required: true },
  message_type: { 
    type: String, 
    enum: ['text', 'image_upload', 'pdf_upload', 'image_generated'], 
    default: 'text' 
  },
  createdAt: { type: Date, default: Date.now }
});

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
