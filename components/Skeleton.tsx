// components/Skeleton.tsx
import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLOR_ELEVATED } from '../lib/constants';

const SHIMMER_COLORS = ['rgba(245,166,35,0)', 'rgba(245,166,35,0.18)', 'rgba(245,166,35,0)'] as const;

interface Props {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({ width, height, borderRadius = 8, style }: Props) {
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    shimmerX.value = -100;
    shimmerX.value = withRepeat(withTiming(400, { duration: 1200 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View
      style={[
        styles.base,
        { height, borderRadius },
        width !== undefined ? { width: width as any } : undefined,
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={SHIMMER_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: COLOR_ELEVATED, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: 100 },
});
