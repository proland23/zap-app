// app/(drawer)/charge.tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, Pressable } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import BayMarker from '../../components/BayMarker';
import BayCard from '../../components/BayCard';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';
interface Bay { id: string; bay_number: number; charger_speed_kw: number; status: BayStatus; charge_pct: number; }

const STATION = { latitude: 33.5543, longitude: -82.3018 };
const DURATIONS = [
  { label: '1h', hours: 1, price: 8 },
  { label: '2h', hours: 2, price: 15 },
  { label: '4h', hours: 4, price: 28 },
  { label: '8h', hours: 8, price: 50 },
];

function bayCoord(index: number) {
  const row = Math.floor(index / 5);
  const col = index % 5;
  return { lat: STATION.latitude + (row - 1) * 0.0002, lng: STATION.longitude + (col - 2) * 0.0002 };
}

export default function Charge() {
  const insets = useSafeAreaInsets();
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const fetchBays = async () => {
    const { data } = await supabase.from('charging_bays').select('*').order('bay_number');
    if (data) setBays(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBays();
    const channel = supabase
      .channel('charging_bays')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charging_bays' }, (payload) => {
        setBays((prev) => prev.map((b) => b.id === payload.new.id ? { ...b, ...payload.new } : b));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openReserve = (bay: Bay) => {
    setSelectedBay(bay);
    setSelectedDuration(DURATIONS[0]);
    bottomSheetRef.current?.present();
  };

  const handleConfirm = async () => {
    if (!selectedBay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) return;
      await supabase.from('charge_bookings').insert({
        bay_id: selectedBay.id,
        duration_hours: selectedDuration.hours,
        amount_paid: selectedDuration.price,
        status: 'confirmed',
        start_time: new Date().toISOString(),
      });
    } else {
      console.log('[Expo Go] Mock reservation:', selectedBay.bay_number, selectedDuration);
    }
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Map */}
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ ...STATION, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
        >
          {bays.map((bay, i) => {
            const { lat, lng } = bayCoord(i);
            return (
              <BayMarker
                key={bay.id}
                latitude={lat}
                longitude={lng}
                status={bay.status}
                bayNumber={bay.bay_number}
              />
            );
          })}
        </MapView>

        {/* Bay list */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>CHARGING BAYS</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading bays...</Text>
          ) : bays.length === 0 ? (
            <Text style={styles.emptyText}>No bays found — connect to Supabase to see live data</Text>
          ) : (
            <FlatList
              data={bays}
              horizontal
              keyExtractor={(b) => b.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8 }}
              renderItem={({ item }) => (
                <BayCard
                  bayNumber={item.bay_number}
                  speedKw={item.charger_speed_kw}
                  status={item.status}
                  onReserve={() => openReserve(item)}
                />
              )}
            />
          )}
        </View>

        {/* Reserve bottom sheet */}
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['50%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>RESERVE BAY {selectedBay?.bay_number}</Text>
            <Text style={styles.sheetSub}>SELECT DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.label}
                  style={[styles.durationPill, selectedDuration.hours === d.hours && styles.durationPillActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDuration(d); }}
                >
                  <Text style={[styles.durationText, selectedDuration.hours === d.hours && styles.durationTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.totalText}>${selectedDuration.price}.00 total</Text>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>
                {Constants.appOwnership === 'expo' ? 'PAYMENT (DEV BUILD REQUIRED)' : 'CONFIRM RESERVATION'}
              </Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  map: { flex: 0.6 },
  listContainer: { flex: 0.4, backgroundColor: COLOR_NAVY, paddingTop: 12 },
  listTitle: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },
  loadingText: { color: COLOR_TEXT_MUTED, paddingHorizontal: 16 },
  emptyText: { color: COLOR_TEXT_MUTED, paddingHorizontal: 16, fontSize: 13 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  sheetContent: { padding: 24 },
  sheetTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2, marginBottom: 4 },
  sheetSub: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 16 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  durationPill: { flex: 1, borderWidth: 1, borderColor: COLOR_GOLD, borderRadius: 20, height: 40, alignItems: 'center', justifyContent: 'center' },
  durationPillActive: { backgroundColor: COLOR_GOLD },
  durationText: { color: COLOR_GOLD, fontSize: 13, fontWeight: '600' },
  durationTextActive: { color: COLOR_NAVY },
  totalText: { color: COLOR_GOLD, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  confirmBtn: { backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
