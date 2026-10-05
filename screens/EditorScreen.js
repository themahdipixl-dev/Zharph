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
import { analyzeLayers } from '../services/localDepth';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['crop', 'Crop'],
  ['tune-vertical', 'Adjust'],
  ['palette-outline', 'Color'],
];

const MASK_SHADER = Skia.RuntimeEffect.Make(`
  uniform shader image;
  uniform shader mask;

  half4 main(float2 p) {
    half4 source = image.eval(p);
    half4 maskColor = mask.eval(p);
    return half4(source.rgb, source.a * maskColor.a);
  }
`);

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
    setDepthError(false);
    setDepthErrorMessage('');
    setLayers([]);
    setSelectedLayer(null);
    setClockPosition({ x: 0, y: 0 });

    const runId = depthRunId.current + 1;
    depthRunId.current = runId;

    try {
      const detectedLayers = await analyzeLayers(imageUri);

      if (runId !== depthRunId.current) return;

      setLayers(detectedLayers);
      setDepthState('ready');
    } catch (error) {
      if (runId !== depthRunId.current) return;

      setDepthState('idle');
      setDepthError(true);
      setDepthErrorMessage(error?.message || 'Local AI layer analysis failed');
    }
  };

  const cancelDepth = () => {
    depthRunId.current += 1;
    setDepthMode(false);
    setDepthState('idle');
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
        clockStart.current = { ...clockPosition };
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
            <Canvas
              key={layers.filter((layer) => layer.above).map((layer) => layer.id).join('|')}
              style={[StyleSheet.absoluteFill, styles.foregroundCanvas]}
              pointerEvents="none"
            >
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
                Depth failed · Retry{depthErrorMessage ? ` · ${depthErrorMessage}` : ''}
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
    zIndex: 5,
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
  foregroundCanvas: {
    zIndex: 20,
    elevation: 20,
  },
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
