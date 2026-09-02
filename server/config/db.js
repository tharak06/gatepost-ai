import mongoose from 'mongoose';

let isMongoConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gatepost_ai';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log(`[Gatepost MongoDB] Connected to: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isMongoConnected = false;
    console.warn(`[Gatepost MongoDB] No local/remote MongoDB instance detected (${error.message}). Running in Resilient Fallback In-Memory Mode.`);
    return false;
  }
};

export const getDbStatus = () => isMongoConnected;
