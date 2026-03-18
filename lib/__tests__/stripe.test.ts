import { openPaymentSheet } from '../stripe';

// In Expo Go (appOwnership === 'expo'), openPaymentSheet must return true (mock success)
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
}));

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  presentPaymentSheet: jest.fn().mockResolvedValue({ error: null }),
}));

describe('openPaymentSheet', () => {
  it('returns true (mock) when running in Expo Go', async () => {
    const result = await openPaymentSheet('mock_secret');
    expect(result).toBe(true);
  });
});
