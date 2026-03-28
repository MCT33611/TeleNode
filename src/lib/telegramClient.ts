import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { getSession } from './sessionStorage';
import { clientsCache } from './authServer';

export async function getTelegramClient(username: string): Promise<TelegramClient | null> {
  if (clientsCache.has(username)) {
    return clientsCache.get(username)!;
  }

  const sessionData = await getSession(username);
  if (!sessionData) {
    return null;
  }

  const stringSession = new StringSession(sessionData.sessionString);
  const client = new TelegramClient(stringSession, sessionData.apiId, sessionData.apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  clientsCache.set(username, client);
  return client;
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
