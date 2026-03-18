// app/(drawer)/shop.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';

export default function Shop() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SHOP</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontFamily: FONT_BEBAS, fontSize: 32 },
  sub: { color: COLOR_TEXT_MUTED, fontSize: 14, marginTop: 8 },
});
