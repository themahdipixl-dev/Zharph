import React, { useEffect, useMemo, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DepthEngine from '../components/DepthEngine';
import DepthScene, { DEFAULT_CLOCK, clampClock, clockBox } from '../components/DepthScene';
import { prepareImage } from '../services/depth/prepareImage';
import { buildLayerList, describeProgress } from '../services/depth/layers';
import { applyWallpaper } from '../modules/zharph-wallpaper';

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['crop', 'Crop'],
  ['tune-vertical', 'Adjust'],
  ['palette-outline', 'Color'],
];

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');
  const [depthState, setDepthState] = useState('idle');
  const [depthMode, setDepthMode] = useState(false);
  const [depthError, setDepthError] = useState(false);
  const [depthErrorMessage, setDepthErrorMessage] = useState('');
  const [progressText, setProgressText] = useState('');
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [job, setJob] = useState(null);
  const [scene, setScene] = useState(null);
  const [prepError, setPrepError] = useState('');
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });
  const [clock, setClock] = useState(DEFAULT_CLOCK);
  const [dragging, setDragging] = useState(false);

  const preparedRef = useRef(null);
  const depthRunId = useRef(0);
  const clockRef = useRef(DEFAULT_CLOCK);
  const clockStart = useRef(DEFAULT_CLOCK);
  const sizeRef = useRef(null);
  const frameRef = useRef(0);

  const previewSize = useMemo(() => {
    const availW = areaSize.width - 48;
    const availH = areaSize.height - 8;
    if (availW <= 0 || availH <= 0) return null;
    let w = Math.min(360, availW);
    let h = (w * 16) / 9;
    if (h > availH) {
      h = availH;
      w = (h * 9) / 16;
    }
    return { width: Math.floor(w), height: Math.floor(h) };
  }, [areaSize]);
  sizeRef.current = previewSize;

  useEffect(() => {
    let alive = true;
    setScene(null);
    setPrepError('');
    const promise = prepareImage(imageUri);
    preparedRef.current = promise;
    promise
      .then((result) => {
        if (alive) setScene(result);
      })
      .catch((error) => {
        if (alive) setPrepError((error && error.message) || 'Could not open the image');
      });
    return () => {
      alive = false;
    };
  }, [imageUri]);

  useEffect(() => () => frameRef.current && cancelAnimationFrame(frameRef.current), []);

  const resetDepthState = () => {
    setJob(null);
    setLayers([]);
    setSelectedLayer(null);
    setDepthError(false);
    setDepthErrorMessage('');
  };

  const failDepth = (message) => {
    setJob(null);
    setDepthState('idle');
    setDepthError(true);
    setDepthErrorMessage(message || 'Layer analysis failed');
  };

  const runDepth = async () => {
    if (depthState === 'analyzing') return;
    const runId = depthRunId.current + 1;
    depthRunId.current = runId;
    setActiveTool('Depth');
    setDepthMode(true);
    resetDepthState();
    setDepthState('analyzing');
    setProgressText('Preparing image...');
    try {
      const prepared = await preparedRef.current;
      if (runId !== depthRunId.current) return;
      setProgressText('Loading AI runtime...');
      setJob(prepared.job);
    } catch (error) {
      if (runId !== depthRunId.current) return;
      failDepth((error && error.message) || 'Could not prepare the image');
    }
  };

  const handleEngineResult = (result) => {
    setJob(null);
    try {
      const detected = buildLayerList(result);
      if (!detected.length) {
        failDepth('No distinct layers found in this image');
        return;
      }
      if (result.timings) {
        console.log('[Depth] timings (ms):', JSON.stringify(result.timings), 'depth used:', result.depthUsed);
      }
      setLayers(detected);
      setSelectedLayer(detected[0].id);
      setDepthState('ready');
    } catch (error) {
      failDepth((error && error.message) || 'Could not read the detected layers');
    }
  };

  const cancelDepth = () => {
    depthRunId.current += 1;
    setDepthMode(false);
    setDepthState('idle');
    resetDepthState();
    applyClock(DEFAULT_CLOCK);
  };

  const confirmDepth = () => {
    depthRunId.current += 1;
    setDepthMode(false);
    setDepthState('idle');
    setDepthError(false);
    setDepthErrorMessage('');
  };

  const setLayerAbove = (id, above) => {
    setLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, above } : layer)));
  };

  function applyClock(next) {
    clockRef.current = next;
    setClock(next);
  }

  const handleApplyWallpaper = async () => {
    try {
      await applyWallpaper(imageUri, clockRef.current);
      Alert.alert(
        'Zharph',
        'Wallpaper ready. Android will open the system wallpaper confirmation screen.',
      );
    } catch (error) {
      Alert.alert(
        'Could not apply wallpaper',
        (error && error.message) || 'Please install a Zharph Android build and try again.',
      );
    }
  };

  const clockPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        const size = sizeRef.current;
        if (!size) return false;
        const box = clockBox(size.width, size.height, clockRef.current);
        const { locationX: x, locationY: y } = event.nativeEvent;
        const slop = 14;
        return x >= box.x - slop && x <= box.x + box.w + slop && y >= box.y - slop && y <= box.y + box.h + slop;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        clockStart.current = { ...clockRef.current };
        setDragging(true);
      },
      onPanResponderMove: (_, gesture) => {
        const size = sizeRef.current;
        if (!size) return;
        const next = clampClock(
          {
            nx: clockStart.current.nx + gesture.dx / size.width,
            ny: clockStart.current.ny + gesture.dy / size.height,
          },
          size.width,
          size.height,
        );
        clockRef.current = next;
        if (!frameRef.current) {
          frameRef.current = requestAnimationFrame(() => {
            frameRef.current = 0;
            setClock(clockRef.current);
          });
        }
      },
      onPanResponderRelease: () => {
        setClock(clockRef.current);
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        setClock(clockRef.current);
        setDragging(false);
      },
    }),
  ).current;

  const selected = layers.find((layer) => layer.id === selectedLayer) || null;
  const showGuide = depthMode || dragging;
  const guide = previewSize ? clockBox(previewSize.width, previewSize.height, clock) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.primaryContainer }]}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.button}>
          <MaterialCommunityIcons name="arrow-left" size={25} color={theme.onSurface} />
        </Pressable>
        <Text style={[styles.title, { color: theme.onSurface }]}>Edit wallpaper</Text>
        <Pressable onPress={handleApplyWallpaper} style={styles.button}>
          <MaterialCommunityIcons name="check" size={25} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.previewArea} onLayout={(event) => setAreaSize(event.nativeEvent.layout)}>
        {previewSize && (
          <View style={[styles.preview, { width: previewSize.width, height: previewSize.height, backgroundColor: theme.surface }]}>
            {scene ? (
              <DepthScene
                width={previewSize.width}
                height={previewSize.height}
                photo={scene.photo}
                layers={layers}
                clock={clock}
                selectedId={selectedLayer}
                showHighlight={depthMode && depthState === 'ready'}
              />
            ) : (
              <View style={styles.centered}>
                {prepError ? (
                  <Text style={[styles.analyzingText, { color: theme.onSurface }]}>{prepError}</Text>
                ) : (
                  <ActivityIndicator color={theme.primary} />
                )}
              </View>
            )}

            <View {...clockPan.panHandlers} style={StyleSheet.absoluteFill} />

            {showGuide && guide && (
              <View
                pointerEvents="none"
                style={[
                  styles.clockGuide,
                  { left: guide.x, top: guide.y, width: guide.w, height: guide.h, borderColor: theme.primary },
                ]}
              >
                <MaterialCommunityIcons name="drag" size={18} color={theme.primary} style={styles.dragIcon} />
              </View>
            )}

            {depthState === 'analyzing' && (
              <View style={[styles.analyzing, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="layers-search-outline" size={20} color={theme.primary} />
                <Text style={[styles.analyzingText, { color: theme.onSurface }]}>{progressText}</Text>
              </View>
            )}

            {depthError && (
              <Pressable onPress={runDepth} style={[styles.errorBadge, { backgroundColor: theme.surface }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.primary} />
                <Text numberOfLines={2} style={[styles.analyzingText, { color: theme.onSurface, flexShrink: 1 }]}>
                  Depth failed · Retry{depthErrorMessage ? ` · ${depthErrorMessage}` : ''}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {depthMode ? (
        <View style={styles.depthControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layers}>
            {depthState === 'analyzing' && (
              <Text style={[styles.hint, { color: theme.onSurfaceVariant }]}>Looking for layers...</Text>
            )}
            {layers.map((layer) => {
              const isSelected = selectedLayer === layer.id;
              const above = layer.above;
              return (
                <Pressable
                  key={layer.id}
                  onPress={() => setSelectedLayer(layer.id)}
                  style={[
                    styles.layerChip,
                    {
                      backgroundColor: isSelected ? theme.primaryContainer : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.outline,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.chipTop}>
                    <View style={[styles.dot, { backgroundColor: layer.color }]} />
                    <Text numberOfLines={1} style={[styles.layerLabel, { color: isSelected ? theme.primary : theme.onSurface }]}>
                      {layer.label}
                    </Text>
                  </View>
                  <Text style={[styles.layerState, { color: above ? theme.primary : theme.onSurfaceVariant }]}>
                    {above ? 'In front of clock' : 'Behind clock'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {depthState === 'ready' && selected && (
            <View style={styles.segment}>
              {[
                [false, 'Behind clock', 'layers-outline'],
                [true, 'In front of clock', 'layers-triple'],
              ].map(([value, label, icon]) => {
                const active = selected.above === value;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setLayerAbove(selected.id, value)}
                    style={[
                      styles.segmentButton,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                        borderColor: active ? theme.primary : theme.outline,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name={icon} size={18} color={active ? theme.onPrimary : theme.onSurfaceVariant} />
                    <Text style={[styles.segmentText, { color: active ? theme.onPrimary : theme.onSurfaceVariant }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.depthActions}>
            <Pressable onPress={cancelDepth} style={[styles.depthAction, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="close" size={22} color={theme.onSurfaceVariant} />
              <Text style={[styles.depthActionText, { color: theme.onSurfaceVariant }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmDepth}
              disabled={depthState !== 'ready'}
              style={[styles.depthAction, { backgroundColor: theme.primary, opacity: depthState === 'ready' ? 1 : 0.45 }]}
            >
              <MaterialCommunityIcons name="check" size={22} color={theme.onPrimary} />
              <Text style={[styles.depthActionText, { color: theme.onPrimary }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.toolsArea}>
          <Text style={[styles.heading, { color: theme.onSurface }]}>Customize</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
            {TOOLS.map(([icon, label]) => {
              const isActive = activeTool === label;
              return (
                <Pressable key={label} onPress={label === 'Depth' ? runDepth : () => setActiveTool(label)} style={styles.tool}>
                  <View style={[styles.toolIcon, { backgroundColor: isActive ? theme.primary : theme.surface }]}>
                    <MaterialCommunityIcons name={icon} size={23} color={isActive ? theme.onPrimary : theme.onSurfaceVariant} />
                  </View>
                  <Text style={[styles.toolLabel, { color: isActive ? theme.primary : theme.onSurfaceVariant }]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {job && (
        <DepthEngine
          job={job}
          onProgress={(p) => setProgressText(describeProgress(p))}
          onResult={handleEngineResult}
          onError={failDepth}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 28 },
  header: { height: 66, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700' },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  preview: { borderRadius: 34, overflow: 'hidden', elevation: 10, shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
  clockGuide: { position: 'absolute', borderRadius: 20, borderWidth: 1.5, opacity: 0.6 },
  dragIcon: { position: 'absolute', right: 8, top: 6 },
  centered: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  analyzing: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 5 },
  errorBadge: { position: 'absolute', left: 18, right: 18, bottom: 18, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 5 },
  analyzingText: { fontSize: 13, fontWeight: '600' },
  depthControls: { paddingTop: 8, paddingBottom: 18 },
  depthActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: 10 },
  depthAction: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  depthActionText: { fontSize: 13, fontWeight: '700' },
  heading: { paddingHorizontal: 20, fontSize: 17, fontWeight: '700', marginBottom: 5 },
  layers: { paddingHorizontal: 18, gap: 8 },
  layerChip: { minWidth: 118, height: 58, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  chipTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  layerLabel: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  layerState: { fontSize: 10, marginTop: 3 },
  hint: { fontSize: 12, fontWeight: '600', alignSelf: 'center' },
  segment: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginTop: 10 },
  segmentButton: { flex: 1, height: 42, borderRadius: 21, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentText: { fontSize: 12, fontWeight: '700' },
  toolsArea: { paddingTop: 8, paddingBottom: 34, marginBottom: 18 },
  tools: { paddingHorizontal: 18, gap: 14 },
  tool: { width: 68, alignItems: 'center' },
  toolIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
});