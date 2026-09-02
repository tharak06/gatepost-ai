import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  month: { type: String, required: true },
  value: { type: Number, required: true },
  efficiencyGrowth: { type: String, default: '+60%' },
  year: { type: Number, default: 2026 }
});

export const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);
