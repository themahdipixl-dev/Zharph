import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { Group, Shadow, SkText, matchFont, Skia } from '@shopify/react-native-skia';

function makeFont(size) {
  try {
    const font = matchFont({
      fontFamily: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif-light' }),
      fontSize: size,
      fontWeight: 'normal',
    });
    if (font) return font;
  } catch (error) {
    return Skia.Font(undefined, size);
  }
  return Skia.Font(undefined, size);
}

function getHour12Preference() {
  try {
    const options = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    return options.hourCycle === 'h11' || options.hourCycle === 'h12';
  } catch (error) {
    return undefined;
  }
}

function formatTime(date) {
  try {
    const hour12 = getHour12Preference();
    const options = { hour: '2-digit', minute: '2-digit' };
    if (hour12 !== undefined) options.hour12 = hour12;
    return date.toLocaleTimeString(undefined, options);
  } catch (error) {
    return date.toLocaleTimeString();
  }
}

function formatDate(date) {
  try {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return '';
  }
}

function textWidth(font, text, size) {
  try {
    return font.measureText(text).width;
  } catch (error) {
    return text.length * size * 0.55;
  }
}

export default function ClockWidget({ box, timeSize, dateSize, color = 'white', live = true }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!live) return undefined;
    const update = () => setNow(new Date());
    const timer = setInterval(update, 1000);
    update();
    return () => clearInterval(timer);
  }, [live]);

  const timeText = useMemo(() => formatTime(now), [now]);
  const dateText = useMemo(() => formatDate(now), [now]);
  const timeFont = useMemo(() => makeFont(timeSize), [timeSize]);
  const dateFont = useMemo(() => makeFont(dateSize), [dateSize]);

  const timeX = (box.w - textWidth(timeFont, timeText, timeSize)) / 2;
  const dateX = (box.w - textWidth(dateFont, dateText, dateSize)) / 2;
  const timeY = timeSize * 0.95;
  const dateY = timeY + dateSize * 1.5;

  return (
    <Group transform={[{ translateX: box.x }, { translateY: box.y }]}>
      <SkText x={timeX} y={timeY} text={timeText} font={timeFont} color={color}>
        <Shadow dx={0} dy={2} blur={8} color="rgba(0,0,0,0.35)" />
      </SkText>
      {dateText ? (
        <SkText x={dateX} y={dateY} text={dateText} font={dateFont} color={color} opacity={0.92}>
          <Shadow dx={0} dy={1} blur={5} color="rgba(0,0,0,0.35)" />
        </SkText>
      ) : null}
    </Group>
  );
}

export { formatTime, formatDate };
