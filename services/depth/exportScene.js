import React from 'react';
import { ImageFormat, drawAsImage } from '@shopify/react-native-skia';
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

  const image = drawAsImage(
    <SceneContent
      width={width}
      height={height}
      photo={photo}
      layers={front}
      clock={{ nx: 0, ny: 0 }}
      showHighlight={false}
      live={false}
    />,
    { width, height },
  );

  return image.encodeToBase64(ImageFormat.PNG, 100);
}
