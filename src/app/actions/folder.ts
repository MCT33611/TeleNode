'use server'

import { Api } from 'telegram';
import { getTelegramClient, resolveChannel } from '@/lib/telegramClient';
import { getSession, updateFolders } from '@/lib/sessionStorage';
import { getTnLogoBuffer, uploadChannelPhoto } from '@/lib/logo';
import { cookies } from 'next/headers';

export async function createFolderAction(name: string) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: name,
        about: 'TeleNode Storage channel',
        broadcast: true,
      })
    );

    // Filter to get the created channel
    let newChannelId = '';
    if ('chats' in result) {
      newChannelId = result.chats[0].id.toString();
    }

    if (!newChannelId) {
       throw new Error("Failed to extract channel ID after creation.");
    }

    try {
      const buffer = await getTnLogoBuffer();
      await uploadChannelPhoto(client, newChannelId, buffer);
    } catch (photoErr) {
      console.error("Failed to set default channel photo:", photoErr);
    }

    // Add to mapping
    const session = await getSession(username);
    const folders = session?.folders || [];
    folders.push({ id: newChannelId, name });
    await updateFolders(username, folders);

    return { success: true, folder: { id: newChannelId, name } };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function linkFolderAction(idOrUsername: string, name: string) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    // Attempt to resolve entity to ensure it exists
    const entity = await client.getEntity(idOrUsername);
    const resolvedId = entity.id.toString();

    const session = await getSession(username);
    const folders = session?.folders || [];
    folders.push({ id: resolvedId, name });
    await updateFolders(username, folders);

    return { success: true, folder: { id: resolvedId, name } };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function getFoldersAction() {
  const username = cookies().get('tele_user')?.value;
  if (!username) return { success: false, error: 'Not authenticated', folders: [], username: '' };

  const session = await getSession(username);
  return { success: true, folders: session?.folders || [], username };
}

export async function deleteFolderAction(channelId: string, hardDelete: boolean = false) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    if (hardDelete) {
      const client = await getTelegramClient(username);
      if (!client) throw new Error('Client not initialized');
      const entity = await resolveChannel(client, channelId);
      
      // Hard delete the channel on Telegram natively
      await client.invoke(
        new Api.channels.DeleteChannel({
          channel: entity
        })
      );
    }

    // Always remove from local Redis mapping regardless of soft/hard choice
    const session = await getSession(username);
    if (session) {
      session.folders = (session.folders || []).filter(f => f.id !== channelId);
      await updateFolders(username, session.folders);
    }

    return { success: true };
  } catch (e: any) {
    console.error(e);
    let errMsg = e?.message || "Error";
    if (errMsg.includes('CHAT_ADMIN_REQUIRED') || errMsg.includes('CHAT_WRITE_FORBIDDEN')) {
      errMsg = "You lack administrative permissions to perform this action natively on this channel.";
    }
    return { success: false, error: errMsg };
  }
}

export async function renameFolderAction(channelId: string, newName: string) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const entity = await resolveChannel(client, channelId);
    
    // Rename on Telegram natively
    await client.invoke(
      new Api.channels.EditTitle({
        channel: entity,
        title: newName
      })
    );

    // Update local mapping
    const session = await getSession(username);
    if (session) {
      session.folders = session.folders || [];
      const folder = session.folders.find(f => f.id === channelId);
      if (folder) folder.name = newName;
      await updateFolders(username, session.folders);
    }

    return { success: true };
  } catch (e: any) {
    console.error(e);
    let errMsg = e?.message || "Error";
    if (errMsg.includes('CHAT_ADMIN_REQUIRED') || errMsg.includes('CHAT_WRITE_FORBIDDEN')) {
      errMsg = "You lack administrative permissions to perform this action natively on this channel.";
    }
    return { success: false, error: errMsg };
  }
}

export async function updateFolderPhotoAction(channelId: string, formData: FormData) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadChannelPhoto(client, channelId, buffer);

    return { success: true };
  } catch (e: any) {
    console.error(e);
    let errMsg = e?.message || "Error";
    if (errMsg.includes('CHAT_ADMIN_REQUIRED') || errMsg.includes('CHAT_WRITE_FORBIDDEN')) {
      errMsg = "You lack administrative permissions to perform this action natively on this channel.";
    }
    return { success: false, error: errMsg };
  }
}

