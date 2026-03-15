// components/SnapCarousel.tsx
import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CARD_WIDTH, SNAP_INTERVAL } from '../lib/constants';
import { CARDS, CardData } from '../lib/card-data';
import ServiceCard from './ServiceCard';

// Create the animated FlatList. Generic is typed on the variable (not the call)
// to avoid JSX parse errors in .tsx files.
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as React.ComponentType<React.ComponentProps<typeof FlatList<CardData>>>;

interface SnapCarouselProps {
  onComingSoon: (title: string) => void;
}

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function SnapCarousel({ onComingSoon }: SnapCarouselProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useSharedValue(0);

  const handler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const activeIndex = useDerivedValue(() =>
    Math.round(scrollX.value / SNAP_INTERVAL),
  );

  useAnimatedReaction(
    () => activeIndex.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(triggerHaptic)();
      }
    },
  );

  return (
    <AnimatedFlatList
      data={CARDS}
      horizontal
      keyExtractor={(item) => item.id}
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={handler}
      getItemLayout={(_data, index) => ({
        length: SNAP_INTERVAL,
        offset: SNAP_INTERVAL * index,
        index,
      })}
      contentContainerStyle={{
        paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
      }}
      renderItem={({ item, index }) => (
        <ServiceCard
          item={item}
          index={index}
          scrollX={scrollX}
          onPress={
            item.comingSoon
              ? () => onComingSoon(item.title)
              : () => router.push(item.route! as never)
          }
        />
      )}
    />
  );
}
