import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useToastStore } from '../lib/toast-store';
import {
  COLOR_GREEN, COLOR_RED, COLOR_GOLD,
  COLOR_NAVY, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY,
} from '../lib/constants';

const SPRING = { damping: 20, stiffness: 200, mass: 1 };
const DISMISS_AFTER_MS = 3000;

const TYPE_COLOR: Record<string, string> = {
  success: COLOR_GREEN,
  error: COLOR_RED,
  info: COLOR_GOLD,
};

const TYPE_ICON: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: '●',
};

export default function Toast() {
  const { toast, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    translateY.value = withSpring(-120, SPRING);
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(hideToast)();
    });
  };

  useEffect(() => {
    if (!toast) return;

    // Haptic
    if (toast.type === 'error') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Slide in
    translateY.value = withSpring(0, SPRING);
    opacity.value = withTiming(1, { duration: 150 });

    // Auto-dismiss
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, DISMISS_AFTER_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const panGesture = Gesture.Pan().onUpdate((e) => {
    if (e.velocityY < -500 || e.translationY < -40) {
      runOnJS(dismiss)();
    }
  });

  if (!toast) return null;

  const accentColor = TYPE_COLOR[toast.type] ?? COLOR_GOLD;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          { top: insets.top, borderLeftColor: accentColor },
          animatedStyle,
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.iconBadge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}66` }]}>
          <Text style={[styles.iconText, { color: accentColor }]}>
            {TYPE_ICON[toast.type]}
          </Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          {toast.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{toast.subtitle}</Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(14,32,53,0.97)',
    borderLeftWidth: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: COLOR_TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
});
