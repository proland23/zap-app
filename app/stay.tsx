// app/stay.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';
export default function Stay() {
  return <View style={styles.container}><Text style={styles.text}>Stay coming soon</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
