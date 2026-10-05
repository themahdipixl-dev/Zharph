import { Platform, useColorScheme } from 'react-native';
import { Color } from 'expo-router';

export function useAppTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  if (Platform.OS === 'android') {
    return {
      dark,
      background: Color.android.dynamic.background,
      surface: Color.android.dynamic.surfaceContainer,
      surfaceHigh: Color.android.dynamic.surfaceContainerHigh,
      primary: Color.android.dynamic.primary,
      onPrimary: Color.android.dynamic.onPrimary,
      onSurface: Color.android.dynamic.onSurface,
      onSurfaceVariant: Color.android.dynamic.onSurfaceVariant,
      outline: Color.android.dynamic.outlineVariant,
    };
  }

  return {
    dark,
    background: dark ? '#101014' : '#FAF8FF',
    surface: dark ? '#1C1B20' : '#F0EDF4',
    surfaceHigh: dark ? '#29272E' : '#E7E2EA',
    primary: dark ? '#D8BDF8' : '#6D3D8F',
    onPrimary: dark ? '#3A1B53' : '#FFFFFF',
    onSurface: dark ? '#E7E1E8' : '#1B1A1F',
    onSurfaceVariant: dark ? '#CAC4CF' : '#49454E',
    outline: dark ? '#938E96' : '#79747E',
  };
}
