'use server'

import { sendCode, signIn } from '@/lib/authServer';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/sessionStorage';
import { getTelegramClient } from '@/lib/telegramClient';
import { Api } from 'telegram';

export async function sendCodeAction(phone: string, apiId: number, apiHash: string) {
  try {
    const hash = await sendCode(phone, apiId, apiHash);
    return { success: true, hash };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function signInAction(phone: string, code: string, username: string) {
  try {
    const res = await signIn(phone, code, username);
    if (res === "2FA_REQUIRED") {
      return { success: false, requiresPassword: true };
    }
    
    cookies().set('tele_user', username, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function checkPasswordAction(phone: string, password: string, username: string) {
  try {
    const signIn = await import('@/lib/authServer');
    await signIn.checkPassword(phone, password, username);

    cookies().set('tele_user', username, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function logoutAction() {
  const cookieStore = cookies();
  const user = cookieStore.get('tele_user')?.value;
  
  if (user) {
    // We only clear the local cookie. 
    // We DON'T call client.invoke(new Api.auth.LogOut()) because the user 
    // wants the API to remain active even after logging out of the web UI.
    cookieStore.delete('tele_user');
  }
  
  return { success: true };
}
