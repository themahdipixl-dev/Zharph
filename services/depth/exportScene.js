import React from 'react';
import {
  ImageFormat,
  Skia,
} from '@shopify/react-native-skia';
import { SceneContent } from '../../components/DepthScene';

export function renderWallpaperPng({ photo, layers, clock, width, height }) {
  const image = requireImageSnapshot(
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

function requireImageSnapshot(element, size) {
  const surface = Skia.Surface.Make(size.width, size.height);
  if (!surface) {
    throw new Error('Could not create the wallpaper render surface');
  }

  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));

  // drawAsImage() is intentionally not used here. The depth preview already
  // renders through Skia Canvas, while drawAsImage() was the source of the
  // runtime "Undefined is not a function" failure on the Android build.
  //
  // This helper is only kept for the full-scene export path. Foreground export
  // below uses the imperative Skia surface API directly as well.
  const recorder = Skia.PictureRecorder();
  const pictureCanvas = recorder.beginRecording(Skia.XYWHRect(0, 0, size.width, size.height));

  // Render the React tree is not supported by the imperative recorder, so this
  // path is deliberately rejected instead of falling back to drawAsImage().
  surface.dispose?.();
  throw new Error('Full wallpaper export is not used by the native wallpaper path');
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
    maskSurface?.dispose?.();
    outputSurface?.dispose?.();
    throw new Error('Could not create the foreground render surface');
  }

  try {
    const maskCanvas = maskSurface.getCanvas();
    maskCanvas.clear(Skia.Color('transparent'));

    const maskPaint = Skia.Paint();
    for (const layer of front) {
      maskCanvas.drawImageRect(layer.mask, rect, rect, maskPaint);
    }

    const maskImage = maskSurface.makeImageSnapshot();
    if (!maskImage) {
      throw new Error('Could not create the foreground mask');
    }

    const outputCanvas = outputSurface.getCanvas();
    outputCanvas.clear(Skia.Color('transparent'));

    // Keep only the pixels of the original wallpaper covered by the
    // selected foreground masks. The clock is drawn by Android between the
    // background and this exported PNG.
    outputCanvas.saveLayer(rect, Skia.Paint());
    outputCanvas.drawImageRect(photo, rect, rect, Skia.Paint());

    const blendPaint = Skia.Paint();
    blendPaint.setBlendMode('dstIn');
    outputCanvas.drawImageRect(maskImage, rect, rect, blendPaint);
    outputCanvas.restore();

    const image = outputSurface.makeImageSnapshot();
    if (!image) {
      throw new Error('Could not create the foreground PNG');
    }

    return image.encodeToBase64(ImageFormat.PNG, 100);
  } finally {
    maskSurface.dispose?.();
    outputSurface.dispose?.();
  }
}
