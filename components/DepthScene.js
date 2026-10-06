import React, { useMemo } from 'react';
import ClockWidget from './ClockWidget';
import {
  Canvas,
  FilterMode,
  Group,
  Image as SkImage,
  Mask,
  MipmapMode,
  Rect,
} from '@shopify/react-native-skia';

export const CLOCK_BOX_W = 0.64;
export const CLOCK_BOX_H = 0.3;
export const DEFAULT_CLOCK = { nx: (1 - CLOCK_BOX_W) / 2, ny: 0.07 };

const SAMPLING = FilterMode && MipmapMode
  ? { filter: FilterMode.Linear, mipmap: MipmapMode.Linear }
  : undefined;

export function coverRect(boxW, boxH, imgW, imgH) {
  const s = Math.max(boxW / imgW, boxH / imgH);
  const width = imgW * s;
  const height = imgH * s;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

export function clockBox(width, height, clock) {
  return {
    x: clock.nx * width,
    y: clock.ny * height,
    w: CLOCK_BOX_W * width,
    h: CLOCK_BOX_H * width,
  };
}

export function clampClock(clock, width, height) {
  const maxNx = 1 - CLOCK_BOX_W;
  const maxNy = Math.max(0, 1 - (CLOCK_BOX_H * width) / height);
  return {
    nx: Math.min(Math.max(clock.nx, 0), maxNx),
    ny: Math.min(Math.max(clock.ny, 0), maxNy),
  };
}

export function SceneContent({ width, height, photo, layers, clock, selectedId, showHighlight, live = true }) {
  const rect = useMemo(
    () => coverRect(width, height, photo.width(), photo.height()),
    [width, height, photo],
  );
  const box = clockBox(width, height, clock);
  const front = layers.filter((layer) => layer.above);
  const selected = showHighlight ? layers.find((layer) => layer.id === selectedId) : null;

  const image = (key, img) => (
    <SkImage
      key={key}
      image={img}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fit="fill"
      sampling={SAMPLING}
    />
  );

  return (
    <Group>
      {image('photo', photo)}
      <ClockWidget
        box={box}
        timeSize={width * 0.22}
        dateSize={width * 0.05}
        live={live}
      />
      {front.length > 0 && (
        <Mask
          mode="alpha"
          mask={<Group>{front.map((layer) => image('m' + layer.id, layer.mask))}</Group>}
        >
          {image('front', photo)}
        </Mask>
      )}
      {selected && (
        <Mask mode="alpha" mask={image('sel', selected.mask)}>
          <Rect x={0} y={0} width={width} height={height} color={selected.color} opacity={0.42} />
        </Mask>
      )}
    </Group>
  );
}

export default function DepthScene({ width, height, ...rest }) {
  if (!rest.photo || !width || !height) return null;
  return (
    <Canvas style={{ width, height }}>
      <SceneContent width={width} height={height} {...rest} />
    </Canvas>
  );
}
