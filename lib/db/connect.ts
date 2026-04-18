import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/** Prefer failing the connection step over buffering queries until bufferTimeoutMS (10s). */
const connectOptions = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
} as const;

export async function connectDb(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local to use the admin API (see docs/FRONTEND_API_INTEGRATION.md for API shapes)."
    );
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, connectOptions).catch((err: unknown) => {
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.conn = null;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not connect to MongoDB (${msg}). Check MONGODB_URI in .env.local, that MongoDB is running (e.g. local service or Atlas cluster awake), and network / IP allowlist for Atlas.`
    );
  }
}
