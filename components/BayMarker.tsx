// components/BayMarker.tsx
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { COLOR_GREEN, COLOR_GOLD, COLOR_RED } from '../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';

const STATUS_COLOR: Record<BayStatus, string> = {
  available: COLOR_GREEN,
  reserved: COLOR_GOLD,
  occupied: COLOR_RED,
};

interface Props {
  latitude: number;
  longitude: number;
  status: BayStatus;
  bayNumber: number;
}

export default function BayMarker({ latitude, longitude, status, bayNumber }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const color = STATUS_COLOR[status];

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1, false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(0.8, { duration: 800 })),
      -1, false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  return (
    <Marker coordinate={{ latitude, longitude }} title={`Bay ${bayNumber}`} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View style={[styles.pulse, { backgroundColor: color + '40' }, pulseStyle]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pulse: { width: 28, height: 28, borderRadius: 14, position: 'absolute', top: -6, left: -6 },
  dot: { width: 16, height: 16, borderRadius: 8 },
});
