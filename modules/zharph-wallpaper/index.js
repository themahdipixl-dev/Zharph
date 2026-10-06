import { requireOptionalNativeModule } from 'expo';

const ZharphWallpaper = requireOptionalNativeModule('ZharphWallpaper');

export async function applyWallpaper(imageUri, clock, foregroundMasks = []) {
  if (!ZharphWallpaper) {
    throw new Error('Zharph wallpaper native module is unavailable. Install a Zharph Android build first.');
  }

  return ZharphWallpaper.applyWallpaper(
    imageUri,
    Array.isArray(foregroundMasks) ? foregroundMasks : [],
    Number(clock?.nx ?? 0.18),
    Number(clock?.ny ?? 0.07),
  );
}

export default ZharphWallpaper;
