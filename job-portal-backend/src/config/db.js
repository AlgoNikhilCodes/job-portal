import mongoose from 'mongoose';

const connectDB = async () => {
  const ts = () => new Date().toISOString();
  try {
    console.log(`[${ts()}] Connecting to MongoDB…`);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[${ts()}] MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[${ts()}] MongoDB connection error:`, err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn(`[${ts()}] MongoDB disconnected — will attempt to reconnect automatically.`);
    });
  } catch (error) {
    console.error(`[${ts()}] MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
