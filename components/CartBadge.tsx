// components/CartBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useEffect } from 'react';
import { COLOR_GOLD, COLOR_NAVY } from '../lib/constants';

interface Props { count: number; }

export default function CartBadge({ count }: Props) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = count > 0
      ? withSpring(1, { damping: 15, stiffness: 200 })
      : withSpring(0, { damping: 15, stiffness: 200 });
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count === 0) return null;

  return (
    <Animated.View style={[styles.badge, animStyle]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: COLOR_GOLD, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLOR_NAVY, fontSize: 11, fontWeight: '700' },
});
