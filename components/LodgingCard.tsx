// components/LodgingCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_GREEN, COLOR_RED, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED } from '../lib/constants';

interface Props {
  name: string;
  nightlyRate: number;
  isAvailable: boolean;
  onPress: () => void;
}

export default function LodgingCard({ name, nightlyRate, isAvailable, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityLabel={`View ${name}`}>
      <View style={styles.photoPlaceholder} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={[styles.dot, { backgroundColor: isAvailable ? COLOR_GREEN : COLOR_RED }]} />
        </View>
        <Text style={styles.rate}>${nightlyRate}<Text style={styles.night}>/night</Text></Text>
        <Text style={styles.status}>{isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLOR_CARD, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', flex: 1, margin: 6 },
  photoPlaceholder: { height: 120, backgroundColor: COLOR_ELEVATED },
  info: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rate: { color: COLOR_GOLD, fontSize: 18, fontWeight: '700' },
  night: { color: COLOR_TEXT_MUTED, fontSize: 12, fontWeight: '400' },
  status: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 2, marginTop: 4 },
});
