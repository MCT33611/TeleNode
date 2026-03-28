import { NextRequest, NextResponse } from 'next/server';
import { getTelegramClient, parseCaptionData, resolveChannel } from '@/lib/telegramClient';
import { getSession } from '@/lib/sessionStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string; foldername: string } }
) {
  const { username, foldername } = params;
  
  let client = await getTelegramClient(username);
  if (!client) {
    return NextResponse.json({ error: 'User session not found' }, { status: 404 });
  }

  try {
    const session = await getSession(username);
    const folder = session?.folders?.find(f => f.name.toLowerCase() === foldername.toLowerCase());
    
    const targetChannel = folder ? folder.id : foldername;
    
  let retryCount = 0;
  while (retryCount < 2) {
    try {
      const entity = await resolveChannel(client, targetChannel);
      const messages = await client.getMessages(entity, { limit: 100 });
      const validMessages = messages.filter(msg => !!msg.media || (msg.message && msg.message.trim().length > 0));
      // ... Proceed with processing validMessages ...
      const grouped = new Map();
      let results: any[] = [];

      validMessages.forEach(msg => {
        const parsedData = parseCaptionData(msg);
        const mediaUrl = msg.media ? `/api/media/${username}/${targetChannel}/${msg.id}` : null;
        const d = new Date(msg.date * 1000);
        const formattedDate = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

        if (msg.groupedId) {
          const gid = msg.groupedId.toString();
          if (!grouped.has(gid)) {
            grouped.set(gid, {
              id: msg.id,
              date: formattedDate,
              mediaUrls: [],
              ...parsedData
            });
          }
          const group = grouped.get(gid);
          if (mediaUrl) group.mediaUrls.push(mediaUrl);
          if (Object.keys(parsedData).length > 0) Object.assign(group, parsedData);
        } else {
          results.push({
            id: msg.id,
            date: formattedDate,
            mediaUrls: mediaUrl ? [mediaUrl] : [],
            ...parsedData
          });
        }
      });
      results.push(...Array.from(grouped.values()));
      results.sort((a, b) => b.id - a.id);
      
      const searchParams = request.nextUrl.searchParams;
      const sorts: { field: string; order: 'asc' | 'desc' }[] = [];
      Array.from(searchParams.entries()).forEach(([key, value]) => {
        if (key.endsWith('-like')) {
          const field = key.replace('-like', '');
          const regex = new RegExp(value, 'i');
          results = results.filter(item => regex.test(item[field]));
        } else if (key.endsWith('-desc') || key.endsWith('-asc')) {
          const field = key.replace('-desc', '').replace('-asc', '');
          sorts.push({ field, order: key.endsWith('-desc') ? 'desc' : 'asc' });
        } else {
          results = results.filter(item => String(item[key]) === value);
        }
      });
      if (sorts.length > 0) {
        results.sort((a, b) => {
          for (const sort of sorts) {
            const valA = a[sort.field];
            const valB = b[sort.field];
            if (valA < valB) return sort.order === 'asc' ? -1 : 1;
            if (valA > valB) return sort.order === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      return NextResponse.json(results, { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=59' } });
    } catch (e: any) {
      const isDuplicate = e.errorMessage === 'AUTH_KEY_DUPLICATED' || (e.message && e.message.includes('406'));
      if (isDuplicate && retryCount === 0) {
        retryCount++;
        // Import clientsCache to clear it 
        const { clientsCache } = await import('@/lib/authServer');
        clientsCache.delete(username);
        const freshClient = await getTelegramClient(username);
        if (freshClient) {
           client = freshClient;
           continue; 
        }
      }
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'Failed after retries' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
