import { NextRequest, NextResponse } from 'next/server';
import { getTelegramClient } from '@/lib/telegramClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  
  const client = await getTelegramClient(username);
  if (!client) {
    return NextResponse.json({ error: 'User session not found' }, { status: 404 });
  }

  try {
    const me = await client.getMe();

    if (!me) {
       return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const buffer = await client.downloadProfilePhoto(me, { isBig: false });

    if (!buffer) {
      return NextResponse.json({ error: 'No profile photo found' }, { status: 404 });
    }

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
