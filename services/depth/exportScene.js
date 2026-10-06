import { ImageFormat, Skia } from '@shopify/react-native-skia';

export function renderForegroundPng({ photo, layers }) {
  const front = (layers || []).filter((layer) => layer.above && layer.mask);
  if (!front.length) return null;

  const width = photo.width();
  const height = photo.height();
  const rect = Skia.XYWHRect(0, 0, width, height);

  const maskSurface = Skia.Surface.Make(width, height);
  const outputSurface = Skia.Surface.Make(width, height);

  if (!maskSurface || !outputSurface) {
    maskSurface?.dispose?.();
    outputSurface?.dispose?.();
    throw new Error('Could not create the foreground render surface');
  }

  try {
    const maskCanvas = maskSurface.getCanvas();
    maskCanvas.clear(Skia.Color('transparent'));

    const maskPaint = Skia.Paint();
    for (const layer of front) {
      if (!layer.mask) continue;
      maskCanvas.drawImageRect(layer.mask, rect, rect, maskPaint);
    }

    const maskImage = maskSurface.makeImageSnapshot();
    if (!maskImage) {
      throw new Error('Could not create the foreground mask');
    }

    const outputCanvas = outputSurface.getCanvas();
    outputCanvas.clear(Skia.Color('transparent'));

    outputCanvas.saveLayer(rect, Skia.Paint());
    outputCanvas.drawImageRect(photo, rect, rect, Skia.Paint());

    const blendPaint = Skia.Paint();
    blendPaint.setBlendMode('dstIn');
    outputCanvas.drawImageRect(maskImage, rect, rect, blendPaint);
    outputCanvas.restore();

    const image = outputSurface.makeImageSnapshot();
    if (!image) {
      throw new Error('Could not create the foreground image');
    }

    return image.encodeToBase64(ImageFormat.PNG, 100);
  } finally {
    maskSurface.dispose?.();
    outputSurface.dispose?.();
  }
}
