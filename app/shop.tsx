// app/shop.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';
export default function Shop() {
  return <View style={styles.container}><Text style={styles.text}>Shop coming soon</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
