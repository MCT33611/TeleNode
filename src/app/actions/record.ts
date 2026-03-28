'use server'

import { Api } from 'telegram';
import { getTelegramClient, parseCaptionData, resolveChannel } from '@/lib/telegramClient';
import { cookies } from 'next/headers';
import { CustomFile } from 'telegram/client/uploads';
import { getSession } from '@/lib/sessionStorage';

export async function getRecordsAction(channelId: string) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const entity = await resolveChannel(client, channelId);
    const messages = await client.getMessages(entity, { limit: 100 });
    
    const session = await getSession(username);
    const folder = session?.folders?.find(f => f.id === channelId);

    // Filter out purely service messages (like channel creation)
    const validMessages = messages.filter(msg => !!msg.media || (msg.message && msg.message.trim().length > 0));

    const grouped = new Map();
    const results: any[] = [];

    validMessages.forEach(msg => {
      const parsedData = parseCaptionData(msg);
      const mediaUrl = msg.media ? `/api/media/${username}/${channelId}/${msg.id}` : null;
      let fileName = 'file';
      let mimeType = 'application/octet-stream';

      if (msg.media instanceof Api.MessageMediaPhoto) {
        fileName = `photo_${msg.id}.jpg`;
        mimeType = 'image/jpeg';
      } else if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
        mimeType = msg.media.document.mimeType;
        const fileAttr = msg.media.document.attributes.find(a => a instanceof Api.DocumentAttributeFilename) as Api.DocumentAttributeFilename | undefined;
        if (fileAttr) fileName = fileAttr.fileName;
        else fileName = `document_${msg.id}`;
      }

      const mediaItem = mediaUrl ? { msgId: msg.id, url: mediaUrl, fileName, mimeType } : null;

      if (msg.groupedId) {
        const gid = msg.groupedId.toString();
        if (!grouped.has(gid)) {
          grouped.set(gid, {
            id: msg.id, // Primary rendering key (highest msg id or lowest msg id)
            msgIds: [], 
            date: msg.date,
            mediaUrls: [],
            mediaItems: [], // Struct for inline editing deletes
            captionMsgId: null, // Critical lock target for JSON mutation 
            data: {},
            hasMedia: false
          });
        }
        
        const group = grouped.get(gid);
        group.msgIds.push(msg.id);
        
        if (mediaUrl) {
           group.mediaUrls.push(mediaUrl);
           group.mediaItems.push(mediaItem);
           group.hasMedia = true;
        }

        // The caption/JSON usually sits on one of the grouped messages.
        if (Object.keys(parsedData).length > 0) {
           group.data = parsedData;
           group.captionMsgId = msg.id; 
        }
        
        if (!group.captionMsgId) group.captionMsgId = msg.id; 

      } else {
         // Free standing record
         results.push({
           id: msg.id,
           captionMsgId: msg.id,
           msgIds: [msg.id],
           date: msg.date,
           mediaUrls: mediaUrl ? [mediaUrl] : [],
           mediaItems: mediaItem ? [mediaItem] : [],
           data: parsedData,
           hasMedia: !!msg.media
         });
      }
    });

    // Process the results to apply any custom media order from JSON metadata
    const finalResults = Array.from(grouped.values()).concat(results).map(record => {
      if (record.data && Array.isArray(record.data.mediaOrder) && record.mediaItems.length > 0) {
        const order = record.data.mediaOrder as number[];
        // Create a map for quick lookup of items by msgId
        const itemMap = new Map(record.mediaItems.map((item: any) => [item.msgId, item]));
        
        const sortedItems: any[] = [];
        // Add items in the specified order if they exist
        order.forEach(id => {
          if (itemMap.has(id)) {
            sortedItems.push(itemMap.get(id));
            itemMap.delete(id);
          }
        });
        // Append any items that weren't in the order array (e.g. newly added)
        sortedItems.push(...Array.from(itemMap.values()));
        
        return {
          ...record,
          mediaItems: sortedItems,
          mediaUrls: sortedItems.map(item => item.url)
        };
      }
      return record;
    });

    // Sort final sequence descending by Date or ID
    finalResults.sort((a, b) => b.id - a.id);

    return { success: true, records: finalResults, folderName: folder?.name || 'Unknown Folder', username };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function createRecordAction(channelId: string, formData: FormData) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const files = formData.getAll('file') as File[];
    const jsonData = formData.get('jsonData') as string;

    if (!files || files.length === 0) throw new Error("No files provided");

    const customFiles = [];
    for (const file of files) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        (buffer as any).name = file.name;
        customFiles.push(buffer);
      }
    }

    if (customFiles.length === 0) throw new Error("No valid files provided");
    if (customFiles.length > 10) throw new Error("Telegram natively limits a single Album (Record) to a maximum of 10 media items. Please split your files across multiple records.");

    const entity = await resolveChannel(client, channelId);
    
    // Gramjs supports an array natively for bulk uploads (Albums)
    await client.sendFile(entity, {
      file: customFiles,
      caption: jsonData,
    });

    return { success: true };
  } catch (e: any) {
    console.error(e);
    let errMsg = e?.message || "Error";
    if (errMsg.includes('CHAT_ADMIN_REQUIRED') || errMsg.includes('CHAT_WRITE_FORBIDDEN')) {
      errMsg = "You lack administrative permissions to perform this action natively on this channel.";
    } else if (errMsg.includes('MULTI_MEDIA_TOO_LONG')) {
      errMsg = "Telegram natively limits a single Album (Record) to a maximum of 10 media items. Please split your files across multiple records.";
    }
    return { success: false, error: errMsg };
  }
}

export async function updateRecordAction(channelId: string, messageId: number, jsonData: string) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const entity = await resolveChannel(client, channelId);
    await client.editMessage(entity, { message: messageId, text: jsonData });

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

export async function deleteRecordAction(channelId: string, messageIds: number[]) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const entity = await resolveChannel(client, channelId);
    await client.deleteMessages(entity, messageIds, { revoke: true });

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

export async function editRecordAction(channelId: string, captionMsgId: number, newJsonText: string, deletedMediaIds: number[], allMsgIds: number[]) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const entity = await resolveChannel(client, channelId);

    const survivingIds = allMsgIds.filter(id => !deletedMediaIds.includes(id));
    let targetMsgId = captionMsgId;

    // Rescue the JSON schema if the user explicitly trashed the exact image hosting the text blob
    if (deletedMediaIds.includes(captionMsgId) && survivingIds.length > 0) {
        targetMsgId = survivingIds[0];
    }

    if (survivingIds.length > 0 && newJsonText) {
      try {
        await client.editMessage(entity, { message: targetMsgId, text: newJsonText });
      } catch (err: any) {
        if (!err.message.includes('MESSAGE_NOT_MODIFIED')) {
          throw err;
        }
      }
    }

    // Execute structural trimming of the album if user trashed images natively
    if (deletedMediaIds.length > 0) {
      await client.deleteMessages(entity, deletedMediaIds, { revoke: true });
    }

    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export async function transferRecordAction(sourceChannelId: string, targetChannelId: string, msgIds: number[], isMove: boolean) {
  try {
    const username = cookies().get('tele_user')?.value;
    if (!username) throw new Error('Not authenticated');

    const client = await getTelegramClient(username);
    if (!client) throw new Error('Client not initialized');

    const source = await resolveChannel(client, sourceChannelId);
    const target = await resolveChannel(client, targetChannelId);

    // native forwarding strictly dropping the original author trace makes it a unique physical clone
    await client.forwardMessages(target, {
      messages: msgIds,
      fromPeer: source,
      dropAuthor: true,
    });

    if (isMove) {
      await client.deleteMessages(source, msgIds, { revoke: true });
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
