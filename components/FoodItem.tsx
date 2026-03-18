// components/FoodItem.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY } from '../lib/constants';

interface Props {
  name: string;
  description: string;
  price: number;
  onAdd: () => void;
}

export default function FoodItem({ name, description, price, onAdd }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.photoPlaceholder} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        <Text style={styles.price}>${price.toFixed(2)}</Text>
      </View>
      <Pressable
        style={styles.addBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
        accessibilityLabel={`Add ${name} to cart`}
      >
        <Text style={styles.addText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  photoPlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLOR_ELEVATED, marginRight: 14 },
  info: { flex: 1 },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  description: { color: COLOR_TEXT_SECONDARY, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  price: { color: COLOR_GOLD, fontSize: 15, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLOR_GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  addText: { color: '#050D18', fontSize: 22, fontWeight: '700', lineHeight: 26 },
});
