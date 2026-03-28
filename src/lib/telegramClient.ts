import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { getSession } from './sessionStorage';
import { clientsCache } from './authServer';

const connectionPromises = new Map<string, Promise<TelegramClient | null>>();

export async function getTelegramClient(username: string): Promise<TelegramClient | null> {
  // 1. Check if we already have a fully connected client
  if (clientsCache.has(username)) {
    const client = clientsCache.get(username)!;
    if (client.connected) return client;
    // If it's in cache but disconnected, treat as a new connection request
    clientsCache.delete(username);
  }

  // 2. Check if a connection is already in progress for this specific user
  if (connectionPromises.has(username)) {
    return connectionPromises.get(username)!;
  }

  // 3. Initiate a single connection attempt and cache the promise
  const connectPromise = (async () => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const sessionData = await getSession(username);
        if (!sessionData) return null;

        const stringSession = new StringSession(sessionData.sessionString);
        const client = new TelegramClient(stringSession, sessionData.apiId, sessionData.apiHash, {
          connectionRetries: 5,
          autoReconnect: true,
          useWSS: true, // Use WebSockets for better stability in cloud/proxy environments
          deviceModel: `TeleNode-${process.env.NODE_ENV === 'production' ? 'Cloud' : 'Local'}`,
          systemVersion: '1.0.0',
        });

        // Aggressively attempt to connect
        await client.connect();
        
        // Final sanity check - sometimes connect() returns but the client is immediately dropped
        if (!client.connected) {
           throw new Error("Connection established but client reported as disconnected immediately.");
        }

        clientsCache.set(username, client);
        console.log(`[TeleNode] Successfully connected Telegram for ${username} (${process.env.NODE_ENV})`);
        return client;
      } catch (error: any) {
        attempts++;
        const isDuplicate = error.errorMessage === 'AUTH_KEY_DUPLICATED' || (error.message && error.message.includes('406'));
        
        if (isDuplicate && attempts < maxAttempts) {
          console.warn(`[TeleNode] AUTH_KEY_DUPLICATED for ${username}. Waiting 2s for other sessions to settle... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(r => setTimeout(r, 2000)); // Increase wait to 2s
          continue;
        }
        
        console.error(`[TeleNode] Critical connection failure for ${username}:`, error);
        return null;
      } finally {
        // Clean up the unique promise to allow fresh attempts if this one failed
        connectionPromises.delete(username);
      }
    }
    return null;
  })();

  connectionPromises.set(username, connectPromise);
  return connectPromise;
}

export function parseCaptionData(message: Api.Message | Api.TypeMessage) {
  if ('message' in message && message.message) {
    try {
      return JSON.parse(message.message);
    } catch {
      return { rawCaption: message.message };
    }
  }
  return {};
}

export async function resolveChannel(client: TelegramClient, idStr: string) {
  let peer: string | number = idStr;
  if (/^\d+$/.test(idStr)) peer = Number("-100" + idStr);
  else if (idStr.startsWith("-100")) peer = Number(idStr);
  
  try {
    return await client.getInputEntity(peer);
  } catch (err: any) {
    if (err.message && err.message.includes("Could not find the input entity")) {
      // Force populate the cache with newest dialogs
      await client.getDialogs({});
      return await client.getInputEntity(peer);
    }
    throw err;
  }
}
