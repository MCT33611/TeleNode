import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { saveSession } from './sessionStorage';

// Store clients in memory to avoid aggressive reconnections
export const clientsCache = new Map<string, TelegramClient>();
const pendingLogins = new Map<string, { client: TelegramClient, phoneCodeHash: string, apiId: number, apiHash: string }>();

export async function sendCode(phone: string, apiId: number, apiHash: string) {
  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  
  await client.connect();
  const result = await client.sendCode(
    {
      apiId,
      apiHash,
    },
    phone
  );

  pendingLogins.set(phone, { client, phoneCodeHash: result.phoneCodeHash, apiId, apiHash });
  return result.phoneCodeHash;
}

export async function signIn(phone: string, phoneCode: string, username: string) {
  const pending = pendingLogins.get(phone);
  if (!pending) {
    throw new Error("No pending login found for this phone number.");
  }

  const { client, phoneCodeHash, apiId, apiHash } = pending;
  
  await client.invoke(
    new Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash: phoneCodeHash,
      phoneCode: phoneCode,
    })
  );

  const sessionString = (client.session as StringSession).save();
  await saveSession(username, { phone, sessionString, apiId, apiHash });
  
  clientsCache.set(username, client);
  pendingLogins.delete(phone);
  
  return sessionString;
}
