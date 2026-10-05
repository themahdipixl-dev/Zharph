import { Appearance, Platform, useColorScheme } from 'react-native';
import { Color } from 'expo-router';
import { useEffect } from 'react';

export function useAppTheme() {
  const scheme = useColorScheme();

  useEffect(() => {
    // Zharph uses dark mode as its default appearance.
    Appearance.setColorScheme('dark');
  }, []);

  const dark = true;

  if (Platform.OS === 'android') {
    return {
      dark,
      background: Color.android.dynamic.background,
      surface: Color.android.dynamic.surfaceContainer,
      surfaceHigh: Color.android.dynamic.surfaceContainerHigh,
      primary: Color.android.dynamic.primary,
      primaryContainer: Color.android.dynamic.primaryContainer,
      onPrimary: Color.android.dynamic.onPrimary,
      onPrimaryContainer: Color.android.dynamic.onPrimaryContainer,
      onSurface: Color.android.dynamic.onSurface,
      onSurfaceVariant: Color.android.dynamic.onSurfaceVariant,
      outline: Color.android.dynamic.outlineVariant,
    };
  }

  return {
    dark,
    background: '#101014',
    surface: '#1C1B20',
    surfaceHigh: '#29272E',
    primary: '#D8BDF8',
    primaryContainer: '#4F3568',
    onPrimary: '#3A1B53',
    onPrimaryContainer: '#F0DBFF',
    onSurface: '#E7E1E8',
    onSurfaceVariant: '#CAC4CF',
    outline: '#938E96',
  };
}
