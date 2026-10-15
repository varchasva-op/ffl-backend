export interface ImageKitConfig { publicKey: string; privateKey: string; urlEndpoint: string; folder: string }

/** Credentials are read only by the Node server; never serialize this object to the client. */
export function getImageKitConfig(): ImageKitConfig {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit is not configured. Set its public key, private key, and URL endpoint in the backend environment.');
  }
  return { publicKey: IMAGEKIT_PUBLIC_KEY, privateKey: IMAGEKIT_PRIVATE_KEY, urlEndpoint: IMAGEKIT_URL_ENDPOINT, folder: process.env.IMAGEKIT_FOLDER || '/ffl/players' };
}
