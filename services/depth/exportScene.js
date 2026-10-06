import { BlendMode, ImageFormat, Paint, Skia } from '@shopify/react-native-skia';

export function encodeForegroundCutout({ photo, layers }) {
  const foreground = (layers || []).filter((layer) => layer.above && layer.mask);
  if (!foreground.length || !photo) return null;

  const width = photo.width();
  const height = photo.height();
  const maskSurface = Skia.Surface.MakeOffscreen(width, height);
  const outputSurface = Skia.Surface.MakeOffscreen(width, height);

  if (!maskSurface || !outputSurface) {
    throw new Error('Could not create foreground render surface');
  }

  const maskCanvas = maskSurface.getCanvas();
  maskCanvas.clear(0x00000000);

  const maskPaint = Paint();
  maskPaint.setAntiAlias(true);
  maskPaint.setFilterQuality(1);

  for (const layer of foreground) {
    maskCanvas.drawImage(layer.mask, 0, 0, maskPaint);
  }

  const combinedMask = maskSurface.makeImageSnapshot();

  const outputCanvas = outputSurface.getCanvas();
  outputCanvas.clear(0x00000000);

  const sourcePaint = Paint();
  sourcePaint.setAntiAlias(true);
  sourcePaint.setFilterQuality(1);
  outputCanvas.drawImage(photo, 0, 0, sourcePaint);

  const cutPaint = Paint();
  cutPaint.setAntiAlias(true);
  cutPaint.setFilterQuality(1);
  cutPaint.setBlendMode(BlendMode.DstIn);
  outputCanvas.drawImage(combinedMask, 0, 0, cutPaint);

  const result = outputSurface.makeImageSnapshot();
  const base64 = result.encodeToBase64(ImageFormat.PNG, 100);

  maskSurface.dispose();
  outputSurface.dispose();

  if (!base64) throw new Error('Could not encode the foreground cutout');
  return base64;
}

export function encodeForegroundMasks({ layers }) {
  return (layers || [])
    .filter((layer) => layer.above && layer.mask)
    .map((layer) => {
      const base64 = layer.mask.encodeToBase64(ImageFormat.PNG, 100);
      if (!base64) throw new Error('Could not encode a foreground layer');
      return base64;
    });
}
