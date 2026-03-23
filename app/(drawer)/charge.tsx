// app/(drawer)/charge.tsx
import { useEffect, useRef, useState, Component } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, Pressable, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import BayMarker from '../../components/BayMarker';
import BayCard from '../../components/BayCard';
import { useToastStore } from '../../lib/toast-store';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, FONT_BEBAS,
  COLOR_GREEN, COLOR_CYAN,
} from '../../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';
interface Bay { id: string; bay_number: number; charger_speed_kw: number; status: BayStatus; charge_pct: number; }

class MapErrorBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.hasError ? null : this.props.children; }
}

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
  const { showToast } = useToastStore();
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  // Maps SDK for Android requires billing enabled in Google Cloud Console
  const [mapError, setMapError] = useState(Platform.OS === 'android');
  const [confirmState, setConfirmState] = useState<null | {
    bayNumber: number;
    hours: number;
    price: number;
    endTime: string;
    accessCode: string;
  }>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    return () => {
      supabase.removeChannel(channel);
      clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const openReserve = (bay: Bay) => {
    clearTimeout(confirmTimerRef.current);
    setConfirmState(null);
    setSelectedBay(bay);
    setSelectedDuration(DURATIONS[0]);
    bottomSheetRef.current?.present();
  };

  const handleConfirm = async () => {
    if (!selectedBay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const endTime = new Date(Date.now() + selectedDuration.hours * 60 * 60 * 1000)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      if (Constants.appOwnership !== 'expo') {
        const success = await openPaymentSheet('mock_secret');
        if (!success) return;
        const { data: booking, error } = await supabase
          .from('charge_bookings')
          .insert({
            bay_id: selectedBay.id,
            duration_hours: selectedDuration.hours,
            amount_paid: selectedDuration.price,
            status: 'confirmed',
            start_time: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (error) throw error;
        const accessCode = 'ZAP-' + booking.id.slice(0, 4).toUpperCase();
        setConfirmState({
          bayNumber: selectedBay.bay_number,
          hours: selectedDuration.hours,
          price: selectedDuration.price,
          endTime,
          accessCode,
        });
      } else {
        setConfirmState({
          bayNumber: selectedBay.bay_number,
          hours: selectedDuration.hours,
          price: selectedDuration.price,
          endTime,
          accessCode: 'ZAP-DEV0',
        });
      }

      confirmTimerRef.current = setTimeout(() => {
        bottomSheetRef.current?.dismiss();
      }, 8000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      showToast({ type: 'error', title: 'RESERVATION FAILED', subtitle: message });
    }
  };

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Map */}
        {mapError ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderTitle}>📍 I-20 Exit 183</Text>
            <Text style={styles.mapPlaceholderSub}>Columbia County, Georgia</Text>
            <Text style={styles.mapPlaceholderNote}>33.5543° N, 82.3018° W</Text>
          </View>
        ) : (
          <MapErrorBoundary onError={() => setMapError(true)}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
          </MapErrorBoundary>
        )}

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
          onDismiss={() => setConfirmState(null)}
        >
          <BottomSheetView style={styles.sheetContent}>
            {confirmState !== null ? (
              <>
                {/* Confirmation header */}
                <View style={styles.confirmHeader}>
                  <View style={styles.confirmCheckCircle}>
                    <Text style={styles.confirmCheckmark}>✓</Text>
                  </View>
                  <Text style={styles.confirmTitle}>BAY {confirmState.bayNumber} CONFIRMED</Text>
                </View>

                {/* Stat pills */}
                <View style={styles.statPillRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillLabel}>DURATION</Text>
                    <Text style={styles.statPillValue}>{confirmState.hours}h</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillLabel}>AMOUNT</Text>
                    <Text style={styles.statPillValue}>${confirmState.price}.00</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillLabel}>END TIME</Text>
                    <Text style={styles.statPillValue}>{confirmState.endTime}</Text>
                  </View>
                </View>

                {/* Access code */}
                <View style={styles.accessCodeRow}>
                  <Text style={styles.accessCodeLabel}>ACCESS CODE</Text>
                  <Text style={styles.accessCodeValue}>{confirmState.accessCode}</Text>
                </View>
              </>
            ) : (
              <>
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
                    {Constants.appOwnership === 'expo' ? 'MOCK RESERVATION' : 'CONFIRM RESERVATION'}
                  </Text>
                </Pressable>
              </>
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  map: { flex: 0.6 },
  mapPlaceholder: {
    flex: 0.6, backgroundColor: '#0A1929', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  mapPlaceholderTitle: { color: COLOR_GOLD, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  mapPlaceholderSub: { color: COLOR_TEXT_PRIMARY, fontSize: 13, marginBottom: 12 },
  mapPlaceholderNote: { color: COLOR_TEXT_MUTED, fontSize: 11, textAlign: 'center', paddingHorizontal: 32 },
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
  // Confirmation view styles
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  confirmCheckCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLOR_GREEN, alignItems: 'center', justifyContent: 'center',
  },
  confirmCheckmark: { color: COLOR_NAVY, fontSize: 18, fontWeight: '700' },
  confirmTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2 },
  statPillRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statPill: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  statPillLabel: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 1, marginBottom: 4 },
  statPillValue: { color: COLOR_TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  accessCodeRow: { alignItems: 'center', gap: 6 },
  accessCodeLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2 },
  accessCodeValue: { color: COLOR_CYAN, fontFamily: FONT_BEBAS, fontSize: 18, letterSpacing: 3 },
});
