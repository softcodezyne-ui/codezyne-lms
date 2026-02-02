import mongoose from 'mongoose';

// Get MongoDB URI from environment variables (required in Vercel)
// Only evaluate this on server-side to prevent client-side errors
const MONGODB_URI = process.env.MONGODB_URI;

console.log('MONGODB_URI', MONGODB_URI);
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __mongodb_cache__: MongooseCache | undefined;
}

const cached: MongooseCache = (global.__mongodb_cache__ ??= { conn: null, promise: null });

async function connectDB() {
  // Prevent execution in browser - return early without throwing
  if (typeof window !== 'undefined') {
    console.warn('connectDB called in browser - this should not happen');
    return null as any;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    }).catch((error) => {
      console.error('Database connection error:', error);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('MongoDB connected successfully');
  } catch (e) {
    cached.promise = null;
    console.error('Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export { connectDB };
export default connectDB;