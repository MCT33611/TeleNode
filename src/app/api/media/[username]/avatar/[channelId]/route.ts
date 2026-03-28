import { NextRequest, NextResponse } from 'next/server';
import { getTelegramClient, resolveChannel } from '@/lib/telegramClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; channelId: string } }
) {
  const { username, channelId } = params;
  
  const client = await getTelegramClient(username);
  if (!client) {
    return NextResponse.json({ error: 'User session not found' }, { status: 404 });
  }

  try {
    const entity = await resolveChannel(client, channelId);

    const buffer = await client.downloadProfilePhoto(entity, { isBig: false });

    if (!buffer) {
      return NextResponse.json({ error: 'No profile photo found' }, { status: 404 });
    }

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
