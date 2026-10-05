import React, { useMemo, useRef, useState } from 'react';
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
  AlphaType,
  ColorType,
  useImage,
} from '@shopify/react-native-skia';

const DEPTH_API = 'https://depth-anything-depth-anything-v2.hf.space';
const SEGMENT_API = 'https://dense-captioning-medsam-inference.hf.space';
const MAX_AI_LAYERS = 8;

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

const DEPTH_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform shader depth;
uniform float minDepth;
uniform float maxDepth;

half4 main(float2 xy) {
  half4 color = image.eval(xy);
  half4 depthColor = depth.eval(xy);

  float d = depthColor.r;
  float edge = 0.035;
  float alpha = smoothstep(minDepth - edge, minDepth + edge, d)
             * (1.0 - smoothstep(maxDepth - edge, maxDepth + edge, d));

  return half4(color.rgb, color.a * alpha);
}
`);

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

function maskToImage(mask) {
  if (!mask?.length || !mask[0]?.length) return null;
  const height = mask.length;
  const width = mask[0].length;
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) pixels[y * width + x] = mask[y][x] ? 255 : 0;
  }
  return Skia.Image.MakeImage(
    { width, height, alphaType: AlphaType.Opaque, colorType: ColorType.Alpha_8 },
    Skia.Data.fromBytes(pixels),
    width,
  );
}

function LayerMask({ image, mask, width, height }) {
  const maskImage = useMemo(() => maskToImage(mask), [mask]);
  const effect = useMemo(() => Skia.RuntimeEffect.Make(`
uniform shader image;
uniform shader mask;
half4 main(float2 xy) {
  half4 color = image.eval(xy);
  float alpha = mask.eval(xy).a;
  return half4(color.rgb, color.a * alpha);
}
`), []);
  if (!image || !maskImage || !effect || !width || !height) return null;
  return (
    <Fill>
      <Shader source={effect} uniforms={{}}>
        <ImageShader image={image} fit="fill" rect={{ x: 0, y: 0, width, height }} />
        <ImageShader image={maskImage} fit="fill" rect={{ x: 0, y: 0, width, height }} />
      </Shader>
    </Fill>
  );
}

async function callSegmentation(imageUri, attempt = 0) {
  const form = new FormData();
  form.append('files', { uri: imageUri, name: 'zharph-layers.jpg', type: 'image/jpeg' });
  const uploadResponse = await fetch(SEGMENT_API + '/gradio_api/upload', { method: 'POST', body: form });
  if (!uploadResponse.ok) {
    if (attempt < 2) return callSegmentation(imageUri, attempt + 1);
    throw new Error('Layer upload failed (' + uploadResponse.status + ')');
  }
  const uploaded = await uploadResponse.json();
  const uploadedFile = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  const path = typeof uploadedFile === 'string' ? uploadedFile : uploadedFile?.path;
  if (!path) throw new Error('Layer upload path missing');

  const fileData = { path, meta: { _type: 'gradio.FileData' }, orig_name: 'zharph-layers.jpg' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const queueResponse = await fetch(SEGMENT_API + '/gradio_api/call/generate_auto_masks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          fileData,
          JSON.stringify({
            resize_longest: 384,
            max_masks: MAX_AI_LAYERS,
            pred_iou_thresh: 0.72,
            stability_score_thresh: 0.72,
          }),
        ],
      }),
      signal: controller.signal,
    });
    if (!queueResponse.ok) throw new Error('Layer request failed (' + queueResponse.status + ')');
    const queueResult = await queueResponse.json();
    const eventId = queueResult?.event_id;
    if (!eventId) throw new Error('Layer queue did not return an event ID');

    const resultResponse = await fetch(
      SEGMENT_API + '/gradio_api/call/generate_auto_masks/' + encodeURIComponent(eventId),
      { method: 'GET', signal: controller.signal },
    );
    if (!resultResponse.ok) throw new Error('Layer result failed (' + resultResponse.status + ')');

    const text = await resultResponse.text();
    const line = text.split(/\r?\n/).filter((v) => v.startsWith('data:')).map((v) => v.slice(5).trim()).filter(Boolean).pop();
    if (!line) throw new Error('Layer queue returned no result');

    const result = JSON.parse(line);
    if (result?.error) throw new Error(String(result.error));
    const data = result?.data ?? result;
    const payload = Array.isArray(data) ? data[0] : data;
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (!parsed?.success || !Array.isArray(parsed.masks)) throw new Error(parsed?.error || 'AI returned no usable layers');
    return parsed;
  } catch (error) {
    if (attempt < 2) return callSegmentation(imageUri, attempt + 1);
    if (error?.name === 'AbortError') throw new Error('AI layer analysis timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

  const image = useImage(imageUri);
  const depth = useImage(depthUri);

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
      const [depthResult, segmentationResult] = await Promise.all([
        callDepth(imageUri),
        callSegmentation(imageUri),
      ]);
      const sourceHeight = segmentationResult.image_size?.[0] || 1;
      const sourceWidth = segmentationResult.image_size?.[1] || 1;
      const masks = segmentationResult.masks
        .filter((item) => Array.isArray(item.segmentation))
        .filter((item) => (item.area || 0) / (sourceWidth * sourceHeight) >= 0.02)
        .slice(0, MAX_AI_LAYERS);
      if (!masks.length) throw new Error('AI could not find usable layers');
      setLayers(
        masks.map((item, index) => ({
          id: 'ai-' + index,
          label: 'Layer ' + (index + 1),
          mask: item.segmentation,
          score: item.predicted_iou || item.stability_score || 0,
          above: false,
        })),
      );
      setDepthUri(depthResult);
      setDepthState('ready');
    } catch (error) {
      setDepthState('idle');
      setDepthError(true);
      setDepthErrorMessage(error?.message || 'Depth analysis failed');
    }
  };

  const cancelDepth = () => {
    setDepthMode(false);
    setDepthState('idle');
    setDepthUri(null);
    setAboveLayers([]);
    setSelectedLayer(null);
    setDepthError(false);
    setDepthErrorMessage('');
    setClockPosition({ x: 0, y: 0 });
  };

  const confirmDepth = () => {
    setDepthMode(false);
    setDepthState('idle');
    setDepthError(false);
    setDepthErrorMessage('');
  };

  const toggleLayer = (id) => {
    setAboveLayers((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setSelectedLayer(id);
  };

  const clockPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => depthMode && depthState === 'ready',
      onMoveShouldSetPanResponder: () => depthMode && depthState === 'ready',
      onMoveShouldSetPanResponderCapture: () => depthMode && depthState === 'ready',
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

  const renderLayers = (above) =>
    LAYERS.filter((layer) => aboveLayers.includes(layer.id) === above).map(
      (layer) => (
        <DepthLayer
          key={layer.id}
          image={image}
          depth={depth}
          layer={layer}
          width={previewSize.width}
          height={previewSize.height}
        />
      ),
    );

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
            {image && depth && aboveLayers.length > 0 && renderLayers(true)}
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
            {LAYERS.map((layer) => {
              const above = aboveLayers.includes(layer.id);
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
                    {depthState === 'ready' ? (above ? 'Above' : 'Below') : 'Analyzing'}
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
