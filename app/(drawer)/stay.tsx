// app/(drawer)/stay.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import LodgingCard from '../../components/LodgingCard';
import { COLOR_NAVY, COLOR_ELEVATED, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';

interface Unit { id: string; name: string; nightly_rate: number; is_available: boolean; }

export default function Stay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('lodging_units').select('id, name, nightly_rate, is_available')
      .then(({ data }) => { if (data) setUnits(data); setLoading(false); });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>STAY</Text>
      {loading ? (
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : units.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No units available</Text></View>
      ) : (
        <FlatList
          data={units}
          numColumns={2}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 10, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <LodgingCard
              name={item.name}
              nightlyRate={item.nightly_rate}
              isAvailable={item.is_available}
              onPress={() => router.push(`/stay/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: '#fff', letterSpacing: 3, paddingHorizontal: 20, marginBottom: 8 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  skeleton: { flex: 1, height: 180, margin: 6, backgroundColor: COLOR_ELEVATED, borderRadius: 20, minWidth: '45%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 15 },
});
