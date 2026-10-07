import {
  BlendMode,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
} from '@shopify/react-native-skia';

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

  const transparent = Skia.Color('transparent');

  const maskCanvas = maskSurface.getCanvas();
  maskCanvas.clear(transparent);

  const maskPaint = Skia.Paint();
  maskPaint.setAntiAlias(true);

  const destination = Skia.XYWHRect(0, 0, width, height);

  for (const layer of foreground) {
    const mask = layer.mask;
    const source = Skia.XYWHRect(0, 0, mask.width(), mask.height());

    maskCanvas.drawImageRectOptions(
      mask,
      source,
      destination,
      FilterMode.Linear,
      MipmapMode.None,
      maskPaint,
    );
  }

  const combinedMask = maskSurface.makeImageSnapshot();

  const outputCanvas = outputSurface.getCanvas();
  outputCanvas.clear(transparent);

  const sourcePaint = Skia.Paint();
  sourcePaint.setAntiAlias(true);
  outputCanvas.drawImage(photo, 0, 0, sourcePaint);

  const cutPaint = Skia.Paint();
  cutPaint.setAntiAlias(true);
  cutPaint.setBlendMode(BlendMode.DstIn);

  outputCanvas.drawImage(combinedMask, 0, 0, cutPaint);

  const result = outputSurface.makeImageSnapshot();
  const base64 = result.encodeToBase64(ImageFormat.PNG, 100);

  maskSurface.dispose();
  outputSurface.dispose();

  if (!base64) {
    throw new Error('Could not encode the foreground cutout');
  }

  return base64;
}

export function encodeForegroundMasks({ layers }) {
  return (layers || [])
    .filter((layer) => layer.above && layer.mask)
    .map((layer) => {
      const base64 = layer.mask.encodeToBase64(ImageFormat.PNG, 100);

      if (!base64) {
        throw new Error('Could not encode a foreground layer');
      }

      return base64;
    });
}
