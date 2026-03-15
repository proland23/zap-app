// app/login.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_GOLD, COLOR_NAVY, FONT_BEBAS } from '../lib/constants';

export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 24 },
});
