import { TelegramClient, Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';
import { resolveChannel } from './telegramClient';

export async function getTnLogoBuffer(): Promise<Buffer> {
  // Fetch a mathematically centered, perfectly styled yellow TN logo
  // facc15 is the hex for Tailwind yellow-400
  const url = 'https://ui-avatars.com/api/?name=TN&background=facc15&color=000&size=512&font-size=0.4&bold=true';
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadChannelPhoto(client: TelegramClient, channelOrId: any, fileBuffer: Buffer, fileName: string = "photo.png") {
  const entity = typeof channelOrId === "string" || typeof channelOrId === "number" 
    ? await resolveChannel(client, channelOrId.toString()) 
    : channelOrId;
  
  const customFile = new CustomFile(fileName, fileBuffer.length, "", fileBuffer);
  
  const uploaded = await client.uploadFile({
    file: customFile,
    workers: 1,
  });

  await client.invoke(
    new Api.channels.EditPhoto({
      channel: entity,
      photo: new Api.InputChatUploadedPhoto({
        file: uploaded,
      }),
    })
  );
}
