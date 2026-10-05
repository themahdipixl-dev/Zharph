import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TOOLS = [
  ['layers-outline', 'Depth'],
  ['blur', 'Blur'],
  ['crop', 'Crop'],
  ['tune-variant', 'Adjust'],
];

export default function EditorScreen({ imageUri, onBack, theme }) {
  const [activeTool, setActiveTool] = useState('Depth');
  const [depthState, setDepthState] = useState('idle');
  const [clockLayer, setClockLayer] = useState('top');
  const clockPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const depthProgress = useRef(new Animated.Value(0)).current;

  const runStandardDepth = () => {
    if (depthState === 'analyzing') return;

    setActiveTool('Depth');
    setDepthState('analyzing');
    setClockLayer('top');
    clockPosition.setValue({ x: 0, y: 0 });
    depthProgress.setValue(0);

    setTimeout(() => {
      setDepthState('ready');
      Animated.spring(depthProgress, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 5,
      }).start();
    }, 900);
  };

  const depthScale = depthProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  const clockPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => depthState === 'ready',
      onPanResponderGrant: () => clockPosition.extractOffset(),
      onPanResponderMove: (_, gesture) => {
        clockPosition.setValue({ x: gesture.dx, y: gesture.dy });
        setClockLayer(gesture.dy > 70 ? 'behind' : 'top');
      },
      onPanResponderRelease: () => clockPosition.flattenOffset(),
    }),
  ).current;

  const depthShift = depthProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

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
            source={{ uri: imageUri }}
            style={[
              styles.previewImage,
              {
                transform: [
                  { translateX: depthShift },
                  { scale: depthScale },
                ],
              },
            ]}
          />

          {depthState === 'ready' && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.depthGlow,
                {
                  borderColor: theme.primary,
                  opacity: depthProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.28],
                  }),
                },
              ]}
            />
          )}

          {depthState === 'ready' && (
            <View
              pointerEvents="none"
              style={[styles.depthLayer, { backgroundColor: theme.background }]}
            />
          )}

          <Animated.View
            {...clockPan.panHandlers}
            style={[
              styles.lockScreen,
              {
                transform: clockPosition.getTranslateTransform(),
                zIndex: clockLayer === 'behind' ? 1 : 4,
              },
            ]}
          >
            <Text style={styles.clock}>09:41</Text>
            <Text style={styles.date}>Monday, October 5</Text>
          </Animated.View>

          {depthState === 'analyzing' && (
            <View style={[styles.analyzing, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="layers-search-outline" size={20} color={theme.primary} />
              <Text style={[styles.analyzingText, { color: theme.onSurface }]}>
                Analyzing depth...
              </Text>
            </View>
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
                onPress={label === 'Depth' ? runStandardDepth : () => setActiveTool(label)}
                style={styles.tool}
              >
                <View style={[styles.toolIcon, { backgroundColor: selected ? theme.primary : theme.surface }]}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={23}
                    color={selected ? theme.onPrimary : theme.onSurfaceVariant}
                  />
                </View>
                <Text style={[styles.toolLabel, { color: selected ? theme.primary : theme.onSurfaceVariant }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {depthState === 'ready' && (
          <Text style={[styles.depthHint, { color: theme.onSurfaceVariant }]}>
            Drag the clock through the highlighted foreground area.
          </Text>
        )}

        {depthState === 'ready' && (
          <Text style={[styles.depthNote, { color: theme.onSurfaceVariant }]}>
            Standard depth approximation
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 28,
  },
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
  previewImage: {
    width: '100%',
    height: '100%',
  },
  depthLayer: {
    position: 'absolute',
    left: '32%',
    top: 0,
    height: '38%',
    right: 0,
    opacity: 0.34,
    zIndex: 2,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  depthGlow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderWidth: 2,
    borderRadius: 28,
  },
  lockScreen: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  clock: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '300',
    letterSpacing: -2,
  },
  date: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
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
  analyzingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toolsArea: {
    paddingTop: 12,
    paddingBottom: 22,
  },
  heading: {
    paddingHorizontal: 20,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  tools: {
    paddingHorizontal: 18,
    gap: 14,
  },
  tool: {
    width: 68,
    alignItems: 'center',
  },
  toolIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  depthHint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 10,
    paddingHorizontal: 18,
  },
  depthNote: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 10,
  },
});
