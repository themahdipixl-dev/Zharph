import React, { useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';

const DEPTH_API = 'https://depth-anything-depth-anything-v2.hf.space';
const SEGMENTATION_API = 'https://sriiram18-orbinest-ai.hf.space';


const MASK_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform shader mask;

half4 main(float2 xy) {
  half4 color = image.eval(xy);
  half4 maskColor = mask.eval(xy);
  return half4(color.rgb, color.a * maskColor.a);
}
`);

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

function getDepthPath(file) {
  const path = typeof file === 'string' ? file : file?.path;
  if (!path) throw new Error('Depth map was not returned');

  return path.startsWith('http')
    ? path
    : DEPTH_API + '/gradio_api/file=' + encodeURIComponent(path);
}

async function callDepth(imageUri, attempt = 0) {
  const form = new FormData();
  form.append('files', {
    uri: imageUri,
    name: 'zharph-depth.jpg',
    type: 'image/jpeg',
  });

  const uploadResponse = await fetch(DEPTH_API + '/gradio_api/upload', {
    method: 'POST',
    body: form,
  });

  if (!uploadResponse.ok) {
    if (attempt < 2) return callDepth(imageUri, attempt + 1);
    throw new Error('Depth upload failed (' + uploadResponse.status + ')');
  }

  const uploaded = await uploadResponse.json();
  const uploadedFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  const path = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile?.path;

  if (!path) {
    if (attempt < 2) return callDepth(imageUri, attempt + 1);
    throw new Error('Depth upload path missing');
  }

  const fileData = {
    path,
    meta: { _type: 'gradio.FileData' },
    orig_name: 'zharph-depth.jpg',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 150000);

  try {
    const queueResponse = await fetch(DEPTH_API + '/gradio_api/call/on_submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [fileData] }),
      signal: controller.signal,
    });

    if (!queueResponse.ok) {
      let message = 'Depth request failed (' + queueResponse.status + ')';
      try {
        const errorBody = await queueResponse.json();
        message = errorBody?.detail || errorBody?.error || message;
      } catch (parseError) {
        // Keep the HTTP error message when the server response is not JSON.
      }
      throw new Error(String(message));
    }

    const queueResult = await queueResponse.json();
    const eventId = queueResult?.event_id;

    if (!eventId) {
      throw new Error('Depth queue did not return an event ID');
    }

    const resultResponse = await fetch(
      DEPTH_API + '/gradio_api/call/on_submit/' + encodeURIComponent(eventId),
      { method: 'GET', signal: controller.signal },
    );

    if (!resultResponse.ok) {
      throw new Error('Depth result failed (' + resultResponse.status + ')');
    }

    const streamText = await resultResponse.text();
    const dataLine = streamText
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean)
      .pop();

    if (!dataLine) {
      throw new Error('Depth queue returned no result');
    }

    const result = JSON.parse(dataLine);
    if (result?.error) {
      throw new Error(String(result.error));
    }

    const data = result?.data ?? result;

    if (Array.isArray(data) && data.length > 1) {
      return getDepthPath(data[1]);
    }

    if (Array.isArray(data) && data.length === 1) {
      return getDepthPath(data[0]);
    }

    if (data?.path || typeof data === 'string') {
      return getDepthPath(data);
    }

    throw new Error('Depth response did not contain a depth map');
  } catch (error) {
    if (attempt < 2) return callDepth(imageUri, attempt + 1);
    if (error?.name === 'AbortError') {
      throw new Error('Depth request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


async function imageUriToBase64(imageUri) {
  const response = await fetch(imageUri);
  if (!response.ok) throw new Error('Could not read selected image');

  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };

    reader.onerror = () => reject(new Error('Could not encode selected image'));
    reader.readAsDataURL(blob);
  });
}

async function callSegmentation(imageUri, attempt = 0) {
  try {
    const imageBase64 = await imageUriToBase64(imageUri);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 150000);

    try {
      const queueResponse = await fetch(
        SEGMENTATION_API + '/gradio_api/call/sam2_detect',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              imageBase64,
              'all distinct visible objects in the image',
            ],
          }),
          signal: controller.signal,
        },
      );

      if (!queueResponse.ok) {
        throw new Error('Layer request failed (' + queueResponse.status + ')');
      }

      const queueResult = await queueResponse.json();
      const eventId = queueResult?.event_id;

      if (!eventId) {
        throw new Error('Layer queue did not return an event ID');
      }

      const resultResponse = await fetch(
        SEGMENTATION_API +
          '/gradio_api/call/sam2_detect/' +
          encodeURIComponent(eventId),
        { method: 'GET', signal: controller.signal },
      );

      if (!resultResponse.ok) {
        throw new Error('Layer result failed (' + resultResponse.status + ')');
      }

      const streamText = await resultResponse.text();
      const dataLine = streamText
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter(Boolean)
        .pop();

      if (!dataLine) {
        throw new Error('Layer queue returned no result');
      }

      const result = JSON.parse(dataLine);
      if (result?.error) {
        throw new Error(String(result.error));
      }

      const data = result?.data ?? result;
      const jsonText = Array.isArray(data) ? data[0] : data;
      const payload =
        typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

      if (!payload?.success) {
        throw new Error(payload?.error || 'Layer segmentation failed');
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (attempt < 2) return callSegmentation(imageUri, attempt + 1);

    if (error?.name === 'AbortError') {
      throw new Error('Layer request timed out');
    }

    throw error;
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;

  for (let i = 0; i < bytes.length; i += 1) {
    a = (a + bytes[i]) % 65521;
    b = (b + a) % 65521;
  }

  return (((b << 16) | a) >>> 0);
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 255;
  bytes[offset + 1] = (value >>> 16) & 255;
  bytes[offset + 2] = (value >>> 8) & 255;
  bytes[offset + 3] = value & 255;
}

function pngChunk(type, data) {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);
  const chunk = new Uint8Array(8 + data.length + 4);
  writeUint32(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);

  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);

  writeUint32(chunk, 8 + data.length, crc32(crcInput));
  return chunk;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function bytesToBase64(bytes) {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const value = (a << 16) | (b << 8) | c;

    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[value & 63] : '=';
  }

  return output;
}

function maskToPngDataUri(mask, width, height) {
  const raw = new Uint8Array(height * (width * 4 + 1));
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[rawOffset] = 0;
    rawOffset += 1;

    const row = mask[y] || [];
    for (let x = 0; x < width; x += 1) {
      const alpha = row[x] ? 255 : 0;
      raw[rawOffset++] = 255;
      raw[rawOffset++] = 255;
      raw[rawOffset++] = 255;
      raw[rawOffset++] = alpha;
    }
  }

  const zlibParts = [
    new Uint8Array([0x78, 0x01]),
  ];

  for (let offset = 0; offset < raw.length; offset += 65535) {
    const size = Math.min(65535, raw.length - offset);
    const block = new Uint8Array(5 + size);
    block[0] = offset + size >= raw.length ? 1 : 0;
    block[1] = size & 255;
    block[2] = (size >>> 8) & 255;
    const inverse = 65535 - size;
    block[3] = inverse & 255;
    block[4] = (inverse >>> 8) & 255;
    block.set(raw.subarray(offset, offset + size), 5);
    zlibParts.push(block);
  }

  const adler = new Uint8Array(4);
  writeUint32(adler, 0, adler32(raw));
  zlibParts.push(adler);

  const signature = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  const header = new Uint8Array(13);
  writeUint32(header, 0, width);
  writeUint32(header, 4, height);
  header[8] = 8;
  header[9] = 6;

  const png = concatBytes([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', concatBytes(zlibParts)),
    pngChunk('IEND', new Uint8Array(0)),
  ]);

  return 'data:image/png;base64,' + bytesToBase64(png);
}

function getLayerLabel(mask, index, width, height) {
  const [x, y, w, h] = mask.bbox || [0, 0, width, height];
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const horizontal =
    centerX < width * 0.34 ? 'Left' : centerX > width * 0.66 ? 'Right' : 'Center';
  const vertical =
    centerY < height * 0.34 ? 'Upper' : centerY > height * 0.66 ? 'Lower' : 'Middle';

  return index === 0
    ? `${vertical} ${horizontal} object`
    : `${vertical} ${horizontal} object ${index + 1}`;
}

function buildLayers(payload) {
  const [width, height] = payload.original_image_size || [];
  const masks = Array.isArray(payload.masks) ? payload.masks : [];

  if (!width || !height || !masks.length) {
    throw new Error('Layer response did not contain usable masks');
  }

  return masks
    .filter((mask) => typeof mask === 'string' && mask.length > 100)
    .slice(0, 8)
    .map((mask, index) => ({
      id: `ai-layer-${index + 1}`,
      label: `Object ${index + 1}`,
      above: false,
      maskUri: mask.startsWith('data:')
        ? mask
        : `data:image/png;base64,${mask}`,
      width,
      height,
    }));
}


function MaskedLayer({ layer, image, previewSize }) {
  const mask = useImage(layer.maskUri);

  if (!MASK_SHADER || !image || !mask || !previewSize.width || !previewSize.height) {
    return null;
  }

  return (
    <Fill>
      <Shader source={MASK_SHADER}>
        <ImageShader
          image={image}
          fit="fill"
          rect={{ x: 0, y: 0, width: previewSize.width, height: previewSize.height }}
        />
        <ImageShader
          image={mask}
          fit="fill"
          rect={{ x: 0, y: 0, width: previewSize.width, height: previewSize.height }}
        />
      </Shader>
    </Fill>
  );
}

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');
  const [depthState, setDepthState] = useState('idle');
  const [depthUri, setDepthUri] = useState(null);
  const [depthMode, setDepthMode] = useState(false);
  const [depthError, setDepthError] = useState(false);
  const [depthErrorMessage, setDepthErrorMessage] = useState('');
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [clockPosition, setClockPosition] = useState({ x: 0, y: 0 });
  const clockStart = useRef({ x: 0, y: 0 });
  const depthRunId = useRef(0);

  const image = useImage(imageUri);

  const runDepth = async () => {
    if (depthState === 'analyzing') return;

    setActiveTool('Depth');
    setDepthMode(true);
    setDepthState('analyzing');
    setDepthUri(null);
    setDepthError(false);
    setDepthErrorMessage('');
    setLayers([]);
    setSelectedLayer(null);
    setClockPosition({ x: 0, y: 0 });

    try {
      const runId = depthRunId.current;
      const depthResult = await callDepth(imageUri);

      if (runId !== depthRunId.current) return;

      const segmentationResult = await callSegmentation(imageUri);

      if (runId !== depthRunId.current) return;

      const detectedLayers = buildLayers(segmentationResult);

      if (!detectedLayers.length) {
        throw new Error('No usable layers were detected');
      }

      setLayers(detectedLayers);
      setDepthUri(depthResult);
      setDepthState('ready');
    } catch (error) {
      setDepthState('idle');
      setDepthError(true);
      setDepthErrorMessage(error?.message || 'Depth analysis failed');
    }
  };

  const cancelDepth = () => {
    depthRunId.current += 1;
    setDepthMode(false);
    setDepthState('idle');
    setDepthUri(null);
    setLayers([]);
    setSelectedLayer(null);
    setDepthError(false);
    setDepthErrorMessage('');
    setClockPosition({ x: 0, y: 0 });
  };

  const confirmDepth = () => {
    depthRunId.current += 1;
    setDepthMode(false);
    setDepthState('idle');
    setDepthError(false);
    setDepthErrorMessage('');
  };

  const toggleLayer = (id) => {
    setLayers((current) =>
      current.map((layer) =>
        layer.id === id ? { ...layer, above: !layer.above } : layer,
      ),
    );
    setSelectedLayer(id);
  };

  const clockPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        clockStart.current = clockPosition;
      },
      onPanResponderMove: (_, gesture) => {
        setClockPosition({
          x: clockStart.current.x + gesture.dx,
          y: clockStart.current.y + gesture.dy,
        });
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.primaryContainer }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.button}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={theme.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: theme.onSurface }]}>Edit wallpaper</Text>
        <Pressable style={styles.button}>
          <MaterialCommunityIcons name="check" size={25} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View
          style={[styles.preview, { backgroundColor: theme.surface }]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setPreviewSize({ width, height });
          }}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            {image ? (
              <Fill>
                <ImageShader
                  image={image}
                  fit="fill"
                  rect={{ x: 0, y: 0, width: previewSize.width, height: previewSize.height }}
                />
              </Fill>
            ) : null}
          </Canvas>

          <View
            {...clockPan.panHandlers}
            style={[
              styles.clockWidget,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary,
                opacity: depthState === 'ready' ? 0.96 : 0.82,
                transform: [
                  { translateX: clockPosition.x },
                  { translateY: clockPosition.y },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons
              name="drag-vertical"
              size={18}
              color={theme.primary}
              style={styles.dragIcon}
            />
            <Text style={styles.clock}>09:41</Text>
            <Text style={styles.date}>Monday, October 5</Text>
          </View>


          {depthState === 'ready' && layers.some((layer) => layer.above) && (
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              {layers
                .filter((layer) => layer.above)
                .map((layer) => (
                  <MaskedLayer
                    key={layer.id}
                    layer={layer}
                    image={image}
                    previewSize={previewSize}
                  />
                ))}
            </Canvas>
          )}

          {depthState === 'analyzing' && (
            <View style={[styles.analyzing, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons
                name="layers-search-outline"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.analyzingText, { color: theme.onSurface }]}>
                Analyzing depth...
              </Text>
            </View>
          )}

          {depthError && (
            <Pressable
              onPress={runDepth}
              style={[styles.errorBadge, { backgroundColor: theme.surface }]}
            >
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={theme.primary}
              />
              <Text style={[styles.analyzingText, { color: theme.onSurface }]}>
                Depth failed · Retry${depthErrorMessage ? ` · ${depthErrorMessage}` : ''}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {depthMode ? (
        <View style={styles.depthControls}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.layers}
          >
            {layers.map((layer) => {
              const above = layer.above;
              const selected = selectedLayer === layer.id;

              return (
                <Pressable
                  key={layer.id}
                  disabled={depthState !== 'ready'}
                  onPress={() => toggleLayer(layer.id)}
                  style={[
                    styles.layerChip,
                    {
                      backgroundColor: above ? theme.primaryContainer : theme.surface,
                      borderColor: selected ? theme.primary : theme.outline,
                      opacity: depthState === 'ready' ? 1 : 0.55,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={above ? 'layers-triple' : 'layers-outline'}
                    size={19}
                    color={above ? theme.primary : theme.onSurfaceVariant}
                  />
                  <Text style={[styles.layerLabel, { color: above ? theme.primary : theme.onSurfaceVariant }]}>
                    {layer.label}
                  </Text>
                  <Text style={[styles.layerState, { color: above ? theme.primary : theme.onSurfaceVariant }]}>
                    {depthState === 'ready' ? (above ? 'Above clock' : 'Below clock') : 'Analyzing'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.depthActions}>
            <Pressable onPress={cancelDepth} style={[styles.depthAction, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="close" size={22} color={theme.onSurfaceVariant} />
              <Text style={[styles.depthActionText, { color: theme.onSurfaceVariant }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={confirmDepth} disabled={depthState !== 'ready'} style={[styles.depthAction, { backgroundColor: theme.primary, opacity: depthState === 'ready' ? 1 : 0.45 }]}>
              <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
              <Text style={[styles.depthActionText, { color: theme.onPrimary }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.toolsArea}>
        <Text style={[styles.heading, { color: theme.onSurface }]}>Customize</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tools}
        >
          {TOOLS.map(([icon, label]) => {
            const selected = activeTool === label;

            return (
              <Pressable
                key={label}
                onPress={label === 'Depth' ? runDepth : () => setActiveTool(label)}
                style={styles.tool}
              >
                <View
                  style={[
                    styles.toolIcon,
                    { backgroundColor: selected ? theme.primary : theme.surface },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={23}
                    color={selected ? theme.onPrimary : theme.onSurfaceVariant}
                  />
                </View>
                <Text
                  style={[
                    styles.toolLabel,
                    { color: selected ? theme.primary : theme.onSurfaceVariant },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 28 },
  header: {
    height: 66,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '700' },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  preview: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 9 / 16,
    borderRadius: 34,
    overflow: 'hidden',
    elevation: 10,
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  clockWidget: {
    position: 'absolute',
    top: 42,
    left: '50%',
    width: 190,
    height: 112,
    marginLeft: -95,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  dragIcon: { position: 'absolute', right: 12, top: 10 },
  clock: { color: '#fff', fontSize: 52, fontWeight: '300', letterSpacing: -2 },
  date: { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 2 },
  analyzing: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
  },
  errorBadge: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 5,
  },
  analyzingText: { fontSize: 13, fontWeight: '600' },
  depthControls: {
    paddingTop: 8,
    paddingBottom: 18,
  },
  depthActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  depthAction: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  depthActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heading: {
    paddingHorizontal: 20,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  layers: { paddingHorizontal: 18, gap: 8 },
  layerChip: {
    minWidth: 106,
    height: 58,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  layerLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  layerState: { fontSize: 10, marginTop: 1 },
  toolsArea: { paddingTop: 8, paddingBottom: 34, marginBottom: 18 },
  tools: { paddingHorizontal: 18, gap: 14 },
  tool: { width: 68, alignItems: 'center' },
  toolIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
});
