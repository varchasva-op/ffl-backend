import { getImageKitConfig } from '../config/imagekit';
import { HttpError } from './httpError';

export interface UploadedImage { url: string; fileId: string; name: string; }

/** Streams a validated in-memory upload to ImageKit using its server-side Basic-auth API. */
export async function uploadPlayerPhoto(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadedImage> {
  const config = getImageKitConfig();
  const extension = originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const fileName = `ffl-player-${Date.now()}.${extension}`;
  const form = new FormData();
  form.set('file', new Blob([Uint8Array.from(buffer)], { type: mimeType }), fileName);
  form.set('fileName', fileName);
  form.set('folder', config.folder);
  form.set('useUniqueFileName', 'true');
  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${config.privateKey}:`).toString('base64')}` },
    body: form,
  });
  const result = await response.json().catch(() => null) as { url?: string; fileId?: string; name?: string; message?: string } | null;
  if (!response.ok || !result?.url || !result.fileId) {
    throw new HttpError(502, result?.message || 'ImageKit did not accept the player photo. Check the ImageKit keys and upload permissions.');
  }
  return { url: result.url, fileId: result.fileId, name: result.name || fileName };
}
