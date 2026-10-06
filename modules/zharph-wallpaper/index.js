import { requireOptionalNativeModule } from 'expo';

const ZharphWallpaper = requireOptionalNativeModule('ZharphWallpaper');

export async function applyWallpaper(imageUri, clock, foregroundCutout = null) {
  if (!ZharphWallpaper) {
    throw new Error('Zharph wallpaper native module is unavailable. Install a Zharph Android build first.');
  }

  return ZharphWallpaper.applyWallpaper(
    imageUri,
    typeof foregroundCutout === 'string' ? foregroundCutout : null,
    Number(clock?.nx ?? 0.18),
    Number(clock?.ny ?? 0.07),
  );
}

export default ZharphWallpaper;
