// components/StaggerItem.tsx
import { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const SPRING = { damping: 20, stiffness: 200, mass: 1 };
const STAGGER_MS = 60;

interface Props {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function StaggerItem({ index, children, style }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const delay = index * STAGGER_MS;
    opacity.value = withDelay(delay, withSpring(1, SPRING));
    translateY.value = withDelay(delay, withSpring(0, SPRING));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
}
