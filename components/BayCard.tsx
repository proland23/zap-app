// components/BayCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import * as Haptics from 'expo-haptics';
import {
  COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN,
  COLOR_GREEN, COLOR_RED, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED,
} from '../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';

interface Props {
  bayNumber: number;
  speedKw: number;
  status: BayStatus;
  onReserve: () => void;
}

const STATUS_COLOR: Record<BayStatus, string> = {
  available: COLOR_GREEN,
  reserved: COLOR_GOLD,
  occupied: COLOR_RED,
};

export default function BayCard({ bayNumber, speedKw, status, onReserve }: Props) {
  const speedColor = speedKw >= 350 ? COLOR_GOLD : COLOR_CYAN;
  const canReserve = status === 'available';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.bayNum}>BAY {bayNumber}</Text>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
      </View>
      <View style={[styles.speedBadge, { borderColor: speedColor }]}>
        <Text style={[styles.speedText, { color: speedColor }]}>{speedKw}kW</Text>
      </View>
      <Text style={styles.statusLabel}>{status.toUpperCase()}</Text>
      <AnimatedPressable
        style={[styles.reserveBtn, !canReserve && styles.disabledBtn]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReserve(); }}
        disabled={!canReserve}
        accessibilityLabel={`Reserve bay ${bayNumber}`}
      >
        <Text style={styles.reserveText}>RESERVE</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140, backgroundColor: COLOR_CARD, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, marginRight: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bayNum: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  speedBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  speedText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statusLabel: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 2, marginBottom: 12 },
  reserveBtn: { backgroundColor: COLOR_GOLD, borderRadius: 10, height: 36, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: COLOR_ELEVATED, opacity: 0.4 },
  reserveText: { color: '#050D18', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
