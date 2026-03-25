// app/(drawer)/stay.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { supaQuery } from '../../lib/supabase-helpers';
import LodgingCard from '../../components/LodgingCard';
import { COLOR_NAVY, COLOR_ELEVATED, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';
import ScreenEntrance from '../../components/ScreenEntrance';
import StaggerItem from '../../components/StaggerItem';
import Skeleton from '../../components/Skeleton';

interface Unit { id: string; name: string; nightly_rate: number; is_available: boolean; }

export default function Stay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supaQuery(supabase.from('lodging_units').select('id, name, nightly_rate, is_available'))
      .then((data) => { if (!data) { setLoading(false); return; } setUnits(data); setLoading(false); });
  }, []);

  return (
    <ScreenEntrance style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>STAY</Text>
      {loading ? (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={180} borderRadius={20} style={{ flex: 1, margin: 6, minWidth: '45%' }} />
          ))}
        </View>
      ) : units.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No units available</Text></View>
      ) : (
        <FlatList
          data={units}
          numColumns={2}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 10, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <LodgingCard
                name={item.name}
                nightlyRate={item.nightly_rate}
                isAvailable={item.is_available}
                onPress={() => router.push(`/stay/${item.id}` as any)}
              />
            </StaggerItem>
          )}
        />
      )}
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: '#fff', letterSpacing: 3, paddingHorizontal: 20, marginBottom: 8 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 15 },
});
