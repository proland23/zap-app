// components/RewardItem.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLOR_CARD, COLOR_GOLD, COLOR_TEXT_PRIMARY } from '../lib/constants';

interface Props {
  label: string;
  cost: number;
  accentColor: string;
  canRedeem: boolean;
  onRedeem: () => void;
}

export default function RewardItem({ label, cost, accentColor, canRedeem, onRedeem }: Props) {
  return (
    <View style={[styles.card, { borderColor: accentColor + '40' }]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.cost, { color: accentColor }]}>{cost.toLocaleString()} pts</Text>
      </View>
      <Pressable
        style={[styles.redeemBtn, { backgroundColor: accentColor }, !canRedeem && styles.disabled]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRedeem(); }}
        disabled={!canRedeem}
      >
        <Text style={styles.redeemText}>REDEEM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLOR_CARD, borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  accent: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, padding: 16 },
  label: { color: COLOR_TEXT_PRIMARY, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cost: { fontSize: 13, fontWeight: '600' },
  redeemBtn: { margin: 12, paddingHorizontal: 16, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  redeemText: { color: '#050D18', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
