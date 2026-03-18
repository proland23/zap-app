// components/ServiceCard.tsx
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { CardData } from '../lib/card-data';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  SNAP_INTERVAL,
  FONT_BEBAS,
  COLOR_GOLD,
} from '../lib/constants';

interface ServiceCardProps {
  item: CardData;
  index: number;
  scrollX: SharedValue<number>;
  onPress?: () => void;
}

export default function ServiceCard({ item, index, scrollX, onPress }: ServiceCardProps) {
  // Outer wrapper: scale, rotateY, opacity, iOS shadow. NO overflow:hidden (would clip shadow).
  const outerStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];
    const scale        = interpolate(scrollX.value, inputRange, [0.88, 1.1, 0.88],  Extrapolation.CLAMP);
    const opacity      = interpolate(scrollX.value, inputRange, [0.5,  1.0,  0.5 ], Extrapolation.CLAMP);
    // rotateY: card right-of-center → -8deg (left edge toward viewer, card faces left = toward center)
    //          card left-of-center  → +8deg (right edge toward viewer, card faces right = toward center)
    const rotateYDeg   = interpolate(scrollX.value, inputRange, [-8,   0,    8   ], Extrapolation.CLAMP);
    const shadowRadius = interpolate(scrollX.value, inputRange, [0,    20,   0   ], Extrapolation.CLAMP);
    const shadowOpacity= interpolate(scrollX.value, inputRange, [0,    0.8,  0   ], Extrapolation.CLAMP);
    const elevation    = interpolate(scrollX.value, inputRange, [0,    20,   0   ], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateYDeg}deg` },
      ],
      // iOS gold glow
      shadowColor:   COLOR_GOLD,
      shadowOffset:  { width: 0, height: 0 },
      shadowRadius,
      shadowOpacity,
      // Android elevation (grey shadow; gold effect via borderColor below)
      elevation,
    };
  });

  // Inner container: animated borderColor for Android gold glow (also applies on iOS).
  const innerStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];
    const borderColor = interpolateColor(
      scrollX.value,
      inputRange,
      ['rgba(255,255,255,0.15)', COLOR_GOLD, 'rgba(255,255,255,0.15)'],
    );
    return { borderColor };
  });

  return (
    <Pressable onPress={onPress}>
      {/* Outer wrapper: receives shadow + transforms. No overflow:hidden. */}
      <Animated.View style={[styles.outer, outerStyle]}>
        {/* Inner container: overflow:hidden clips BlurView to rounded corners. */}
        <Animated.View style={[styles.inner, innerStyle]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.content}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            {item.comingSoon && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>COMING SOON</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginRight: SNAP_INTERVAL - CARD_WIDTH,
    // No overflow:hidden here — required for iOS shadow to render.
  },
  inner: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  content: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontFamily: FONT_BEBAS,
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLOR_GOLD,
    fontSize: 11,
  },
});
