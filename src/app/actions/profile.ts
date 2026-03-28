'use server'

import { Api } from 'telegram';
import { getTelegramClient } from '@/lib/telegramClient';
import { getTnLogoBuffer, uploadChannelPhoto } from '@/lib/logo';
import { cookies } from 'next/headers';

export async function ensureProfileChannel() {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) return { success: false };

    const client = await getTelegramClient(username);
    if (!client) return { success: false };

    // Find if user already has a channel named exactly matching their active username
    const dialogs = await client.getDialogs({});
    const profileDialog = dialogs.find(d => d.title === username && d.isChannel);

    if (!profileDialog) {
      const result = await client.invoke(
        new Api.channels.CreateChannel({
          title: username,
          about: 'TeleNode Settings & Profile Channel',
          broadcast: true,
        })
      );
      
      let newChannelId = '';
      if ('chats' in result) {
        newChannelId = result.chats[0].id.toString();
      }

      if (newChannelId) {
        try {
          const buffer = await getTnLogoBuffer();
          await uploadChannelPhoto(client, newChannelId, buffer);
        } catch (photoErr) {
          console.error("Failed to set default profile photo:", photoErr);
        }
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error("Failed to ensure profile channel:", e);
    return { success: false };
  }
}

export async function updateProfilePhotoAction(formData: FormData) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    const dialogs = await client.getDialogs({});
    const profileDialog = dialogs.find(d => d.title === username && d.isChannel);

    if (!profileDialog) throw new Error("Profile channel not found");

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadChannelPhoto(client, profileDialog.entity, buffer, file.name);

    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}
