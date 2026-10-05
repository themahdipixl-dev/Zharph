import React, { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DEPTH_API = 'https://depth-anything-depth-anything-v2.hf.space';
const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

async function runAIDepth(imageUri) {
  const form = new FormData();
  form.append('files', { uri: imageUri, name: 'zharph-depth.jpg', type: 'image/jpeg' });

  const uploadResponse = await fetch(DEPTH_API + '/gradio_api/upload', {
    method: 'POST',
    body: form,
  });

  if (!uploadResponse.ok) throw new Error('Depth upload failed');

  const uploaded = await uploadResponse.json();
  const uploadedPath = Array.isArray(uploaded) ? uploaded[0] : uploaded;

  const callResponse = await fetch(DEPTH_API + '/gradio_api/call/on_submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [{ path: uploadedPath }] }),
  });

  if (!callResponse.ok) throw new Error('Depth request failed');

  const { event_id: eventId } = await callResponse.json();
  const resultResponse = await fetch(DEPTH_API + '/gradio_api/call/on_submit/' + eventId);

  if (!resultResponse.ok) throw new Error('Depth result failed');

  const streamText = await resultResponse.text();
  const completeMatch = streamText.match(/event: complete\s+data: (.+)/);

  if (!completeMatch) throw new Error('Depth result was incomplete');

  const result = JSON.parse(completeMatch[1]);
  const grayFile = result && result[1];
  const grayPath = typeof grayFile === 'string' ? grayFile : grayFile && grayFile.path;

  if (!grayPath) throw new Error('Depth map was not returned');

  return grayPath.startsWith('http')
    ? grayPath
    : DEPTH_API + '/gradio_api/file=' + encodeURIComponent(grayPath);
}

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');
  const [depthState, setDepthState] = useState('idle');
  const [depthImageUri, setDepthImageUri] = useState(null);
  const [depthError, setDepthError] = useState(false);
  const [clockLayer, setClockLayer] = useState('top');
  const clockPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const depthProgress = useRef(new Animated.Value(0)).current;
  const depthStateRef = useRef('idle');

  depthStateRef.current = depthState;

  const runDepth = async () => {
    if (depthState === 'analyzing') return;

    setActiveTool('Depth');
    setDepthState('analyzing');
    setDepthImageUri(null);
    setDepthError(false);
    setClockLayer('top');
    clockPosition.setValue({ x: 0, y: 0 });
    depthProgress.setValue(0);

    try {
      const resultUri = await runAIDepth(imageUri);
      setDepthImageUri(resultUri);
      setDepthState('ready');
      Animated.spring(depthProgress, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 5,
      }).start();
    } catch (error) {
      setDepthState('idle');
      setDepthError(true);
    }
  };

  const depthScale = depthProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const clockPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => depthStateRef.current === 'ready',
      onStartShouldSetPanResponderCapture: () => depthStateRef.current === 'ready',
      onMoveShouldSetPanResponder: () => depthStateRef.current === 'ready',
      onMoveShouldSetPanResponderCapture: () => depthStateRef.current === 'ready',
      onPanResponderGrant: () => clockPosition.extractOffset(),
      onPanResponderMove: (_, gesture) => {
        clockPosition.setValue({ x: gesture.dx, y: gesture.dy });
        setClockLayer(gesture.dy > 40 ? 'behind' : 'top');
      },
      onPanResponderRelease: () => clockPosition.flattenOffset(),
      onPanResponderTerminate: () => clockPosition.flattenOffset(),
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
        <View style={[styles.preview, { backgroundColor: theme.surface }]}>
          <Animated.Image
            pointerEvents="none"
            source={{ uri: imageUri }}
            style={[styles.previewImage, { transform: [{ scale: depthScale }] }]}
          />

          {depthImageUri && (
            <Animated.Image
              pointerEvents="none"
              source={{ uri: depthImageUri }}
              resizeMode="stretch"
              style={[
                styles.depthPreview,
                {
                  opacity: depthProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.52],
                  }),
                },
              ]}
            />
          )}

          <Animated.View
            collapsable={false}
            pointerEvents="box-only"
            {...clockPan.panHandlers}
            style={[
              styles.clockWidget,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary,
                opacity: depthState === 'ready' ? 0.96 : 0.82,
                transform: clockPosition.getTranslateTransform(),
                zIndex: clockLayer === 'behind' ? 1 : 5,
              },
            ]}
          >
            <MaterialCommunityIcons name="drag-vertical" size={18} color={theme.primary} style={styles.dragIcon} />
            <Text style={styles.clock}>09:41</Text>
            <Text style={styles.date}>Monday, October 5</Text>
          </Animated.View>

          {depthState === 'analyzing' && (
            <View style={[styles.analyzing, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="layers-search-outline" size={20} color={theme.primary} />
              <Text style={[styles.analyzingText, { color: theme.onSurface }]}>Analyzing depth...</Text>
            </View>
          )}

          {depthError && (
            <Pressable onPress={runDepth} style={[styles.errorBadge, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.analyzingText, { color: theme.onSurface }]}>Depth failed · Retry</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.toolsArea}>
        <Text style={[styles.heading, { color: theme.onSurface }]}>Customize</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          {TOOLS.map(([icon, label]) => {
            const selected = activeTool === label;
            return (
              <Pressable
                key={label}
                onPress={label === 'Depth' ? runDepth : () => setActiveTool(label)}
                style={styles.tool}
              >
                <View style={[styles.toolIcon, { backgroundColor: selected ? theme.primary : theme.surface }]}>
                  <MaterialCommunityIcons name={icon} size={23} color={selected ? theme.onPrimary : theme.onSurfaceVariant} />
                </View>
                <Text style={[styles.toolLabel, { color: selected ? theme.primary : theme.onSurfaceVariant }]}>{label}</Text>
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
  button: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700' },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
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
  previewImage: { width: '100%', height: '100%' },
  depthPreview: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
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
  toolsArea: { paddingTop: 12, paddingBottom: 34, marginBottom: 18 },
  heading: { paddingHorizontal: 20, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  tools: { paddingHorizontal: 18, gap: 14 },
  tool: { width: 68, alignItems: 'center' },
  toolIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '600', marginTop: 6 },
});