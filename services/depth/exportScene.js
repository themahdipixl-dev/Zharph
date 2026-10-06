import { ImageFormat } from '@shopify/react-native-skia';

export function encodeForegroundMasks({ layers }) {
  return (layers || [])
    .filter((layer) => layer.above && layer.mask)
    .map((layer) => {
      const base64 = layer.mask.encodeToBase64(ImageFormat.PNG, 100);
      if (!base64) throw new Error('Could not encode a foreground layer');
      return base64;
    });
}
