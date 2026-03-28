import Redis from 'ioredis';

export interface Folder {
  id: string;
  name: string;
}

export interface SessionData {
  phone: string;
  sessionString: string;
  apiId: number;
  apiHash: string;
  folders?: Folder[];
}

const redisUrl = process.env.telenode_db_REDIS_URL || process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("WARNING: REDIS URL is missing from environment. Cloud Storage disabled!");
}

// Ensure Vercel serverless functions / Next.js Hot Reloads don't artificially exhaust our Redis connections pool
const globalForRedis = global as unknown as { redis: Redis | null };

export const redis =
  globalForRedis.redis ||
  (redisUrl ? new Redis(redisUrl) : null);

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redis = redis;
}

const getKey = (username: string) => `telenode:user:${username}`;

export async function saveSession(username: string, data: SessionData): Promise<void> {
  if (!redis) throw new Error("Cloud Database (Redis) not configured.");
  const key = getKey(username);
  
  // Try to preserve existing folders if we're just updating the session/phone
  const existing = await getSession(username);
  const finalData = {
    ...data,
    folders: data.folders || existing?.folders || []
  };

  await redis.set(key, JSON.stringify(finalData));
}

export async function updateFolders(username: string, folders: Folder[]): Promise<void> {
  const session = await getSession(username);
  if (session) {
    session.folders = folders;
    await saveSession(username, session);
  }
}

export async function getSession(username: string): Promise<SessionData | null> {
  if (!redis) return null;
  const key = getKey(username);
  
  const raw = await redis.get(key);
  if (!raw) return null;
  
  try {
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed.folders) parsed.folders = [];
    return parsed;
  } catch (error) {
    console.error(`Error parsing session for ${username}:`, error);
    return null;
  }
}

export async function deleteSession(username: string): Promise<void> {
  if (!redis) return;
  const key = getKey(username);
  await redis.del(key);
}
