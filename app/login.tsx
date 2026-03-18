// app/login.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, COLOR_RED, FONT_BEBAS,
} from '../lib/constants';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signin' | 'signup';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signupOffset = useSharedValue(40);
  const signupOpacity = useSharedValue(0);

  const signupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: signupOffset.value }],
    opacity: signupOpacity.value,
  }));

  const switchToSignup = () => {
    setMode('signup');
    setError('');
    signupOffset.value = withSpring(0, { damping: 18, stiffness: 80 });
    signupOpacity.value = withSpring(1, { damping: 18, stiffness: 80 });
  };

  const switchToSignin = () => {
    setMode('signin');
    setError('');
    signupOffset.value = 40;
    signupOpacity.value = 0;
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/(drawer)/');
  };

  const handleSignUp = async () => {
    if (!fullName || !phone || !email || !password) { setError('All fields required.'); return; }
    setLoading(true); setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/(drawer)/');
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const redirectTo = makeRedirectUri({ scheme: 'zapapp' });
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (err || !data.url) { setError(err?.message ?? 'OAuth failed'); return; }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const url = new URL(result.url);
      const access_token = url.searchParams.get('access_token') ?? '';
      const refresh_token = url.searchParams.get('refresh_token') ?? '';
      if (access_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        router.replace('/(drawer)/');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLOR_NAVY }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero top */}
        <LinearGradient colors={[COLOR_ELEVATED, COLOR_NAVY]} style={styles.hero}>
          <View style={styles.glow} />
          <Text style={styles.logoText}>ZAPP</Text>
          <Text style={styles.byLine}>BY REST & RECHARGE</Text>
          <Text style={styles.tagline}>CHARGE · STAY · EAT · RIDE · FLY</Text>
        </LinearGradient>

        {/* Bottom card */}
        <View style={styles.card}>
          <View style={styles.handle} />

          {mode === 'signup' && (
            <Animated.View style={signupStyle}>
              <Input label="FULL NAME" value={fullName} onChangeText={setFullName} editable={!loading} />
              <Input label="PHONE" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
            </Animated.View>
          )}

          <Input label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
          <Input label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={mode === 'signin' ? handleEmailSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLOR_NAVY} />
              : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
            }
          </Pressable>

          {mode === 'signin' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.oauthRow}>
                <Pressable style={styles.oauthBtn} onPress={() => handleOAuth('apple')}>
                  <Text style={styles.oauthText}> Apple</Text>
                </Pressable>
                <Pressable style={styles.oauthBtn} onPress={() => handleOAuth('google')}>
                  <Text style={[styles.oauthText, { color: '#EA4335' }]}>G</Text>
                  <Text style={styles.oauthText}> Google</Text>
                </Pressable>
              </View>
              <Pressable onPress={switchToSignup} style={styles.switchLink}>
                <Text style={styles.switchText}>New here? <Text style={{ color: COLOR_GOLD }}>Create account</Text></Text>
              </Pressable>
            </>
          )}

          {mode === 'signup' && (
            <Pressable onPress={switchToSignin} style={styles.switchLink}>
              <Text style={styles.switchText}>Already have an account? <Text style={{ color: COLOR_GOLD }}>Sign in</Text></Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={[inputStyles.input, focused && inputStyles.focused]}
        placeholderTextColor={COLOR_TEXT_MUTED}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  label: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: COLOR_ELEVATED, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
    height: 52, paddingHorizontal: 16, color: COLOR_TEXT_PRIMARY, fontSize: 15,
  },
  focused: { borderColor: COLOR_GOLD },
});

const styles = StyleSheet.create({
  hero: { height: 280, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28, position: 'relative' },
  glow: {
    position: 'absolute', top: '40%', left: '50%',
    width: 160, height: 80, marginLeft: -80, marginTop: -40,
    backgroundColor: 'rgba(245,166,35,0.18)', borderRadius: 80,
  },
  logoText: { fontFamily: FONT_BEBAS, fontSize: 72, color: COLOR_GOLD, letterSpacing: 12, zIndex: 1 },
  byLine: { fontSize: 9, letterSpacing: 3, color: COLOR_TEXT_MUTED, marginTop: 4 },
  tagline: { fontSize: 10, letterSpacing: 2, color: COLOR_TEXT_MUTED, marginTop: 12 },
  card: {
    flex: 1, backgroundColor: COLOR_CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 24, marginTop: -20,
  },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  primaryBtn: {
    backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  primaryBtnText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  errorText: { color: COLOR_RED, fontSize: 13, marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 1, paddingHorizontal: 12 },
  oauthRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  oauthBtn: {
    flex: 1, backgroundColor: COLOR_ELEVATED, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  oauthText: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  switchLink: { alignItems: 'center', marginTop: 8 },
  switchText: { color: COLOR_TEXT_MUTED, fontSize: 12 },
});
