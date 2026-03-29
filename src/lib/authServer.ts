import { TelegramClient, Api, password as passwordHelper } from 'telegram';
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
  
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: phoneCode,
      })
    );
  } catch (e: any) {
    if (e.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return "2FA_REQUIRED";
    }
    throw e;
  }

  const sessionString = (client.session as StringSession).save();
  await saveSession(username, { phone, sessionString, apiId, apiHash });
  
  clientsCache.set(username, client);
  pendingLogins.delete(phone);
  
  return sessionString;
}

export async function checkPassword(phone: string, password: string, username: string) {
  const pending = pendingLogins.get(phone);
  if (!pending) {
    throw new Error("No pending login found for this phone number.");
  }

  const { client, apiId, apiHash } = pending;
  
  // Manual SRP check for 2FA
  const passwordInfo = await client.invoke(new Api.account.GetPassword());
  const passwordSrp = await passwordHelper.computeCheck(passwordInfo, password);
  
  await client.invoke(
    new Api.auth.CheckPassword({
      password: passwordSrp,
    })
  );

  const sessionString = (client.session as StringSession).save();
  await saveSession(username, { phone, sessionString, apiId, apiHash });
  
  clientsCache.set(username, client);
  pendingLogins.delete(phone);
  
  return sessionString;
}
