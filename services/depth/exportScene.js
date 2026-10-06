import React from 'react';
import {
  BlendMode,
  ImageFormat,
  Skia,
  drawAsImage,
} from '@shopify/react-native-skia';
import { SceneContent } from '../../components/DepthScene';

export function renderWallpaperPng({ photo, layers, clock, width, height }) {
  const image = drawAsImage(
    <SceneContent
      width={width}
      height={height}
      photo={photo}
      layers={layers}
      clock={clock}
      showHighlight={false}
      live={false}
    />,
    { width, height },
  );
  return image.encodeToBase64(ImageFormat.PNG, 100);
}

export function renderForegroundPng({ photo, layers }) {
  const front = (layers || []).filter((layer) => layer.above && layer.mask);
  if (!front.length) return null;

  const width = photo.width();
  const height = photo.height();
  const rect = Skia.XYWHRect(0, 0, width, height);

  const maskSurface = Skia.Surface.Make(width, height);
  const outputSurface = Skia.Surface.Make(width, height);

  if (!maskSurface || !outputSurface) {
    throw new Error('Could not create the foreground render surface');
  }

  const maskCanvas = maskSurface.getCanvas();
  maskCanvas.clear(Skia.Color('transparent'));

  const maskPaint = Skia.Paint();
  for (const layer of front) {
    maskCanvas.drawImageRect(layer.mask, rect, rect, maskPaint);
  }

  const outputCanvas = outputSurface.getCanvas();
  outputCanvas.clear(Skia.Color('transparent'));

  outputCanvas.saveLayer(rect, Skia.Paint());
  outputCanvas.drawImageRect(photo, rect, rect, Skia.Paint());

  const blendPaint = Skia.Paint();
  blendPaint.setBlendMode(BlendMode.DstIn);
  const maskImage = maskSurface.makeImageSnapshot();
  outputCanvas.drawImageRect(maskImage, rect, rect, blendPaint);
  outputCanvas.restore();

  const image = outputSurface.makeImageSnapshot();
  const base64 = image.encodeToBase64(ImageFormat.PNG, 100);

  maskSurface.dispose?.();
  outputSurface.dispose?.();

  return base64;
}
