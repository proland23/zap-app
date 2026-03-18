// app/stay/[id].tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../../lib/constants';

export default function StayDetail() {
  return <View style={styles.container}><Text style={{ color: '#fff' }}>Loading...</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
});
