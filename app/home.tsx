// app/home.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../lib/session-context';
import SnapCarousel from '../components/SnapCarousel';
import { COLOR_NAVY, COLOR_GOLD, FONT_BEBAS } from '../lib/constants';

export default function Home() {
  const { session, loading } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonTitle, setComingSoonTitle]     = useState('');

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  // Show blank navy while session resolves (splash covers initial load;
  // this handles the edge case where home.tsx is revisited without a session).
  if (loading || !session) {
    return <View style={styles.container} />;
  }

  // || (not ??) is intentional — catches null, undefined, and empty string
  const displayName: string =
    (session.user?.user_metadata?.full_name as string | undefined) || 'there';

  const handleComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonVisible(true);
  };

  const dismiss = () => setComingSoonVisible(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Greeting */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{displayName}</Text>
      </View>

      {/* Carousel */}
      <View style={styles.carouselWrapper}>
        <SnapCarousel onComingSoon={handleComingSoon} />
      </View>

      {/* Coming Soon modal */}
      <Modal visible={comingSoonVisible} transparent animationType="fade">
        {/* Outer pressable = backdrop — tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={dismiss}>
          {/*
            Inner Pressable with empty onPress consumes the touch,
            preventing it from bubbling to the backdrop dismiss handler.
            Reliable on both iOS and Android.
          */}
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {comingSoonTitle} is coming soon!
            </Text>
            <Text style={styles.modalSubtext}>
              We're working hard to bring this to you.
            </Text>
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
  container: {
    flex: 1,
    backgroundColor: COLOR_NAVY,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  greeting: {
    color: '#fff',
    fontSize: 16,
  },
  name: {
    color: COLOR_GOLD,
    fontFamily: FONT_BEBAS,
    fontSize: 42,
  },
  carouselWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: COLOR_NAVY,
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  modalTitle: {
    color: COLOR_GOLD,
    fontFamily: FONT_BEBAS,
    fontSize: 28,
    textAlign: 'center',
  },
  modalSubtext: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  gotItButton: {
    backgroundColor: COLOR_GOLD,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  gotItText: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
  },
});
