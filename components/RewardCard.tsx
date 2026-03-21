// components/RewardCard.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  COLOR_CARD,
  COLOR_NAVY,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_MUTED,
} from '../lib/constants';

interface RewardCardProps {
  label: string;
  cost: number;
  accentColor: string;
  iconLabel: string;
  balance: number;
  redeeming: boolean;
  onRedeem: () => void;
}

export default function RewardCard({
  label,
  cost,
  accentColor,
  iconLabel,
  balance,
  redeeming,
  onRedeem,
}: RewardCardProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);
  const canRedeem = balance >= cost;

  useEffect(() => {
    const target = Math.min(balance / cost, 1);
    // cancelAnimation aborts any in-progress animation (including the 200ms delay)
    // so the new target takes effect immediately rather than stacking animations.
    // progress is a stable shared value ref — safe to omit from deps.
    cancelAnimation(progress);
    progress.value = withDelay(200, withSpring(target, { damping: 20, stiffness: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, cost]);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * trackWidth,
  }));

  // No emoji per CLAUDE.md — plain text labels only
  const statusText = canRedeem
    ? 'REDEEMABLE'
    : `${(cost - balance).toLocaleString()} PTS TO GO`;

  return (
    <View style={[styles.card, { borderColor: accentColor + '40' }]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '1A' }]}>
        <Text style={[styles.iconLabel, { color: accentColor }]}>{iconLabel}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.rewardLabel}>{label}</Text>
        <View
          style={styles.track}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[styles.fill, { backgroundColor: accentColor }, fillStyle]}
          />
        </View>
        <Text style={[styles.status, { color: canRedeem ? accentColor : COLOR_TEXT_MUTED }]}>
          {statusText}
        </Text>
      </View>

      {/* Redeem button */}
      <Pressable
        style={[styles.button, { backgroundColor: accentColor }, !canRedeem && styles.buttonDisabled]}
        disabled={!canRedeem || redeeming}
        accessibilityLabel={canRedeem ? `Redeem ${label}` : `${label} — insufficient points`}
        accessibilityState={{ disabled: !canRedeem || redeeming }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRedeem();
        }}
      >
        {redeeming ? (
          <ActivityIndicator size="small" color={COLOR_NAVY} />
        ) : (
          <Text style={styles.buttonText}>REDEEM</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_CARD,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    paddingVertical: 16,
  },
  rewardLabel: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 6,
  },
  button: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 10,
    margin: 16,
    marginLeft: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: COLOR_NAVY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
