import { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SPRING = { damping: 20, stiffness: 200, mass: 1 };

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function ScreenEntrance({ children, style }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withSpring(1, SPRING);
    translateY.value = withSpring(0, SPRING);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle, style]}>
      {children}
    </Animated.View>
  );
}
