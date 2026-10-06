import * as ImageManipulator from 'expo-image-manipulator';
import { Skia } from '@shopify/react-native-skia';

export const DISPLAY_LONG_SIDE = 2048;
export const ANALYSIS_LONG_SIDE = 640;

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });
}

async function resolveSource(uri) {
  if (!/^https?:\/\//i.test(uri)) return uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not download the image');
  return blobToDataUri(await response.blob());
}

async function render(source, actions = []) {
  return ImageManipulator.manipulateAsync(source, actions, {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.92,
  });
}

export async function prepareImage(uri) {
  const source = await resolveSource(uri);

  const full = await render(source);
  const longSide = Math.max(full.width, full.height);

  let display = full;
  if (longSide > DISPLAY_LONG_SIDE) {
    const k = DISPLAY_LONG_SIDE / longSide;
    display = await render(full.uri, [
      { resize: { width: Math.round(full.width * k) } },
    ]);
  }

  const k2 = Math.min(1, ANALYSIS_LONG_SIDE / Math.max(display.width, display.height));
  const small = await render(display.uri, [
    { resize: { width: Math.max(64, Math.round(display.width * k2)) } },
  ]);

  const smallFile = await ImageManipulator.manipulateAsync(
    small.uri,
    [],
    {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.9,
      base64: true,
    },
  );

  const data = await Skia.Data.fromURI(display.uri);
  const photo = Skia.Image.MakeImageFromEncoded(data);
  if (!photo) throw new Error('Could not decode the image');

  return {
    photo,
    job: {
      base64: smallFile.base64,
      width: smallFile.width,
      height: smallFile.height,
    },
  };
}
