// app/(drawer)/index.tsx
import { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session-context';
import SnapCarousel from '../../components/SnapCarousel';
import { COLOR_NAVY, COLOR_GOLD, FONT_BEBAS } from '../../lib/constants';

export default function Home() {
  const { session } = useSession();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState('');

  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined) || 'there';

  const handleComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonVisible(true);
  };

  const dismiss = () => setComingSoonVisible(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header row */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn} accessibilityLabel="Open menu">
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: 18 }]} />
          <View style={styles.menuLine} />
        </Pressable>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.carouselWrapper}>
        <SnapCarousel onComingSoon={handleComingSoon} />
      </View>

      <Modal visible={comingSoonVisible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{comingSoonTitle} is coming soon!</Text>
            <Text style={styles.modalSubtext}>We're working hard to bring this to you.</Text>
            <Pressable style={styles.gotItButton} onPress={dismiss}>
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: { paddingHorizontal: 24, marginBottom: 32, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  menuBtn: { paddingBottom: 4, gap: 5 },
  menuLine: { width: 24, height: 2, backgroundColor: COLOR_GOLD, borderRadius: 1 },
  greeting: { color: '#fff', fontSize: 16 },
  name: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 42 },
  carouselWrapper: { flex: 1, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: COLOR_NAVY, borderWidth: 1, borderColor: COLOR_GOLD,
    borderRadius: 20, padding: 32, marginHorizontal: 32, alignItems: 'center',
  },
  modalTitle: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 28, textAlign: 'center' },
  modalSubtext: { color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 8 },
  gotItButton: { backgroundColor: COLOR_GOLD, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 },
  gotItText: { color: COLOR_NAVY, fontWeight: 'bold' },
});
