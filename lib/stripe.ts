// lib/stripe.ts
import Constants from 'expo-constants';

export async function initializeStripe(): Promise<void> {
  if (Constants.appOwnership === 'expo') return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initStripe } = require('@stripe/stripe-react-native');
  await initStripe({
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  });
}

export async function openPaymentSheet(_clientSecret: string): Promise<boolean> {
  if (Constants.appOwnership === 'expo') return true; // mock success in Expo Go
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { presentPaymentSheet } = require('@stripe/stripe-react-native');
  const { error } = await presentPaymentSheet();
  return !error;
}
