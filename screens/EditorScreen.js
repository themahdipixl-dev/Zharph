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
  useImage,
} from '@shopify/react-native-skia';

const DEPTH_API = 'https://depth-anything-depth-anything-v2.hf.space';

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

const LAYERS = [
  { id: 'back', label: 'Back', min: 0.00, max: 0.25 },
  { id: 'middle', label: 'Middle', min: 0.25, max: 0.50 },
  { id: 'front', label: 'Front', min: 0.50, max: 0.75 },
  { id: 'closest', label: 'Closest', min: 0.75, max: 1.01 },
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
    const runResponse = await fetch(DEPTH_API + '/gradio_api/run/on_submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [fileData] }),
      signal: controller.signal,
    });

    if (!runResponse.ok) {
      let message = 'Depth request failed (' + runResponse.status + ')';
      try {
        const errorBody = await runResponse.json();
        message = errorBody?.detail || errorBody?.error || message;
      } catch {}
      throw new Error(String(message));
    }

    const result = await runResponse.json();
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

function DepthLayer({ image, depth, layer, width, height }) {
  const uniforms = useMemo(
    () => ({
      minDepth: layer.min,
      maxDepth: layer.max,
    }),
    [layer],
  );

  if (!image || !depth || !DEPTH_SHADER) return null;

  return (
    <Fill>
      <Shader source={DEPTH_SHADER} uniforms={uniforms}>
        <ImageShader
          image={image}
          fit="fill"
          rect={{ x: 0, y: 0, width, height }}
        />
        <ImageShader
          image={depth}
          fit="fill"
          rect={{ x: 0, y: 0, width, height }}
        />
      </Shader>
    </Fill>
  );
}

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');
  const [depthState, setDepthState] = useState('idle');
  const [depthUri, setDepthUri] = useState(null);
  const [depthError, setDepthError] = useState(false);
  const [depthErrorMessage, setDepthErrorMessage] = useState('');
  const [aboveLayers, setAboveLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const clockPosition = useRef({ x: 0, y: 0 }).current;

  const image = useImage(imageUri);
  const depth = useImage(depthUri);

  const runDepth = async () => {
    if (depthState === 'analyzing') return;

    setActiveTool('Depth');
    setDepthState('analyzing');
    setDepthUri(null);
    setDepthError(false);
    setDepthErrorMessage('');
    setAboveLayers([]);
    setSelectedLayer(null);
    clockPosition.x = 0;
    clockPosition.y = 0;

    try {
      const result = await callDepth(imageUri);
      setDepthUri(result);
      setDepthState('ready');
    } catch (error) {
      setDepthState('idle');
      setDepthError(true);
      setDepthErrorMessage(error?.message || 'Depth analysis failed');
    }
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
      onStartShouldSetPanResponder: () => depthState === 'ready',
      onStartShouldSetPanResponderCapture: () => depthState === 'ready',
      onMoveShouldSetPanResponder: () => depthState === 'ready',
      onMoveShouldSetPanResponderCapture: () => depthState === 'ready',
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        clockPosition.x = gesture.dx;
        clockPosition.y = gesture.dy;
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
            {image && depth ? (
              <>
                {renderLayers(false)}
                <Fill color="transparent" />
                {renderLayers(true)}
              </>
            ) : image ? (
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

      {depthState === 'ready' && (
        <View style={styles.layerPanel}>
          <Text style={[styles.heading, { color: theme.onSurface }]}>
            Clock depth
          </Text>
          <Text style={[styles.subheading, { color: theme.onSurfaceVariant }]}>
            Tap layers to put them above or below the clock
          </Text>
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
                  onPress={() => toggleLayer(layer.id)}
                  style={[
                    styles.layerChip,
                    {
                      backgroundColor: above ? theme.primaryContainer : theme.surface,
                      borderColor: selected ? theme.primary : theme.outline,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={above ? 'layers-triple' : 'layers-outline'}
                    size={19}
                    color={above ? theme.primary : theme.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.layerLabel,
                      { color: above ? theme.primary : theme.onSurfaceVariant },
                    ]}
                  >
                    {layer.label}
                  </Text>
                  <Text
                    style={[
                      styles.layerState,
                      { color: above ? theme.primary : theme.onSurfaceVariant },
                    ]}
                  >
                    {above ? 'Above' : 'Below'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
  layerPanel: { paddingTop: 4, paddingBottom: 10 },
  heading: {
    paddingHorizontal: 20,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },
  subheading: {
    paddingHorizontal: 20,
    fontSize: 12,
    marginBottom: 9,
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
