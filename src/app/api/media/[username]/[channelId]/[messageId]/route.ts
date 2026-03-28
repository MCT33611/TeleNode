import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { getTelegramClient, resolveChannel } from '@/lib/telegramClient';
import { Api } from 'telegram';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; channelId: string; messageId: string } }
) {
  const { username, channelId, messageId } = params;
  
  const client = await getTelegramClient(username);
  if (!client) {
    return NextResponse.json({ error: 'User session not found' }, { status: 404 });
  }

  try {
    // getMessages by id requires passing an array of ids.
    const entity = await resolveChannel(client, channelId);
    const messages = await client.getMessages(entity, { ids: [parseInt(messageId)] });
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const msg = messages[0];
    if (!msg.media) {
      return NextResponse.json({ error: 'No media found in message' }, { status: 404 });
    }

    const buffer = await client.downloadMedia(msg, {});

    if (!buffer) {
      return NextResponse.json({ error: 'Failed to download media from Telegram' }, { status: 500 });
    }

    let contentType = 'application/octet-stream';
    if (msg.media instanceof Api.MessageMediaPhoto) {
      contentType = 'image/jpeg';
    } else if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
      contentType = msg.media.document.mimeType;
    }

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
