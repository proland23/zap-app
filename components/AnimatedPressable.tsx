// components/AnimatedPressable.tsx
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SPRING = { damping: 20, stiffness: 200, mass: 1 };

export default function AnimatedPressable({ onPressIn, onPressOut, style, ...rest }: PressableProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={(e) => {
          scale.value = withSpring(0.96, SPRING);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, SPRING);
          onPressOut?.(e);
        }}
        style={style}
        {...rest}
      />
    </Animated.View>
  );
}
